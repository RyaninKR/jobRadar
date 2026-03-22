'use client'

import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-24 text-center">
      <BarChart3 className="mb-4 h-12 w-12 text-slate-500" />
      <h1 className="text-xl font-bold text-slate-100">분석</h1>
      <p className="mt-2 text-sm text-slate-400">
        트렌드 차트, 연봉 분포, 기술 스택 인기도 분석 기능이 곧 추가됩니다.
      </p>
    </div>
  )
}
