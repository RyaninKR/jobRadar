import Anthropic from '@anthropic-ai/sdk';
import { agentTools } from './tools';
import { dispatchToolCall, type ToolName } from './tool-handlers';
import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const MAX_TOOL_ROUNDS = 10;

const SYSTEM_PROMPT = `당신은 JobRadar의 채용 모니터링 AI 도우미입니다.

## 역할
- 사용자가 채용 시장을 효과적으로 탐색할 수 있도록 돕습니다.
- 채용 공고 검색, 트렌드 분석, 기업 비교, 알림 설정 등의 기능을 제공합니다.

## 행동 지침
1. 사용자의 질문을 정확히 이해하고, 필요한 도구를 적극적으로 활용하세요.
2. 검색 결과를 사용자가 이해하기 쉽게 요약하고 정리하세요.
3. 연봉 정보는 만원 단위로 표시하세요.
4. 경력 정보는 년 단위로 표시하세요.
5. 답변은 항상 한국어로 작성하세요.
6. 데이터가 없거나 부족한 경우 솔직하게 알려주세요.
7. 추가 검색 조건이나 관련 정보를 제안하여 사용자가 더 나은 결과를 얻을 수 있도록 도와주세요.

## 응답 형식
- 채용 공고 목록은 핵심 정보(회사명, 직무, 지역, 연봉, 기술스택)를 간결하게 정리하세요.
- 트렌드 분석 결과는 수치와 함께 인사이트를 제공하세요.
- 기업 비교 시 표 형식으로 정리하면 좋습니다.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentContext {
  user_id: string;
}

interface ToolCallRecord {
  tool_name: string;
  tool_input: Record<string, unknown>;
  result: unknown;
}

interface AgentResponse {
  content: string;
  tool_calls: ToolCallRecord[];
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

const client = new Anthropic();

/**
 * 메인 에이전트 오케스트레이터
 *
 * 대화 이력을 받아 Claude에게 전달하고, tool_use 루프를 처리한 뒤
 * 최종 텍스트 응답과 실행된 도구 호출 목록을 반환합니다.
 */
export async function runAgent(
  messages: MessageParam[],
  context: AgentContext,
): Promise<AgentResponse> {
  const toolCalls: ToolCallRecord[] = [];
  let currentMessages = [...messages];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: agentTools,
      messages: currentMessages,
    });

    // Check if the response contains tool_use blocks
    const toolUseBlocks = response.content.filter(
      (block: ContentBlock) => block.type === 'tool_use',
    );

    // If no tool use, extract text and return
    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      const textContent = response.content
        .filter((block: ContentBlock) => block.type === 'text')
        .map((block: ContentBlock) => {
          if (block.type === 'text') return block.text;
          return '';
        })
        .join('');

      // If we have text content even with tool use blocks and end_turn
      if (textContent) {
        return { content: textContent, tool_calls: toolCalls };
      }

      // If only tool use blocks remain without end_turn, continue processing
      if (toolUseBlocks.length === 0) {
        return { content: textContent || '', tool_calls: toolCalls };
      }
    }

    // Process tool calls
    const toolResults: MessageParam[] = [];

    // Add the assistant message with all content blocks
    currentMessages.push({
      role: 'assistant',
      content: response.content,
    });

    const toolResultBlocks: {
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }[] = [];

    for (const block of toolUseBlocks) {
      if (block.type !== 'tool_use') continue;

      const toolName = block.name as ToolName;
      const toolInput = block.input as Record<string, unknown>;

      let result: unknown;
      let isError = false;

      try {
        result = await dispatchToolCall(toolName, toolInput, {
          user_id: context.user_id,
        });
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : '도구 실행 중 오류가 발생했습니다.',
        };
        isError = true;
      }

      toolCalls.push({
        tool_name: toolName,
        tool_input: toolInput,
        result,
      });

      toolResultBlocks.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
        is_error: isError,
      });
    }

    // Add tool results as user message
    currentMessages.push({
      role: 'user',
      content: toolResultBlocks,
    });

    // If stop_reason is end_turn and we had text, we already returned above.
    // Otherwise, continue the loop for Claude to process the tool results.
    if (response.stop_reason === 'end_turn') {
      // Extract text from this response
      const textContent = response.content
        .filter((block: ContentBlock) => block.type === 'text')
        .map((block: ContentBlock) => {
          if (block.type === 'text') return block.text;
          return '';
        })
        .join('');

      if (textContent) {
        return { content: textContent, tool_calls: toolCalls };
      }
    }
  }

  // Exhausted max rounds — ask Claude for a final summary
  const finalResponse = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      ...currentMessages,
      {
        role: 'user',
        content:
          '지금까지 수집한 정보를 바탕으로 최종 답변을 제공해주세요.',
      },
    ],
  });

  const finalText = finalResponse.content
    .filter((block: ContentBlock) => block.type === 'text')
    .map((block: ContentBlock) => {
      if (block.type === 'text') return block.text;
      return '';
    })
    .join('');

  return { content: finalText, tool_calls: toolCalls };
}
