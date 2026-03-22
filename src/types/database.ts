export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// Enum Types
// ============================================================
export type JobSource = 'wanted' | 'jobkorea' | 'saramin' | 'jobplanet'
export type JobType = 'full-time' | 'contract' | 'intern' | 'freelance' | 'unknown'
export type CompanySize = 'startup' | 'sme' | 'midsize' | 'enterprise' | 'unknown'
export type AlertFrequency = 'realtime' | 'daily' | 'weekly'
export type AlertChannel = 'email' | 'push' | 'both'
export type ChatRole = 'user' | 'assistant' | 'system'
export type CrawlerStatus = 'running' | 'completed' | 'failed'

// ============================================================
// Database Schema Types (Supabase)
// ============================================================
export interface Database {
  public: {
    Tables: {
      work_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          title: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          name_normalized: string
          logo_url: string | null
          industry: string | null
          company_size: CompanySize | null
          website_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_normalized: string
          logo_url?: string | null
          industry?: string | null
          company_size?: CompanySize | null
          website_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_normalized?: string
          logo_url?: string | null
          industry?: string | null
          company_size?: CompanySize | null
          website_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      skills: {
        Row: {
          id: string
          name: string
          name_lower: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_lower: string
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_lower?: string
          category?: string | null
          created_at?: string
        }
      }
      job_postings: {
        Row: {
          id: string
          title: string
          company_id: string | null
          company_name: string
          location_city: string | null
          location_district: string | null
          location_full: string | null
          job_type: JobType
          experience_min: number | null
          experience_max: number | null
          salary_min: number | null
          salary_max: number | null
          categories: string[]
          industry: string | null
          description: string
          description_summary: string | null
          description_embedding: number[] | null
          posted_at: string | null
          expires_at: string | null
          first_scraped_at: string
          last_scraped_at: string
          is_active: boolean
          deduplication_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          company_id?: string | null
          company_name: string
          location_city?: string | null
          location_district?: string | null
          location_full?: string | null
          job_type?: JobType
          experience_min?: number | null
          experience_max?: number | null
          salary_min?: number | null
          salary_max?: number | null
          categories?: string[]
          industry?: string | null
          description?: string
          description_summary?: string | null
          description_embedding?: number[] | null
          posted_at?: string | null
          expires_at?: string | null
          first_scraped_at?: string
          last_scraped_at?: string
          is_active?: boolean
          deduplication_hash: string
        }
        Update: {
          id?: string
          title?: string
          company_id?: string | null
          company_name?: string
          location_city?: string | null
          location_district?: string | null
          location_full?: string | null
          job_type?: JobType
          experience_min?: number | null
          experience_max?: number | null
          salary_min?: number | null
          salary_max?: number | null
          categories?: string[]
          industry?: string | null
          description?: string
          description_summary?: string | null
          description_embedding?: number[] | null
          posted_at?: string | null
          expires_at?: string | null
          first_scraped_at?: string
          last_scraped_at?: string
          is_active?: boolean
          deduplication_hash?: string
        }
      }
      job_posting_sources: {
        Row: {
          id: string
          job_posting_id: string
          source: JobSource
          source_id: string
          source_url: string
          raw_data: Json | null
          scraped_at: string
        }
        Insert: {
          id?: string
          job_posting_id: string
          source: JobSource
          source_id: string
          source_url: string
          raw_data?: Json | null
          scraped_at?: string
        }
        Update: {
          id?: string
          job_posting_id?: string
          source?: JobSource
          source_id?: string
          source_url?: string
          raw_data?: Json | null
          scraped_at?: string
        }
      }
      job_skills: {
        Row: {
          job_posting_id: string
          skill_id: string
        }
        Insert: {
          job_posting_id: string
          skill_id: string
        }
        Update: {
          job_posting_id?: string
          skill_id?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          display_name: string | null
          preferred_roles: string[]
          preferred_skills: string[]
          preferred_locations: string[]
          salary_min: number | null
          salary_max: number | null
          experience_years: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          preferred_roles?: string[]
          preferred_skills?: string[]
          preferred_locations?: string[]
          salary_min?: number | null
          salary_max?: number | null
          experience_years?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          preferred_roles?: string[]
          preferred_skills?: string[]
          preferred_locations?: string[]
          salary_min?: number | null
          salary_max?: number | null
          experience_years?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      saved_jobs: {
        Row: {
          user_id: string
          job_posting_id: string
          note: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          job_posting_id: string
          note?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          job_posting_id?: string
          note?: string | null
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          name: string
          conditions: Json
          frequency: AlertFrequency
          channel: AlertChannel
          is_active: boolean
          last_triggered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          conditions?: Json
          frequency?: AlertFrequency
          channel?: AlertChannel
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          conditions?: Json
          frequency?: AlertFrequency
          channel?: AlertChannel
          is_active?: boolean
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: ChatRole
          content: string
          tool_calls: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: ChatRole
          content: string
          tool_calls?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: ChatRole
          content?: string
          tool_calls?: Json | null
          metadata?: Json | null
          created_at?: string
        }
      }
      crawler_runs: {
        Row: {
          id: string
          source: JobSource
          status: CrawlerStatus
          jobs_found: number
          jobs_created: number
          jobs_updated: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          source: JobSource
          status?: CrawlerStatus
          jobs_found?: number
          jobs_created?: number
          jobs_updated?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          source?: JobSource
          status?: CrawlerStatus
          jobs_found?: number
          jobs_created?: number
          jobs_updated?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ============================================================
// Application-level types (UI/API 사용)
// ============================================================

/** 공고 목록 뷰에서 사용하는 요약 타입 */
export interface JobPostingSummary {
  id: string
  title: string
  company_name: string
  location_city: string | null
  location_district: string | null
  job_type: JobType
  experience_min: number | null
  experience_max: number | null
  salary_min: number | null
  salary_max: number | null
  categories: string[]
  skills: string[]
  sources: { source: JobSource; source_url: string }[]
  posted_at: string | null
  is_saved: boolean
}

/** 공고 상세 뷰 타입 */
export interface JobPostingDetail extends JobPostingSummary {
  company_id: string | null
  company_logo_url: string | null
  company_size: CompanySize | null
  company_industry: string | null
  description: string
  description_summary: string | null
  expires_at: string | null
}

/** 검색 필터 */
export interface JobSearchFilters {
  query?: string
  sources?: JobSource[]
  job_types?: JobType[]
  locations?: string[]
  skills?: string[]
  categories?: string[]
  experience_min?: number
  experience_max?: number
  salary_min?: number
  salary_max?: number
  posted_after?: string
  is_active?: boolean
}

/** 트렌드 분석 결과 */
export interface TrendAnalysis {
  period: string
  total_jobs: number
  change_percent: number
  top_companies: { name: string; count: number }[]
  salary_range: { min: number; max: number; avg: number }
  daily_counts: { date: string; count: number }[]
}

/** 알림 조건 */
export interface AlertConditions {
  keywords?: string[]
  skills?: string[]
  locations?: string[]
  companies?: string[]
  salary_min?: number
  experience_max?: number
  job_types?: JobType[]
}

/** 채팅 메시지 (UI용) */
export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  tool_calls?: Json
  metadata?: {
    chart_data?: Json
    job_results?: JobPostingSummary[]
    trend_data?: TrendAnalysis
  }
  created_at: string
}
