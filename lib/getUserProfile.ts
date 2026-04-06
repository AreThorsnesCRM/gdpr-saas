import { createServerClient } from "@/lib/supabaseServer";

export async function getUserProfile() {
  const supabase = createServerClient();

  // 1. Hent session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;

  // 2. Hent profil fra "profiles"
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_status")
    .eq("user_id", userId)
    .single();

  return {
    email: session.user.email,
    full_name: profile?.full_name ?? "",
    subscription_status: profile?.subscription_status ?? "unknown",
  };
}
