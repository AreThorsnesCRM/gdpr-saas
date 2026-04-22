"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline"
import LogoutButton from "../logout/LogoutButton"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function Sidebar() {
  const pathname = usePathname()

  const [status, setStatus] = useState<string>("loading")
  const [fullName, setFullName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  // -----------------------------
  // 1. Vent på session før vi henter profil
  // -----------------------------
  useEffect(() => {
    async function waitForSession() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (sessionData?.session) {
        setSessionReady(true)
        return
      }

      // Hvis session ikke er klar, vent på onAuthStateChange
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setSessionReady(true)
        }
      })

      return () => subscription.unsubscribe()
    }

    waitForSession()
  }, [])

  // -----------------------------
  // 2. Når session er klar → hent profil
  // -----------------------------
  useEffect(() => {
    if (!sessionReady) return

    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData?.user) {
        setStatus("unknown")
        return
      }

      setEmail(userData.user.email ?? null)

      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, full_name, company_name")
        .eq("user_id", userData.user.id)
        .single()

      setStatus(data?.subscription_status ?? "unknown")
      setFullName(data?.full_name ?? null)
      setCompanyName(data?.company_name ?? null)
    }

    loadProfile()
  }, [sessionReady])

  // -----------------------------
  // 3. Oppdater profil ved login/logout
  // -----------------------------
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Sidebar] Auth event:", event)
      
      // Hvis sessionen forsvinner, tøm profildata.
      if (!session?.user) {
        setStatus("unknown")
        setFullName(null)
        setEmail(null)
        setCompanyName(null)
        return
      }

      // Bare hent profil når brukeren er logget inn eller oppdatert.
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        setEmail(session.user.email ?? null)

        const { data } = await supabase
          .from("profiles")
          .select("subscription_status, full_name, company_name")
          .eq("user_id", session.user.id)
          .single()

        setStatus(data?.subscription_status ?? "unknown")
        setFullName(data?.full_name ?? null)
        setCompanyName(data?.company_name ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <HomeIcon className="h-5 w-5" /> },
    { href: "/customers", label: "Kunder", icon: <UserGroupIcon className="h-5 w-5" /> },
    { href: "/agreements", label: "Avtaler", icon: <DocumentTextIcon className="h-5 w-5" /> },
    { href: "/archive", label: "Arkiv", icon: <ArchiveBoxIcon className="h-5 w-5" /> },
    { href: "/settings", label: "Innstillinger", icon: <Cog6ToothIcon className="h-5 w-5" /> },
  ]

  const badgeStyles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-red-100 text-red-700",
    canceled: "bg-gray-200 text-gray-600",
    unknown: "bg-gray-200 text-gray-600",
    loading: "bg-gray-200 text-gray-600",
  }

  const badgeLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    canceled: "Canceled",
    unknown: "Unknown",
    loading: "Loading...",
  }

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 p-6 flex flex-col fixed left-0 top-0">
      <div className="text-2xl font-bold mb-6">AreCRM</div>

      {/* Profilseksjon */}
      <div className="mb-6">
        <div className="text-lg font-bold text-gray-900">
          {companyName ?? ""}
        </div>

        <div className="font-semibold text-gray-800">
          {fullName ?? "Bruker"}
        </div>

        <div className="text-sm text-gray-500 truncate">
          {email ?? ""}
        </div>

        <span
          className={`inline-block mt-2 rounded px-2 py-0.5 text-xs font-medium ${badgeStyles[status]}`}
        >
          {badgeLabel[status]}
        </span>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
                ${isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}
              `}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200">
        <LogoutButton />
      </div>

      <div className="mt-4 text-sm text-gray-400">
        © {new Date().getFullYear()} AreCRM
      </div>
    </aside>
  )
}
