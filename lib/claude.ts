import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function callClaude(
  userMessage: string,
  options?: { system?: string; model?: string; pdfData?: string }
): Promise<string> {
  const content = options?.pdfData
    ? [
        { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: options.pdfData } },
        { type: 'text' as const, text: userMessage },
      ]
    : userMessage

  const message = await client.messages.create({
    model: options?.model ?? 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    ...(options?.system ? { system: options.system } : {}),
    messages: [{ role: 'user', content }],
  })

  const block = message.content[0]
  if (block.type !== 'text') {
    throw new Error(`Expected text response from Claude, got: ${block.type}`)
  }

  return block.text
}

export function parseAIResponse<T>(raw: string): T {
  // Strip ```json ... ``` fences if present
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(stripped) as T
  } catch (err) {
    throw new Error(
      `Failed to parse AI response as JSON: ${err instanceof Error ? err.message : String(err)}\n\nRaw response:\n${raw}`
    )
  }
}
