"use client"

export const dynamic = "force-dynamic"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/AuthContext"

type Member = {
  user_id: string
  full_name: string
  email: string
  role: string
}

type NotificationPrefs = {
  notify_trial_ending: boolean
  notify_payment_failed: boolean
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
  { id: "firma", label: "Firmainformasjon" },
  { id: "brukere", label: "Brukere" },
  { id: "varsler", label: "Varsler" },
]

export default function SettingsPage() {
  const { account } = useAuth()
  const [activeSection, setActiveSection] = useState("firma")
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
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
  const [companyMessage, setCompanyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchCompanyProfile()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch("/api/account/users")
    if (res.ok) {
      const data = await res.json()
      setMembers(data.users)
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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMessage(null)
    const res = await fetch("/api/account/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteMessage({ type: "success", text: `Invitasjon sendt til ${inviteEmail}!` })
      setInviteEmail("")
    } else {
      setInviteMessage({ type: "error", text: data.error ?? "Noe gikk galt" })
    }
    setInviting(false)
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
      setCompanyMessage({ type: "success", text: "Lagret!" })
    } else {
      const data = await res.json()
      setCompanyMessage({ type: "error", text: data.error ?? "Noe gikk galt" })
    }
    setSavingCompany(false)
  }

  function scrollTo(id: string) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Sidehode */}
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
                  <button type="submit" disabled={savingCompany} className={btnPrimary}>
                    {savingCompany ? "Lagrer..." : "Lagre"}
                  </button>
                  {companyMessage && (
                    <p className={`text-sm ${companyMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                      {companyMessage.text}
                    </p>
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
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Navn</th>
                      <th className="text-left px-4 py-3 font-medium">E-post</th>
                      <th className="text-left px-4 py-3 font-medium">Rolle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.user_id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-800 font-medium">{member.full_name}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inviter */}
            {currentUserRole === "admin" && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Inviter ny bruker</p>
                <form onSubmit={handleInvite} className="flex gap-3">
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
              adminOnly
              isAdmin={currentUserRole === "admin"}
            />
            {currentUserRole === "admin" && (
              <div className="mt-4 border border-gray-200 rounded-xl divide-y divide-gray-100">
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
            )}
            {savingPrefs && <p className="text-xs text-gray-400 mt-2">Lagrer...</p>}
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
  title: string
  description: string
  adminOnly?: boolean
  isAdmin?: boolean
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

function ToggleRow({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
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
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-slate-800" : "bg-gray-200"
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
          checked ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  )
}
