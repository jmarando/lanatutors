import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const callbackData = await req.json()
    console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2))

    const { Body } = callbackData
    const { stkCallback } = Body

    const resultCode = stkCallback.ResultCode
    const checkoutRequestId = stkCallback.CheckoutRequestID
    const merchantRequestId = stkCallback.MerchantRequestID

    console.log('Processing callback:', { resultCode, checkoutRequestId, merchantRequestId })

    // Find the payment record
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single()

    if (findError || !payment) {
      console.error('Payment not found:', findError)
      throw new Error('Payment record not found')
    }

    console.log('Found payment record:', payment)

    // Update payment status based on result code
    let status: 'completed' | 'failed' | 'cancelled' = 'failed'
    let mpesaReceiptNumber = null

    if (resultCode === 0) {
      // Success
      status = 'completed'
      
      // Extract M-Pesa receipt number from callback metadata
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || []
      const receiptItem = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')
      mpesaReceiptNumber = receiptItem?.Value || null

      console.log('Payment successful, receipt number:', mpesaReceiptNumber)

      // Create subscription or purchase record based on payment type
      if (payment.payment_type === 'subscription') {
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1) // 1 month subscription

        const { error: subError } = await supabase
          .from('recording_subscriptions')
          .insert({
            user_id: payment.user_id,
            amount: payment.amount,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString()
          })

        if (subError) {
          console.error('Error creating subscription:', subError)
        } else {
          console.log('Subscription created successfully')
        }
      } else if (payment.payment_type === 'single_recording' && payment.reference_id) {
        const { error: purchaseError } = await supabase
          .from('recording_purchases')
          .insert({
            user_id: payment.user_id,
            class_id: payment.reference_id,
            amount: payment.amount
          })

        if (purchaseError) {
          console.error('Error creating recording purchase:', purchaseError)
        } else {
          console.log('Recording purchase created successfully')
        }
      }
    } else if (resultCode === 1032) {
      // User cancelled
      status = 'cancelled'
      console.log('Payment cancelled by user')
    } else {
      // Other failure
      status = 'failed'
      console.log('Payment failed with code:', resultCode)
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status,
        mpesa_receipt_number: mpesaReceiptNumber
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('Error updating payment:', updateError)
      throw updateError
    }

    console.log('Payment updated successfully:', { status, mpesaReceiptNumber })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
