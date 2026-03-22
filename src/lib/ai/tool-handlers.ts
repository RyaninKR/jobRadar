import { createClient } from '@supabase/supabase-js';
import type {
  JobPostingSummary,
  JobPostingDetail,
  TrendAnalysis,
  AlertFrequency,
  Json,
} from '@/types/database';

function createUntypedServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchJobsInput {
  query: string;
  filters?: {
    sources?: string[];
    job_types?: string[];
    locations?: string[];
    skills?: string[];
    experience_min?: number;
    experience_max?: number;
    salary_min?: number;
    salary_max?: number;
  };
  limit?: number;
}

interface GetJobDetailInput {
  job_id: string;
}

interface AnalyzeTrendInput {
  skill: string;
  period: '7d' | '30d' | '90d';
  filters?: {
    locations?: string[];
    job_types?: string[];
  };
}

interface CompareCompaniesInput {
  company_names: string[];
}

interface SetAlertInput {
  name: string;
  conditions: Record<string, unknown>;
  frequency: string;
}

interface ToolContext {
  user_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToDays(period: string): number {
  switch (period) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 30;
  }
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * 채용 공고 검색
 */
export async function handleSearchJobs(
  input: SearchJobsInput,
): Promise<{ results: JobPostingSummary[]; total: number }> {
  const supabase = createUntypedServerClient();
  const limit = input.limit ?? 10;

  let query = supabase
    .from('job_postings')
    .select(
      `
      id,
      title,
      company_name,
      location_city,
      location_district,
      job_type,
      experience_min,
      experience_max,
      salary_min,
      salary_max,
      categories,
      posted_at,
      is_active,
      job_skills (
        skill_id,
        skills:skill_id ( name )
      ),
      job_posting_sources (
        source,
        source_url
      )
    `,
    )
    .eq('is_active', true)
    .order('posted_at', { ascending: false })
    .limit(limit);

  // Text search on title
  if (input.query) {
    query = query.ilike('title', `%${input.query}%`);
  }

  // Apply filters
  const f = input.filters;
  if (f) {
    if (f.job_types && f.job_types.length > 0) {
      query = query.in('job_type', f.job_types);
    }
    if (f.locations && f.locations.length > 0) {
      query = query.in('location_city', f.locations);
    }
    if (f.experience_min !== undefined) {
      query = query.gte('experience_min', f.experience_min);
    }
    if (f.experience_max !== undefined) {
      query = query.lte('experience_max', f.experience_max);
    }
    if (f.salary_min !== undefined) {
      query = query.gte('salary_min', f.salary_min);
    }
    if (f.salary_max !== undefined) {
      query = query.lte('salary_max', f.salary_max);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`채용 공고 검색 실패: ${error.message}`);
  }

  const results: JobPostingSummary[] = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    company_name: row.company_name,
    location_city: row.location_city,
    location_district: row.location_district,
    job_type: row.job_type,
    experience_min: row.experience_min,
    experience_max: row.experience_max,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    categories: row.categories ?? [],
    skills: (row.job_skills ?? [])
      .map((js: any) => js.skills?.name)
      .filter(Boolean) as string[],
    sources: (row.job_posting_sources ?? []).map(
      (s: any) => ({ source: s.source, source_url: s.source_url }),
    ),
    posted_at: row.posted_at,
    is_saved: false,
  }));

  // Post-filter by skills if specified (join-based filtering is complex in Supabase)
  let filtered = results;
  if (f?.skills && f.skills.length > 0) {
    const skillsLower = f.skills.map((s) => s.toLowerCase());
    filtered = results.filter((r) =>
      r.skills.some((s) => skillsLower.includes(s.toLowerCase())),
    );
  }

  return { results: filtered, total: filtered.length };
}

/**
 * 특정 공고 상세 조회
 */
