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

    // This is an admin-only function - verify admin role
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

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      throw new Error('Admin access required')
    }

    const { enrollmentId, amount, email, phoneNumber, description, appOrigin } = await req.json()

    if (!enrollmentId || !amount || !email) {
      throw new Error('Missing required fields: enrollmentId, amount, email')
    }

    console.log('Generating recovery payment link for enrollment:', enrollmentId)

    // Get enrollment details
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('intensive_enrollments')
      .select('*, student_id')
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      throw new Error('Enrollment not found')
    }

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
    const merchantReference = `RECOVERY-${Date.now()}-${enrollmentId.substring(0, 8)}`
    const baseCallbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pesapal-callback`
    
    const orderRequest = {
      id: merchantReference,
      currency: 'KES',
      amount: parseFloat(amount),
      description: description || `Recovery Payment - December Holiday Bootcamp`,
      callback_url: baseCallbackUrl,
      redirect_mode: 'TOP_WINDOW',
      notification_id: ipnId,
      billing_address: {
        email_address: email,
        phone_number: phoneNumber || '',
        country_code: 'KE',
        first_name: email.split('@')[0] || 'Customer',
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

    console.log('Submitting recovery order to Pesapal:', orderRequest)

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
      throw new Error(`Pesapal error: ${orderData.error.message || JSON.stringify(orderData.error)}`)
    }

    if (!orderData?.redirect_url || !orderData?.order_tracking_id) {
      throw new Error('Payment gateway did not return a redirect URL')
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: enrollment.student_id,
        amount: parseFloat(amount),
        currency: 'KES',
        status: 'pending',
        payment_type: 'intensive_enrollment',
        reference_id: enrollmentId,
        phone_number: phoneNumber || '',
        pesapal_order_tracking_id: orderData.order_tracking_id,
        pesapal_merchant_reference: merchantReference,
        redirect_url: appOrigin || 'https://lanatutors.africa',
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      throw new Error('Failed to create payment record')
    }

    // Update enrollment with tracking ID
    await supabase
      .from('intensive_enrollments')
      .update({ pesapal_order_tracking_id: orderData.order_tracking_id })
      .eq('id', enrollmentId)

    console.log('Recovery payment link generated successfully')

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
    console.error('Error generating recovery payment link:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
