'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  User,
  LogOut,
  Bell,
  BarChart3,
  MessageSquare,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/lib/auth-context'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: Briefcase },
  { href: '/analytics', label: '분석', icon: BarChart3 },
  { href: '/chat', label: '채팅', icon: MessageSquare },
  { href: '/alerts', label: '알림', icon: Bell },
]

export function Header() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="text-lg font-bold text-slate-100 tracking-tight"
        >
          Job<span className="text-blue-500">Radar</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-800 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* User menu */}
          {user && (
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700">
                  <User className="h-4 w-4 text-slate-300" />
                </div>
                <span className="max-w-[120px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                    <div className="border-b border-slate-700 px-3 py-2">
                      <p className="truncate text-sm text-slate-300">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        signOut()
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700"
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
            aria-label="메뉴 열기"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-700 bg-slate-900 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-slate-800 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
          {user && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <p className="mb-2 truncate px-3 text-sm text-slate-400">
                {user.email}
              </p>
              <button
                onClick={() => {
                  setMobileOpen(false)
                  signOut()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
