import { createClient } from '@supabase/supabase-js'
import { generateDeduplicationHash, normalizeCompanyName } from '@/lib/utils/hash'
import type { JobSource, JobType } from '@/types/database'
import type { CrawledJob, CrawlerResult } from '@/lib/crawler/types'

function createUntypedServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * Abstract base class for all job crawlers.
 * Subclasses must implement the `crawl()` method to fetch jobs from a source.
 */
export abstract class BaseCrawler {
  protected readonly source: JobSource

  constructor(source: JobSource) {
    this.source = source
  }

  /** Fetch jobs from the external source. */
  abstract crawl(): Promise<CrawledJob[]>

  /**
   * Orchestrates a full crawl cycle:
   * 1. Records a crawler_runs entry (status=running)
   * 2. Calls crawl() to fetch jobs
   * 3. Upserts jobs into the database
   * 4. Updates the crawler_runs entry with final status
   */
  async run(): Promise<CrawlerResult> {
    const supabase = createUntypedServerClient()
    const result: CrawlerResult = {
      source: this.source,
      jobs_found: 0,
      jobs_created: 0,
      jobs_updated: 0,
      errors: [],
    }

    // Insert a crawler_runs record to track this run
    const { data: runRecord, error: runError } = await supabase
      .from('crawler_runs')
      .insert({ source: this.source, status: 'running' as const })
      .select('id')
      .single()

    if (runError) {
      console.error(`[${this.source}] Failed to create crawler run record:`, runError.message)
    }

    try {
      const jobs = await this.crawl()
      result.jobs_found = jobs.length

      const saveResult = await this.saveJobs(jobs)
      result.jobs_created = saveResult.created
      result.jobs_updated = saveResult.updated
      result.errors = saveResult.errors

      // Mark crawler run as completed
      if (runRecord?.id) {
        await supabase
          .from('crawler_runs')
          .update({
            status: 'completed' as const,
            jobs_found: result.jobs_found,
            jobs_created: result.jobs_created,
            jobs_updated: result.jobs_updated,
            error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', runRecord.id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      result.errors.push(errorMessage)
      console.error(`[${this.source}] Crawl failed:`, errorMessage)

      // Mark crawler run as failed
      if (runRecord?.id) {
        await supabase
          .from('crawler_runs')
          .update({
            status: 'failed' as const,
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('id', runRecord.id)
      }
    }

    return result
  }

  /**
   * Persists crawled jobs into the database.
   * - Generates a deduplication hash per job
   * - Upserts into `job_postings` (keyed by deduplication_hash)
   * - Inserts into `job_posting_sources` (on conflict do nothing)
   * - Links skills from the `skills` table
   */
  private async saveJobs(
    jobs: CrawledJob[]
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const supabase = createUntypedServerClient()
    let created = 0
    let updated = 0
    const errors: string[] = []

    // Pre-fetch all known skills for efficient matching
    const { data: allSkills } = await supabase
      .from('skills')
      .select('id, name_lower')

    const skillMap = new Map<string, string>()
    if (allSkills) {
      for (const skill of allSkills) {
        skillMap.set(skill.name_lower, skill.id)
      }
    }

    for (const job of jobs) {
      try {
        const deduplicationHash = generateDeduplicationHash(
          job.company_name,
          job.title,
          job.location_full
        )

        const normalizedName = normalizeCompanyName(job.company_name)

        // Try to find an existing company by normalized name
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('name_normalized', normalizedName)
          .limit(1)
          .maybeSingle()

        // If no company exists, create one
        let companyId: string | null = existingCompany?.id ?? null
        if (!companyId) {
          const { data: newCompany } = await supabase
            .from('companies')
            .insert({
              name: job.company_name,
              name_normalized: normalizedName,
            })
            .select('id')
            .single()

          companyId = newCompany?.id ?? null
        }

        // Check if this job already exists
        const { data: existingJob } = await supabase
          .from('job_postings')
          .select('id')
          .eq('deduplication_hash', deduplicationHash)
          .maybeSingle()

        const jobType: JobType = isValidJobType(job.job_type) ? job.job_type : 'unknown'
        const now = new Date().toISOString()

        let jobPostingId: string

        if (existingJob) {
          // Update the existing posting
          const { error: updateError } = await supabase
            .from('job_postings')
            .update({
              title: job.title,
              company_id: companyId,
              company_name: job.company_name,
              location_full: job.location_full,
              location_city: job.location_city,
              location_district: job.location_district,
              job_type: jobType,
              experience_min: job.experience_min,
              experience_max: job.experience_max,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              categories: job.categories,
              description: job.description,
              posted_at: job.posted_at,
              expires_at: job.expires_at,
              last_scraped_at: now,
              is_active: true,
            })
            .eq('id', existingJob.id)

          if (updateError) {
            errors.push(`Update failed for "${job.title}": ${updateError.message}`)
            continue
          }

          jobPostingId = existingJob.id
          updated++
        } else {
          // Insert a new posting
          const { data: newPosting, error: insertError } = await supabase
            .from('job_postings')
            .insert({
              title: job.title,
              company_id: companyId,
              company_name: job.company_name,
              location_full: job.location_full,
              location_city: job.location_city,
              location_district: job.location_district,
              job_type: jobType,
              experience_min: job.experience_min,
              experience_max: job.experience_max,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              categories: job.categories,
              description: job.description,
              posted_at: job.posted_at,
              expires_at: job.expires_at,
              deduplication_hash: deduplicationHash,
              first_scraped_at: now,
              last_scraped_at: now,
              is_active: true,
            })
            .select('id')
            .single()

          if (insertError || !newPosting) {
            errors.push(`Insert failed for "${job.title}": ${insertError?.message}`)
            continue
          }

          jobPostingId = newPosting.id
          created++
        }

        // Insert source record (on conflict do nothing via upsert-like approach)
        await supabase
          .from('job_posting_sources')
          .upsert(
            {
              job_posting_id: jobPostingId,
              source: job.source,
              source_id: job.source_id,
              source_url: job.source_url,
              raw_data: job.raw_data as Record<string, unknown>,
              scraped_at: now,
            },
            { onConflict: 'job_posting_id,source', ignoreDuplicates: true }
          )

        // Link skills from the skills table
        await this.linkSkills(jobPostingId, job.skills, skillMap)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Error processing "${job.title}": ${msg}`)
      }
    }

    return { created, updated, errors }
  }

  /**
   * Match crawled skill names against the `skills` table and insert
   * corresponding `job_skills` rows.
   */
  private async linkSkills(
    jobPostingId: string,
    skillNames: string[],
    skillMap: Map<string, string>
  ): Promise<void> {
    if (skillNames.length === 0) return

    const supabase = createUntypedServerClient()

    // Collect matching skill IDs
    const matchedSkillIds: string[] = []
    for (const name of skillNames) {
      const normalized = name.trim().toLowerCase()
      const skillId = skillMap.get(normalized)
      if (skillId) {
        matchedSkillIds.push(skillId)
      }
    }

    if (matchedSkillIds.length === 0) return

    // Remove existing skill links for this job and re-insert
    await supabase
      .from('job_skills')
      .delete()
      .eq('job_posting_id', jobPostingId)

    const rows = matchedSkillIds.map((skillId) => ({
      job_posting_id: jobPostingId,
      skill_id: skillId,
    }))

    await supabase.from('job_skills').insert(rows)
  }
}

const VALID_JOB_TYPES = new Set(['full-time', 'contract', 'intern', 'freelance', 'unknown'])

function isValidJobType(value: string | null): value is JobType {
  return value !== null && VALID_JOB_TYPES.has(value)
}
