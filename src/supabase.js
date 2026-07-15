import { createClient } from '@supabase/supabase-js'

// Project URL + publishable (anon) key. The publishable key is safe to ship in
// the frontend — Row-Level Security is what actually protects the data. Env
// vars override these if ever set, but they're not required.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://aollhmzrtycefjfgmosc.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UT58QTS6Dy2Pv8wXvm-BXQ_lPT90mc-'

export const supabase = (url && key)
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export const supabaseReady = !!supabase
