'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage, Json } from '@/types/database';
import { supabase } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatApiResponse {
  session_id: string;
  message: string;
  tool_calls?: Json;
  metadata?: Record<string, unknown>;
}

interface UseChatReturn {
  messages: ChatMessage[];
  sessionId: string | null;
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  clearChat: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);
      setLoading(true);

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Get current session access token
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: content,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error ?? `요청 실패 (${response.status})`,
          );
        }

        const data: ChatApiResponse = await response.json();

        // Update session ID (may be new)
        if (data.session_id) {
          setSessionId(data.session_id);
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          tool_calls: data.tool_calls,
          metadata: data.metadata as ChatMessage['metadata'],
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : '메시지 전송 중 오류가 발생했습니다.';
        setError(errorMessage);

        // Add error message to chat
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `오류가 발생했습니다: ${errorMessage}`,
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  /**
   * 기존 세션 메시지 로드
   */
  const loadSession = useCallback(async (sid: string) => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('인증이 필요합니다.');
      }

      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('id, role, content, tool_calls, metadata, created_at')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setSessionId(sid);
      setMessages(
        (data ?? []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls ?? undefined,
          metadata: (m.metadata as ChatMessage['metadata']) ?? undefined,
          created_at: m.created_at,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '세션 로드에 실패했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 새 채팅 시작
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  return {
    messages,
    sessionId,
    loading,
    error,
    sendMessage,
    loadSession,
    clearChat,
  };
}
