'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Something went wrong
      </h2>
      <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="rounded px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
      >
        Try again
      </button>
    </div>
  )
}
