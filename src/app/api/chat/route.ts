import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runAgent } from '@/lib/ai/agent';
import type { ChatRole } from '@/types/database';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// ---------------------------------------------------------------------------
// Auth helper — create a Supabase client scoped to the request user
// ---------------------------------------------------------------------------

function createRequestClient(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '') ?? '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = createRequestClient(req);

    // Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { session_id: inputSessionId, message } = body as {
      session_id?: string;
      message: string;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: '메시지를 입력해주세요.' },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Resolve or create chat session
    // -----------------------------------------------------------------------
    let sessionId = inputSessionId;

    if (!sessionId) {
      // Create a new session, using the first 30 chars of the message as a title
      const title =
        message.length > 30 ? `${message.slice(0, 30)}...` : message;

      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, title })
        .select('id')
        .single();

      if (sessionError || !session) {
        return NextResponse.json(
          { error: '세션 생성에 실패했습니다.' },
          { status: 500 },
        );
      }

      sessionId = session.id;
    }

    // -----------------------------------------------------------------------
    // Load previous messages for context
    // -----------------------------------------------------------------------
    const { data: previousMessages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50);

    // Build conversation history for Claude
    const history: MessageParam[] = (previousMessages ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Append current user message
    history.push({ role: 'user', content: message });

    // -----------------------------------------------------------------------
    // Save user message
    // -----------------------------------------------------------------------
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user' as ChatRole,
      content: message,
    });

    // -----------------------------------------------------------------------
    // Run agent
    // -----------------------------------------------------------------------
    const agentResponse = await runAgent(history, { user_id: user.id });

    // -----------------------------------------------------------------------
    // Save assistant message
    // -----------------------------------------------------------------------
    const toolCallsJson =
      agentResponse.tool_calls.length > 0 ? agentResponse.tool_calls : null;

    // Build metadata with structured results for the UI
    let metadata: Record<string, unknown> | null = null;
    if (agentResponse.tool_calls.length > 0) {
      const jobResults = agentResponse.tool_calls
        .filter((tc) => tc.tool_name === 'search_jobs')
        .flatMap((tc) => (tc.result as any)?.results ?? []);

      const trendData = agentResponse.tool_calls.find(
        (tc) => tc.tool_name === 'analyze_trend',
      )?.result;

      metadata = {};
      if (jobResults.length > 0) metadata.job_results = jobResults;
      if (trendData) metadata.trend_data = trendData;
      if (Object.keys(metadata).length === 0) metadata = null;
    }

    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant' as ChatRole,
      content: agentResponse.content,
      tool_calls: toolCallsJson,
      metadata,
    });

    // -----------------------------------------------------------------------
    // Respond
    // -----------------------------------------------------------------------
    return NextResponse.json({
      session_id: sessionId,
      message: agentResponse.content,
      tool_calls: toolCallsJson,
      metadata,
    });
  } catch (err) {
    console.error('[chat/route] Error:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : '채팅 처리 중 오류가 발생했습니다.',
      },
      { status: 500 },
    );
  }
}
