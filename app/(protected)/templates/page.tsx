"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DocumentTextIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline"
import { useTranslations, useLocale } from "next-intl"

type Template = {
  id: string
  name: string
  duration_months: number
  created_at: string
  category_id: string | null
  agreement_categories: { id: string; name: string } | null
}

export default function TemplatesPage() {
  const t = useTranslations("templates")
  const tc = useTranslations("common")
  const locale = useLocale()
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
    if (!window.confirm(t("deleteConfirm", { name }))) return
    setDeleting(id)
    await fetch(`/api/templates/${id}`, { method: "DELETE" })
    setDeleting(null)
    fetchTemplates()
  }

  const dateLocale = locale === "en" ? "en-GB" : "no-NO"

  // Grupper maler etter kategori
  const grouped: { label: string; templates: Template[] }[] = []
  const categoryMap = new Map<string, { label: string; templates: Template[] }>()

  for (const tmpl of templates) {
    const catId = tmpl.category_id ?? "__none__"
    const catName = tmpl.agreement_categories?.name ?? "Uten kategori"
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { label: catName, templates: [] })
    }
    categoryMap.get(catId)!.templates.push(tmpl)
  }

  // Sorter: kategorier med navn først (alfabetisk), "Uten kategori" sist
  const withCategory = [...categoryMap.entries()]
    .filter(([key]) => key !== "__none__")
    .sort((a, b) => a[1].label.localeCompare(b[1].label))
    .map(([, v]) => v)

  const withoutCategory = categoryMap.get("__none__")

  if (withCategory.length > 0) grouped.push(...withCategory)
  if (withoutCategory) grouped.push(withoutCategory)

  function TemplateRow({ tmpl }: { tmpl: Template }) {
    return (
      <tr key={tmpl.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <Link href={`/templates/${tmpl.id}`} className="font-medium text-gray-900 hover:text-slate-700">
            {tmpl.name}
          </Link>
        </td>
        <td className="px-4 py-3 text-gray-500">
          {tmpl.duration_months} {tmpl.duration_months === 1 ? t("monthSingular") : t("monthPlural")}
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs">
          {new Date(tmpl.created_at).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => deleteTemplate(tmpl.id, tmpl.name)}
            disabled={deleting === tmpl.id}
            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
            title={t("deleteTooltip")}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/templates/new"
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          {t("newTemplate")}
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{tc("loading")}</p>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <DocumentTextIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t("noTemplates")}</p>
          <p className="text-sm text-gray-400 mt-1">{t("noTemplatesDesc")}</p>
          <Link
            href="/templates/new"
            className="inline-flex items-center gap-2 mt-4 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            {t("createFirst")}
          </Link>
        </div>
      ) : grouped.length === 1 && grouped[0].label === "Uten kategori" ? (
        // Ingen kategorier i bruk — vis flat tabell uten headers
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-auto" />
              <col style={{ width: "140px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "48px" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnName")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnDuration")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnCreated")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {grouped[0].templates.map((tmpl) => <TemplateRow key={tmpl.id} tmpl={tmpl} />)}
            </tbody>
          </table>
        </div>
      ) : (
        // Kategorisert visning
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                {group.label}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-auto" />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "48px" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnName")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnDuration")}</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{t("columnCreated")}</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.templates.map((tmpl) => <TemplateRow key={tmpl.id} tmpl={tmpl} />)}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
