"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useTransition, useState, useRef, useEffect } from "react"

const LANGUAGES = [
  { code: "no", label: "Norsk",      flag: "🇳🇴" },
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "sv", label: "Svenska",    flag: "🇸🇪" },
  { code: "da", label: "Dansk",      flag: "🇩🇰" },
  { code: "fi", label: "Suomi",      flag: "🇫🇮" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "pt", label: "Português",  flag: "🇵🇹" },
]

export default function LanguageSwitcher({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find(l => l.code === locale) ?? LANGUAGES[0]

  async function switchLocale(newLocale: string) {
    setOpen(false)
    if (newLocale === locale) return
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    })
    startTransition(() => router.refresh())
  }

  // Lukk ved klikk utenfor
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const isLight = variant === "light"
  const triggerCls = isLight
    ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
    : "text-slate-400 hover:text-[#F0DFC0] hover:bg-slate-800"
  const dropdownCls = isLight
    ? "bg-white border border-gray-200 shadow-lg"
    : "bg-slate-800 border border-slate-700 shadow-lg"
  const itemCls = isLight
    ? "text-gray-700 hover:bg-gray-50"
    : "text-slate-300 hover:bg-slate-700"
  const activeItemCls = isLight
    ? "text-gray-900 font-semibold"
    : "text-[#F0DFC0] font-semibold"

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${triggerCls}`}
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>{current.flag} {current.code.toUpperCase()}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`absolute z-50 mt-1 right-0 rounded-xl overflow-hidden w-44 ${dropdownCls}`}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                lang.code === locale ? activeItemCls : itemCls
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === locale && (
                <svg className="ml-auto w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
