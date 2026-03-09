import { describe, it, expect } from 'vitest'
import {
  buildExtractionSystemPrompt,
  buildExtractionUserMessage,
  buildAssessmentPrompt,
} from '@/lib/prompts'
import { PRODUCT_TAXONOMY } from '@/lib/taxonomy'
import type { ExtractedFinding } from '@/lib/types'

describe('buildExtractionSystemPrompt', () => {
  it('contains the source regulator', () => {
    const prompt = buildExtractionSystemPrompt('CIRO')
    expect(prompt).toContain('CIRO')
  })

  it('embeds document text when provided', () => {
    const prompt = buildExtractionSystemPrompt('OSC', 'The rule states X.', '2025-01-15')
    expect(prompt).toContain('The rule states X.')
    expect(prompt).toContain('2025-01-15')
  })

  it('omits publish_date tag when not provided', () => {
    const prompt = buildExtractionSystemPrompt('CRA', 'text only')
    expect(prompt).not.toContain('<publish_date>')
  })

  it('still includes regulator when text is omitted', () => {
    const prompt = buildExtractionSystemPrompt('FINTRAC')
    expect(prompt).toContain('FINTRAC')
    expect(prompt).toContain('<source_regulator>')
  })
})

describe('buildExtractionUserMessage', () => {
  it('returns a non-empty string', () => {
    const msg = buildExtractionUserMessage()
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })
})

describe('buildAssessmentPrompt', () => {
  const finding: ExtractedFinding = {
    finding_summary: 'New margin rules for high-volatility securities',
    effective_date: '2025-04-01',
    key_quotes: ['The rate shall be 50%.'],
    regulatory_references: ['MR-0125'],
    affected_keywords: ['margin', 'securities', 'trading'],
  }

  it('contains the finding summary', () => {
    const prompt = buildAssessmentPrompt(finding, PRODUCT_TAXONOMY)
    expect(prompt).toContain('New margin rules for high-volatility securities')
  })

  it('contains taxonomy product keywords', () => {
    const prompt = buildAssessmentPrompt(finding, PRODUCT_TAXONOMY)
    // PRODUCT_TAXONOMY is serialized as JSON in the prompt
    expect(prompt).toContain('TRADING')
  })

  it('references the severity scale', () => {
    const prompt = buildAssessmentPrompt(finding, PRODUCT_TAXONOMY)
    expect(prompt).toContain('critical')
    expect(prompt).toContain('high')
    expect(prompt).toContain('medium')
    expect(prompt).toContain('low')
  })
})
