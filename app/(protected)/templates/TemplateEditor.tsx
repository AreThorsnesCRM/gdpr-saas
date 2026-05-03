"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"
import RichTextEditor from "@/app/components/RichTextEditor"

type Props = {
  templateId?: string
}

export default function TemplateEditor({ templateId }: Props) {
  const router = useRouter()
  const isEditing = !!templateId

  const [name, setName] = useState("")
  const [durationMonths, setDurationMonths] = useState(12)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!templateId) return
    fetch(`/api/templates/${templateId}`)
      .then((r) => r.json())
      .then(({ template }) => {
        if (!template) return
        setName(template.name)
        setDurationMonths(template.duration_months)
        setContent(template.content ?? "")
        setLoading(false)
      })
  }, [templateId])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    const url = isEditing ? `/api/templates/${templateId}` : "/api/templates"
    const method = isEditing ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, duration_months: durationMonths, content }),
    })

    setSaving(false)
    if (res.ok) {
      if (isEditing) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        router.push("/templates")
      }
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

  if (loading) return <div className="p-8 text-sm text-gray-400">Laster...</div>

  return (
    <div className="p-8 max-w-4xl space-y-6">

      <Link href="/templates" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        Avtalemaler
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">
        {isEditing ? "Rediger mal" : "Ny avtalemal"}
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Navn på mal *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Serviceavtale Standard"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Standard varighet (måneder)</label>
            <input
              type="number"
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              min={1}
              max={120}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Avtaleinnhold</label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Skriv avtaleinnholdet her. Bruk flettefelt i toolbar for å sette inn dynamiske verdier..."
          />
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              saved
                ? "bg-green-600 text-white"
                : "bg-slate-800 text-white hover:bg-slate-700"
            }`}
          >
            {saving ? "Lagrer..." : saved ? "Lagret ✓" : isEditing ? "Lagre endringer" : "Opprett mal"}
          </button>
          <Link href="/templates" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Avbryt
          </Link>
        </div>
      </div>
    </div>
  )
}
