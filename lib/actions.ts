"use server"

import { createSupabaseServerClient } from "@/lib/supabaseServer"

export async function getProfile() {
  const supabase = await createSupabaseServerClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }

  return profile
}