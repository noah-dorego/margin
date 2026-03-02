import { NextRequest, NextResponse } from 'next/server'
import { getFinding } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const finding = getFinding(id)
  if (!finding) {
    return NextResponse.json({ error: 'Finding not found' }, { status: 404 })
  }
  return NextResponse.json(finding)
}
