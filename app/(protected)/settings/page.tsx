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

export default function SettingsPage() {
  const { account } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

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
    </div>
  )
}
