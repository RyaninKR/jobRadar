import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { JobSource, JobType } from '@/types/database'

function createUntypedServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const VALID_SOURCES: JobSource[] = ['wanted', 'saramin', 'jobkorea', 'jobplanet']
const VALID_JOB_TYPES: JobType[] = ['full-time', 'contract', 'intern', 'freelance', 'unknown']
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * GET /api/jobs
 * List job postings with filtering, pagination, and search.
 *
 * Query params:
 *   q              - full-text search across title, company_name, description
 *   source         - filter by job source
 *   job_type       - filter by job type
 *   location       - filter by location (partial match on location_full)
 *   skill          - filter by skill name
 *   experience_min - minimum experience years
 *   experience_max - maximum experience years
 *   salary_min     - minimum salary
 *   salary_max     - maximum salary
 *   page           - page number (1-based)
 *   limit          - items per page (max 100)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Parse pagination
  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE)
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  )
  const offset = (page - 1) * limit

  // Parse filters
  const q = searchParams.get('q')?.trim() || null
  const source = searchParams.get('source') as JobSource | null
  const jobType = searchParams.get('job_type') as JobType | null
  const location = searchParams.get('location')?.trim() || null
  const skill = searchParams.get('skill')?.trim() || null
  const experienceMin = parseNumberParam(searchParams.get('experience_min'))
  const experienceMax = parseNumberParam(searchParams.get('experience_max'))
  const salaryMin = parseNumberParam(searchParams.get('salary_min'))
  const salaryMax = parseNumberParam(searchParams.get('salary_max'))

  // Validate enum params
  if (source && !VALID_SOURCES.includes(source)) {
    return NextResponse.json(
      { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` },
      { status: 400 }
    )
  }

  if (jobType && !VALID_JOB_TYPES.includes(jobType)) {
    return NextResponse.json(
      { error: `Invalid job_type. Must be one of: ${VALID_JOB_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const supabase = createUntypedServerClient()

    // Build query for total count and data
    let query = supabase
      .from('job_postings')
      .select(
        `
        id,
        title,
        company_name,
        location_city,
        location_district,
        location_full,
        job_type,
        experience_min,
        experience_max,
        salary_min,
        salary_max,
        categories,
        posted_at,
        is_active,
        created_at,
        job_posting_sources (
          source,
          source_url
        ),
        job_skills (
          skill_id,
          skills (
            id,
            name
          )
        )
        `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('posted_at', { ascending: false, nullsFirst: false })

    // Apply text search
    if (q) {
      query = query.or(`title.ilike.%${q}%,company_name.ilike.%${q}%,description.ilike.%${q}%`)
    }

    // Apply source filter by checking the related job_posting_sources table
    if (source) {
      query = query.eq('job_posting_sources.source', source)
    }

    // Apply job type filter
    if (jobType) {
      query = query.eq('job_type', jobType)
    }

    // Apply location filter (partial match)
    if (location) {
      query = query.ilike('location_full', `%${location}%`)
    }

    // Apply experience filters
    if (experienceMin !== null) {
      query = query.gte('experience_min', experienceMin)
    }
    if (experienceMax !== null) {
      query = query.lte('experience_max', experienceMax)
    }

    // Apply salary filters
    if (salaryMin !== null) {
      query = query.gte('salary_min', salaryMin)
    }
    if (salaryMax !== null) {
      query = query.lte('salary_max', salaryMax)
    }

    // Apply skill filter via inner join filtering
    if (skill) {
      query = query.ilike('job_skills.skills.name', skill)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('[api/jobs] Query error:', error.message)
      return NextResponse.json(
        { error: 'Failed to fetch job postings' },
        { status: 500 }
      )
    }

    // Transform the response to flatten nested data
    const jobs = (data ?? []).map((job: any) => ({
      id: job.id,
      title: job.title,
      company_name: job.company_name,
      location_city: job.location_city,
      location_district: job.location_district,
      location_full: job.location_full,
      job_type: job.job_type,
      experience_min: job.experience_min,
      experience_max: job.experience_max,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      categories: job.categories,
      posted_at: job.posted_at,
      is_active: job.is_active,
      sources: (job.job_posting_sources ?? []).map((s: any) => ({
        source: s.source,
        source_url: s.source_url,
      })),
      skills: (job.job_skills ?? [])
        .map((js: any) => {
          const sk = Array.isArray(js.skills) ? js.skills[0] : js.skills
          return sk?.name
        })
        .filter(Boolean),
    }))

    const totalCount = count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: jobs,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/jobs] Unexpected error:', message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function parseNumberParam(value: string | null): number | null {
  if (value === null) return null
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}
