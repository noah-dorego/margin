import { NextRequest, NextResponse } from 'next/server'
import { getFeedSources, insertFeedSource } from '@/lib/db'
import type { SourceAgency } from '@/lib/types'

export async function GET() {
  return NextResponse.json(getFeedSources())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { label, url, source_agency } = body

  if (!label || !url || !source_agency) {
    return NextResponse.json(
      { error: 'label, url, and source_agency are required' },
      { status: 400 }
    )
  }

  const id = insertFeedSource({ label, url, source_agency: source_agency as SourceAgency })
  return NextResponse.json({ id }, { status: 201 })
}
