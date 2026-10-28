import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Social sign-in creates an auth user with no profile row or role.
 * This makes sure a first-time Google user gets a profile and the student role
 * so the normal parent/student dashboard flow works.
 */
export async function ensureUserBootstrap(user: User) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      full_name:
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email ||
        "New user",
      avatar_url: (user.user_metadata?.avatar_url as string) || null,
    });
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!role) {
    await supabase.rpc("assign_user_role", { _user_id: user.id, _role: "student" });
  }
}
