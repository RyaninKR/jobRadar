'use client'

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Input } from '@/components/ui/input'
import type { JobSearchFilters, JobSource } from '@/types/database'

interface JobFiltersProps {
  filters: JobSearchFilters
  onFilterChange: (filters: JobSearchFilters) => void
}

const SOURCES: { value: JobSource; label: string }[] = [
  { value: 'wanted', label: '원티드' },
  { value: 'jobkorea', label: '잡코리아' },
  { value: 'saramin', label: '사람인' },
  { value: 'jobplanet', label: '잡플래닛' },
]

const CITIES = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대전',
  '대구',
  '광주',
  '울산',
  '세종',
  '제주',
]

const POPULAR_SKILLS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Python',
  'Java',
  'Node.js',
  'Next.js',
  'Spring',
  'Docker',
  'Kubernetes',
  'AWS',
  'Go',
  'Rust',
  'Flutter',
  'Swift',
  'Kotlin',
  'Vue.js',
  'Angular',
  'PostgreSQL',
  'MongoDB',
]

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-700 py-4 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-200 hover:text-slate-100 transition-colors"
      >
        {title}
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function JobFilters({ filters, onFilterChange }: JobFiltersProps) {
  const [skillSearch, setSkillSearch] = useState('')

  const toggleSource = useCallback(
    (source: JobSource) => {
      const current = filters.sources ?? []
      const next = current.includes(source)
        ? current.filter((s) => s !== source)
        : [...current, source]
      onFilterChange({ ...filters, sources: next.length > 0 ? next : undefined })
    },
    [filters, onFilterChange]
  )

  const toggleLocation = useCallback(
    (city: string) => {
      const current = filters.locations ?? []
      const next = current.includes(city)
        ? current.filter((c) => c !== city)
        : [...current, city]
      onFilterChange({
        ...filters,
        locations: next.length > 0 ? next : undefined,
      })
    },
    [filters, onFilterChange]
  )

  const toggleSkill = useCallback(
    (skill: string) => {
      const current = filters.skills ?? []
      const next = current.includes(skill)
        ? current.filter((s) => s !== skill)
        : [...current, skill]
      onFilterChange({ ...filters, skills: next.length > 0 ? next : undefined })
    },
    [filters, onFilterChange]
  )

  const filteredSkills = POPULAR_SKILLS.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  )

  return (
    <aside className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
      <h2 className="mb-2 text-base font-bold text-slate-100">필터</h2>

      <FilterSection title="플랫폼">
        <div className="space-y-2">
          {SOURCES.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-slate-100"
            >
              <input
                type="checkbox"
                checked={filters.sources?.includes(value) ?? false}
                onChange={() => toggleSource(value)}
                className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
              />
              {label}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="경력" defaultOpen={false}>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="최소"
            value={filters.experience_min ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                experience_min: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            className="text-center"
          />
          <span className="shrink-0 text-sm text-slate-400">~</span>
          <Input
            type="number"
            min={0}
            placeholder="최대"
            value={filters.experience_max ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                experience_max: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            className="text-center"
          />
          <span className="shrink-0 text-sm text-slate-400">년</span>
        </div>
      </FilterSection>

      <FilterSection title="연봉" defaultOpen={false}>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={500}
            placeholder="최소"
            value={filters.salary_min ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                salary_min: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            className="text-center"
          />
          <span className="shrink-0 text-sm text-slate-400">~</span>
          <Input
            type="number"
            min={0}
            step={500}
            placeholder="최대"
            value={filters.salary_max ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                salary_max: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            className="text-center"
          />
          <span className="shrink-0 text-xs text-slate-400">만원</span>
        </div>
      </FilterSection>

      <FilterSection title="기술스택" defaultOpen={false}>
        <div className="mb-2">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="기술 검색..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
          />
        </div>
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
          {filteredSkills.map((skill) => {
            const selected = filters.skills?.includes(skill) ?? false
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  selected
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                {skill}
              </button>
            )
          })}
        </div>
      </FilterSection>

      <FilterSection title="지역" defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5">
          {CITIES.map((city) => {
            const selected = filters.locations?.includes(city) ?? false
            return (
              <button
                key={city}
                onClick={() => toggleLocation(city)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  selected
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                {city}
              </button>
            )
          })}
        </div>
      </FilterSection>
    </aside>
  )
}
