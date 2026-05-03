"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline"
import { useAuth } from "@/lib/AuthContext"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/customers", label: "Kunder", icon: UserGroupIcon },
  { href: "/agreements", label: "Avtaler", icon: DocumentTextIcon },
  { href: "/agreements?filter=archived", label: "Arkiv", icon: ArchiveBoxIcon },
  { href: "/templates", label: "Maler", icon: ClipboardDocumentListIcon },
  { href: "/settings", label: "Innstillinger", icon: Cog6ToothIcon },
]

const badgeStyles: Record<string, string> = {
  active:   "bg-green-500/20 text-green-400 ring-1 ring-green-500/30",
  trialing: "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30",
  past_due: "bg-red-500/20 text-red-400 ring-1 ring-red-500/30",
  canceled: "bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/30",
  unknown:  "bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/30",
  loading:  "bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/30",
}

const badgeLabel: Record<string, string> = {
  active:   "Aktivt",
  trialing: "Prøveperiode",
  past_due: "Forfalt",
  canceled: "Avsluttet",
  unknown:  "Ukjent",
  loading:  "Laster...",
}

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, account, role, loading, logout } = useAuth()

  const status = loading ? "loading" : account?.subscription_status ?? "unknown"
  const fullName = profile?.full_name ?? ""
  const companyName = account?.name ?? "AreCRM"
  const isAdmin = role === "admin"

  return (
    <aside className="w-64 h-screen bg-slate-900 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <span className="text-xl font-bold text-white tracking-tight">AreCRM</span>
      </div>

      {/* Firma og bruker */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="text-sm font-semibold text-white truncate">{companyName}</div>
        {fullName && (
          <div className="text-xs text-slate-400 mt-0.5 truncate">{fullName}</div>
        )}
        {isAdmin && (
          <span className={`inline-block mt-2.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyles[status]}`}>
            {badgeLabel[status]}
          </span>
        )}
      </div>

      {/* Navigasjon */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const basePath = href.split("?")[0]
          const isActive =
            pathname === href ||
            (basePath !== "/dashboard" && pathname.startsWith(basePath) && !href.includes("?filter=archived")) ||
            (href.includes("?filter=archived") && pathname === "/agreements" && false)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bunn: logg ut + copyright */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-700/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="h-4 w-4 shrink-0" />
          Logg ut
        </button>
        <div className="text-xs text-slate-600 mt-3 px-3">
          © {new Date().getFullYear()} AreCRM
        </div>
      </div>
    </aside>
  )
}
