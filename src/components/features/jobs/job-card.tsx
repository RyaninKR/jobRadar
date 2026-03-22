'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Bookmark,
  BookmarkCheck,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import type { JobPostingSummary, JobSource } from '@/types/database'

interface JobCardProps {
  job: JobPostingSummary
  onToggleSave?: (jobId: string, saved: boolean) => void
}

const sourceLabels: Record<JobSource, string> = {
  wanted: '원티드',
  jobkorea: '잡코리아',
  saramin: '사람인',
  jobplanet: '잡플래닛',
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null
  if (min !== null && max !== null) {
    return `${min.toLocaleString()}만원 ~ ${max.toLocaleString()}만원`
  }
  if (min !== null) return `${min.toLocaleString()}만원 이상`
  return `${max!.toLocaleString()}만원 이하`
}

function formatExperience(
  min: number | null,
  max: number | null
): string | null {
  if (min === null && max === null) return null
  if (min === 0 && (max === null || max === 0)) return '신입'
  if (min !== null && max !== null) return `${min}~${max}년`
  if (min !== null) return `${min}년 이상`
  return `${max}년 이하`
}

export function JobCard({ job, onToggleSave }: JobCardProps) {
  const router = useRouter()

  const salary = formatSalary(job.salary_min, job.salary_max)
  const experience = formatExperience(job.experience_min, job.experience_max)
  const location = [job.location_city, job.location_district]
    .filter(Boolean)
    .join(' ')

  const relativeTime = job.posted_at
    ? formatDistanceToNow(new Date(job.posted_at), {
        addSuffix: true,
        locale: ko,
      })
    : null

  const handleClick = () => {
    router.push(`/jobs/${job.id}`)
  }

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSave?.(job.id, !job.is_saved)
  }

  return (
    <article
      onClick={handleClick}
      className={cn(
        'group cursor-pointer rounded-xl border border-slate-700 bg-slate-800/50 p-5 transition-all',
        'hover:border-slate-500 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-sm text-slate-400">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.company_name}</span>
          </div>
          <h3 className="mb-3 line-clamp-2 text-base font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
            {job.title}
          </h3>
        </div>
        <button
          onClick={handleSaveToggle}
          className={cn(
            'shrink-0 rounded-lg p-1.5 transition-colors',
            job.is_saved
              ? 'text-yellow-400 hover:text-yellow-300'
              : 'text-slate-500 hover:text-slate-300'
          )}
          aria-label={job.is_saved ? '저장 취소' : '저장'}
        >
          {job.is_saved ? (
            <BookmarkCheck className="h-5 w-5" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
        {location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </span>
        )}
        {experience && (
          <span className="inline-flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {experience}
          </span>
        )}
        {relativeTime && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {relativeTime}
          </span>
        )}
      </div>

      {salary && (
        <p className="mb-3 text-sm font-medium text-emerald-400">{salary}</p>
      )}

      {job.skills.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 5).map((skill) => (
            <Badge key={skill} variant="secondary" size="sm">
              {skill}
            </Badge>
          ))}
          {job.skills.length > 5 && (
            <Badge variant="outline" size="sm">
              +{job.skills.length - 5}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {job.sources.map(({ source, source_url }) => (
            <a
              key={source}
              href={source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 transition-opacity hover:opacity-80"
            >
              <Badge variant="source" source={source} size="sm">
                {sourceLabels[source]}
                <ExternalLink className="ml-0.5 h-2.5 w-2.5" />
              </Badge>
            </a>
          ))}
        </div>
      </div>
    </article>
  )
}
