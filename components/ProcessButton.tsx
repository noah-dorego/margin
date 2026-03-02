'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  documentId: string
  label?: string
}

export function ProcessButton({ documentId, label = 'Run' }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/process`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-opacity disabled:opacity-50"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {loading ? (
        <>
          <span
            className="h-3 w-3 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: 'var(--accent-blue)' }}
          />
          Processing…
        </>
      ) : (
        label
      )}
    </button>
  )
}
