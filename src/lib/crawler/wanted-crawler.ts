import { BaseCrawler } from '@/lib/crawler/base-crawler'
import type { CrawledJob } from '@/lib/crawler/types'

const WANTED_API_BASE = 'https://www.wanted.co.kr/api/v4/jobs'

/** Maximum number of pages to fetch per crawl run. */
const MAX_PAGES = 20
const PAGE_SIZE = 20

/**
 * Common Korean tech keywords used to extract skills from job descriptions.
 * Each entry is [keyword, canonical skill name].
 */
const TECH_KEYWORDS: [RegExp, string][] = [
  [/\bReact\b/i, 'React'],
  [/\bReact\s*Native\b/i, 'React Native'],
  [/\bNext\.?js\b/i, 'Next.js'],
  [/\bVue\.?js?\b/i, 'Vue.js'],
  [/\bAngular\b/i, 'Angular'],
  [/\bTypeScript\b/i, 'TypeScript'],
  [/\bJavaScript\b/i, 'JavaScript'],
  [/\bNode\.?js\b/i, 'Node.js'],
  [/\bPython\b/i, 'Python'],
  [/\bJava\b(?!\s*Script)/i, 'Java'],
  [/\bKotlin\b/i, 'Kotlin'],
  [/\bSwift\b/i, 'Swift'],
  [/\bGo\b(?:lang)?/i, 'Go'],
  [/\bRust\b/i, 'Rust'],
  [/\bC\+\+\b/, 'C++'],
  [/\bC#\b/, 'C#'],
  [/\bPHP\b/i, 'PHP'],
  [/\bRuby\b/i, 'Ruby'],
  [/\bFlutter\b/i, 'Flutter'],
  [/\bDocker\b/i, 'Docker'],
  [/\bKubernetes\b/i, 'Kubernetes'],
  [/\bAWS\b/, 'AWS'],
  [/\bGCP\b/, 'GCP'],
  [/\bAzure\b/i, 'Azure'],
  [/\bMySQL\b/i, 'MySQL'],
  [/\bPostgreSQL\b/i, 'PostgreSQL'],
  [/\bMongoDB\b/i, 'MongoDB'],
  [/\bRedis\b/i, 'Redis'],
  [/\bElasticsearch\b/i, 'Elasticsearch'],
  [/\bGraphQL\b/i, 'GraphQL'],
  [/\bREST\s*API\b/i, 'REST API'],
  [/\bSpring\b/i, 'Spring'],
  [/\bDjango\b/i, 'Django'],
  [/\bFastAPI\b/i, 'FastAPI'],
  [/\bTerraform\b/i, 'Terraform'],
  [/\bJenkins\b/i, 'Jenkins'],
  [/\bCI\s*\/?\s*CD\b/i, 'CI/CD'],
  [/\bGit\b(?!Hub|Lab)/i, 'Git'],
  [/\bLinux\b/i, 'Linux'],
  [/\bFigma\b/i, 'Figma'],
  [/\b머신러닝\b/, 'Machine Learning'],
  [/\b딥러닝\b/, 'Deep Learning'],
  [/\bTensorFlow\b/i, 'TensorFlow'],
  [/\bPyTorch\b/i, 'PyTorch'],
]

interface WantedJobResponse {
  data?: WantedJobItem[]
  links?: {
    next?: string
  }
}

interface WantedJobItem {
  id: number
  position: string
  company: {
    id: number
    name: string
    industry_name?: string
  }
  address?: {
    full_location?: string
    country?: string
    location?: string
    district?: string
  }
  category?: {
    id: number
    name: string
  }[]
  reward?: {
    formatted_total?: string
  }
  detail?: {
    requirements?: string
    main_tasks?: string
    intro?: string
    benefits?: string
    preferred_points?: string
  }
  due_time?: string
  created_time?: string
  skill_tags?: { id: number; title: string }[]
}

export class WantedCrawler extends BaseCrawler {
  constructor() {
    super('wanted')
  }

  async crawl(): Promise<CrawledJob[]> {
    const jobs: CrawledJob[] = []
    let offset = 0

    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const url = new URL(WANTED_API_BASE)
        url.searchParams.set('country', 'kr')
        url.searchParams.set('limit', String(PAGE_SIZE))
        url.searchParams.set('offset', String(offset))
        url.searchParams.set('job_sort', 'job.latest_order')

        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'JobRadar-Crawler/1.0',
          },
        })

        if (!response.ok) {
          console.warn(`[wanted] API returned ${response.status} at offset ${offset}`)
          break
        }

        const body: WantedJobResponse = await response.json()
        const items = body.data

        if (!items || items.length === 0) {
          break
        }

        for (const item of items) {
          try {
            const crawledJob = this.mapToJob(item)
            jobs.push(crawledJob)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.warn(`[wanted] Failed to parse job id=${item?.id}: ${msg}`)
          }
        }

        // Stop if there is no next page
        if (!body.links?.next) {
          break
        }

        offset += PAGE_SIZE
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[wanted] Pagination error at offset ${offset}: ${msg}`)
        break
      }
    }

    return jobs
  }

  private mapToJob(item: WantedJobItem): CrawledJob {
    const description = [
      item.detail?.intro,
      item.detail?.main_tasks,
      item.detail?.requirements,
      item.detail?.preferred_points,
      item.detail?.benefits,
    ]
      .filter(Boolean)
      .join('\n\n')

    // Extract skills from API tags + description text matching
    const skills = this.extractSkills(description, item.skill_tags)

    const categories = item.category?.map((c) => c.name) ?? []

    return {
      source: 'wanted',
      source_id: String(item.id),
      source_url: `https://www.wanted.co.kr/wd/${item.id}`,
      title: item.position,
      company_name: item.company.name,
      location_full: item.address?.full_location ?? null,
      location_city: item.address?.location ?? null,
      location_district: item.address?.district ?? null,
      job_type: null,
      experience_min: null,
      experience_max: null,
      salary_min: null,
      salary_max: null,
      categories,
      skills,
      description,
      posted_at: item.created_time ?? null,
      expires_at: item.due_time ?? null,
      raw_data: item as unknown as Record<string, unknown>,
    }
  }

  /**
   * Extract skills by combining explicit API skill_tags with
   * regex-based extraction from the description text.
   */
  private extractSkills(
    description: string,
    skillTags?: { id: number; title: string }[]
  ): string[] {
    const skillSet = new Set<string>()

    // Add explicit skill tags from API response
    if (skillTags) {
      for (const tag of skillTags) {
        skillSet.add(tag.title)
      }
    }

    // Match tech keywords from description text
    for (const [regex, canonical] of TECH_KEYWORDS) {
      if (regex.test(description)) {
        skillSet.add(canonical)
      }
    }

    return Array.from(skillSet)
  }
}
