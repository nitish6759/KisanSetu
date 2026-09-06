import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
export const isSupabaseConfigured = Boolean(supabase)

export async function createBooking(payload) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Using demo mode.') }
  return supabase.functions.invoke('book-slot', { body: payload })
}

export async function getQueueStatus(token) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Using demo mode.') }
  return supabase.functions.invoke('queue-status', { body: { token } })
}
