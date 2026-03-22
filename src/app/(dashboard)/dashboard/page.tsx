'use client'

import { useState } from 'react'
import {
  Briefcase,
  Calendar,
  Bookmark,
  BarChart3,
  Filter,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { JobSearchBar } from '@/components/features/jobs/job-search-bar'
import { JobFilters } from '@/components/features/jobs/job-filters'
import { JobList } from '@/components/features/jobs/job-list'
import type { JobSearchFilters } from '@/types/database'

const STATS = [
  {
    label: '오늘 신규 공고',
    value: '—',
    icon: Briefcase,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    label: '이번 주 공고',
    value: '—',
    icon: Calendar,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: '관심 기술 매칭',
    value: '—',
    icon: BarChart3,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    label: '저장한 공고',
    value: '—',
    icon: Bookmark,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
]

export default function DashboardPage() {
  const [filters, setFilters] = useState<JobSearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, query: query || undefined }))
  }

  const handleFilterChange = (next: JobSearchFilters) => {
    setFilters(next)
  }

  const activeFilterCount = [
    filters.sources?.length,
    filters.locations?.length,
    filters.skills?.length,
    filters.experience_min !== undefined || filters.experience_max !== undefined
      ? 1
      : 0,
    filters.salary_min !== undefined || filters.salary_max !== undefined
      ? 1
      : 0,
  ].reduce<number>((sum, v) => sum + (v || 0), 0)

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">
                  {value}
                </p>
              </div>
              <div className={cn('rounded-lg p-2.5', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1">
          <JobSearchBar value={filters.query} onSearch={handleSearch} />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'outline'}
          size="lg"
          className="relative shrink-0"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? (
            <X className="h-4 w-4" />
          ) : (
            <Filter className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">필터</span>
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {showFilters && (
          <div className="hidden w-72 shrink-0 lg:block">
            <JobFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        {/* Mobile filter drawer */}
        {showFilters && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowFilters(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-100">필터</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <JobFilters
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <JobList filters={filters} />
        </div>
      </div>
    </div>
  )
}
