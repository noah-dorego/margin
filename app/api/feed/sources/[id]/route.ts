import { NextRequest, NextResponse } from 'next/server'
import { getFeedSource, deleteFeedSource } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const source = getFeedSource(id)
  if (!source) {
    return NextResponse.json({ error: 'Feed source not found' }, { status: 404 })
  }

  deleteFeedSource(id)
  return new NextResponse(null, { status: 204 })
}
