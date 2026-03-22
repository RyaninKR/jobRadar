import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * 서버사이드 Supabase 클라이언트 (service_role 키 사용)
 * 크롤러, API 라우트 등 서버 전용 작업에 사용
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}
