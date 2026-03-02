import { NextRequest, NextResponse } from 'next/server'
import { getFindings } from '@/lib/db'
import type { FindingFilters, Severity, SourceAgency, ProductKey } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const filters: FindingFilters = {}

  const severity = searchParams.get('severity')
  if (severity) filters.severity = severity.split(',') as Severity[]

  const source_agency = searchParams.get('source_agency')
  if (source_agency) filters.source_agency = source_agency as SourceAgency

  const product = searchParams.get('product')
  if (product) filters.product = product as ProductKey

  return NextResponse.json(getFindings(filters))
}
