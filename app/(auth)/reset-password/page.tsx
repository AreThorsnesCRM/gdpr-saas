"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < 8) return 0
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (score === 3) return 3
  if (score === 2) return 2
  return 1
}

export default function ResetPasswordPage() {
  const t = useTranslations("resetPassword")
  const tReg = useTranslations("register")
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(password)
  const strengthLabel = strength === 3 ? tReg("strengthStrong") : strength === 2 ? tReg("strengthMedium") : strength === 1 ? tReg("strengthWeak") : ""
  const strengthColor = strength === 3 ? "bg-green-500" : strength === 2 ? "bg-yellow-400" : "bg-red-400"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage("")
    setError("")

    if (password !== confirm) {
      setError(t("errorNotMatch"))
      return
    }

    if (password.length < 8) {
      setError(tReg("errorTooShort"))
      return
    }

    if (strength < 2) {
      setError(tReg("errorTooWeak"))
      return
    }

    if (!supabase) {
      setError("Tjeneste ikke tilgjengelig")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(t("errorMessage"))
      return
    }

    setMessage(t("successMessage"))
    setTimeout(() => router.push("/login"), 2000)
  }

  return (
    <div className="min-h-screen flex">

      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <img src="/pactiva-logo-light.svg" alt="Pactiva" className="h-16" />
        <div className="space-y-4">
          <h2 className="text-white text-3xl font-bold leading-snug whitespace-pre-line">
            {t("brandingHeadline")}
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            {t("brandingSubheadline")}
          </p>
        </div>
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Pactiva</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50 px-8 py-12">
        <div className="w-full max-w-sm">

          <img src="/pactiva-logo-dark.svg" alt="Pactiva" className="lg:hidden h-10 mb-8" />

          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 text-sm mt-1 mb-8">{t("subtitle")}</p>

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("passwordLabel")}</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${strength >= level ? strengthColor : "bg-gray-200"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {strengthLabel && <span className="font-medium">{strengthLabel} — </span>}
                    {tReg("passwordHint")}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("confirmLabel")}</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? "..." : t("submitButton")}
            </button>
          </form>

          <div className="mt-5 text-center text-sm">
            <Link href="/login" className="text-gray-500 hover:text-gray-900 transition-colors">
              {t("backToLogin")}
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
