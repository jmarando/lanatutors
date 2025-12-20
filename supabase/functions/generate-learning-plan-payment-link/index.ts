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

    const { 
      planId, 
      amount, 
      parentEmail, 
      parentPhone, 
      studentName, 
      description,
      isDeposit 
    } = await req.json()

    console.log('Generating payment link - Amount:', amount, 'Plan:', planId, 'Deposit:', isDeposit)

    // Step 1: Get Pesapal access token
    const consumerKey = Deno.env.get('PESAPAL_CONSUMER_KEY')
    const consumerSecret = Deno.env.get('PESAPAL_CONSUMER_SECRET')

    if (!consumerKey || !consumerSecret) {
      throw new Error('Pesapal credentials not configured')
    }

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

    // Step 2: Register IPN URL
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
    }

    // Step 3: Submit order request
    const depositLabel = isDeposit ? '-DEPOSIT' : ''
    const merchantReference = `PLAN${depositLabel}-${Date.now()}-${planId.substring(0, 8)}`
    
    // Callback URL that will handle the payment confirmation
    const callbackUrl = `https://lanatutors.africa/payment-callback`
    
    const orderRequest = {
      id: merchantReference,
      currency: 'KES',
      amount: parseFloat(amount),
      description: description || `Learning Plan Payment for ${studentName}`,
      callback_url: callbackUrl,
      redirect_mode: 'TOP_WINDOW',
      notification_id: ipnId,
      billing_address: {
        email_address: parentEmail,
        phone_number: parentPhone || '',
        country_code: 'KE',
        first_name: parentEmail?.split('@')[0] || 'Customer',
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

    if (orderData?.error) {
      const gatewayMessage = typeof orderData.error === 'object'
        ? (orderData.error.message || JSON.stringify(orderData.error))
        : String(orderData.error)
      console.error('Pesapal gateway error:', orderData.error)
      throw new Error(gatewayMessage)
    }

    if (!orderData?.redirect_url || !orderData?.order_tracking_id) {
      console.error('Missing redirect_url or order_tracking_id from Pesapal response')
      throw new Error('Payment gateway did not return a redirect URL')
    }

    console.log('Payment link generated:', orderData.redirect_url)

    return new Response(
      JSON.stringify({
        success: true,
        paymentLink: orderData.redirect_url,
        orderTrackingId: orderData.order_tracking_id,
        merchantReference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-learning-plan-payment-link:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
