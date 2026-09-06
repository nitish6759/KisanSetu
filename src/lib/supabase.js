import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
export const isSupabaseConfigured = Boolean(supabase)

export async function ensureSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.session
}

export async function createBooking(payload) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Using demo mode.') }
  try { await ensureSession() } catch (error) { return { data: null, error } }
  return supabase.functions.invoke('book-slot', { body: payload })
}

export async function getQueueStatus(token) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Using demo mode.') }
  try { await ensureSession() } catch (error) { return { data: null, error } }
  return supabase.functions.invoke('queue-status', { body: { token } })
}
