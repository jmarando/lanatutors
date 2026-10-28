// Shared authorization guard for "internal" edge functions — those that should only
// ever be invoked by (a) another edge function using the service-role key, or
// (b) a signed-in user (optionally required to hold the 'admin' role).
//
// Why this exists: setting verify_jwt=true is NOT enough on its own, because the
// project's public anon key is itself a valid JWT and would pass that gate. These
// functions send templated email / WhatsApp to addresses taken from the request
// body, so left open they can be used as a spam/phishing relay from our own domain.
//
// Usage inside a function handler, right after the OPTIONS check:
//   const guard = await guardInternal(req, { requireAdmin: true });
//   if (!guard.ok) return new Response(JSON.stringify({ error: guard.message }),
//     { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface GuardResult {
  ok: boolean;
  status?: number;
  message?: string;
  userId?: string;
  isServiceRole?: boolean;
  isAdmin?: boolean;
}

export async function guardInternal(
  req: Request,
  opts: { requireAdmin?: boolean } = {},
): Promise<GuardResult> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return { ok: false, status: 401, message: "Unauthorized" };

  // (a) Trusted server-to-server call using the exact service-role key.
  if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) {
    return { ok: true, isServiceRole: true };
  }

  // (b) A real signed-in user. getUser() returns a user only for a genuine user
  // access token; the anon key resolves to no user and is therefore rejected.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, message: "Unauthorized" };

  if (opts.requireAdmin) {
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return { ok: false, status: 403, message: "Forbidden: admin role required" };
    return { ok: true, userId: user.id, isAdmin: true };
  }

  return { ok: true, userId: user.id };
}
