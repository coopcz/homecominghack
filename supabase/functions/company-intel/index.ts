const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const intelSchema = {
  type: 'object', additionalProperties: false,
  required: ['people', 'jobs', 'events', 'feed', 'researchedAt', 'live'],
  properties: {
    people: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['name', 'title', 'reason', 'sourceUrl'], properties: { name: { type: 'string' }, title: { type: 'string' }, reason: { type: 'string' }, sourceUrl: { type: 'string' } } } },
    jobs: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['title', 'location', 'totalComp', 'summary', 'sourceUrl'], properties: { title: { type: 'string' }, location: { type: 'string' }, totalComp: { type: 'string' }, summary: { type: 'string' }, sourceUrl: { type: 'string' } } } },
    events: { type: 'array', maxItems: 4, items: { type: 'object', additionalProperties: false, required: ['title', 'date', 'location', 'sourceUrl'], properties: { title: { type: 'string' }, date: { type: 'string' }, location: { type: 'string' }, sourceUrl: { type: 'string' } } } },
    feed: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['title', 'summary', 'date', 'sourceUrl'], properties: { title: { type: 'string' }, summary: { type: 'string' }, date: { type: 'string' }, sourceUrl: { type: 'string' } } } },
    researchedAt: { type: 'string' }, live: { type: 'boolean' },
  },
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const key = Deno.env.get('OPENAI_API_KEY')
    if (!key) return Response.json({ error: 'OPENAI_API_KEY is required for live company research' }, { status: 503, headers: corsHeaders })
    const body = await request.json()
    if (!body?.company || !body?.role) return Response.json({ error: 'Missing company or role' }, { status: 400, headers: corsHeaders })
    const today = new Date().toISOString().slice(0, 10)
    const input = `Research ${body.company} for a student pursuing ${body.role}. Today is ${today}.
Find up to four current, publicly verifiable employees whose work is relevant to the role; up to four currently open jobs from the company's official careers site that are relevant to the student's path; up to four verified public events occurring strictly after today; and up to six substantive company updates from reputable reporting or official announcements published in the last 120 days. For every job, include the published total compensation or salary range exactly as the source states it. If the source publishes no compensation, use "Not published"—never estimate it.
Every item must have a direct source URL to the exact profile, job, event, or article—not a homepage or search result. Prefer reputable reporting for feed items and official sources for jobs and events. Never invent a person, title, job, event, date, article, or URL. If a claim cannot be sourced, omit it. Events in the past and closed jobs must be omitted. Keep reasons and summaries concise and explain why each result matters to this student.
Student signal: ${JSON.stringify({ major: body.profile?.major, skills: body.profile?.skills, interests: body.profile?.interests })}
Company mission: ${body.mission ?? ''}`
    const preferredModel = Deno.env.get('OPENAI_SEARCH_MODEL') ?? Deno.env.get('OPENAI_MODEL') ?? 'gpt-5.6-luna'
    const makeRequest = (model: string) => fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        reasoning: { effort: 'none' },
        max_output_tokens: 2400,
        tools: [{ type: 'web_search', external_web_access: true }],
        tool_choice: 'required',
        input,
        text: { format: { type: 'json_schema', name: 'company_intel', strict: true, schema: intelSchema } },
      }),
    })
    let response = await makeRequest(preferredModel)
    if (!response.ok && preferredModel === 'gpt-5.6-luna') response = await makeRequest('gpt-5.4-mini')
    if (!response.ok) throw new Error(`Company research failed (${response.status})`)
    const data = await response.json()
    const outputText = data.output_text ?? data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text
    if (!outputText) throw new Error('Company research returned no structured result')
    const intel = JSON.parse(outputText)
    intel.researchedAt = new Date().toISOString()
    intel.live = true
    intel.events = intel.events.filter((event: { date: string }) => event.date > today)
    const uniqueBySource = <T extends { sourceUrl: string }>(items: T[]) =>
      items.filter((item, index) => items.findIndex((candidate) => candidate.sourceUrl === item.sourceUrl) === index)
    intel.people = uniqueBySource(intel.people)
    intel.jobs = uniqueBySource(intel.jobs)
    intel.events = uniqueBySource(intel.events)
    intel.feed = uniqueBySource(intel.feed)
    return Response.json(intel, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Company research failed' }, { status: 500, headers: corsHeaders })
  }
})
