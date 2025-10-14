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

    const { phoneNumber, amount, paymentType, referenceId, classId, testMode } = await req.json()

    console.log('Initiating M-Pesa payment:', { phoneNumber, amount, paymentType, referenceId, classId, testMode })

    // Get auth user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    // TEST MODE: Skip actual M-Pesa API call and auto-confirm
    if (testMode === true) {
      console.log('TEST MODE: Simulating successful payment')
      
      // Record test payment in database as completed
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          phone_number: phoneNumber,
          amount: amount,
          payment_type: paymentType,
          status: 'completed',
          checkout_request_id: `TEST-${Date.now()}`,
          merchant_request_id: `TEST-MERCHANT-${Date.now()}`,
          mpesa_receipt_number: `TEST-RECEIPT-${Date.now()}`,
          reference_id: referenceId || classId
        })
        .select()
        .single()

      if (paymentError) {
        console.error('Error recording test payment:', paymentError)
        throw paymentError
      }

      // Update booking to confirmed and send email
      if (referenceId) {
        console.log('Updating booking to confirmed:', referenceId)

        // Update status and fetch booking base fields
        const { data: bookingBase, error: bookingUpdateError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', referenceId)
          .select('*')
          .single()

        if (bookingUpdateError) {
          console.error('Error updating booking:', bookingUpdateError)
        } else if (bookingBase) {
          console.log('Booking confirmed, fetching related details for email')

          // Fetch slot times
          const { data: slot } = await supabase
            .from('tutor_availability')
            .select('start_time, end_time')
            .eq('id', bookingBase.availability_slot_id)
            .single()

          // Fetch tutor profile to get user_id
          // Note: bookings.tutor_id references tutor_profiles.id
          const { data: tutorProfileRow } = await supabase
            .from('tutor_profiles')
            .select('id, user_id')
            .eq('id', bookingBase.tutor_id)
            .single()
          
          console.log('Tutor profile lookup:', { tutor_id: bookingBase.tutor_id, tutorProfileRow })

          // Get names from profiles
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', bookingBase.student_id)
            .single()

          let tutorProfile = null
          let tutorUserId = tutorProfileRow?.user_id || bookingBase.tutor_id
          // Fallback: if booking stored tutor user_id instead of profile id, we still resolve name/email
          if (tutorUserId) {
            const { data } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', tutorUserId)
              .maybeSingle()
            tutorProfile = data
          }

          // Get emails using admin API only if we have valid UUIDs
          let studentEmail = null
          let tutorEmail = null

          if (bookingBase.student_id) {
            try {
              const { data: studentAuth } = await supabase.auth.admin.getUserById(bookingBase.student_id)
              studentEmail = studentAuth?.user?.email
            } catch (err) {
              console.error('Error fetching student email:', err)
            }
          }

          if (tutorUserId) {
            try {
              const { data: tutorAuth } = await supabase.auth.admin.getUserById(tutorUserId)
              tutorEmail = tutorAuth?.user?.email
            } catch (err) {
              console.error('Error fetching tutor email:', err)
            }
          }

          console.log('Student email:', studentEmail, 'Tutor email:', tutorEmail)

          if (studentEmail && tutorEmail) {
            console.log('Invoking send-booking-email function')

            const emailPayload = {
              studentEmail: studentEmail,
              studentName: studentProfile?.full_name || 'Student',
              tutorEmail: tutorEmail,
              tutorName: tutorProfile?.full_name || 'Tutor',
              subject: bookingBase.subject,
              startTime: slot?.start_time || new Date().toISOString(),
              endTime: slot?.end_time || new Date(Date.now() + 60*60*1000).toISOString(),
              meetingLink: bookingBase.meeting_link,
              depositPaid: bookingBase.deposit_paid || 0,
              balanceDue: bookingBase.balance_due || 0,
              totalAmount: bookingBase.amount,
              classType: bookingBase.class_type
            }

            console.log('Email payload:', emailPayload)

            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-booking-email', {
              body: emailPayload
            })

            if (emailError) {
              console.error('Error sending booking email:', emailError)
            } else {
              console.log('Booking email sent successfully:', emailResult)
            }
          } else {
            console.error('Missing email addresses - Student:', studentEmail, 'Tutor:', tutorEmail)
          }
        }
      }

      console.log('Test payment recorded and booking confirmed:', payment)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'TEST MODE: Payment simulated successfully',
          checkoutRequestId: payment.checkout_request_id,
          paymentId: payment.id,
          testMode: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PRODUCTION MODE: Actual M-Pesa payment flow
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
