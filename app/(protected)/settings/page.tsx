"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/AuthContext"
import { supabase } from "@/lib/supabaseClient"

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
}

const sections = [
  { id: "profil",      label: "Min profil" },
  { id: "firma",       label: "Firmainformasjon" },
  { id: "brukere",     label: "Brukere" },
  { id: "varsler",     label: "Varsler" },
  { id: "abonnement",  label: "Abonnement" },
]

export default function SettingsPage() {
  const { account, user } = useAuth()

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

  const [company, setCompany] = useState<CompanyProfile>({
    name: "", org_number: "", address: "", postal_code: "", city: "", phone: "", contact_email: "",
  })
  const [savingCompany, setSavingCompany] = useState(false)
  const [companySaved, setCompanySaved] = useState(false)
  const [companyMessage, setCompanyMessage] = useState<{ type: "error"; text: string } | null>(null)

  const [fullName, setFullName] = useState("")
  const [profileSaved, setProfileSaved] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const [userNotifPrefs, setUserNotifPrefs] = useState<UserNotifPrefs>({
    notify_expiring_agreements: true,
    notify_no_active_agreement: true,
  })
  const [savingUserNotif, setSavingUserNotif] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchCompanyProfile()
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
      })
    }
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
      setInviteMessage({ type: "success", text: `Invitasjon sendt til ${inviteEmail}!` })
      setInviteEmail("")
      setInviteRestrictToOwn(false)
      fetchUsers()
    } else {
      setInviteMessage({ type: "error", text: data.error ?? "Noe gikk galt" })
    }
    setInviting(false)
  }

  async function handleRemoveUser(userId: string) {
    if (!window.confirm("Er du sikker på at du vil fjerne denne brukeren fra kontoen?")) return
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
    if (!window.confirm(`Avbryte invitasjonen til ${email}?`)) return
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
    if (!window.confirm(`Overfør admin-rollen til ${name}? Du vil selv bli vanlig bruker.`)) return
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
      setCompanyMessage({ type: "error", text: data.error ?? "Noe gikk galt" })
    }
    setSavingCompany(false)
  }

  async function openPortal() {
    const res = await fetch("/api/create-portal-session", { method: "POST" })
    const data = await res.json()
    window.location.href = data.url
  }

  async function openCheckout() {
    const res = await fetch("/api/create-checkout-session", { method: "POST" })
    const data = await res.json()
    window.location.href = data.url
  }

  function daysLeft(dateStr: string | null | undefined) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  function scrollTo(id: string) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Innstillinger</h1>
        {account && <p className="text-gray-500 mt-1">{account.name}</p>}
      </div>

      <div className="flex gap-10 items-start">
        {/* Sticky venstremeny */}
        <nav className="w-44 shrink-0 sticky top-8">
          <ul className="flex flex-col gap-1">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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

        {/* Innholdsseksjoner */}
        <div className="flex-1 space-y-12">

          {/* Min profil */}
          <section id="profil" className="scroll-mt-8">
            <SectionHeader title="Min profil" description="Navn som vises til andre brukere på kontoen." />
            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fullt navn</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ditt navn"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
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
                {savingProfile ? "Lagrer..." : profileSaved ? "Lagret ✓" : "Lagre"}
              </button>
            </form>
          </section>

          <Divider />

          {/* Firmainformasjon */}
          <section id="firma" className="scroll-mt-8">
            <SectionHeader
              title="Firmainformasjon"
              description="Brukes i maler og PDF-er."
              adminOnly
              isAdmin={currentUserRole === "admin"}
            />
            {currentUserRole === "admin" && (
              <form onSubmit={handleCompanySave} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Firmanavn" colSpan={2}>
                    <input type="text" value={company.name}
                      onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label="Organisasjonsnummer" colSpan={2}>
                    <input type="text" value={company.org_number} placeholder="123 456 789"
                      onChange={(e) => setCompany((c) => ({ ...c, org_number: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label="Adresse" colSpan={2}>
                    <input type="text" value={company.address} placeholder="Gateveien 1"
                      onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label="Postnummer">
                    <input type="text" value={company.postal_code} placeholder="0001"
                      onChange={(e) => setCompany((c) => ({ ...c, postal_code: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label="Sted">
                    <input type="text" value={company.city} placeholder="Oslo"
                      onChange={(e) => setCompany((c) => ({ ...c, city: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label="Telefon">
                    <input type="tel" value={company.phone} placeholder="+47 000 00 000"
                      onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
                      className={inputCls} />
                  </Field>
                  <Field label="Kontakt-e-post">
                    <input type="email" value={company.contact_email} placeholder="post@firma.no"
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
                    {savingCompany ? "Lagrer..." : companySaved ? "Lagret ✓" : "Lagre"}
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
            <SectionHeader title="Brukere" description="Alle brukere på denne kontoen." />
            {loading ? (
              <p className="text-sm text-gray-400 mt-4">Laster...</p>
            ) : (
              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Navn</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">E-post</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rolle</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tilgang</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      {currentUserRole === "admin" && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.user_id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          {member.full_name || <span className="text-gray-400 italic">Ikke satt</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{member.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            member.role === "admin"
                              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {member.role === "admin" ? "Admin" : "Bruker"}
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
                              title={member.restrict_to_own ? "Kun egne kunder — klikk for å gi full tilgang" : "Alle kunder — klikk for å begrense"}
                            >
                              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${member.restrict_to_own ? "bg-slate-800" : "bg-gray-200"}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${member.restrict_to_own ? "translate-x-6" : "translate-x-1"}`} />
                              </span>
                              <span className="text-xs text-gray-500 group-hover:text-gray-800 transition-colors">
                                {member.restrict_to_own ? "Kun egne" : "Alle kunder"}
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {member.restrict_to_own ? "Kun egne kunder" : "Alle kunder"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">
                            Aktiv
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
                                  title="Gjør til admin"
                                >
                                  Gjør til admin
                                </button>
                                <span className="text-gray-200">|</span>
                                <button
                                  onClick={() => handleRemoveUser(member.user_id)}
                                  disabled={actionLoading === member.user_id}
                                  className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                                  title="Fjern bruker"
                                >
                                  Fjern
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
                            Bruker
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {invite.restrict_to_own ? "Kun egne" : "Alle kunder"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                            Invitert
                          </span>
                        </td>
                        {currentUserRole === "admin" && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleCancelInvite(invite.email)}
                              disabled={actionLoading === invite.email}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                            >
                              Avbryt
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
                <p className="text-sm font-medium text-gray-700 mb-2">Inviter ny bruker</p>
                <form onSubmit={handleInvite} className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="E-postadresse"
                      required
                      className={`flex-1 ${inputCls}`}
                    />
                    <button type="submit" disabled={inviting} className={btnPrimary}>
                      {inviting ? "Sender..." : "Send invitasjon"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-600">Begrens til egne kunder</span>
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
            <SectionHeader
              title="Varsler"
              description="Velg hvilke e-postvarsler du ønsker å motta."
            />

            {/* Per-bruker varsler — alle brukere */}
            <div className="mt-4 border border-gray-200 rounded-xl divide-y divide-gray-100">
              <ToggleRow
                label="Utløpende avtaler"
                description="Få beskjed 2 uker og 1 uke før en avtale du er ansvarlig for utløper"
                checked={userNotifPrefs.notify_expiring_agreements}
                onChange={(v) => handleUserNotifToggle("notify_expiring_agreements", v)}
              />
              <ToggleRow
                label="Kunder uten aktiv avtale"
                description="Få beskjed når en kunde du er ansvarlig for ikke lenger har aktive avtaler"
                checked={userNotifPrefs.notify_no_active_agreement}
                onChange={(v) => handleUserNotifToggle("notify_no_active_agreement", v)}
              />
            </div>
            {savingUserNotif && <p className="text-xs text-gray-400 mt-2">Lagrer...</p>}

            {/* Systemvarsler — kun admin */}
            {currentUserRole === "admin" && (
              <>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-8 mb-3">
                  Systemvarsler
                </p>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                  <ToggleRow
                    label="Prøveperiode utløper snart"
                    description="Få beskjed 2 uker og 1 uke før prøveperioden avsluttes"
                    checked={prefs.notify_trial_ending}
                    onChange={(v) => handleToggle("notify_trial_ending", v)}
                  />
                  <ToggleRow
                    label="Betalingsproblemer"
                    description="Få beskjed dersom en betaling mislykkes"
                    checked={prefs.notify_payment_failed}
                    onChange={(v) => handleToggle("notify_payment_failed", v)}
                  />
                </div>
                {savingPrefs && <p className="text-xs text-gray-400 mt-2">Lagrer...</p>}
              </>
            )}
          </section>

          <Divider />

          {/* Abonnement */}
          <section id="abonnement" className="scroll-mt-8">
            <SectionHeader
              title="Abonnement"
              description="Administrer betaling, faktura og abonnement."
              adminOnly
              isAdmin={currentUserRole === "admin"}
            />
            {currentUserRole === "admin" && account && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={account.subscription_status} />
                  <p className="text-sm text-gray-500">
                    {account.subscription_status === "active"   && "Abonnementet er aktivt."}
                    {account.subscription_status === "trialing" && `${daysLeft(account.trial_end)} dager igjen av prøveperioden.`}
                    {account.subscription_status === "past_due" && "Betaling feilet — oppdater betalingsmetode."}
                    {account.subscription_status === "canceled" && "Abonnementet er avsluttet."}
                    {account.subscription_status === "incomplete" && "Betaling ikke fullført."}
                  </p>
                </div>
                <div className="flex gap-3">
                  {(account.subscription_status === "active" || account.subscription_status === "past_due") && (
                    <button onClick={openPortal} className={btnPrimary}>Administrer abonnement</button>
                  )}
                  {account.subscription_status === "trialing" && (
                    <>
                      <button onClick={openCheckout} className={btnPrimary}>Start abonnement nå</button>
                      <button onClick={openPortal} className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:border-gray-300 transition-colors">
                        Administrer abonnement
                      </button>
                    </>
                  )}
                  {(account.subscription_status === "canceled" || account.subscription_status === "incomplete") && (
                    <button onClick={openCheckout} className={btnPrimary}>Start abonnement</button>
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

// ── Hjelpere ──────────────────────────────────────────────────────────────────

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

function SectionHeader({ title, description, adminOnly, isAdmin }: {
  title: string; description: string; adminOnly?: boolean; isAdmin?: boolean
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-0.5">
        {adminOnly && !isAdmin ? "Kun synlig for admin." : description}
      </p>
    </div>
  )
}

function Divider() {
  return <hr className="border-gray-200" />
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:     { label: "Aktivt",          cls: "bg-green-50 text-green-700 ring-green-200" },
    trialing:   { label: "Prøveperiode",    cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    past_due:   { label: "Betaling feilet", cls: "bg-red-50 text-red-600 ring-red-200" },
    canceled:   { label: "Avsluttet",       cls: "bg-gray-100 text-gray-600 ring-gray-200" },
    incomplete: { label: "Ikke fullført",   cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  }
  const s = status ? map[status] : null
  if (!s) return null
  return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ring-1 ${s.cls}`}>{s.label}</span>
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