export async function handleGetJobDetail(
  input: GetJobDetailInput,
): Promise<JobPostingDetail | null> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('job_postings')
    .select(
      `
      *,
      companies:company_id (
        id,
        logo_url,
        company_size,
        industry
      ),
      job_skills (
        skill_id,
        skills:skill_id ( name )
      ),
      job_posting_sources (
        source,
        source_url
      )
    `,
    )
    .eq('id', input.job_id)
    .single();

  if (error) {
    throw new Error(`공고 상세 조회 실패: ${error.message}`);
  }

  if (!data) return null;

  const row = data as any;
  const company = row.companies;

  return {
    id: row.id,
    title: row.title,
    company_name: row.company_name,
    company_id: row.company_id,
    company_logo_url: company?.logo_url ?? null,
    company_size: company?.company_size ?? null,
    company_industry: company?.industry ?? null,
    location_city: row.location_city,
    location_district: row.location_district,
    job_type: row.job_type,
    experience_min: row.experience_min,
    experience_max: row.experience_max,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    categories: row.categories ?? [],
    description: row.description,
    description_summary: row.description_summary,
    expires_at: row.expires_at,
    skills: (row.job_skills ?? [])
      .map((js: any) => js.skills?.name)
      .filter(Boolean) as string[],
    sources: (row.job_posting_sources ?? []).map(
      (s: any) => ({ source: s.source, source_url: s.source_url }),
    ),
    posted_at: row.posted_at,
    is_saved: false,
  };
}

/**
 * 트렌드 분석
 */
export async function handleAnalyzeTrend(
  input: AnalyzeTrendInput,
): Promise<TrendAnalysis> {
  const supabase = createUntypedServerClient();
  const days = periodToDays(input.period);
  const sinceDate = dateNDaysAgo(days);
  const previousSinceDate = dateNDaysAgo(days * 2);

  // Current period jobs matching the skill/category
  let currentQuery = supabase
    .from('job_postings')
    .select('id, company_name, salary_min, salary_max, posted_at, categories')
    .eq('is_active', true)
    .gte('posted_at', sinceDate)
    .or(
      `title.ilike.%${input.skill}%,categories.cs.{${input.skill}}`,
    );

  if (input.filters?.locations && input.filters.locations.length > 0) {
    currentQuery = currentQuery.in('location_city', input.filters.locations);
  }
  if (input.filters?.job_types && input.filters.job_types.length > 0) {
    currentQuery = currentQuery.in('job_type', input.filters.job_types);
  }

  const { data: currentData, error: currentError } = await currentQuery;

  if (currentError) {
    throw new Error(`트렌드 분석 실패: ${currentError.message}`);
  }

  const currentJobs = currentData ?? [];

  // Previous period for comparison
  let prevQuery = supabase
    .from('job_postings')
    .select('id')
    .eq('is_active', true)
    .gte('posted_at', previousSinceDate)
    .lt('posted_at', sinceDate)
    .or(
      `title.ilike.%${input.skill}%,categories.cs.{${input.skill}}`,
    );

  if (input.filters?.locations && input.filters.locations.length > 0) {
    prevQuery = prevQuery.in('location_city', input.filters.locations);
  }

  const { data: prevData } = await prevQuery;
  const prevCount = prevData?.length ?? 0;

  // Compute stats
  const totalJobs = currentJobs.length;
  const changePercent =
    prevCount > 0
      ? Math.round(((totalJobs - prevCount) / prevCount) * 100)
      : totalJobs > 0
        ? 100
        : 0;

  // Top companies
  const companyMap = new Map<string, number>();
  for (const job of currentJobs) {
    const name = job.company_name;
    companyMap.set(name, (companyMap.get(name) ?? 0) + 1);
  }
  const topCompanies = Array.from(companyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Salary stats
  const salaries = currentJobs
    .flatMap((j) => [j.salary_min, j.salary_max])
    .filter((v): v is number => v !== null && v > 0);

  const salaryRange =
    salaries.length > 0
      ? {
          min: Math.min(...salaries),
          max: Math.max(...salaries),
          avg: Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length),
        }
      : { min: 0, max: 0, avg: 0 };

  // Daily counts
  const dailyMap = new Map<string, number>();
  for (const job of currentJobs) {
    if (job.posted_at) {
      const date = job.posted_at.slice(0, 10);
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
    }
  }
  const dailyCounts = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  return {
    period: input.period,
    total_jobs: totalJobs,
    change_percent: changePercent,
    top_companies: topCompanies,
    salary_range: salaryRange,
    daily_counts: dailyCounts,
  };
}

