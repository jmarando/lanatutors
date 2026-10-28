import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  userId: string | null;
  isAdmin: boolean;
  error: Response | null;
}

const json = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Verifies the caller's JWT. Returns the user id and whether the user is a platform admin.
 * On failure, `error` holds a ready-to-return 401 Response.
 */
export async function authenticate(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, isAdmin: false, error: json({ error: "Unauthorized" }, 401, corsHeaders) };
  }

  const token = authHeader.replace("Bearer ", "");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    return { userId: null, isAdmin: false, error: json({ error: "Unauthorized" }, 401, corsHeaders) };
  }

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");

  return { userId: data.user.id, isAdmin, error: null };
}

/** Verifies the caller is authenticated AND has the admin role. */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthResult> {
  const result = await authenticate(req, corsHeaders);
  if (result.error) return result;
  if (!result.isAdmin) {
    return {
      userId: result.userId,
      isAdmin: false,
      error: json({ error: "Forbidden" }, 403, corsHeaders),
    };
  }
  return result;
}
