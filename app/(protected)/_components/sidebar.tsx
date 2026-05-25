"use client"

import { useEffect } from "react"
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
  XMarkIcon,
} from "@heroicons/react/24/outline"
import { useAuth } from "@/lib/AuthContext"
import { useTranslations } from "next-intl"
import LanguageSwitcher from "@/app/components/LanguageSwitcher"

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const { profile, account, role, loading, logout } = useAuth()
  const t = useTranslations("nav")
  const ts = useTranslations("sidebar")

  const navItems = [
    { href: "/dashboard",              label: t("dashboard"), icon: HomeIcon },
    { href: "/customers",              label: t("customers"), icon: UserGroupIcon },
    { href: "/agreements",             label: t("agreements"), icon: DocumentTextIcon },
    { href: "/agreements?filter=archived", label: t("archive"), icon: ArchiveBoxIcon },
    { href: "/templates",              label: t("templates"), icon: ClipboardDocumentListIcon },
    { href: "/settings",               label: t("settings"), icon: Cog6ToothIcon },
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
    active:   ts("statusActive"),
    trialing: ts("statusTrialing"),
    past_due: ts("statusPastDue"),
    canceled: ts("statusCanceled"),
    unknown:  ts("statusUnknown"),
    loading:  ts("statusLoading"),
  }

  const status = loading ? "loading" : account?.subscription_status ?? "unknown"
  const fullName = profile?.full_name ?? ""
  const companyName = account?.name ?? "Pactiva"
  const isAdmin = role === "admin"

  useEffect(() => { onClose() }, [pathname])

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-30 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>

      {/* Logo + lukk-knapp (mobil) */}
      <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
        <img src="/pactiva-logo-light.svg" alt="Pactiva" className="h-14" />
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-[#F0DFC0] transition-colors">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Firma og bruker */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="text-sm font-semibold text-[#F0DFC0] truncate">{companyName}</div>
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
            (basePath !== "/dashboard" && pathname.startsWith(basePath) && !href.includes("?filter=archived"))

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-700 text-[#F0DFC0]"
                  : "text-slate-400 hover:bg-slate-800 hover:text-[#F0DFC0]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bunn: logg ut + språkvalg + copyright */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-700/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-[#F0DFC0] transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="h-4 w-4 shrink-0" />
          {t("logout")}
        </button>
        <div className="mt-2">
          <LanguageSwitcher />
        </div>
        <div className="text-xs text-slate-600 mt-2 px-3">
          © {new Date().getFullYear()} Pactiva
        </div>
      </div>
    </aside>
  )
}
