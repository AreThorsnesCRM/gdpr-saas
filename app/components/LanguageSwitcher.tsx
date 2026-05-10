"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

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
    <div className="flex items-center gap-0.5 px-3">
      {(["no", "en"] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span className="text-slate-700 text-xs mx-0.5">|</span>}
          <button
            onClick={() => switchLocale(l)}
            disabled={isPending || locale === l}
            className={`text-xs font-medium uppercase px-1.5 py-0.5 rounded transition-colors disabled:cursor-default ${
              locale === l ? "text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  )
}
