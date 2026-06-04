"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"
import { useTranslations } from "next-intl"

interface TeamMember {
  user_id: string
  full_name: string
}

export default function NewCustomerPage() {
  const router = useRouter()
  const t = useTranslations("customers")
  const tc = useTranslations("common")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [orgNummer, setOrgNummer] = useState("")
  const [address, setAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [website, setWebsite] = useState("")
  const [accountManagerId, setAccountManagerId] = useState("")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/account/members")
      .then((r) => r.json())
      .then(({ members }) => { if (members) setTeamMembers(members) })
  }, [])

  async function createCustomer() {
    if (!name.trim()) {
      alert(t("newNameRequired"))
      return
    }
    if (!supabase) return
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name,
        email: email || null,
        phone: phone || null,
        org_nummer: orgNummer || null,
        address: address || null,
        postal_code: postalCode || null,
        city: city || null,
        country: country || null,
        website: website || null,
        account_manager_id: accountManagerId || null,
      }),
    })

    setLoading(false)
    if (res.ok) router.push("/customers")
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

  return (
    <div className="p-8 max-w-2xl space-y-6">

      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        {t("newBackLink")}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{t("newTitle")}</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t("newNameLabel")}</label>
          <input className={inputClass} placeholder={t("newNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("newEmailLabel")}</label>
            <input className={inputClass} placeholder={t("newEmailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("newPhoneLabel")}</label>
            <input className={inputClass} placeholder={t("newPhonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t("newOrgLabel")}</label>
          <input className={inputClass} placeholder={t("newOrgPlaceholder")} value={orgNummer} onChange={(e) => setOrgNummer(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t("newAddressLabel")}</label>
          <input className={inputClass} placeholder={t("newAddressPlaceholder")} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("newPostalLabel")}</label>
            <input className={inputClass} placeholder={t("newPostalPlaceholder")} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("newCityLabel")}</label>
            <input className={inputClass} placeholder={t("newCityPlaceholder")} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("newCountryLabel")}</label>
            <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">{t("newCountryPlaceholder")}</option>
              {(["NO","SE","DK","FI","DE","FR","GB","NL","BE","AT","CH","ES","PT","IT","PL","US","CA","BR","MX","OTHER"] as const).map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("newWebsiteLabel")}</label>
            <input className={inputClass} placeholder={t("newWebsitePlaceholder")} value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </div>

        {teamMembers.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("newManagerLabel")}</label>
            <select
              className={inputClass}
              value={accountManagerId}
              onChange={(e) => setAccountManagerId(e.target.value)}
            >
              <option value="">{t("newManagerNone")}</option>
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
          {loading ? tc("saving") : t("newCreateButton")}
        </button>

      </div>
    </div>
  )
}
