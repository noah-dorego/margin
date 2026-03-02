import { NextRequest, NextResponse } from 'next/server'
import { getDocument } from '@/lib/db'
import { runPipeline } from '@/lib/pipeline'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const doc = getDocument(id)
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (doc.processing_status === 'processed') {
    return NextResponse.json({ error: 'Document already processed' }, { status: 409 })
  }

  try {
    const result = await runPipeline(id)
    return NextResponse.json({ document_id: id, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
