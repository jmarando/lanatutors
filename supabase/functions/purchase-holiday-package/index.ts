import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PackageDetails {
  curriculum: string;
  candidateLevel: string;
  subjects: string[];
  sessionsPerSubject: number;
  totalAmount: number;
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

    const { packageDetails }: { packageDetails: PackageDetails } = await req.json()

    console.log('Creating holiday package purchase:', packageDetails)

    const totalSessions = packageDetails.subjects.length * packageDetails.sessionsPerSubject

    // Create the main package purchase
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('package_purchases')
      .insert({
        student_id: user.id,
        tutor_id: '00000000-0000-0000-0000-000000000000', // Placeholder
        total_sessions: totalSessions,
        sessions_remaining: totalSessions,
        total_amount: packageDetails.totalAmount,
        payment_status: 'pending',
        expires_at: new Date('2026-01-31').toISOString(),
        metadata: {
          curriculum: packageDetails.curriculum,
          candidateLevel: packageDetails.candidateLevel,
          subjects: packageDetails.subjects,
          sessionsPerSubject: packageDetails.sessionsPerSubject,
          packageType: 'holiday_revision',
        },
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('Error creating package purchase:', purchaseError)
      throw purchaseError
    }

    console.log('Package purchase created:', purchaseData.id)

    // Create subject allocations (tutors will be assigned by admin later)
    const allocations = packageDetails.subjects.map(subject => ({
      package_purchase_id: purchaseData.id,
      subject,
      tutor_id: null,
      sessions_allocated: packageDetails.sessionsPerSubject,
      sessions_used: 0,
      sessions_remaining: packageDetails.sessionsPerSubject,
      status: 'pending_assignment',
    }))

    const { error: allocationsError } = await supabase
      .from('package_subject_allocations')
      .insert(allocations)

    if (allocationsError) {
      console.error('Error creating allocations:', allocationsError)
      // Don't fail the whole purchase if allocations fail
    }

    const description = `${packageDetails.curriculum} December Revision - ${packageDetails.subjects.join(', ')}`
    
    // Call PesaPal payment initiation
    const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
      'initiate-pesapal-payment',
      {
        body: {
          amount: packageDetails.totalAmount,
          description,
          referenceId: purchaseData.id,
          paymentType: 'holiday_package',
          callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/pesapal-callback`,
          phoneNumber: '', // Optional - PesaPal will collect it
        },
        headers: {
          Authorization: authHeader,
        },
      }
    )

    if (paymentError) {
      console.error('Error initiating payment:', paymentError)
      throw new Error('Failed to initiate payment')
    }

    console.log('Payment initiated:', paymentData)

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchaseData.id,
        payment: paymentData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in purchase-holiday-package:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
