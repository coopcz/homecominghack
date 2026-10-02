import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  url &&
    publishableKey &&
    !url.includes('YOUR_PROJECT_REF') &&
    !publishableKey.includes('YOUR_KEY'),
)

export const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false' || !isSupabaseConfigured

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw error
  return data as T
}

