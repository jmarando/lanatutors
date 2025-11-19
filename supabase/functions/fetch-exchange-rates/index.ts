import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'UGX', 'TZS', 'KES'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Fetching exchange rates from API...");

    // Fetch exchange rates from free API (base currency KES)
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/KES");
    
    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data = await response.json();
    console.log("Exchange rates fetched successfully");

    // Prepare rates for supported currencies
    const ratesToInsert = SUPPORTED_CURRENCIES
      .filter(currency => currency !== 'KES') // Don't store KES to KES
      .map(currency => ({
        base_currency: 'KES',
        target_currency: currency,
        rate: data.rates[currency] || 1.0,
        updated_at: new Date().toISOString()
      }));

    // Upsert rates into database
    const { error: upsertError } = await supabase
      .from('exchange_rates')
      .upsert(ratesToInsert, {
        onConflict: 'base_currency,target_currency',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error("Error upserting rates:", upsertError);
      throw upsertError;
    }

    console.log(`Updated ${ratesToInsert.length} exchange rates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        rates: data.rates,
        updated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching exchange rates:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
