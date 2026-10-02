import { createClient } from 'npm:@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function clients(authHeader: string) {
  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? publishableKeys.default
  const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? secretKeys.default
  return {
    userClient: createClient(Deno.env.get('SUPABASE_URL')!, publicKey, { global: { headers: { Authorization: authHeader } } }),
    adminClient: createClient(Deno.env.get('SUPABASE_URL')!, secretKey),
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization') ?? ''
    const { userClient, adminClient } = clients(authHeader)
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })

    const { username, repo } = await request.json()
    if (!username || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
      return Response.json({ error: 'Invalid GitHub username' }, { status: 400, headers: corsHeaders })
    }
    if (repo && !/^[\w.-]+(?:\/[\w.-]+)?$/.test(repo)) {
      return Response.json({ error: 'Invalid repository name' }, { status: 400, headers: corsHeaders })
    }

    const { data: connection } = await adminClient.from('github_connections').select('*').eq('user_id', user.id).maybeSingle()
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'northstar-hackathon' }
    if (Deno.env.get('GITHUB_TOKEN')) headers.Authorization = `Bearer ${Deno.env.get('GITHUB_TOKEN')}`

    const repository = repo ? (repo.includes('/') ? repo : `${username}/${repo}`) : null
    const since = connection?.last_checked_at ?? new Date(Date.now() - 7 * 86400000).toISOString()
    const url = repository
      ? `https://api.github.com/repos/${repository}/commits?author=${encodeURIComponent(username)}&since=${encodeURIComponent(since)}&per_page=20`
      : `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`
    const githubResponse = await fetch(url, { headers })

    if (!githubResponse.ok) {
      if ((githubResponse.status === 403 || githubResponse.status === 429) && connection?.cached_response) {
        return Response.json({ events: connection.cached_response.events ?? [], cached: true }, { headers: corsHeaders })
      }
      throw new Error(`GitHub error ${githubResponse.status}`)
    }

    const payload = await githubResponse.json()
    const rawCommits = repository
      ? payload.map((commit: Record<string, unknown>) => ({
          sha: commit.sha,
          message: (commit.commit as { message?: string })?.message?.split('\n')[0] ?? 'GitHub commit',
          url: commit.html_url,
          occurredAt: (commit.commit as { author?: { date?: string } })?.author?.date,
          repository,
        }))
      : payload.filter((event: { type: string }) => event.type === 'PushEvent').flatMap((event: Record<string, unknown>) =>
          ((event.payload as { commits?: Record<string, unknown>[] })?.commits ?? []).map((commit) => ({
            sha: commit.sha,
            message: commit.message ?? 'GitHub commit',
            url: `https://github.com/${(event.repo as { name: string }).name}/commit/${commit.sha}`,
            occurredAt: event.created_at,
            repository: (event.repo as { name: string }).name,
          })),
        )

    const previousIndex = rawCommits.findIndex((commit: { sha: string }) => commit.sha === connection?.last_commit_sha)
    const unseenCommits = previousIndex >= 0 ? rawCommits.slice(0, previousIndex) : rawCommits
    const newCommits = unseenCommits.filter((commit: { sha: string }) => commit.sha).slice(0, 10)
    const rows = newCommits.map((commit: { sha: string; message: string; url: string; occurredAt?: string; repository: string }) => ({
      user_id: user.id,
      type: 'github_commit',
      label: commit.message.slice(0, 180),
      points: 15,
      verified: true,
      external_id: commit.sha,
      metadata: { url: commit.url, repository: commit.repository },
      occurred_at: commit.occurredAt ?? new Date().toISOString(),
    }))

    if (rows.length) {
      const { error } = await adminClient.from('progress_events').insert(rows)
      if (error) throw error
    }
    const events = rows.map((row: Record<string, unknown>) => ({
      id: row.external_id,
      type: row.type,
      label: row.label,
      points: row.points,
      verified: true,
      occurredAt: row.occurred_at,
    }))
    await adminClient.from('github_connections').upsert({
      user_id: user.id,
      github_username: username,
      repository,
      last_commit_sha: rawCommits[0]?.sha ?? connection?.last_commit_sha,
      last_checked_at: new Date().toISOString(),
      cached_response: { events },
    })

    return Response.json({ events, cached: false }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error(error)
    return Response.json({ error: error instanceof Error ? error.message : 'GitHub sync failed' }, { status: 500, headers: corsHeaders })
  }
})
