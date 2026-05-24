"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { CheckCircleIcon } from "@heroicons/react/24/outline"
import { useTranslations } from "next-intl"

export default function LoginForm() {
  const router = useRouter()
  const t = useTranslations("auth")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const features = [t("feature1"), t("feature2"), t("feature3")]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get("email") || "")
    const password = String(formData.get("password") || "")

    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })

    if (!res.ok) {
      setError(t("wrongCredentials"))
      setLoading(false)
      return
    }

    const body = await res.json()
    if (body.session && supabase) {
      await supabase.auth.setSession({
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token,
      })
    }

    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex">

      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <img src="/pactiva-logo-light.svg" alt="Pactiva" className="h-8" />

        <div className="space-y-8">
          <div>
            <h2 className="text-white text-3xl font-bold leading-snug whitespace-pre-line">
              {t("headline")}
            </h2>
            <p className="text-slate-400 mt-3 text-base leading-relaxed">
              {t("subheadline")}
            </p>
          </div>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                <CheckCircleIcon className="h-5 w-5 text-green-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Pactiva</p>
          <Link href="/privacy" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
            {t("privacyLink")}
          </Link>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Logo on mobile */}
          <img src="/pactiva-logo-dark.svg" alt="Pactiva" className="lg:hidden h-7 mb-8" />

          <h1 className="text-2xl font-bold text-gray-900">{t("loginTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">{t("welcome")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("emailLabel")}</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("passwordLabel")}</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? t("loggingIn") : t("loginButton")}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-gray-500 hover:text-gray-900 transition-colors">
              {t("forgotPassword")}
            </Link>
            <Link href="/register" className="text-gray-500 hover:text-gray-900 transition-colors">
              {t("createAccount")}
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
