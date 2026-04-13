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

export default function Sidebar({ profile }: { profile: any }) {
  const pathname = usePathname()

  const [status, setStatus] = useState<string>("unknown")
  const [fullName, setFullName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)

  // Hent status + profil ved første render
  useEffect(() => {
    async function loadInitial() {
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

    loadInitial()
  }, [])

  // Oppdater status + profil ved endringer (login/logout)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setStatus("unknown")
        setFullName(null)
        setEmail(null)
        setCompanyName(null)
        return
      }

      setEmail(session.user.email ?? null)

      const { data } = await supabase
        .from("profiles")
        .select("subscription_status, full_name, company_name")
        .eq("user_id", session.user.id)
        .single()

      setStatus(data?.subscription_status ?? "unknown")
      setFullName(data?.full_name ?? null)
      setCompanyName(data?.company_name ?? null)
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
  trial: "bg-blue-100 text-blue-700",      // <--- LEGG TIL DENNE
  trialing: "bg-blue-100 text-blue-700",
  canceled: "bg-gray-200 text-gray-600",
  past_due: "bg-red-100 text-red-700",
  unknown: "bg-gray-200 text-gray-600",
}


  const badgeLabel: Record<string, string> = {
  active: "Active",
  trial: "Trial",                          // <--- LEGG TIL DENNE
  trialing: "Trial",
  canceled: "Canceled",
  past_due: "Past due",
  unknown: "Unknown",
}


  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 p-6 flex flex-col fixed left-0 top-0">
      <div className="text-2xl font-bold mb-6">AreCRM</div>

      {/* Profilseksjon */}
      <div className="mb-6">
        {/* Firma-navn */}
        <div className="text-lg font-bold text-gray-900">
          {companyName ?? ""}
        </div>

        {/* Fullt navn */}
        <div className="font-semibold text-gray-800">
          {fullName ?? "Bruker"}
        </div>

        {/* E-post */}
        <div className="text-sm text-gray-500 truncate">
          {email ?? ""}
        </div>

        {/* Status-badge */}
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
