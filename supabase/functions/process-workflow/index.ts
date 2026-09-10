import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization')! } } })
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Authentication required' }, 401)
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['operator', 'inspector', 'admin'].includes(profile.role)) return json({ error: 'Staff access required' }, 403)

    const { action, token, grossWeightQ, tareWeightQ, moisture, foreignMatter, result, rejectionReason, pricePerQ } = await request.json()
    if (!action || !token) return json({ error: 'action and token are required' }, 400)
    const { data: booking, error: bookingError } = await adminClient.from('bookings').select('id, status, quantity_q').eq('token', token).single()
    if (bookingError || !booking) return json({ error: 'Booking not found' }, 404)

    if (action === 'verify') {
      if (!['operator', 'admin'].includes(profile.role)) return json({ error: 'Operator access required' }, 403)
      const { data, error } = await adminClient.from('bookings').update({ status: 'checked_in', checked_in_at: new Date().toISOString() }).eq('id', booking.id).select().single()
      if (error) throw error
      return json({ booking: data, message: 'Farmer verified and checked in' })
    }

    if (action === 'weigh') {
      if (!['operator', 'admin'].includes(profile.role)) return json({ error: 'Operator access required' }, 403)
      if (grossWeightQ == null || tareWeightQ == null || Number(grossWeightQ) < Number(tareWeightQ)) return json({ error: 'Valid gross and tare weights are required' }, 400)
      const { data, error } = await adminClient.from('weighings').upsert({ booking_id: booking.id, gross_weight_q: Number(grossWeightQ), tare_weight_q: Number(tareWeightQ), recorded_by: user.id }, { onConflict: 'booking_id' }).select().single()
      if (error) throw error
      await adminClient.from('bookings').update({ status: 'weighing' }).eq('id', booking.id)
      return json({ weighing: data, message: 'Weight recorded successfully' })
    }

    if (action === 'quality') {
      if (!['inspector', 'admin'].includes(profile.role)) return json({ error: 'Inspector access required' }, 403)
      if (!['pass', 'not_approved'].includes(result)) return json({ error: 'Quality result must be pass or not_approved' }, 400)
      const { data, error } = await adminClient.from('quality_inspections').upsert({ booking_id: booking.id, moisture: moisture == null ? null : Number(moisture), foreign_matter: foreignMatter == null ? null : Number(foreignMatter), result, rejection_reason: rejectionReason || null, inspected_by: user.id }, { onConflict: 'booking_id' }).select().single()
      if (error) throw error
      await adminClient.from('bookings').update({ status: 'quality' }).eq('id', booking.id)
      return json({ inspection: data, message: `Quality inspection recorded as ${result}` })
    }

    if (action === 'procure') {
      if (!['operator', 'admin'].includes(profile.role)) return json({ error: 'Operator access required' }, 403)
      if (pricePerQ == null || Number(pricePerQ) <= 0) return json({ error: 'A valid price per quintal is required' }, 400)
      const { data: weighing } = await adminClient.from('weighings').select('net_weight_q').eq('booking_id', booking.id).single()
      if (!weighing) return json({ error: 'Record weighing before completing procurement' }, 400)
      const receiptId = `RCPT-${token}-${Date.now()}`
      const { data, error } = await adminClient.from('procurements').insert({ booking_id: booking.id, receipt_id: receiptId, price_per_q: Number(pricePerQ), net_quantity_q: Number(weighing.net_weight_q), confirmed_by: user.id }).select().single()
      if (error) throw error
      await adminClient.from('bookings').update({ status: 'procured' }).eq('id', booking.id)
      return json({ procurement: data, message: 'Procurement completed successfully' })
    }

    return json({ error: 'Unsupported workflow action' }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to process workflow' }, 400)
  }
})
