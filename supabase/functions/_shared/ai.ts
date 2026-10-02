export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export interface ImageInput { mime: string; base64: string }

interface StructuredRequest {
  prompt: string
  schema: Record<string, unknown>
  name: string
  maxTokens?: number
  image?: ImageInput
  webSearch?: boolean
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
}

export const hasProvider = () => Boolean(Deno.env.get('OPENAI_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY'))

async function withOpenAI({ prompt, schema, name, maxTokens, image, webSearch, reasoningEffort = 'none' }: StructuredRequest) {
  const content: unknown[] = [{ type: 'input_text', text: prompt }]
  if (image) content.push({ type: 'input_image', image_url: `data:${image.mime};base64,${image.base64}` })
  const preferredModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5.6-luna'
  const makeRequest = (model: string) => fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxTokens ?? 2400,
      input: [{ role: 'user', content }],
      ...(webSearch ? { tools: [{ type: 'web_search', external_web_access: true }] } : {}),
      text: { format: { type: 'json_schema', name, strict: true, schema } },
    }),
  })
  let response = await makeRequest(preferredModel)
  if (!response.ok && preferredModel === 'gpt-5.6-luna') response = await makeRequest('gpt-5.4-mini')
  if (!response.ok) throw new Error(`OpenAI error ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const text = data.output_text ?? data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text
  if (!text) throw new Error('OpenAI returned no structured output')
  return JSON.parse(text)
}

async function withAnthropic({ prompt, schema, name, maxTokens, image }: StructuredRequest) {
  const content: unknown[] = []
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.base64 } })
  content.push({ type: 'text', text: prompt })
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens ?? 2800,
      messages: [{ role: 'user', content }],
      tools: [{ name, description: 'Return the final structured result.', input_schema: schema }],
      tool_choice: { type: 'tool', name },
    }),
  })
  if (!response.ok) throw new Error(`Anthropic error ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const toolUse = data.content?.find((block: { type: string; name?: string }) => block.type === 'tool_use' && block.name === name)
  if (!toolUse?.input) throw new Error('Anthropic returned no structured tool result')
  return toolUse.input
}

export async function generateStructured(request: StructuredRequest) {
  if (Deno.env.get('OPENAI_API_KEY')) return withOpenAI(request)
  if (Deno.env.get('ANTHROPIC_API_KEY')) return withAnthropic(request)
  throw new Error('No AI provider configured')
}
