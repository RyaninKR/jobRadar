-- ============================================================
-- JobRadar: 채용 모니터링 대시보드 스키마
-- ============================================================

-- Enable pgvector for embedding search
create extension if not exists "vector";

-- ============================================================
-- 1. companies: 기업 정보
-- ============================================================
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  name_normalized text not null,  -- 검색용 정규화 이름 (소문자, 공백 제거)
  logo_url text,
  industry text,
  company_size text check (company_size in ('startup', 'sme', 'midsize', 'enterprise', 'unknown')),
  website_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(name_normalized)
);

create trigger set_companies_updated_at
  before update on public.companies
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 2. skills: 기술 스택 마스터
-- ============================================================
create table public.skills (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,          -- 정규화된 이름 (e.g. "React", "TypeScript")
  name_lower text not null unique,    -- 소문자 검색용
  category text,                      -- e.g. "frontend", "backend", "devops", "data"
  created_at timestamptz default now() not null
);

-- ============================================================
-- 3. job_postings: 채용 공고 (정규화 통합)
-- ============================================================
create table public.job_postings (
  id uuid default gen_random_uuid() primary key,

  -- 기본 정보
  title text not null,
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null,           -- 비정규화 (조인 없이 빠른 조회)

  -- 위치
  location_city text,                   -- 시/도 (e.g. "서울", "경기")
  location_district text,               -- 구/군 (e.g. "강남구", "성남시")
  location_full text,                   -- 전체 주소 원문

  -- 조건
  job_type text default 'full-time' check (job_type in ('full-time', 'contract', 'intern', 'freelance', 'unknown')),
  experience_min int,                   -- 최소 경력 (년), null = 무관
  experience_max int,                   -- 최대 경력 (년), null = 무관
  salary_min int,                       -- 최소 연봉 (만원)
  salary_max int,                       -- 최대 연봉 (만원)

  -- 분류
  categories text[] default '{}',       -- 직무 카테고리 배열
  industry text,

  -- 상세
  description text not null default '',
  description_summary text,             -- AI 요약

  -- 벡터 검색
  description_embedding vector(1536),   -- OpenAI text-embedding-3-small 크기

  -- 타임스탬프
  posted_at timestamptz,
  expires_at timestamptz,
  first_scraped_at timestamptz default now() not null,
  last_scraped_at timestamptz default now() not null,

  -- 상태
  is_active boolean default true not null,

  -- 중복 제거
  deduplication_hash text not null,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger set_job_postings_updated_at
  before update on public.job_postings
  for each row execute function public.handle_updated_at();

-- 인덱스
create index job_postings_company_id_idx on public.job_postings(company_id);
create index job_postings_company_name_idx on public.job_postings(company_name);
create index job_postings_location_city_idx on public.job_postings(location_city);
create index job_postings_job_type_idx on public.job_postings(job_type);
create index job_postings_is_active_idx on public.job_postings(is_active);
create index job_postings_posted_at_idx on public.job_postings(posted_at desc);
create index job_postings_dedup_hash_idx on public.job_postings(deduplication_hash);
create index job_postings_categories_idx on public.job_postings using gin(categories);
create index job_postings_experience_idx on public.job_postings(experience_min, experience_max);
create index job_postings_salary_idx on public.job_postings(salary_min, salary_max);

-- 벡터 검색 인덱스 (IVFFlat - 데이터 1000건 이상일 때 활성화 권장)
-- create index job_postings_embedding_idx on public.job_postings
--   using ivfflat (description_embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- 4. job_posting_sources: 공고별 원본 출처 (멀티 플랫폼)
-- ============================================================
create table public.job_posting_sources (
  id uuid default gen_random_uuid() primary key,
  job_posting_id uuid references public.job_postings(id) on delete cascade not null,
  source text not null check (source in ('wanted', 'jobkorea', 'saramin', 'jobplanet')),
  source_id text not null,             -- 원본 플랫폼 내 ID
  source_url text not null,            -- 원본 공고 링크
  raw_data jsonb,                      -- 원본 응답 (디버깅용)
  scraped_at timestamptz default now() not null,

  unique(source, source_id)
);

create index job_posting_sources_posting_id_idx on public.job_posting_sources(job_posting_id);
create index job_posting_sources_source_idx on public.job_posting_sources(source);

-- ============================================================
-- 5. job_skills: 공고-기술스택 매핑
-- ============================================================
create table public.job_skills (
  job_posting_id uuid references public.job_postings(id) on delete cascade not null,
  skill_id uuid references public.skills(id) on delete cascade not null,
  primary key (job_posting_id, skill_id)
);

create index job_skills_skill_id_idx on public.job_skills(skill_id);

-- ============================================================
-- 6. user_profiles: 사용자 프로필
-- ============================================================
create table public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  preferred_roles text[] default '{}',       -- 관심 직무
  preferred_skills text[] default '{}',      -- 보유/관심 기술
  preferred_locations text[] default '{}',   -- 선호 지역
  salary_min int,                            -- 희망 최소 연봉 (만원)
  salary_max int,                            -- 희망 최대 연봉 (만원)
  experience_years int,                      -- 경력 연수
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 7. saved_jobs: 북마크
-- ============================================================
create table public.saved_jobs (
  user_id uuid references auth.users(id) on delete cascade not null,
  job_posting_id uuid references public.job_postings(id) on delete cascade not null,
  note text,
  created_at timestamptz default now() not null,
  primary key (user_id, job_posting_id)
);

-- ============================================================
-- 8. alerts: 알림 설정
-- ============================================================
create table public.alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  conditions jsonb not null default '{}',   -- 필터 조건 JSON
  frequency text default 'daily' check (frequency in ('realtime', 'daily', 'weekly')),
  channel text default 'email' check (channel in ('email', 'push', 'both')),
  is_active boolean default true not null,
  last_triggered_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger set_alerts_updated_at
  before update on public.alerts
  for each row execute function public.handle_updated_at();

create index alerts_user_id_idx on public.alerts(user_id);
create index alerts_is_active_idx on public.alerts(is_active);

-- ============================================================
-- 9. chat_sessions: AI 대화 세션
-- ============================================================
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create trigger set_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.handle_updated_at();

create index chat_sessions_user_id_idx on public.chat_sessions(user_id);

-- ============================================================
-- 10. chat_messages: 대화 메시지
-- ============================================================
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_calls jsonb,                     -- 에이전트 도구 호출 기록
  metadata jsonb,                       -- 추가 메타데이터 (차트 데이터 등)
  created_at timestamptz default now() not null
);

create index chat_messages_session_id_idx on public.chat_messages(session_id);
create index chat_messages_created_at_idx on public.chat_messages(created_at);

-- ============================================================
-- 11. crawler_runs: 크롤러 실행 기록
-- ============================================================
create table public.crawler_runs (
  id uuid default gen_random_uuid() primary key,
  source text not null check (source in ('wanted', 'jobkorea', 'saramin', 'jobplanet')),
  status text default 'running' check (status in ('running', 'completed', 'failed')),
  jobs_found int default 0,
  jobs_created int default 0,
  jobs_updated int default 0,
  error_message text,
  started_at timestamptz default now() not null,
  completed_at timestamptz
);

create index crawler_runs_source_idx on public.crawler_runs(source);
create index crawler_runs_started_at_idx on public.crawler_runs(started_at desc);

-- ============================================================
-- RLS Policies
-- ============================================================

-- companies: 모든 인증 사용자 읽기 가능
alter table public.companies enable row level security;
create policy "Anyone can view companies" on public.companies for select using (true);

-- skills: 모든 인증 사용자 읽기 가능
alter table public.skills enable row level security;
create policy "Anyone can view skills" on public.skills for select using (true);

-- job_postings: 모든 인증 사용자 읽기 가능
alter table public.job_postings enable row level security;
create policy "Anyone can view active jobs" on public.job_postings for select using (is_active = true);

-- job_posting_sources: 모든 인증 사용자 읽기 가능
alter table public.job_posting_sources enable row level security;
create policy "Anyone can view sources" on public.job_posting_sources for select using (true);

-- job_skills: 모든 인증 사용자 읽기 가능
alter table public.job_skills enable row level security;
create policy "Anyone can view job skills" on public.job_skills for select using (true);

-- user_profiles: 본인만 CRUD
alter table public.user_profiles enable row level security;
create policy "Users manage own profile" on public.user_profiles for all using (auth.uid() = id);

-- saved_jobs: 본인만 CRUD
alter table public.saved_jobs enable row level security;
create policy "Users manage own saved jobs" on public.saved_jobs for all using (auth.uid() = user_id);

-- alerts: 본인만 CRUD
alter table public.alerts enable row level security;
create policy "Users manage own alerts" on public.alerts for all using (auth.uid() = user_id);

-- chat_sessions: 본인만 CRUD
alter table public.chat_sessions enable row level security;
create policy "Users manage own sessions" on public.chat_sessions for all using (auth.uid() = user_id);

-- chat_messages: 세션 소유자만
alter table public.chat_messages enable row level security;
create policy "Users view own messages" on public.chat_messages for all
  using (exists (
    select 1 from public.chat_sessions
    where chat_sessions.id = chat_messages.session_id
    and chat_sessions.user_id = auth.uid()
  ));

-- crawler_runs: 읽기만 허용
alter table public.crawler_runs enable row level security;
create policy "Anyone can view crawler runs" on public.crawler_runs for select using (true);

-- ============================================================
-- 초기 기술 스택 데이터 시딩
-- ============================================================
insert into public.skills (name, name_lower, category) values
  -- Frontend
  ('React', 'react', 'frontend'),
  ('Next.js', 'next.js', 'frontend'),
  ('Vue.js', 'vue.js', 'frontend'),
  ('Angular', 'angular', 'frontend'),
  ('Svelte', 'svelte', 'frontend'),
  ('TypeScript', 'typescript', 'frontend'),
  ('JavaScript', 'javascript', 'frontend'),
  ('HTML/CSS', 'html/css', 'frontend'),
  ('Tailwind CSS', 'tailwind css', 'frontend'),
  ('React Native', 'react native', 'mobile'),
  ('Flutter', 'flutter', 'mobile'),
  ('Swift', 'swift', 'mobile'),
  ('Kotlin', 'kotlin', 'mobile'),
  -- Backend
  ('Node.js', 'node.js', 'backend'),
  ('Python', 'python', 'backend'),
  ('Java', 'java', 'backend'),
  ('Spring', 'spring', 'backend'),
  ('Go', 'go', 'backend'),
  ('Rust', 'rust', 'backend'),
  ('C#', 'c#', 'backend'),
  ('.NET', '.net', 'backend'),
  ('PHP', 'php', 'backend'),
  ('Ruby', 'ruby', 'backend'),
  ('Django', 'django', 'backend'),
  ('FastAPI', 'fastapi', 'backend'),
  ('NestJS', 'nestjs', 'backend'),
  ('Express', 'express', 'backend'),
  -- Data
  ('SQL', 'sql', 'data'),
  ('PostgreSQL', 'postgresql', 'data'),
  ('MySQL', 'mysql', 'data'),
  ('MongoDB', 'mongodb', 'data'),
  ('Redis', 'redis', 'data'),
  ('Elasticsearch', 'elasticsearch', 'data'),
  -- DevOps
  ('Docker', 'docker', 'devops'),
  ('Kubernetes', 'kubernetes', 'devops'),
  ('AWS', 'aws', 'devops'),
  ('GCP', 'gcp', 'devops'),
  ('Azure', 'azure', 'devops'),
  ('Terraform', 'terraform', 'devops'),
  ('CI/CD', 'ci/cd', 'devops'),
  ('GitHub Actions', 'github actions', 'devops'),
  -- AI/ML
  ('PyTorch', 'pytorch', 'ai'),
  ('TensorFlow', 'tensorflow', 'ai'),
  ('LLM', 'llm', 'ai'),
  ('Machine Learning', 'machine learning', 'ai'),
  ('Deep Learning', 'deep learning', 'ai'),
  ('NLP', 'nlp', 'ai'),
  ('Computer Vision', 'computer vision', 'ai')
on conflict (name) do nothing;
