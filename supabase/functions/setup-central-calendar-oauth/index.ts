import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle OAuth callback
    if (path.endsWith('/callback')) {
      const code = url.searchParams.get('code');
      
      if (!code) {
        throw new Error('No authorization code received');
      }

      console.log('Exchanging code for tokens...');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/setup-central-calendar-oauth/callback`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token exchange failed:', error);
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();
      
      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      const userInfo = await userInfoResponse.json();
      console.log('Connected Google account:', userInfo.email);

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      // Store tokens as Supabase secrets
      // Note: In production, you would use Supabase Vault or secure secret management
      // For now, we'll store in a dedicated table
      const { error: upsertError } = await supabaseClient
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
        console.error('Failed to store tokens:', upsertError);
        throw upsertError;
      }

      console.log('Central calendar tokens stored successfully');

      // Redirect back to setup page with success
      return Response.redirect(
        `${url.origin}/setup-central-calendar?success=true&email=${encodeURIComponent(userInfo.email)}`,
        302
      );
    }

    // Handle OAuth initiation
    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/setup-central-calendar-oauth/callback`;
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', Deno.env.get('GOOGLE_CLIENT_ID')!);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', 'central-calendar');

    console.log('Generated OAuth URL for central calendar setup');

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in setup-central-calendar-oauth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
