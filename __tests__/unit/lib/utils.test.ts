import { describe, it, expect } from 'vitest'
import { cn, formatDate, severityOrder, severityColor } from '@/lib/utils'

describe('cn()', () => {
  it('merges class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('resolves Tailwind conflicts — last class wins', () => {
    // tailwind-merge: p-2 overrides p-4 when p-4 comes first
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })
})

describe('formatDate()', () => {
  it('returns the YYYY-MM-DD prefix of an ISO string', () => {
    expect(formatDate('2025-04-01T00:00:00.000Z')).toBe('2025-04-01')
  })

  it('passes through a plain date string unchanged', () => {
    expect(formatDate('2025-01-15')).toBe('2025-01-15')
  })

  it('handles strings shorter than 10 chars without throwing', () => {
    expect(formatDate('2025')).toBe('2025')
  })
})

describe('severityOrder', () => {
  it('maps critical to 0 (highest priority)', () => {
    expect(severityOrder.critical).toBe(0)
  })

  it('maps all four severities correctly', () => {
    expect(severityOrder.critical).toBe(0)
    expect(severityOrder.high).toBe(1)
    expect(severityOrder.medium).toBe(2)
    expect(severityOrder.low).toBe(3)
  })
})

describe('severityColor', () => {
  it('maps each severity to a string containing the expected CSS var', () => {
    expect(severityColor.critical).toContain('--severity-critical')
    expect(severityColor.high).toContain('--severity-high')
    expect(severityColor.medium).toContain('--severity-medium')
    expect(severityColor.low).toContain('--severity-low')
  })
})
