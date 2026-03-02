import { NextRequest, NextResponse } from 'next/server'
import { getAllDocuments, insertDocument } from '@/lib/db'
import type { SourceAgency } from '@/lib/types'

const VALID_SOURCE_AGENCIES: SourceAgency[] = [
  'CRA', 'CIRO', 'OSC', 'CSA', 'FINTRAC', 'OSFI', 'FCAC', 'Dept-of-Finance', 'Payments-Canada',
]

export async function GET() {
  return NextResponse.json(getAllDocuments())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, source_agency, source_url, publish_date, raw_text, content_type } = body

  if (!title || !source_agency || !raw_text) {
    return NextResponse.json(
      { error: 'title, source_agency, and raw_text are required' },
      { status: 400 }
    )
  }

  if (!VALID_SOURCE_AGENCIES.includes(source_agency)) {
    return NextResponse.json(
      { error: `source_agency must be one of: ${VALID_SOURCE_AGENCIES.join(', ')}` },
      { status: 400 }
    )
  }

  const id = insertDocument({ title, source_agency, source_url, publish_date, raw_text, content_type: content_type ?? 'text' })
  return NextResponse.json({ id }, { status: 201 })
}