/**
 * 기업 채용 비교
 */
export async function handleCompareCompanies(
  input: CompareCompaniesInput,
): Promise<{
  companies: {
    name: string;
    total_postings: number;
    active_postings: number;
    salary_range: { min: number; max: number; avg: number };
    common_skills: string[];
    job_types: { type: string; count: number }[];
  }[];
}> {
  const supabase = createUntypedServerClient();
  const results = [];

  for (const companyName of input.company_names) {
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select(
        `
        id,
        job_type,
        salary_min,
        salary_max,
        is_active,
        job_skills (
          skill_id,
          skills:skill_id ( name )
        )
      `,
      )
      .ilike('company_name', `%${companyName}%`);

    if (error) {
      throw new Error(`기업 비교 실패 (${companyName}): ${error.message}`);
    }

    const allJobs = jobs ?? [];
    const activeJobs = allJobs.filter((j) => j.is_active);

    // Salary stats
    const salaries = allJobs
      .flatMap((j) => [j.salary_min, j.salary_max])
      .filter((v): v is number => v !== null && v > 0);

    const salaryRange =
      salaries.length > 0
        ? {
            min: Math.min(...salaries),
            max: Math.max(...salaries),
            avg: Math.round(
              salaries.reduce((a, b) => a + b, 0) / salaries.length,
            ),
          }
        : { min: 0, max: 0, avg: 0 };

    // Skill frequency
    const skillCount = new Map<string, number>();
    for (const job of allJobs) {
      const jobSkills = (job as any).job_skills ?? [];
      for (const js of jobSkills) {
        const name = (js as any).skills?.name;
        if (name) {
          skillCount.set(name, (skillCount.get(name) ?? 0) + 1);
        }
      }
    }
    const commonSkills = Array.from(skillCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    // Job type distribution
    const typeCount = new Map<string, number>();
    for (const job of allJobs) {
      typeCount.set(job.job_type, (typeCount.get(job.job_type) ?? 0) + 1);
    }
    const jobTypes = Array.from(typeCount.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    results.push({
      name: companyName,
      total_postings: allJobs.length,
      active_postings: activeJobs.length,
      salary_range: salaryRange,
      common_skills: commonSkills,
      job_types: jobTypes,
    });
  }

  return { companies: results };
}

/**
 * 알림 설정
 */
export async function handleSetAlert(
  input: SetAlertInput,
  context: ToolContext,
): Promise<{ alert_id: string; message: string }> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('alerts')
    .insert({
      user_id: context.user_id,
      name: input.name,
      conditions: input.conditions as Json,
      frequency: input.frequency as AlertFrequency,
      channel: 'push',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`알림 설정 실패: ${error.message}`);
  }

  return {
    alert_id: data.id,
    message: `"${input.name}" 알림이 성공적으로 설정되었습니다. (빈도: ${input.frequency})`,
  };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export type ToolName =
  | 'search_jobs'
  | 'get_job_detail'
  | 'analyze_trend'
  | 'compare_companies'
  | 'set_alert';

/**
 * 도구 이름에 따라 적절한 핸들러로 디스패치합니다.
 */
export async function dispatchToolCall(
  toolName: ToolName,
  toolInput: Record<string, unknown>,
  context: ToolContext,
): Promise<unknown> {
  switch (toolName) {
    case 'search_jobs':
      return handleSearchJobs(toolInput as unknown as SearchJobsInput);
    case 'get_job_detail':
      return handleGetJobDetail(toolInput as unknown as GetJobDetailInput);
    case 'analyze_trend':
      return handleAnalyzeTrend(toolInput as unknown as AnalyzeTrendInput);
    case 'compare_companies':
      return handleCompareCompanies(
        toolInput as unknown as CompareCompaniesInput,
      );
    case 'set_alert':
      return handleSetAlert(toolInput as unknown as SetAlertInput, context);
    default:
      throw new Error(`알 수 없는 도구: ${toolName}`);
  }
}
