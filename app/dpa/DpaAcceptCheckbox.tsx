"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useDpaSync } from "@/lib/useDpaSync"

export default function DpaAcceptCheckbox() {
  const t = useTranslations("dpa")
  const [accepted, setAccepted] = useState(false)
  const update = useDpaSync(accepted, setAccepted, "viewer")

  return (
    <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 cursor-pointer">
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => update(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-slate-800 focus:ring-slate-400 shrink-0"
      />
      <span>
        <span className="block text-sm font-medium text-gray-800">{t("acceptCheckbox")}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{t("acceptCheckboxHint")}</span>
      </span>
    </label>
  )
}
