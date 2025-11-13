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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { amount, description, referenceId, paymentType, callbackUrl, phoneNumber } = await req.json()

    console.log('Initiating payment - Amount:', amount, 'Type:', paymentType, 'Phone:', phoneNumber)

    // Step 1: Get Pesapal access token
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
      const errorText = await authResponse.text()
      console.error('Pesapal auth error:', errorText)
      throw new Error(`Failed to authenticate with Pesapal: ${errorText}`)
    }

    const authData = await authResponse.json()
    const accessToken = authData.token

    console.log('Pesapal access token obtained')

    // Step 2: Register IPN URL (if not already registered)
    const ipnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pesapal-callback`
    
    const ipnResponse = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        url: ipnUrl,
        ipn_notification_type: 'POST',
      }),
    })

    let ipnId = null
    if (ipnResponse.ok) {
      const ipnData = await ipnResponse.json()
      ipnId = ipnData.ipn_id
      console.log('IPN registered:', ipnId)
    } else {
      console.log('IPN registration skipped or already exists')
    }

    // Step 3: Submit order request
    const merchantReference = `ORDER-${Date.now()}-${user.id.substring(0, 8)}`
    
    // Pesapal will append OrderTrackingId as a query parameter to the callback URL
    const baseCallbackUrl = callbackUrl || `${Deno.env.get('SUPABASE_URL')}/functions/v1/pesapal-callback`
    
    const orderRequest = {
      id: merchantReference,
      currency: 'KES',
      amount: parseFloat(amount),
      description: description || 'Payment',
      callback_url: baseCallbackUrl,
      redirect_mode: 'TOP_WINDOW', // Ensures redirect happens in the same window
      notification_id: ipnId,
      billing_address: {
        email_address: user.email,
        phone_number: phoneNumber || '',
        country_code: 'KE',
        first_name: user.email?.split('@')[0] || 'Customer',
        middle_name: '',
        last_name: '',
        line_1: '',
        line_2: '',
        city: '',
        state: '',
        postal_code: '',
        zip_code: '',
      },
    }

    console.log('Submitting order to Pesapal:', orderRequest)

    const orderResponse = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderRequest),
    })

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text()
      console.error('Pesapal order submission error:', errorText)
      throw new Error(`Failed to submit order to Pesapal: ${errorText}`)
    }

    const orderData = await orderResponse.json()
    console.log('Pesapal order response:', orderData)

    // If Pesapal returned an error in the payload, surface it and stop here
    if (orderData?.error) {
      const gatewayMessage = typeof orderData.error === 'object'
        ? (orderData.error.message || JSON.stringify(orderData.error))
        : String(orderData.error)
      console.error('Pesapal gateway error:', orderData.error)
      return new Response(
        JSON.stringify({ success: false, error: gatewayMessage, code: orderData.error.code }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Defensive check: redirect_url and order_tracking_id must exist
    if (!orderData?.redirect_url || !orderData?.order_tracking_id) {
      console.error('Missing redirect_url or order_tracking_id from Pesapal response')
      return new Response(
        JSON.stringify({ success: false, error: 'Payment gateway did not return a redirect URL. Please try again later.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: parseFloat(amount),
        status: 'pending',
        payment_type: paymentType || 'booking',
        reference_id: referenceId,
        phone_number: '', // Pesapal doesn't require phone upfront
        pesapal_order_tracking_id: orderData.order_tracking_id,
        pesapal_merchant_reference: merchantReference,
        redirect_url: orderData.redirect_url,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create payment record.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Payment record created:', payment.id)

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        redirect_url: orderData.redirect_url,
        order_tracking_id: orderData.order_tracking_id,
        merchant_reference: merchantReference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in initiate-pesapal-payment:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
