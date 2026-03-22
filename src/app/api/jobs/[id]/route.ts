import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createUntypedServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * GET /api/jobs/[id]
 * Return a single job posting with full details including
 * company info, all sources, and linked skills.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    )
  }

  try {
    const supabase = createUntypedServerClient()

    const { data: job, error } = await supabase
      .from('job_postings')
      .select(
        `
        id,
        title,
        company_id,
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
        industry,
        description,
        description_summary,
        posted_at,
        expires_at,
        first_scraped_at,
        last_scraped_at,
        is_active,
        created_at,
        updated_at,
        companies (
          id,
          name,
          logo_url,
          industry,
          company_size,
          website_url
        ),
        job_posting_sources (
          id,
          source,
          source_id,
          source_url,
          scraped_at
        ),
        job_skills (
          skill_id,
          skills (
            id,
            name,
            category
          )
        )
        `
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error(`[api/jobs/${id}] Query error:`, error.message)
      return NextResponse.json(
        { error: 'Failed to fetch job posting' },
        { status: 500 }
      )
    }

    if (!job) {
      return NextResponse.json(
        { error: 'Job posting not found' },
        { status: 404 }
      )
    }

    const jobData = job as any

    // Flatten the response for cleaner API output
    const companyArr = jobData.companies ?? []
    const company = Array.isArray(companyArr) ? companyArr[0] ?? null : companyArr

    const sources = (jobData.job_posting_sources ?? []).map((s: any) => ({
      id: s.id,
      source: s.source,
      source_id: s.source_id,
      source_url: s.source_url,
      scraped_at: s.scraped_at,
    }))

    const skills = (jobData.job_skills ?? [])
      .map((js: any) => {
        const sk = Array.isArray(js.skills) ? js.skills[0] : js.skills
        return sk ? { id: sk.id, name: sk.name, category: sk.category } : null
      })
      .filter(Boolean)

    const result = {
      id: jobData.id,
      title: jobData.title,
      company_name: jobData.company_name,
      company: company
        ? {
            id: company.id,
            name: company.name,
            logo_url: company.logo_url,
            industry: company.industry,
            company_size: company.company_size,
            website_url: company.website_url,
          }
        : null,
      location_city: jobData.location_city,
      location_district: jobData.location_district,
      location_full: jobData.location_full,
      job_type: jobData.job_type,
      experience_min: jobData.experience_min,
      experience_max: jobData.experience_max,
      salary_min: jobData.salary_min,
      salary_max: jobData.salary_max,
      categories: jobData.categories,
      industry: jobData.industry,
      description: jobData.description,
      description_summary: jobData.description_summary,
      posted_at: jobData.posted_at,
      expires_at: jobData.expires_at,
      first_scraped_at: jobData.first_scraped_at,
      last_scraped_at: jobData.last_scraped_at,
      is_active: jobData.is_active,
      sources,
      skills,
      created_at: jobData.created_at,
      updated_at: jobData.updated_at,
    }

    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[api/jobs/${id}] Unexpected error:`, message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
