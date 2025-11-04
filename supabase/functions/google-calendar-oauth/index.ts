import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    
    // Handle OAuth callback
    if (url.pathname.includes('/callback')) {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // Contains tutorId or 'central-calendar'
      
      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      const isCentral = state === 'central-calendar';
      const tutorId = isCentral ? null : state;

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          redirect_uri: `${supabaseUrl}/functions/v1/google-calendar-oauth/callback`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json();

      // Get user email from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      
      const userInfo = await userInfoResponse.json();

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      // Store tokens
      if (isCentral) {
        const { error: upsertError } = await supabase
          .from('central_calendar_config')
          .upsert({
            id: 'central-calendar',
            google_oauth_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token,
            google_token_expires_at: expiresAt.toISOString(),
            google_email: userInfo.email,
            updated_at: new Date().toISOString(),
          });

        if (upsertError) {
          console.error('Failed to store central calendar tokens:', upsertError);
          throw upsertError;
        }

        // Redirect back to setup page with success
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `${url.origin}/setup-central-calendar?success=true&email=${encodeURIComponent(userInfo.email)}`,
          },
        });
      } else {
        // Update tutor profile with OAuth tokens
        const { error: updateError } = await supabase
          .from('tutor_profiles')
          .update({
            google_calendar_connected: true,
            google_oauth_token: tokens.access_token,
            google_refresh_token: tokens.refresh_token,
            google_token_expires_at: expiresAt.toISOString(),
            google_calendar_email: userInfo.email,
            calendar_sync_enabled: true,
          })
          .eq('id', tutorId!);

        if (updateError) {
          console.error('Failed to update tutor profile:', updateError);
          throw updateError;
        }

        // Redirect back to tutor dashboard with success
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': `${url.origin}/tutor-dashboard?calendar_connected=true`,
          },
        });
      }
    }

    // Handle OAuth initiation
    const { tutorId } = await req.json();
    
    if (!tutorId) {
      throw new Error('Tutor ID is required');
    }

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-oauth/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', tutorId);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in google-calendar-oauth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
