import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { toZonedTime, fromZonedTime } from "https://esm.sh/date-fns-tz@3.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    // Get the authenticated user using the bearer token explicitly
    const jwt = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { weeksAhead = 4 } = await req.json();

    console.log(`Generating availability for user ${user.id} for ${weeksAhead} weeks ahead`);

    // Verify user is a tutor
    const { data: tutorProfile, error: tutorError } = await supabaseClient
      .from('tutor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (tutorError || !tutorProfile) {
      console.error('Tutor profile not found:', tutorError);
      return new Response(
        JSON.stringify({ error: 'Tutor profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Generate time slots for the next X weeks in East Africa Time
    const slots = [];
    const timezone = 'Africa/Nairobi'; // East Africa Time (UTC+3)
    const now = new Date();
    const nowInEAT = toZonedTime(now, timezone);
    
    const startDate = new Date(nowInEAT);
    startDate.setHours(0, 0, 0, 0);

    for (let week = 0; week < weeksAhead; week++) {
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (week * 7) + day);

        // Generate hourly slots from 6 AM to 10 PM EAT (16 slots per day)
        for (let hour = 6; hour < 22; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);

          const slotEnd = new Date(currentDate);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          // Only create slots for future times
          if (slotStart > nowInEAT) {
            // Convert EAT times to UTC for storage
            const slotStartUTC = fromZonedTime(slotStart, timezone);
            const slotEndUTC = fromZonedTime(slotEnd, timezone);
            
            slots.push({
              tutor_id: user.id,
              start_time: slotStartUTC.toISOString(),
              end_time: slotEndUTC.toISOString(),
              is_booked: false,
              slot_type: 'available', // Mark as available for booking
            });
          }
        }
      }
    }

    console.log(`Generated ${slots.length} time slots`);

    // Check for existing slots to avoid duplicates
    const { data: existingSlots, error: fetchError } = await supabaseClient
      .from('tutor_availability')
      .select('start_time, end_time')
      .eq('tutor_id', user.id)
      .gte('start_time', now.toISOString());

    if (fetchError) {
      console.error('Error fetching existing slots:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Error checking existing slots' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Filter out slots that already exist
    const existingSlotKeys = new Set(
      existingSlots?.map(slot => `${slot.start_time}_${slot.end_time}`) || []
    );

    const newSlots = slots.filter(slot => 
      !existingSlotKeys.has(`${slot.start_time}_${slot.end_time}`)
    );

    console.log(`Inserting ${newSlots.length} new slots (${slots.length - newSlots.length} already exist)`);

    if (newSlots.length > 0) {
      // Insert in batches to avoid timeout
      const batchSize = 500;
      for (let i = 0; i < newSlots.length; i += batchSize) {
        const batch = newSlots.slice(i, i + batchSize);
        const { error: insertError } = await supabaseClient
          .from('tutor_availability')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
          return new Response(
            JSON.stringify({ error: 'Error creating availability slots' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        slotsCreated: newSlots.length,
        message: `Successfully generated ${newSlots.length} availability slots`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in generate-weekly-availability:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
