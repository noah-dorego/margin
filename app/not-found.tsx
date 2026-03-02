import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
      <p className="text-4xl font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
        404
      </p>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Page not found
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="rounded px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
