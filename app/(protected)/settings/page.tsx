"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import { useTranslations } from "next-intl"
import { getCategoryDisplayName } from "@/lib/categoryUtils"

type Member = {
  user_id: string
  full_name: string
  email: string
  role: string
  restrict_to_own: boolean
}

type PendingInvite = {
  email: string
  restrict_to_own: boolean
}

type NotificationPrefs = {
  notify_trial_ending: boolean
  notify_payment_failed: boolean
}

type UserNotifPrefs = {
  notify_expiring_agreements: boolean
  notify_no_active_agreement: boolean
}

type CompanyProfile = {
  name: string
  org_number: string
  address: string
  postal_code: string
  city: string
  phone: string
  contact_email: string
  logo_url: string
}

export default function SettingsPage() {
  const { account, user, refreshAccount } = useAuth()
  const t = useTranslations("settings")
  const tc = useTranslations("common")

  const sections = [
    { id: "profil",         label: t("tabProfile") },
    { id: "firma",          label: t("tabCompany") },
    { id: "brukere",        label: t("tabUsers") },
    { id: "varsler",        label: t("tabNotifications") },
    { id: "ai",             label: t("tabAI") },
    { id: "kategorier",     label: t("tabCategories") },
    { id: "abonnement",     label: t("tabSubscription") },
  ]

  const [activeSection, setActiveSection] = useState("profil")
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRestrictToOwn, setInviteRestrictToOwn] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notify_trial_ending: true,
    notify_payment_failed: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [aiEnabled, setAiEnabled] = useState<boolean>(account?.ai_assistant_enabled ?? false)
  const [aiDashboardWidget, setAiDashboardWidget] = useState<boolean>(account?.ai_dashboard_widget_enabled ?? false)
  const [savingAI, setSavingAI] = useState(false)

  const [company, setCompany] = useState<CompanyProfile>({
    name: "", org_number: "", address: "", postal_code: "", city: "", phone: "", contact_email: "", logo_url: "",
  })
  const [savingCompany, setSavingCompany] = useState(false)
  const [companySaved, setCompanySaved] = useState(false)
  const [companyMessage, setCompanyMessage] = useState<{ type: "error"; text: string } | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMessage, setLogoMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [fullName, setFullName] = useState("")
  const [profileSaved, setProfileSaved] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [userNotifPrefs, setUserNotifPrefs] = useState<UserNotifPrefs>({
    notify_expiring_agreements: true,
    notify_no_active_agreement: true,
  })
  const [savingUserNotif, setSavingUserNotif] = useState(false)

  type Category = { id: string; name: string; is_predefined: boolean }
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [addingCategory, setAddingCategory] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchCompanyProfile()
    loadCategories()
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    supabase
      .from("profiles")
      .select("full_name, notify_expiring_agreements, notify_no_active_agreement")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        if (data.full_name) setFullName(data.full_name)
        setUserNotifPrefs({
          notify_expiring_agreements: data.notify_expiring_agreements ?? true,
          notify_no_active_agreement: data.notify_no_active_agreement ?? true,
        })
      })
  }, [user])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch("/api/account/users")
    if (res.ok) {
      const data = await res.json()
      setMembers(data.users)
      setPendingInvites(data.pendingInvites ?? [])
      setCurrentUserRole(data.currentUserRole)
      setPrefs({
        notify_trial_ending: data.notify_trial_ending ?? true,
        notify_payment_failed: data.notify_payment_failed ?? true,
      })
    }
    setLoading(false)
  }

  async function fetchCompanyProfile() {
    const res = await fetch("/api/account/profile")
    if (res.ok) {
      const data = await res.json()
      setCompany({
        name: data.name ?? "",
        org_number: data.org_number ?? "",
        address: data.address ?? "",
        postal_code: data.postal_code ?? "",
        city: data.city ?? "",
        phone: data.phone ?? "",
        contact_email: data.contact_email ?? "",
        logo_url: data.logo_url ? "/api/account/logo" : "",
      })
      setAiEnabled(data.ai_assistant_enabled ?? false)
      setAiDashboardWidget(data.ai_dashboard_widget_enabled ?? false)
    }
  }

  async function loadCategories() {
    const res = await fetch("/api/account/agreement-categories")
    if (res.ok) {
      const data = await res.json()
      setCategories(data.categories ?? [])
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    const res = await fetch("/api/account/agreement-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setCategories((prev) => [...prev, data.category])
      setNewCategoryName("")
    }
    setAddingCategory(false)
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/account/agreement-categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
    }
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true)
    setLogoMessage(null)
    const form = new FormData()
    form.append("logo", file)
    const res = await fetch("/api/account/logo", { method: "POST", body: form })
    const data = await res.json()
    if (res.ok) {
      setCompany((c) => ({ ...c, logo_url: `/api/account/logo?t=${Date.now()}` }))
      setLogoMessage({ type: "success", text: "Logo lastet opp" })
    } else {
      setLogoMessage({ type: "error", text: data.error ?? "Opplasting feilet" })
    }
    setLogoUploading(false)
  }

  async function handleLogoDelete() {
    if (!window.confirm("Fjern logoen?")) return
    setLogoUploading(true)
    setLogoMessage(null)
    const res = await fetch("/api/account/logo", { method: "DELETE" })
    if (res.ok) {
      setCompany((c) => ({ ...c, logo_url: "" }))
      setLogoMessage({ type: "success", text: "Logo fjernet" })
    } else {
      setLogoMessage({ type: "error", text: "Kunne ikke fjerne logo" })
    }
    setLogoUploading(false)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !user) return
    setSavingProfile(true)
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id)
    setSavingProfile(false)
    if (!error) {
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMessage(null)
    const res = await fetch("/api/account/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, restrict_to_own: inviteRestrictToOwn }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteMessage({ type: "success", text: t("inviteSent", { email: inviteEmail }) })
      setInviteEmail("")
      setInviteRestrictToOwn(false)
      fetchUsers()
    } else {
      setInviteMessage({ type: "error", text: data.error ?? tc("error") })
    }
    setInviting(false)
  }

  async function handleRemoveUser(userId: string) {
    if (!window.confirm(t("removeConfirm"))) return
    setActionLoading(userId)
    await fetch("/api/account/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    })
    setActionLoading(null)
    fetchUsers()
  }

  async function handleCancelInvite(email: string) {
    if (!window.confirm(t("cancelInviteConfirm", { email }))) return
    setActionLoading(email)
    await fetch("/api/account/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setActionLoading(null)
    fetchUsers()
  }

  async function handleTransferAdmin(userId: string, name: string) {
    if (!window.confirm(t("makeAdminConfirm", { name }))) return
    setActionLoading(userId)
    const res = await fetch("/api/account/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, action: "make_admin" }),
    })
    setActionLoading(null)
    if (res.ok) fetchUsers()
  }

  async function handleToggleRestrict(userId: string, current: boolean) {
    setMembers((prev) =>
      prev.map((m) => m.user_id === userId ? { ...m, restrict_to_own: !current } : m)
    )
    await fetch("/api/account/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, restrict_to_own: !current }),
    })
  }

  async function handleUserNotifToggle(key: keyof UserNotifPrefs, value: boolean) {
    if (!supabase || !user) return
    setUserNotifPrefs((p) => ({ ...p, [key]: value }))
    setSavingUserNotif(true)
    await supabase.from("profiles").update({ [key]: value }).eq("user_id", user.id)
    setSavingUserNotif(false)
  }

  async function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }))
    setSavingPrefs(true)
    await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    })
    setSavingPrefs(false)
  }

  useEffect(() => {
    setAiEnabled(account?.ai_assistant_enabled ?? false)
    setAiDashboardWidget(account?.ai_dashboard_widget_enabled ?? false)
  }, [account])

  async function handleToggleAI(value: boolean) {
    setAiEnabled(value)
    setSavingAI(true)
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_assistant_enabled: value }),
    })
    if (res.ok) await refreshAccount()
    setSavingAI(false)
  }

  async function handleToggleDashboardWidget(value: boolean) {
    setAiDashboardWidget(value)
    setSavingAI(true)
    await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai_dashboard_widget_enabled: value }),
    })
    await refreshAccount()
    setSavingAI(false)
  }

  async function handleCompanySave(e: React.FormEvent) {
    e.preventDefault()
    setSavingCompany(true)
    setCompanyMessage(null)
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    })
    if (res.ok) {
      setCompanyMessage(null)
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 2000)
    } else {
      const data = await res.json()
      setCompanyMessage({ type: "error", text: data.error ?? tc("error") })
    }
    setSavingCompany(false)
  }

  async function openPortal() {
    const res = await fetch("/api/create-portal-session", { method: "POST" })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else console.error("Portal error:", data.error)
  }

  async function openCheckout() {
    const res = await fetch("/api/create-checkout-session", { method: "POST" })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else console.error("Checkout error:", data.error)
  }

  function daysLeft(dateStr: string | null | undefined) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  function scrollTo(id: string) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const subStatusMap: Record<string, { label: string; cls: string }> = {
    active:     { label: t("subStatusActive"),     cls: "bg-green-50 text-green-700 ring-green-200" },
    trialing:   { label: t("subStatusTrialing"),   cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    past_due:   { label: t("subStatusPastDue"),    cls: "bg-red-50 text-red-600 ring-red-200" },
    canceled:   { label: t("subStatusCanceled"),   cls: "bg-gray-100 text-gray-600 ring-gray-200" },
    incomplete: { label: t("subStatusIncomplete"), cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        {account && <p className="text-gray-500 mt-1">{account.name}</p>}
      </div>

      <div className="flex flex-col md:flex-row md:gap-10 md:items-start">
        {/* Sticky venstremeny */}
        <nav className="w-full md:w-44 md:shrink-0 md:sticky md:top-8">
          <ul className="flex flex-row overflow-x-auto gap-1 pb-2 md:flex-col md:overflow-visible md:pb-0">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeSection === s.id
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 space-y-12">

          {/* Min profil */}
          <section id="profil" className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("profileTitle")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t("profileDesc")}</p>
            </div>
            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("profileNameLabel")}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("profileNamePlaceholder")}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("profileEmailLabel")}</label>
                <input
                  type="text"
                  value={user?.email ?? ""}
                  disabled
                  className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`}
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  profileSaved ? "bg-green-600 text-white" : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
              >
                {savingProfile ? tc("saving") : profileSaved ? tc("saved") : tc("save")}
              </button>
            </form>
          </section>

          <Divider />

          {/* Firmainformasjon */}
          <section id="firma" className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("companyTitle")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {currentUserRole !== "admin" ? t("adminOnly") : t("companyDesc")}
              </p>
            </div>
            {currentUserRole === "admin" && (
              <form onSubmit={handleCompanySave} className="mt-4 space-y-4">
                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Firmalogo</label>
                  <p className="text-xs text-gray-400 mb-3">Vises i headeren på avtale-PDF-er. PNG, JPG eller SVG anbefales.</p>
                  {company.logo_url ? (
                    <div className="flex items-center gap-4">
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 inline-flex">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={company.logo_url} alt="Firmalogo" className="h-12 max-w-[160px] object-contain" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer text-sm text-slate-700 underline hover:text-slate-900 transition-colors">
                          Bytt logo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                            className="hidden"
                            disabled={logoUploading}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleLogoDelete}
                          disabled={logoUploading}
                          className="text-sm text-red-400 hover:text-red-600 transition-colors text-left disabled:opacity-50"
                        >
                          Fjern logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-slate-400 hover:text-slate-700 transition-colors ${logoUploading ? "opacity-50 pointer-events-none" : ""}`}>
                      {logoUploading ? "Laster opp..." : "Last opp logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                        className="hidden"
                        disabled={logoUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
                      />
                    </label>
                  )}
                  {logoMessage && (
                    <p className={`mt-2 text-sm ${logoMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                      {logoMessage.text}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t("companyNameLabel")} colSpan={2}>
                    <input type="text" value={company.name}
                      onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label={t("companyOrgLabel")} colSpan={2}>
                    <input type="text" value={company.org_number} placeholder={t("companyOrgPlaceholder")}
                      onChange={(e) => setCompany((c) => ({ ...c, org_number: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label={t("companyAddressLabel")} colSpan={2}>
                    <input type="text" value={company.address} placeholder={t("companyAddressPlaceholder")}
                      onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label={t("companyPostalLabel")}>
                    <input type="text" value={company.postal_code} placeholder={t("companyPostalPlaceholder")}
                      onChange={(e) => setCompany((c) => ({ ...c, postal_code: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label={t("companyCityLabel")}>
                    <input type="text" value={company.city} placeholder={t("companyCityPlaceholder")}
                      onChange={(e) => setCompany((c) => ({ ...c, city: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label={t("companyPhoneLabel")}>
                    <input type="tel" value={company.phone} placeholder={t("companyPhonePlaceholder")}
                      onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label={t("companyEmailLabel")}>
                    <input type="email" value={company.contact_email} placeholder={t("companyEmailPlaceholder")}
                      onChange={(e) => setCompany((c) => ({ ...c, contact_email: e.target.value }))}
                      className={inputCls} />
                  </Field>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="submit"
                    disabled={savingCompany}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      companySaved ? "bg-green-600 text-white" : "bg-slate-800 text-white hover:bg-slate-700"
                    }`}
                  >
                    {savingCompany ? tc("saving") : companySaved ? tc("saved") : tc("save")}
                  </button>
                  {companyMessage && (
                    <p className="text-sm text-red-600">{companyMessage.text}</p>
                  )}
                </div>
              </form>
            )}
          </section>

          <Divider />

          {/* Brukere */}
          <section id="brukere" className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("usersTitle")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t("usersDesc")}</p>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400 mt-4">{tc("loading")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnName")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnEmail")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnRole")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnAccess")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnStatus")}</th>
                      {currentUserRole === "admin" && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.user_id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          {member.full_name || <span className="text-gray-400 italic">{t("roleNotSet")}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{member.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            member.role === "admin"
                              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {member.role === "admin" ? t("roleAdmin") : t("roleMember")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {member.role === "admin" ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : currentUserRole === "admin" ? (
                            <button
                              role="switch"
                              aria-checked={member.restrict_to_own}
                              onClick={() => handleToggleRestrict(member.user_id, member.restrict_to_own)}
                              className="flex items-center gap-2 group"
                              title={member.restrict_to_own ? t("accessOwnOnlyTitle") : t("accessAllTitle")}
                            >
                              <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${member.restrict_to_own ? "bg-slate-800" : "bg-gray-200"}`}>
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${member.restrict_to_own ? "translate-x-5" : "translate-x-0.5"}`} />
                              </span>
                              <span className="text-xs text-gray-500 group-hover:text-gray-800 transition-colors">
                                {member.restrict_to_own ? t("accessOwnBadge") : t("accessAllBadge")}
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {member.restrict_to_own ? t("accessOwnReadonly") : t("accessAllReadonly")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">
                            {t("statusActive")}
                          </span>
                        </td>
                        {currentUserRole === "admin" && (
                          <td className="px-4 py-3">
                            {member.role !== "admin" && member.user_id !== user?.id && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleTransferAdmin(member.user_id, member.full_name)}
                                  disabled={actionLoading === member.user_id}
                                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-40"
                                >
                                  {t("makeAdmin")}
                                </button>
                                <span className="text-gray-200">|</span>
                                <button
                                  onClick={() => handleRemoveUser(member.user_id)}
                                  disabled={actionLoading === member.user_id}
                                  className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                                >
                                  {t("removeUser")}
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {pendingInvites.map((invite) => (
                      <tr key={invite.email} className="border-t border-gray-100 bg-gray-50/50">
                        <td className="px-4 py-3 text-gray-400 italic text-sm">—</td>
                        <td className="px-4 py-3 text-gray-500">{invite.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {t("roleMember")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {invite.restrict_to_own ? t("accessOwnBadge") : t("accessAllBadge")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                            {t("statusInvited")}
                          </span>
                        </td>
                        {currentUserRole === "admin" && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleCancelInvite(invite.email)}
                              disabled={actionLoading === invite.email}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                            >
                              {t("cancelInvite")}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {currentUserRole === "admin" && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">{t("inviteTitle")}</p>
                <form onSubmit={handleInvite} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder={t("inviteEmailPlaceholder")}
                      required
                      className={`flex-1 ${inputCls}`}
                    />
                    <button type="submit" disabled={inviting} className={btnPrimary}>
                      {inviting ? t("inviteSending") : t("inviteSendButton")}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600">{t("inviteRestrict")}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={inviteRestrictToOwn}
                      onClick={() => setInviteRestrictToOwn((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${inviteRestrictToOwn ? "bg-slate-800" : "bg-gray-200"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${inviteRestrictToOwn ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </form>
                {inviteMessage && (
                  <p className={`mt-2 text-sm ${inviteMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                    {inviteMessage.text}
                  </p>
                )}
              </div>
            )}
          </section>

          <Divider />

          {/* Varsler */}
          <section id="varsler" className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("notificationsTitle")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t("notificationsDesc")}</p>
            </div>

            <div className="mt-4 border border-gray-200 rounded-xl divide-y divide-gray-100">
              <ToggleRow
                label={t("notifExpiringTitle")}
                description={t("notifExpiringDesc")}
                checked={userNotifPrefs.notify_expiring_agreements}
                onChange={(v) => handleUserNotifToggle("notify_expiring_agreements", v)}
              />
              <ToggleRow
                label={t("notifNoActiveTitle")}
                description={t("notifNoActiveDesc")}
                checked={userNotifPrefs.notify_no_active_agreement}
                onChange={(v) => handleUserNotifToggle("notify_no_active_agreement", v)}
              />
            </div>
            {savingUserNotif && <p className="text-xs text-gray-400 mt-2">{tc("saving")}</p>}

            {currentUserRole === "admin" && (
              <>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-8 mb-3">
                  {t("notifSystemTitle")}
                </p>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  <ToggleRow
                    label={t("notifTrialTitle")}
                    description={t("notifTrialDesc")}
                    checked={prefs.notify_trial_ending}
                    onChange={(v) => handleToggle("notify_trial_ending", v)}
                  />
                  <ToggleRow
                    label={t("notifPaymentTitle")}
                    description={t("notifPaymentDesc")}
                    checked={prefs.notify_payment_failed}
                    onChange={(v) => handleToggle("notify_payment_failed", v)}
                  />
                </div>
                {savingPrefs && <p className="text-xs text-gray-400 mt-2">{tc("saving")}</p>}
              </>
            )}
          </section>

          <Divider />

          {/* AI-assistent */}
          <section id="ai" className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("aiTitle")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {currentUserRole !== "admin" ? t("adminOnly") : t("aiDesc")}
              </p>
            </div>
            {currentUserRole === "admin" && (
              <div className="mt-4 border border-gray-200 rounded-xl divide-y divide-gray-100">
                <ToggleRow
                  label={t("aiEnableTitle")}
                  description={t("aiEnableDesc")}
                  checked={aiEnabled}
                  onChange={handleToggleAI}
                />
                {aiEnabled && (
                  <>
                    <div className="pl-8 pr-4 py-4 bg-gray-50/50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{t("aiDashboardWidgetTitle")}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t("aiDashboardWidgetDesc")}</p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={aiDashboardWidget}
                        onClick={() => handleToggleDashboardWidget(!aiDashboardWidget)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiDashboardWidget ? "bg-slate-800" : "bg-gray-200"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${aiDashboardWidget ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                    <div className="px-4 py-3 bg-amber-50 rounded-b-xl flex items-start gap-2.5 border-t border-amber-100">
                      <span className="text-amber-500 text-sm mt-0.5 shrink-0">⚠</span>
                      <p className="text-xs text-amber-700 leading-relaxed">{t("aiDataWarning")}</p>
                    </div>
                  </>
                )}
              </div>
            )}
            {savingAI && <p className="text-xs text-gray-400 mt-2">{tc("saving")}</p>}
          </section>

          <Divider />

          {/* Avtalekategorier */}
          <section id="kategorier" className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("tabCategories")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {currentUserRole !== "admin"
                  ? t("adminOnly")
                  : t("categoryDesc")}
              </p>
            </div>
            {currentUserRole === "admin" && (
              <div className="mt-4 space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">{getCategoryDisplayName(cat, tc)}</span>
                      {cat.is_predefined && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{t("predefinedBadge")}</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-sm"
                      title={t("categoryDeleteTitle")}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory() } }}
                    placeholder={t("categoryAddPlaceholder")}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  />
                  <button
                    onClick={addCategory}
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    {addingCategory ? t("categoryAdding") : t("categoryAddButton")}
                  </button>
                </div>
              </div>
            )}
          </section>

          <Divider />

          {/* Privacy */}
          <section className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("privacyTitle")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {t("privacyDesc")}
              </p>
            </div>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm text-slate-700 underline hover:text-slate-900 transition-colors"
            >
              {t("privacyLink")}
            </a>
          </section>

          <Divider />

          {/* Abonnement */}
          <section id="abonnement" className="scroll-mt-8">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("subscriptionTitle")}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {currentUserRole !== "admin" ? t("adminOnly") : t("subscriptionDesc")}
              </p>
            </div>
            {currentUserRole === "admin" && account && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const s = account.subscription_status ? subStatusMap[account.subscription_status] : null
                    return s ? (
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ring-1 ${s.cls}`}>{s.label}</span>
                    ) : null
                  })()}
                  <p className="text-sm text-gray-500">
                    {account.subscription_status === "active"   && t("subscriptionActive")}
                    {account.subscription_status === "trialing" && t("subscriptionTrial", { daysLeft: daysLeft(account.trial_end) ?? 0 })}
                    {account.subscription_status === "past_due" && t("subscriptionPastDue")}
                    {account.subscription_status === "canceled" && t("subscriptionCanceled")}
                    {account.subscription_status === "incomplete" && t("subscriptionIncomplete")}
                  </p>
                </div>
                <div className="flex gap-3">
                  {(account.subscription_status === "active" || account.subscription_status === "past_due") && (
                    <button onClick={openPortal} className={btnPrimary}>{t("manageSubscription")}</button>
                  )}
                  {account.subscription_status === "trialing" && (
                    <>
                      <button onClick={openCheckout} className={btnPrimary}>{t("startSubscriptionNow")}</button>
                      <button onClick={openPortal} className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-gray-300 transition-colors">
                        {t("manageSubscription")}
                      </button>
                    </>
                  )}
                  {(account.subscription_status === "canceled" || account.subscription_status === "incomplete") && (
                    <button onClick={openCheckout} className={btnPrimary}>{t("startSubscription")}</button>
                  )}
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
const btnPrimary = "bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? "col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Divider() {
  return <hr className="border-gray-200" />
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-slate-800" : "bg-gray-200"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  )
}
