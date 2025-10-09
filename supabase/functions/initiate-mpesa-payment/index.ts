import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Placeholder M-Pesa credentials - to be replaced with actual values
const MPESA_CONSUMER_KEY = "PLACEHOLDER_CONSUMER_KEY"
const MPESA_CONSUMER_SECRET = "PLACEHOLDER_CONSUMER_SECRET"
const MPESA_SHORTCODE = "174379"
const MPESA_PASSKEY = "PLACEHOLDER_PASSKEY"
const MPESA_CALLBACK_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phoneNumber, amount, paymentType, referenceId, classId } = await req.json()

    console.log('Initiating M-Pesa payment:', { phoneNumber, amount, paymentType, referenceId, classId })

    // Get auth user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get M-Pesa access token
    const authString = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`)
    const tokenResponse = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authString}`
        }
      }
    )

    const { access_token } = await tokenResponse.json()
    console.log('M-Pesa access token obtained')

    // Prepare STK Push request
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = btoa(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`)

    const stkPushPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: referenceId || 'Recording Payment',
      TransactionDesc: `Payment for ${paymentType}`
    }

    console.log('Sending STK Push request')

    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stkPushPayload)
      }
    )

    const stkData = await stkResponse.json()
    console.log('STK Push response:', stkData)

    // Record payment in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        phone_number: phoneNumber,
        amount: amount,
        payment_type: paymentType,
        status: 'pending',
        checkout_request_id: stkData.CheckoutRequestID,
        merchant_request_id: stkData.MerchantRequestID,
        reference_id: referenceId || classId
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error recording payment:', paymentError)
      throw paymentError
    }

    console.log('Payment recorded in database:', payment)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK push sent successfully',
        checkoutRequestId: stkData.CheckoutRequestID,
        paymentId: payment.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error initiating M-Pesa payment:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
