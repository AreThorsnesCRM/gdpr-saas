"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
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

export default function SettingsPage() {
  const { account } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notify_trial_ending: true,
    notify_payment_failed: true,
  })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [company, setCompany] = useState<CompanyProfile>({
    name: "",
    org_number: "",
    address: "",
    postal_code: "",
    city: "",
    phone: "",
    contact_email: "",
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
    setMessage(null)

    const res = await fetch("/api/account/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    })

    const data = await res.json()

    if (res.ok) {
      setMessage({ type: "success", text: `Invitasjon sendt til ${inviteEmail}!` })
      setInviteEmail("")
    } else {
      setMessage({ type: "error", text: data.error ?? "Noe gikk galt" })
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
      setCompanyMessage({ type: "success", text: "Firmainformasjon lagret!" })
    } else {
      const data = await res.json()
      setCompanyMessage({ type: "error", text: data.error ?? "Noe gikk galt" })
    }

    setSavingCompany(false)
  }

  return (
    <div className="p-8 max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Innstillinger</h1>
        {account && <p className="text-gray-500 mt-1">{account.name}</p>}
      </div>

      {/* Firmainformasjon — kun for admin */}
      {currentUserRole === "admin" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Firmainformasjon</h2>
          <p className="text-sm text-gray-500 mb-4">Brukes i maler og PDF-er.</p>

          <form onSubmit={handleCompanySave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Firmanavn</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisasjonsnummer</label>
                <input
                  type="text"
                  value={company.org_number}
                  onChange={(e) => setCompany((c) => ({ ...c, org_number: e.target.value }))}
                  placeholder="123 456 789"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={company.address}
                  onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
                  placeholder="Gateveien 1"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label>
                <input
                  type="text"
                  value={company.postal_code}
                  onChange={(e) => setCompany((c) => ({ ...c, postal_code: e.target.value }))}
                  placeholder="0001"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sted</label>
                <input
                  type="text"
                  value={company.city}
                  onChange={(e) => setCompany((c) => ({ ...c, city: e.target.value }))}
                  placeholder="Oslo"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={company.phone}
                  onChange={(e) => setCompany((c) => ({ ...c, phone: e.target.value }))}
                  placeholder="+47 000 00 000"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kontakt-e-post</label>
                <input
                  type="email"
                  value={company.contact_email}
                  onChange={(e) => setCompany((c) => ({ ...c, contact_email: e.target.value }))}
                  placeholder="post@firma.no"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={savingCompany}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {savingCompany ? "Lagrer..." : "Lagre"}
              </button>
              {companyMessage && (
                <p className={`text-sm ${companyMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {companyMessage.text}
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Brukere */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Brukere</h2>

        {loading ? (
          <p className="text-gray-500 text-sm">Laster...</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Navn</th>
                  <th className="text-left px-4 py-3 font-medium">E-post</th>
                  <th className="text-left px-4 py-3 font-medium">Rolle</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800">{member.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{member.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        member.role === "admin"
                          ? "bg-blue-100 text-blue-700"
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
      </div>

      {/* Inviter bruker — kun for admin */}
      {currentUserRole === "admin" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Inviter bruker</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-postadresse"
              required
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {inviting ? "Sender..." : "Send invitasjon"}
            </button>
          </form>

          {message && (
            <p className={`mt-3 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </div>
      )}

      {/* Varslingsinnstillinger — kun for admin */}
      {currentUserRole === "admin" && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Varsler</h2>
          <p className="text-sm text-gray-500 mb-4">Velg hvilke e-postvarsler du ønsker å motta.</p>

          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
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

          {savingPrefs && (
            <p className="text-xs text-gray-400 mt-2">Lagrer...</p>
          )}
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
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
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}
