import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
export const isSupabaseConfigured = Boolean(supabase)

export async function signIn(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Demo mode is active.') }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp({ name, email, password, role = 'farmer' }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Demo mode is active.') }
  const response = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, role } } })
  if (response.error || !response.data.user) return response
  const profile = await supabase.from('profiles').upsert({ id: response.data.user.id, full_name: name, role }, { onConflict: 'id' })
  return profile.error ? { data: response.data, error: profile.error } : response
}

export async function signOut() {
  if (!supabase) return { error: null }
  return supabase.auth.signOut()
}

export async function getAuthSession() {
  if (!supabase) return { data: { session: null }, error: null }
  return supabase.auth.getSession()
}

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

export async function processWorkflow(action, payload = {}) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Demo mode is active.') }
  try { await ensureSession() } catch (error) { return { data: null, error } }
  return supabase.functions.invoke('process-workflow', { body: { action, ...payload } })
}

async function authenticatedQuery(query) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured. Using demo mode.') }
  try { await ensureSession() } catch (error) { return { data: null, error } }
  return query
}

export async function getCentres() {
  return authenticatedQuery(supabase?.from('procurement_centres').select('*').order('distance_km'))
}

export async function getCurrentProfile() {
  const session = await ensureSession()
  if (!session?.user || !supabase) return { data: null, error: new Error('No authenticated user') }
  return supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
}

export async function getFarmerCrops() {
  const session = await ensureSession()
  if (!session?.user || !supabase) return { data: null, error: new Error('No authenticated user') }
  return supabase.from('crops').select('*').eq('farmer_id', session.user.id).order('created_at', { ascending: false })
}

export async function getFarmerBookings() {
  const session = await ensureSession()
  if (!session?.user || !supabase) return { data: null, error: new Error('No authenticated user') }
  return supabase.from('bookings').select('*, procurement_centres(name, distance_km), crops(crop_type)').eq('farmer_id', session.user.id).order('booking_date', { ascending: false })
}

export async function getFarmerPayments() {
  const session = await ensureSession()
  if (!session?.user || !supabase) return { data: null, error: new Error('No authenticated user') }
  return supabase.from('payments').select('*, procurements(receipt_id, booking_id)').order('created_at', { ascending: false })
}

export async function getFarmerNotifications() {
  const session = await ensureSession()
  if (!session?.user || !supabase) return { data: null, error: new Error('No authenticated user') }
  return supabase.from('notifications').select('*').eq('farmer_id', session.user.id).order('created_at', { ascending: false })
}

export async function markNotificationRead(notificationId) {
  const session = await ensureSession()
  if (!session?.user || !supabase) return { data: null, error: new Error('No authenticated user') }
  return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('farmer_id', session.user.id)
}
