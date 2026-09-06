import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization')! } } })
    const { token } = await request.json()
    if (!token) return new Response(JSON.stringify({ error: 'token is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: booking, error } = await supabase.from('bookings').select('token, status, queue_position, centre_id, procurement_centres(name, waiting_farmers, estimated_wait_minutes)').eq('token', token).single()
    if (error || !booking) return new Response(JSON.stringify({ error: 'Token not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const ahead = Math.max(0, (booking.queue_position ?? 1) - 1)
    return new Response(JSON.stringify({ token: booking.token, status: booking.status, position: booking.queue_position, farmersAhead: ahead, estimatedWaitMinutes: Math.round(ahead * 3.4), centre: booking.procurement_centres }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to load queue' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
