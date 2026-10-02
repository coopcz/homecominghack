import { corsHeaders, generateStructured } from '../_shared/ai.ts'

const schema = {
  type: 'object', additionalProperties: false,
  required: ['score', 'headline', 'summary', 'strengths', 'nextStep', 'generatedBy'],
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    headline: { type: 'string' },
    summary: { type: 'string' },
    strengths: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['title', 'evidence'], properties: { title: { type: 'string' }, evidence: { type: 'string' } } } },
    nextStep: { type: 'string' },
    generatedBy: { type: 'string', enum: ['ai'] },
  },
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await request.json()
    if (!body?.profile || !body?.mission || !body?.roadmap) return Response.json({ error: 'Missing candidate, mission, or roadmap' }, { status: 400, headers: corsHeaders })
    const prompt = `Act as a careful recruiting analyst. Assess this student candidate's alignment with the company's mission using only the supplied evidence. Do not infer protected traits or invent experience. Score the strength of demonstrated mission alignment, not general employability. Use specific evidence and make the summary useful to an employer. Keep the headline under 10 words, summary under 65 words, each evidence statement under 35 words, and next step under 12 words.\n\nCandidate evidence:\n${JSON.stringify(body)}`
    const result = await generateStructured({ prompt, schema, name: 'mission_alignment', maxTokens: 1100 })
    return Response.json(result, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Could not analyze mission alignment' }, { status: 500, headers: corsHeaders })
  }
})
