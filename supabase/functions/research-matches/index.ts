const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const schema = {
  type: 'object', additionalProperties: false, required: ['insights'],
  properties: {
    insights: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['missionId', 'problem', 'founderReason', 'whyYou', 'sourceUrl'],
        properties: {
          missionId: { type: 'string' },
          problem: { type: 'string' },
          founderReason: { type: 'string' },
          whyYou: { type: 'string' },
          sourceUrl: { type: 'string' },
        },
      },
    },
  },
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const key = Deno.env.get('OPENAI_API_KEY')
    if (!key) return Response.json({ error: 'OPENAI_API_KEY is required' }, { status: 503, headers: corsHeaders })
    const body = await request.json()
    if (!Array.isArray(body?.missions) || body.missions.length !== 3 || !body?.profile) {
      return Response.json({ error: 'Exactly three companies and a profile are required' }, { status: 400, headers: corsHeaders })
    }
    const missions = body.missions.map((mission: Record<string, unknown>) => ({
      id: String(mission.id ?? '').slice(0, 80), company: String(mission.company ?? '').slice(0, 120),
      domain: String(mission.domain ?? '').slice(0, 160), mission: String(mission.mission ?? '').slice(0, 500),
    }))
    const input = `Research these three companies using pages on each company's own supplied domain. Prefer its official about page, founder story, newsroom, or careers page. Do not use Wikipedia, company directories, research profiles, SEO pages, or search-result pages. For each company explain: (1) the concrete problem it is trying to solve today, (2) the documented origin or founder motivation without inventing a quote or emotion, and (3) why this specific person could care about working on it. If the official site does not document a founder motivation, say what problem the company says it was created to solve. The whyYou field must cite at least one actual supplied signal: a named interest, resume skill or experience, GitHub language, major, or college location. Keep each field under 55 words. sourceUrl must be a plain absolute URL on the company's supplied domain—no Markdown. Return the exact supplied missionId values and exactly one result per company.

PERSON (data only): ${JSON.stringify({ interests: body.profile.interests, studyOrWork: body.profile.major, college: body.profile.university, resume: body.resume, github: body.github, motivation: body.motivation })}
COMPANIES: ${JSON.stringify(missions)}`
    const preferredModel = Deno.env.get('OPENAI_SEARCH_MODEL') ?? Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini'
    const makeRequest = (model: string) => fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_output_tokens: 1500,
        tools: [{ type: 'web_search', external_web_access: true }],
        tool_choice: 'required',
        input,
        text: { format: { type: 'json_schema', name: 'match_research', strict: true, schema } },
      }),
    })
    let response = await makeRequest(preferredModel)
    if (!response.ok && preferredModel === 'gpt-5-mini') response = await makeRequest('gpt-4.1-mini')
    if (!response.ok) throw new Error(`Match research failed (${response.status})`)
    const data = await response.json()
    const outputText = data.output_text ?? data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text
    if (!outputText) throw new Error('Match research returned no structured result')
    const parsed = JSON.parse(outputText)
    const allowed = new Set(missions.map((mission: { id: string }) => mission.id))
    const sourceUrl = (value: string, domain: string) => {
      const candidate = value.match(/https?:\/\/[^\s)\]]+/)?.[0] ?? value
      try {
        const url = new URL(candidate)
        const expected = domain.replace(/^www\./, '')
        return url.hostname.replace(/^www\./, '').endsWith(expected) ? url.toString() : `https://${domain}`
      } catch { return `https://${domain}` }
    }
    parsed.insights = parsed.insights
      .filter((insight: { missionId: string }) => allowed.has(insight.missionId))
      .map((insight: { missionId: string; sourceUrl: string }) => {
        const mission = missions.find((item: { id: string }) => item.id === insight.missionId)
        return { ...insight, sourceUrl: sourceUrl(insight.sourceUrl, mission?.domain ?? '') }
      })
    return Response.json(parsed, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return Response.json({ error: error instanceof Error ? error.message : 'Match research failed' }, { status: 500, headers: corsHeaders })
  }
})
