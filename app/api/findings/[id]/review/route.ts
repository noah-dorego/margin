import { NextResponse } from 'next/server'

// Review workflow has been removed. This endpoint no longer exists.
export async function PATCH() {
  return NextResponse.json({ error: 'Review functionality has been removed' }, { status: 404 })
}
