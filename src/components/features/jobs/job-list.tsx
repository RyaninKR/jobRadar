'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { JobCard } from './job-card'
import type { JobPostingSummary, JobSearchFilters } from '@/types/database'

interface JobListProps {
  filters: JobSearchFilters
}

interface JobsResponse {
  data: JobPostingSummary[]
  total: number
  page: number
  per_page: number
}

const PER_PAGE = 12

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <div className="mb-2 h-4 w-24 rounded bg-slate-700" />
      <div className="mb-1 h-5 w-full rounded bg-slate-700" />
      <div className="mb-3 h-5 w-3/4 rounded bg-slate-700" />
      <div className="mb-3 flex gap-3">
        <div className="h-4 w-16 rounded bg-slate-700" />
        <div className="h-4 w-16 rounded bg-slate-700" />
        <div className="h-4 w-20 rounded bg-slate-700" />
      </div>
      <div className="mb-3 h-4 w-32 rounded bg-slate-700" />
      <div className="flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-slate-700" />
        <div className="h-5 w-14 rounded-full bg-slate-700" />
        <div className="h-5 w-14 rounded-full bg-slate-700" />
      </div>
    </div>
  )
}

export function JobList({ filters }: JobListProps) {
  const [jobs, setJobs] = useState<JobPostingSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(total / PER_PAGE)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', String(PER_PAGE))

      if (filters.query) params.set('query', filters.query)
      if (filters.sources?.length)
        params.set('sources', filters.sources.join(','))
      if (filters.locations?.length)
        params.set('locations', filters.locations.join(','))
      if (filters.skills?.length)
        params.set('skills', filters.skills.join(','))
      if (filters.experience_min !== undefined)
        params.set('experience_min', String(filters.experience_min))
      if (filters.experience_max !== undefined)
        params.set('experience_max', String(filters.experience_max))
      if (filters.salary_min !== undefined)
        params.set('salary_min', String(filters.salary_min))
      if (filters.salary_max !== undefined)
        params.set('salary_max', String(filters.salary_max))

      const res = await fetch(`/api/jobs?${params.toString()}`)

      if (!res.ok) {
        throw new Error('공고 목록을 불러오는데 실패했습니다.')
      }

      const json: JobsResponse = await res.json()
      setJobs(json.data)
      setTotal(json.total)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '알 수 없는 오류가 발생했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleToggleSave = (jobId: string, saved: boolean) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, is_saved: saved } : j))
    )
    // Optimistic update — fire and forget the API call
    fetch(`/api/jobs/${jobId}/save`, {
      method: saved ? 'POST' : 'DELETE',
    }).catch(() => {
      // Revert on failure
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, is_saved: !saved } : j))
      )
    })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-16 text-center">
        <p className="mb-4 text-sm text-red-400">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchJobs}>
          다시 시도
        </Button>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-6 py-16 text-center">
        <Briefcase className="mb-3 h-10 w-10 text-slate-500" />
        <p className="text-base font-medium text-slate-300">
          조건에 맞는 공고가 없습니다
        </p>
        <p className="mt-1 text-sm text-slate-400">
          검색 조건을 변경해 보세요
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-400">
        총 <span className="font-medium text-slate-200">{total.toLocaleString()}</span>개의 공고
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onToggleSave={handleToggleSave} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  )}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  )
}
