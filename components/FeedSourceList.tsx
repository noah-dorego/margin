'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, RefreshCw, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { FeedSource, SourceAgency } from '@/lib/types'

const AGENCIES: SourceAgency[] = [
  'CRA', 'CIRO', 'OSC', 'CSA', 'FINTRAC', 'OSFI', 'FCAC', 'Dept-of-Finance', 'Payments-Canada',
]

interface Props {
  sources: FeedSource[]
}

export function FeedSourceList({ sources }: Props) {
  const router = useRouter()
  const [checking, setChecking] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [agency, setAgency] = useState<SourceAgency>('CRA')
  const [adding, setAdding] = useState(false)

  async function handleCheck(id: string) {
    setChecking(id)
    try {
      const res = await fetch(`/api/feed/sources/${id}/check`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Check failed')
      toast.success(`Found ${data.items_found} links`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setChecking(null)
    }
  }

  async function handleDelete(id: string, label: string) {
    try {
      const res = await fetch(`/api/feed/sources/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success(`Removed "${label}"`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function handleAdd() {
    if (!label.trim() || !url.trim()) {
      toast.error('Label and URL are required')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/feed/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, url, source_agency: agency }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Add failed')
      toast.success('Source added')
      setLabel('')
      setUrl('')
      setAgency('CRA')
      setShowForm(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {sources.map(source => (
        <div
          key={source.id}
          className="rounded-md p-3 flex flex-col gap-1.5"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {source.label}
              </span>
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded w-fit"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
              >
                {source.source_agency}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleCheck(source.id)}
                disabled={checking === source.id}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
              >
                <RefreshCw size={11} className={checking === source.id ? 'animate-spin' : ''} />
                Check
              </button>
              <button
                onClick={() => handleDelete(source.id, source.label)}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {source.last_checked_at
              ? `Checked ${formatDate(source.last_checked_at)}`
              : 'Never checked'}
          </span>
        </div>
      ))}

      {showForm ? (
        <div
          className="rounded-md p-3 flex flex-col gap-2 mt-1"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label"
            className="w-full rounded px-2 py-1.5 text-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded px-2 py-1.5 text-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          />
          <select
            value={agency}
            onChange={e => setAgency(e.target.value as SourceAgency)}
            className="w-full rounded px-2 py-1.5 text-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {AGENCIES.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex-1 text-sm py-1.5 rounded font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 text-sm py-1.5 rounded transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded mt-1 transition-colors"
          style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
        >
          <Plus size={13} />
          Add Source
        </button>
      )}
    </div>
  )
}
