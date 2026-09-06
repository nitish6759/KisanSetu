import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization')! } } })
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { cropType, quantityQ, cropId, centreId, centreName, bookingDate, timeSlot } = await request.json()
    if (!cropType || !quantityQ || (!centreId && !centreName) || !bookingDate || !timeSlot) return new Response(JSON.stringify({ error: 'cropType, quantityQ, centreId or centreName, bookingDate and timeSlot are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const centreQuery = adminClient.from('procurement_centres').select('*')
    const { data: centre, error: centreError } = centreId ? await centreQuery.eq('id', centreId).single() : await centreQuery.eq('name', centreName).single()
    if (centreError || !centre) throw new Error('Procurement centre not found')
    if (Number(centre.remaining_capacity_q) < Number(quantityQ)) throw new Error('This centre does not have enough remaining capacity')
    if (!centre.accepted_crops.includes(cropType)) throw new Error('This crop is not accepted at the selected centre')
    const { data: profile } = await adminClient.from('profiles').upsert({ id: user.id, full_name: user.user_metadata?.full_name ?? 'Demo Farmer', role: 'farmer' }, { onConflict: 'id' }).select().single()
    const resolvedCropId = cropId || (await adminClient.from('crops').insert({ farmer_id: user.id, crop_type: cropType, quantity_q: quantityQ, preliminary_ready: true }).select('id').single()).data?.id
    if (!profile || !resolvedCropId) throw new Error('Unable to prepare farmer records')
    const { count } = await adminClient.from('bookings').select('*', { count: 'exact', head: true }).eq('centre_id', centre.id).eq('booking_date', bookingDate).neq('status', 'cancelled')
    const position = (count ?? 0) + 1
    const token = `P-${String(1000 + position).padStart(4, '0')}`
    const { data: booking, error } = await adminClient.from('bookings').insert({ farmer_id: user.id, crop_id: resolvedCropId, centre_id: centre.id, token, booking_date: bookingDate, time_slot: timeSlot, quantity_q: quantityQ, queue_position: position }).select().single()
    if (error) throw error
    return new Response(JSON.stringify({ booking }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to create booking' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
