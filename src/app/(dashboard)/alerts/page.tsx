'use client'

import { Bell } from 'lucide-react'

export default function AlertsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-24 text-center">
      <Bell className="mb-4 h-12 w-12 text-slate-500" />
      <h1 className="text-xl font-bold text-slate-100">알림 설정</h1>
      <p className="mt-2 text-sm text-slate-400">
        조건별 채용 공고 알림 기능이 곧 추가됩니다.
      </p>
    </div>
  )
}
