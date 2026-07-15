import { createClient } from '@supabase/supabase-js'

// Configured via Vercel env vars. Until they're set, `supabase` is null and the
// app keeps running on its current (KV/localStorage) path — nothing breaks.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (url && key)
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export const supabaseReady = !!supabase
