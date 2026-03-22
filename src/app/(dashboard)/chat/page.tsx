'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/lib/auth-context'

const SUGGESTIONS = [
  '요즘 프론트엔드 채용 트렌드 어때?',
  'React 쓰는 스타트업 공고 찾아줘',
  '연봉 5000만원 이상 백엔드 공고',
  '토스, 카카오, 네이버 채용 비교해줘',
]

export default function ChatPage() {
  const { user } = useAuth()
  const { messages, loading, error, sendMessage, clearChat } = useChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    await sendMessage(msg)
  }

  const handleSuggestion = async (text: string) => {
    if (loading) return
    await sendMessage(text)
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-24 text-center">
        <Bot className="mb-4 h-12 w-12 text-slate-500" />
        <p className="text-sm text-slate-400">로그인 후 AI 채팅을 이용할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-slate-700 bg-slate-800/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-400" />
          <h1 className="text-base font-bold text-slate-100">AI 채용 어시스턴트</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat}>
          <Trash2 className="mr-1 h-4 w-4" />
          새 대화
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Bot className="mb-4 h-16 w-16 text-slate-600" />
            <p className="mb-1 text-lg font-semibold text-slate-200">무엇이든 물어보세요</p>
            <p className="mb-6 text-sm text-slate-400">채용 공고 검색, 트렌드 분석, 기업 비교 등</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:border-blue-500 hover:bg-slate-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role !== 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600">
                    <User className="h-4 w-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl bg-slate-700 px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="border-t border-red-800/50 bg-red-900/20 px-5 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-slate-700 px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 outline-none transition-colors focus:border-blue-500"
          />
          <Button type="submit" variant="primary" size="md" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  )
}
