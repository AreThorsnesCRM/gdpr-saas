"use client"

import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded"
    >
      Logg ut
    </button>
  )
}
