import { BaseCrawler } from '@/lib/crawler/base-crawler'
import type { CrawledJob } from '@/lib/crawler/types'

const SARAMIN_API_BASE = 'https://oapi.saramin.co.kr/recruit'

/** Maximum number of pages to fetch per crawl run. */
const MAX_PAGES = 10
const PAGE_SIZE = 110 // Saramin max per page

interface SaraminResponse {
  jobs?: {
    count?: number
    start?: number
    total?: string
    job?: SaraminJob[]
  }
}

interface SaraminJob {
  id: string
  url: string
  active: string
  company: {
    detail: {
      name: string
      href?: string
      industry?: {
        code?: string
        name?: string
      }[]
    }
  }
  position: {
    title: string
    industry?: {
      code?: string
      name?: string
    }
    location?: {
      code?: string
      name?: string
    }
    'job-type'?: {
      code?: string
      name?: string
    }
    'job-mid-code'?: {
      code?: string
      name?: string
    }
    'experience-level'?: {
      code: string
      min: number
      max: number
      name?: string
    }
    'required-education-level'?: {
      code?: string
      name?: string
    }
  }
  keyword?: string
  salary?: {
    code?: string
    name?: string
  }
  'posting-timestamp'?: string
  'modification-timestamp'?: string
  'opening-timestamp'?: string
  'expiration-timestamp'?: string
  'close-type'?: {
    code?: string
    name?: string
  }
}

export class SaraminCrawler extends BaseCrawler {
  private readonly apiKey: string

  constructor() {
    super('saramin')

    const key = process.env.SARAMIN_API_KEY
    if (!key) {
      throw new Error('SARAMIN_API_KEY environment variable is not set')
    }
    this.apiKey = key
  }

  async crawl(): Promise<CrawledJob[]> {
    const jobs: CrawledJob[] = []

    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const url = new URL(SARAMIN_API_BASE)
        url.searchParams.set('access-key', this.apiKey)
        url.searchParams.set('job_type', '1') // Full-time by default
        url.searchParams.set('count', String(PAGE_SIZE))
        url.searchParams.set('start', String(page))
        url.searchParams.set('sort', 'pd') // Sort by posting date
        url.searchParams.set('sr', 'directhire')

        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'JobRadar-Crawler/1.0',
          },
        })

        if (!response.ok) {
          console.warn(`[saramin] API returned ${response.status} at page ${page}`)
          break
        }

        const body: SaraminResponse = await response.json()
        const items = body.jobs?.job

        if (!items || items.length === 0) {
          break
        }

        for (const item of items) {
          try {
            const crawledJob = this.mapToJob(item)
            jobs.push(crawledJob)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.warn(`[saramin] Failed to parse job id=${item?.id}: ${msg}`)
          }
        }

        // If we got fewer items than requested, we reached the last page
        const total = parseInt(body.jobs?.total ?? '0', 10)
        const fetched = (page + 1) * PAGE_SIZE
        if (fetched >= total) {
          break
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[saramin] Pagination error at page ${page}: ${msg}`)
        break
      }
    }

    return jobs
  }

  private mapToJob(item: SaraminJob): CrawledJob {
    const position = item.position
    const locationName = position.location?.name ?? null
    const { city, district } = this.parseLocation(locationName)

    // Parse experience level
    const expLevel = position['experience-level']
    const experienceMin = expLevel?.min ?? null
    const experienceMax = expLevel?.max ?? null

    // Parse salary range from salary name (e.g., "3,000~4,000만원")
    const { salaryMin, salaryMax } = this.parseSalary(item.salary?.name ?? null)

    // Map job type
    const jobType = this.mapJobType(position['job-type']?.name ?? null)

    // Extract keywords/skills
    const skills = item.keyword
      ? item.keyword.split(',').map((k) => k.trim()).filter(Boolean)
      : []

    // Build categories from industry info
    const categories: string[] = []
    if (position.industry?.name) {
      categories.push(position.industry.name)
    }
    if (position['job-mid-code']?.name) {
      categories.push(position['job-mid-code'].name)
    }

    // Convert timestamps to ISO
    const postedAt = item['posting-timestamp']
      ? new Date(parseInt(item['posting-timestamp'], 10) * 1000).toISOString()
      : null
    const expiresAt = item['expiration-timestamp']
      ? new Date(parseInt(item['expiration-timestamp'], 10) * 1000).toISOString()
      : null

    return {
      source: 'saramin',
      source_id: item.id,
      source_url: item.url,
      title: position.title,
      company_name: item.company.detail.name,
      location_full: locationName,
      location_city: city,
      location_district: district,
      job_type: jobType,
      experience_min: experienceMin,
      experience_max: experienceMax,
      salary_min: salaryMin,
      salary_max: salaryMax,
      categories,
      skills,
      description: '', // Saramin list API does not include full description
      posted_at: postedAt,
      expires_at: expiresAt,
      raw_data: item as unknown as Record<string, unknown>,
    }
  }

  /**
   * Parse a Saramin location string like "서울 > 강남구" into city and district.
   */
  private parseLocation(location: string | null): {
    city: string | null
    district: string | null
  } {
    if (!location) return { city: null, district: null }

    const parts = location.split('>').map((p) => p.trim())
    return {
      city: parts[0] ?? null,
      district: parts[1] ?? null,
    }
  }

  /**
   * Parse a salary string like "3,000~4,000만원" into min/max numbers (in 만원).
   */
  private parseSalary(salaryStr: string | null): {
    salaryMin: number | null
    salaryMax: number | null
  } {
    if (!salaryStr) return { salaryMin: null, salaryMax: null }

    const cleaned = salaryStr.replace(/,/g, '').replace(/만\s*원/g, '')
    const match = cleaned.match(/(\d+)\s*~\s*(\d+)/)
    if (match) {
      return {
        salaryMin: parseInt(match[1], 10),
        salaryMax: parseInt(match[2], 10),
      }
    }

    // Single value (e.g., "3000만원 이상")
    const single = cleaned.match(/(\d+)/)
    if (single) {
      return {
        salaryMin: parseInt(single[1], 10),
        salaryMax: null,
      }
    }

    return { salaryMin: null, salaryMax: null }
  }

  /**
   * Map Saramin job type names to our standardized JobType values.
   */
  private mapJobType(name: string | null): string | null {
    if (!name) return null

    const normalized = name.trim()
    if (normalized.includes('정규직')) return 'full-time'
    if (normalized.includes('계약직')) return 'contract'
    if (normalized.includes('인턴')) return 'intern'
    if (normalized.includes('프리랜서')) return 'freelance'

    return 'unknown'
  }
}
