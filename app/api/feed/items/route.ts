import { NextRequest, NextResponse } from 'next/server'
import { getFeedItems } from '@/lib/db'
import type { FeedItem } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as FeedItem['status'] | null

  const validStatuses: FeedItem['status'][] = ['new', 'dismissed', 'ingested']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  return NextResponse.json(getFeedItems(status ?? undefined))
}
