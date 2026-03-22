'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { MessageSquare, X, Send, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/lib/auth-context';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage, JobPostingSummary, TrendAnalysis } from '@/types/database';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JobCard({ job }: { job: JobPostingSummary }) {
  const salaryText =
    job.salary_min || job.salary_max
      ? `${job.salary_min ?? '?'}~${job.salary_max ?? '?'}만원`
      : '연봉 미공개';

  const expText =
    job.experience_min !== null || job.experience_max !== null
      ? `${job.experience_min ?? 0}~${job.experience_max ?? ''}년`
      : '경력 무관';

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{job.title}</p>
          <p className="text-gray-400">{job.company_name}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
        {job.location_city && <span>{job.location_city}</span>}
        <span>{salaryText}</span>
        <span>{expText}</span>
      </div>
      {job.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs text-blue-300"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
      {job.sources.length > 0 && (
        <div className="mt-2 flex gap-2">
          {job.sources.map((src) => (
            <a
              key={src.source_url}
              href={src.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 underline hover:text-blue-300"
            >
              {src.source}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendSummary({ trend }: { trend: TrendAnalysis }) {
  const changeColor =
    trend.change_percent >= 0 ? 'text-green-400' : 'text-red-400';
  const changeSign = trend.change_percent >= 0 ? '+' : '';

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-3 text-sm">
      <p className="font-semibold text-white">
        트렌드 분석 ({trend.period})
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-400">총 공고 수</p>
          <p className="text-lg font-bold text-white">{trend.total_jobs}</p>
        </div>
        <div>
          <p className="text-gray-400">변화율</p>
          <p className={cn('text-lg font-bold', changeColor)}>
            {changeSign}
            {trend.change_percent}%
          </p>
        </div>
      </div>
      {trend.salary_range.avg > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          연봉 범위: {trend.salary_range.min}~{trend.salary_range.max}만원
          (평균 {trend.salary_range.avg}만원)
        </div>
      )}
      {trend.top_companies.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-400">상위 기업</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {trend.top_companies.map((c) => (
              <span
                key={c.name}
                className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
              >
                {c.name} ({c.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-100',
        )}
      >
        {/* Message text */}
        <div className="whitespace-pre-wrap">{msg.content}</div>

        {/* Inline tool results: job cards */}
        {msg.metadata?.job_results && msg.metadata.job_results.length > 0 && (
          <div className="mt-3 space-y-2">
            {msg.metadata.job_results.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Inline tool results: trend data */}
        {msg.metadata?.trend_data && (
          <div className="mt-3">
            <TrendSummary trend={msg.metadata.trend_data} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export default function ChatPanel() {
  const { user } = useAuth();
  const { messages, loading, error, sendMessage, clearChat } = useChat();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render if not authenticated
  if (!user) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center',
          'rounded-full bg-blue-600 text-white shadow-lg transition-transform',
          'hover:bg-blue-700 hover:scale-105 active:scale-95',
          open && 'bg-gray-700 hover:bg-gray-600',
        )}
        aria-label={open ? '채팅 닫기' : '채팅 열기'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-40 flex flex-col',
          'h-[600px] w-[400px] max-h-[80vh] max-w-[calc(100vw-2rem)]',
          'rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl',
          'transition-all duration-300 ease-in-out',
          open
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-4 opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">
              AI 채용 도우미
            </h2>
          </div>
          <button
            onClick={clearChat}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            title="새 대화 시작"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
              <MessageSquare className="mb-3 h-10 w-10 text-gray-600" />
              <p className="text-sm font-medium">안녕하세요!</p>
              <p className="mt-1 text-xs text-gray-600">
                채용 공고 검색, 트렌드 분석, 기업 비교 등<br />
                무엇이든 물어보세요.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  'React 개발자 채용 공고 검색해줘',
                  '최근 30일 백엔드 트렌드 분석',
                  '네이버와 카카오 채용 비교',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-blue-500 hover:text-blue-400"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-gray-800 px-4 py-2.5 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>분석 중...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-700 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800',
                'px-3 py-2.5 text-sm text-white placeholder-gray-500',
                'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                'max-h-32 scrollbar-thin',
              )}
              style={{
                height: 'auto',
                minHeight: '40px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                'bg-blue-600 text-white transition-colors',
                'hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500',
              )}
              aria-label="전송"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
