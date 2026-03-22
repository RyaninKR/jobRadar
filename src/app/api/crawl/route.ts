import { NextRequest, NextResponse } from 'next/server'
import type { JobSource } from '@/types/database'
import { WantedCrawler } from '@/lib/crawler/wanted-crawler'
import { SaraminCrawler } from '@/lib/crawler/saramin-crawler'
import type { BaseCrawler } from '@/lib/crawler/base-crawler'

const VALID_SOURCES: JobSource[] = ['wanted', 'saramin', 'jobkorea', 'jobplanet']

function createCrawler(source: JobSource): BaseCrawler {
  switch (source) {
    case 'wanted':
      return new WantedCrawler()
    case 'saramin':
      return new SaraminCrawler()
    default:
      throw new Error(`Crawler not implemented for source: ${source}`)
  }
}

/**
 * POST /api/crawl
 * Trigger a crawl run for a specific job source.
 * Requires CRAWLER_SECRET header for authentication.
 */
export async function POST(request: NextRequest) {
  // Validate auth
  const secret = request.headers.get('x-crawler-secret')
  if (!secret || secret !== process.env.CRAWLER_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized: invalid or missing CRAWLER_SECRET header' },
      { status: 401 }
    )
  }

  // Parse and validate body
  let body: { source?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const { source } = body
  if (!source || !VALID_SOURCES.includes(source as JobSource)) {
    return NextResponse.json(
      { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const crawler = createCrawler(source as JobSource)
    const result = await crawler.run()

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Crawl failed: ${message}` },
      { status: 500 }
    )
  }
}

/**
 * GET /api/crawl
 * Health check endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    available_sources: VALID_SOURCES,
    timestamp: new Date().toISOString(),
  })
}
