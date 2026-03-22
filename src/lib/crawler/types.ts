import type { JobSource } from '@/types/database'

export interface CrawledJob {
  source: JobSource
  source_id: string
  source_url: string
  title: string
  company_name: string
  location_full: string | null
  location_city: string | null
  location_district: string | null
  job_type: string | null
  experience_min: number | null
  experience_max: number | null
  salary_min: number | null
  salary_max: number | null
  categories: string[]
  skills: string[]
  description: string
  posted_at: string | null
  expires_at: string | null
  raw_data: Record<string, unknown>
}

export interface CrawlerResult {
  source: JobSource
  jobs_found: number
  jobs_created: number
  jobs_updated: number
  errors: string[]
}

export interface CrawlerConfig {
  source: JobSource
  enabled: boolean
  interval_minutes: number
}
