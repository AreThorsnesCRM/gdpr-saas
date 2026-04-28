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

  useEffect(() => {
    fetchUsers()
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
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    setSavingPrefs(true)

    await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    })

    setSavingPrefs(false)
  }

  return (
    <div className="p-8 max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Innstillinger</h1>
        {account && (
          <p className="text-gray-500 mt-1">{account.name}</p>
        )}
      </div>

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
              description="Få beskjed 3 og 1 dag før prøveperioden avsluttes"
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
