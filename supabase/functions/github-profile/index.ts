const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const githubHeaders: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'northstar-career-demo',
}

if (Deno.env.get('GITHUB_TOKEN')) githubHeaders.Authorization = `Bearer ${Deno.env.get('GITHUB_TOKEN')}`

async function github(path: string) {
  const response = await fetch(`https://api.github.com${path}`, { headers: githubHeaders })
  if (response.status === 404) throw new Error('GitHub user not found')
  if (response.status === 403 || response.status === 429) throw new Error('GitHub rate limit reached—try again shortly')
  if (!response.ok) throw new Error(`GitHub validation failed (${response.status})`)
  return response.json()
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { username } = await request.json()
    if (!username || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
      return Response.json({ error: 'Invalid GitHub username' }, { status: 400, headers: corsHeaders })
    }

    const [user, rawRepos, rawEvents] = await Promise.all([
      github(`/users/${encodeURIComponent(username)}`),
      github(`/users/${encodeURIComponent(username)}/repos?sort=pushed&direction=desc&per_page=8&type=owner`),
      github(`/users/${encodeURIComponent(username)}/events/public?per_page=30`),
    ])

    const repos = rawRepos.slice(0, 6).map((repo: Record<string, unknown>) => ({
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language,
      topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 6) : [],
      pushedAt: repo.pushed_at,
    }))
    const languageCounts = new Map<string, number>()
    for (const repo of repos) if (repo.language) languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1)
    const topLanguages = [...languageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([language]) => language)
    const recentCommitCount = rawEvents
      .filter((event: { type: string }) => event.type === 'PushEvent')
      .reduce((sum: number, event: { payload?: { commits?: unknown[] } }) => sum + (event.payload?.commits?.length ?? 0), 0)

    // This is the only shape returned to the browser or downstream AI. Raw GitHub payloads stay server-side.
    const trimmed = {
      login: user.login,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
      publicRepos: user.public_repos,
      followers: user.followers,
      topLanguages,
      recentCommitCount,
      repositories: repos,
      verified: true,
    }
    return Response.json(trimmed, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub validation failed'
    return Response.json({ error: message }, { status: message.includes('not found') ? 404 : 500, headers: corsHeaders })
  }
})
