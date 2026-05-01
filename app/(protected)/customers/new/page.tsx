"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import Link from "next/link"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"

interface TeamMember {
  user_id: string
  full_name: string
}

export default function NewCustomerPage() {
  const router = useRouter()
  const { user, account } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [orgNummer, setOrgNummer] = useState("")
  const [address, setAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("")
  const [accountManagerId, setAccountManagerId] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/account/members")
      .then((r) => r.json())
      .then(({ members }) => { if (members) setTeamMembers(members) })
  }, [])

  async function createCustomer() {
    if (!name.trim() || !supabase) return
    setLoading(true)

    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoading(false); return }

    const { error } = await supabase.from("customers").insert([{
      user_id: u.id,
      account_id: account?.id ?? null,
      name,
      email: email || null,
      phone: phone || null,
      org_nummer: orgNummer || null,
      address: address || null,
      postal_code: postalCode || null,
      city: city || null,
      account_manager_id: accountManagerId || null,
    }])

    setLoading(false)
    if (!error) router.push("/customers")
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

  return (
    <div className="p-8 max-w-2xl space-y-6">

      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        Kunder
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Ny kunde</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Navn *</label>
          <input className={inputClass} placeholder="Kundenavn" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">E-post</label>
            <input className={inputClass} placeholder="e-post@eksempel.no" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
            <input className={inputClass} placeholder="+47 000 00 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Org.nummer</label>
          <input className={inputClass} placeholder="F.eks. 123456789 eller GB123456" value={orgNummer} onChange={(e) => setOrgNummer(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
          <input className={inputClass} placeholder="Gateadresse" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Postnummer</label>
            <input className={inputClass} placeholder="0000" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sted</label>
            <input className={inputClass} placeholder="By" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>

        {teamMembers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kundeansvarlig</label>
            <select
              className={inputClass}
              value={accountManagerId}
              onChange={(e) => setAccountManagerId(e.target.value)}
            >
              <option value="">Ingen ansvarlig valgt</option>
              {teamMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={createCustomer}
          disabled={loading || !name.trim()}
          className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Lagrer..." : "Opprett kunde"}
        </button>

      </div>
    </div>
  )
}
