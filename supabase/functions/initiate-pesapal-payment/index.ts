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

    const { amount, description, referenceId, paymentType, callbackUrl, phoneNumber, currency, appOrigin } = await req.json()

    // Only allow redirects back to known application origins
    const ALLOWED_ORIGINS = [
      'https://lanatutors.africa',
      'https://www.lanatutors.africa',
      'https://lanatutors.lovable.app',
    ]
    const isAllowedOrigin = (origin: string) =>
      ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin)

    let safeOrigin = ALLOWED_ORIGINS[0]
    if (appOrigin) {
      const trimmed = String(appOrigin).replace(/\/+$/, '')
      if (!isAllowedOrigin(trimmed)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid redirect origin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      safeOrigin = trimmed
    }

    console.log('Initiating payment - Amount:', amount, 'Currency:', currency || 'KES', 'Type:', paymentType)

    // Validate phone number before processing payment
    if (phoneNumber) {
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-phone', {
        body: { phoneNumber }
      })

      if (validationError || !validationResult?.isValid) {
        console.error('Phone validation failed:', validationError || 'Invalid phone number')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid phone number format. Please provide a valid phone number.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // --- Server-side amount & currency validation (prevents client price tampering) ---
    // The amount a client may pay is derived from the referenced record, never trusted
    // from the request body. Every flow charges in the record's own currency (KES unless
    // the record stores otherwise). An authenticated user could otherwise invoke this with
    // amount: 1 and have the booking/enrollment confirmed for a nominal sum.
    const pt = paymentType || 'booking'
    const round2 = (n: unknown) => Math.round(Number(n))
    const clientAmount = round2(amount)
    const clientCurrency = String(currency || 'KES').toUpperCase()

    if (!Number.isFinite(clientAmount) || clientAmount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payment amount.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resolveExpected = async (): Promise<{ currency: string; allowed: number[] } | null> => {
      switch (pt) {
        case 'booking':
        case 'tutor_booking_deposit':
        case 'booking_balance': {
          if (!referenceId) return null
          const { data: b } = await supabase
            .from('bookings')
            .select('amount, balance_due, currency')
            .eq('id', referenceId)
            .maybeSingle()
          if (!b) return null
          const cur = String(b.currency || 'KES').toUpperCase()
          const full = Number(b.amount) || 0
          if (pt === 'booking_balance') {
            return { currency: cur, allowed: [round2(b.balance_due)].filter((n) => n > 0) }
          }
          // full payment, 30% deposit, 1% deposit (special tutor), or remaining balance
          return {
            currency: cur,
            allowed: [full, full * 0.3, full * 0.01, Number(b.balance_due) || 0]
              .map(round2)
              .filter((n) => n > 0),
          }
        }
        case 'package_purchase':
        case 'package':
        case 'multi_package': {
          if (!referenceId) return null
          const { data: p } = await supabase
            .from('package_purchases')
            .select('total_amount, currency')
            .eq('id', referenceId)
            .maybeSingle()
          if (!p) return null
          const cur = String(p.currency || 'KES').toUpperCase()
          const total = Number(p.total_amount) || 0
          return { currency: cur, allowed: [total, total * 0.3, total * 0.01].map(round2).filter((n) => n > 0) }
        }
        case 'intensive_enrollment': {
          if (!referenceId) return null
          const { data: e } = await supabase
            .from('intensive_enrollments')
            .select('total_amount')
            .eq('id', referenceId)
            .maybeSingle()
          if (!e) return null
          const total = Number(e.total_amount) || 0
          return { currency: 'KES', allowed: [total, total * 0.3].map(round2).filter((n) => n > 0) }
        }
        case 'group_class_enrollment': {
          if (!referenceId) return null
          const { data: g } = await supabase
            .from('group_class_enrollments')
            .select('amount_paid')
            .eq('id', referenceId)
            .maybeSingle()
          if (!g) return null
          return { currency: 'KES', allowed: [round2(g.amount_paid)].filter((n) => n > 0) }
        }
        case 'subscription':
          return { currency: 'KES', allowed: [500] }
        case 'single_recording':
          return { currency: 'KES', allowed: [200] }
        default:
          return null
      }
    }

    const expected = await resolveExpected()
    if (!expected || expected.allowed.length === 0) {
      console.error('Amount validation failed: could not resolve expected price', { paymentType: pt, referenceId })
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to verify the amount for this order.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (clientCurrency !== expected.currency) {
      console.error('Currency mismatch on payment', { clientCurrency, expected: expected.currency, paymentType: pt, referenceId })
      return new Response(
        JSON.stringify({ success: false, error: 'Payment currency does not match this order.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Snap to the nearest legitimate amount; ±2 absorbs client/server rounding differences.
    const chargeAmount = expected.allowed.find((a) => Math.abs(a - clientAmount) <= 2)
    if (chargeAmount === undefined) {
      console.error('Payment amount rejected (does not match order)', {
        clientAmount, allowed: expected.allowed, paymentType: pt, referenceId, userId: user.id,
      })
      return new Response(
        JSON.stringify({ success: false, error: 'Payment amount does not match this order.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const chargeCurrency = expected.currency
    // --- end amount validation ---

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
      currency: chargeCurrency,
      amount: chargeAmount,
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
    // Store app origin URL for callback redirects
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: chargeAmount,
        currency: chargeCurrency,
        status: 'pending',
        payment_type: paymentType || 'booking',
        reference_id: referenceId,
        phone_number: phoneNumber || '',
        pesapal_order_tracking_id: orderData.order_tracking_id,
        pesapal_merchant_reference: merchantReference,
        redirect_url: safeOrigin, // Validated app origin for callback redirects
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

    console.log('Payment record created:', payment.id, 'for user:', user.id, 'Amount:', amount, currency || 'KES')

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
