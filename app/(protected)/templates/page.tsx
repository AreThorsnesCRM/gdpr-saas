"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DocumentTextIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline"

type Template = {
  id: string
  name: string
  duration_months: number
  created_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    const res = await fetch("/api/templates")
    if (res.ok) {
      const data = await res.json()
      setTemplates(data.templates)
    }
    setLoading(false)
  }

  async function deleteTemplate(id: string, name: string) {
    if (!window.confirm(`Slette malen "${name}"?`)) return
    setDeleting(id)
    await fetch(`/api/templates/${id}`, { method: "DELETE" })
    setDeleting(null)
    fetchTemplates()
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avtalemaler</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lag maler med rik tekst og flettefelt som fylles inn automatisk.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Ny mal
        </Link>
      </div>

      {/* Flettefelt-forklaring */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm text-amber-800 font-medium mb-1">Tilgjengelige flettefelt</p>
        <div className="flex flex-wrap gap-2">
          {["{{kunde_navn}}", "{{org_nummer}}", "{{startdato}}", "{{sluttdato}}", "{{firma_navn}}"].map((f) => (
            <code key={f} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              {f}
            </code>
          ))}
        </div>
        <p className="text-xs text-amber-600 mt-2">
          Disse erstattes automatisk med riktige verdier når du bruker malen på en avtale.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Laster...</p>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <DocumentTextIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Ingen maler ennå</p>
          <p className="text-sm text-gray-400 mt-1">Lag din første avtalemal for å komme i gang.</p>
          <Link
            href="/templates/new"
            className="inline-flex items-center gap-2 mt-4 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Lag første mal
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Navn</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Varighet</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Opprettet</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/templates/${t.id}`} className="font-medium text-gray-900 hover:text-slate-700">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.duration_months} {t.duration_months === 1 ? "måned" : "måneder"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteTemplate(t.id, t.name)}
                      disabled={deleting === t.id}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Slett mal"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
