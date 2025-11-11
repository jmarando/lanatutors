import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneValidationRequest {
  phoneNumber: string;
}

/**
 * Validates Kenyan phone numbers in multiple formats
 * Accepts: +254XXXXXXXXX, 254XXXXXXXXX, or 0XXXXXXXXX
 * Returns normalized format: 254XXXXXXXXX
 */
const validateAndNormalizePhone = (phone: string): { isValid: boolean; normalized: string; error?: string } => {
  // Remove all spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // Check for +254 format
  if (cleaned.match(/^\+254[0-9]{9}$/)) {
    return {
      isValid: true,
      normalized: cleaned.substring(1) // Remove the +
    };
  }
  
  // Check for 254 format
  if (cleaned.match(/^254[0-9]{9}$/)) {
    return {
      isValid: true,
      normalized: cleaned
    };
  }
  
  // Check for 0 format (Kenyan local)
  if (cleaned.match(/^0[0-9]{9}$/)) {
    return {
      isValid: true,
      normalized: '254' + cleaned.substring(1) // Replace 0 with 254
    };
  }
  
  return {
    isValid: false,
    normalized: cleaned,
    error: "Phone number must be in format: +254XXXXXXXXX, 254XXXXXXXXX, or 0XXXXXXXXX"
  };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber }: PhoneValidationRequest = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const validation = validateAndNormalizePhone(phoneNumber);

    return new Response(
      JSON.stringify(validation),
      {
        status: validation.isValid ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Phone validation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
