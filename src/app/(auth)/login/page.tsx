'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const { user, loading: authLoading, signIn, signUp } = useAuth()
  const router = useRouter()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        setSuccess('가입 확인 이메일을 발송했습니다. 이메일을 확인해 주세요.')
      } else {
        await signIn(email, password)
        router.replace('/dashboard')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '인증에 실패했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-100">
            Job<span className="text-blue-500">Radar</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            AI 기반 채용 공고 통합 모니터링
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="mb-6 text-center text-lg font-semibold text-slate-100">
            {isSignUp ? '회원가입' : '로그인'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                이메일
              </label>
              <Input
                id="email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="6자 이상 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {success}
              </p>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              {isSignUp ? '회원가입' : '로그인'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setSuccess(null)
              }}
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
            >
              {isSignUp
                ? '이미 계정이 있으신가요? 로그인'
                : '계정이 없으신가요? 회원가입'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
