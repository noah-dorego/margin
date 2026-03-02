import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'txt') {
    const text = await file.text()
    return NextResponse.json({ content_type: 'text', text: text.trim() })
  }

  if (ext === 'pdf') {
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return NextResponse.json({ content_type: 'pdf', file_data: base64 })
  }

  return NextResponse.json(
    { error: 'Only .txt and .pdf files are supported' },
    { status: 400 }
  )
}
