"use client"

import { useAuth } from "@/lib/AuthContext"

export default function LogoutButton() {
  const { logout } = useAuth()

  return (
    <button
      onClick={logout}
      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded"
    >
      Logg ut
    </button>
  )
}
