"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

const LABELS: Record<string, string> = { no: "NO", en: "EN", es: "ES" }

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function switchLocale(newLocale: string) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    })
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-1 px-3">
      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      {(["no", "en", "es"] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="text-slate-600 text-xs mx-0.5">·</span>}
          <button
            onClick={() => switchLocale(l)}
            disabled={isPending || locale === l}
            className={`text-xs font-semibold uppercase px-1 py-0.5 rounded transition-colors disabled:cursor-default ${
              locale === l
                ? "text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {LABELS[l]}
          </button>
        </span>
      ))}
    </div>
  )
}
