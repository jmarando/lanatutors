import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PESAPAL_BASE_URL = 'https://pay.pesapal.com/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('Pesapal IPN received:', JSON.stringify(body, null, 2))

    const { OrderTrackingId, OrderMerchantReference } = body

    if (!OrderTrackingId) {
      throw new Error('Missing OrderTrackingId in callback')
    }

    // Security: Check for duplicate processing (idempotency)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('status')
      .eq('pesapal_order_tracking_id', OrderTrackingId)
      .single()

    if (existingPayment?.status === 'completed') {
      console.log('Payment already processed, ignoring duplicate webhook')
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Pesapal access token
    const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')
    const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')

    const authResponse = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      }),
    })

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with Pesapal')
    }

    const authData = await authResponse.json()
    const accessToken = authData.token

    // Get transaction status
    const statusResponse = await fetch(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!statusResponse.ok) {
      throw new Error('Failed to get transaction status from Pesapal')
    }

    const statusData = await statusResponse.json()
    console.log('Transaction status:', statusData)

    // Security: Verify the transaction status directly with Pesapal
    // This prevents spoofed webhook data from being trusted
    if (!statusData.order_tracking_id) {
      console.error('Invalid Pesapal response - missing order_tracking_id')
      throw new Error('Invalid transaction verification')
    }

    // Find payment record
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('pesapal_order_tracking_id', OrderTrackingId)
      .single()

    if (findError || !payment) {
      console.error('Payment not found:', findError)
      throw new Error('Payment record not found')
    }

    console.log('Found payment record:', payment)

    // Security: Log webhook attempt for audit trail
    console.log('Webhook validation passed for order:', OrderTrackingId, 'User:', payment.user_id)

    // Map Pesapal status to our status
    let status: 'completed' | 'failed' | 'cancelled' | 'pending' = 'pending'
    
    switch (statusData.payment_status_description?.toLowerCase()) {
      case 'completed':
        status = 'completed'
        break
      case 'failed':
        status = 'failed'
        break
      case 'cancelled':
        status = 'cancelled'
        break
      default:
        status = 'pending'
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status,
        pesapal_confirmation_code: statusData.confirmation_code,
        pesapal_payment_method: statusData.payment_method,
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      throw updateError
    }

    console.log('Payment updated successfully:', { status, confirmation_code: statusData.confirmation_code })

    // Handle payment completion
    if (status === 'completed') {
      console.log('Payment completed successfully')

      // If this is for a booking, update the booking status
      if (payment.reference_id && payment.payment_type === 'booking') {
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', payment.reference_id)

        if (bookingError) {
          console.error('Error updating booking:', bookingError)
        } else {
          console.log('Booking confirmed:', payment.reference_id)

          // Send confirmation email
          const { data: booking } = await supabase
            .from('bookings')
            .select('*, student:student_id(*)')
            .eq('id', payment.reference_id)
            .single()

          if (booking) {
            await supabase.functions.invoke('send-booking-email', {
              body: {
                booking,
                user: booking.student,
              },
            })
          }
        }
      }

      // Handle subscription payments
      if (payment.payment_type === 'subscription') {
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1)

        await supabase
          .from('recording_subscriptions')
          .insert({
            user_id: payment.user_id,
            amount: payment.amount,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
          })
      }

      // Handle single recording purchase
      if (payment.payment_type === 'single_recording' && payment.reference_id) {
        await supabase
          .from('recording_purchases')
          .insert({
            user_id: payment.user_id,
            class_id: payment.reference_id,
            amount: payment.amount,
          })
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing Pesapal callback:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
