import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization')! } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { cropType, quantityQ, cropId, centreId, bookingDate, timeSlot } = await request.json()
    if (!cropType || !quantityQ || !centreId || !bookingDate || !timeSlot) return new Response(JSON.stringify({ error: 'cropType, quantityQ, centreId, bookingDate and timeSlot are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: centre, error: centreError } = await supabase.from('procurement_centres').select('*').eq('id', centreId).single()
    if (centreError || !centre) throw new Error('Procurement centre not found')
    if (Number(centre.remaining_capacity_q) < Number(quantityQ)) throw new Error('This centre does not have enough remaining capacity')
    if (!centre.accepted_crops.includes(cropType)) throw new Error('This crop is not accepted at the selected centre')
    const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('centre_id', centreId).eq('booking_date', bookingDate).neq('status', 'cancelled')
    const position = (count ?? 0) + 1
    const token = `P-${String(1000 + position).padStart(4, '0')}`
    const { data: booking, error } = await supabase.from('bookings').insert({ farmer_id: user.id, crop_id: cropId, centre_id: centreId, token, booking_date: bookingDate, time_slot: timeSlot, quantity_q: quantityQ, queue_position: position }).select().single()
    if (error) throw error
    return new Response(JSON.stringify({ booking }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to create booking' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
