import { NextRequest, NextResponse } from 'next/server'
import { getFeedItem, updateFeedItemStatus } from '@/lib/db'
import type { FeedItem } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const item = getFeedItem(id)
  if (!item) {
    return NextResponse.json({ error: 'Feed item not found' }, { status: 404 })
  }

  const body = await req.json()
  const { status } = body as { status: FeedItem['status'] }

  const validStatuses: FeedItem['status'][] = ['dismissed', 'ingested']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  updateFeedItemStatus(id, status)
  return NextResponse.json({ ok: true })
}
