"use client"

export const dynamic = "force-dynamic"
export const dynamicParams = true

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/lib/AuthContext"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"
import RichTextEditor from "@/app/components/RichTextEditor"
import { substituteMergeFields } from "@/lib/mergeFields"
import { useTranslations, useLocale } from "next-intl"
import { generateBrandedPDF, type PDFBranding } from "@/lib/generateBrandedPDF"

type DbSigner = { name: string; email: string; sessionId: string; url: string; signed: boolean }

type AgreementDetail = {
  id: string
  title: string
  start_date: string
  end_date: string
  signed: boolean
  file_url: string | null
  signed_file_url: string | null
  archived: boolean
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  signing_status: string | null
  signing_url: string | null
  signer_name: string | null
  signer_email: string | null
  signers: DbSigner[] | null
  template_id: string | null
  content: string | null
  customer_id: string
  customers: { id: string; name: string; org_nummer: string | null }
}

type Template = { id: string; name: string; duration_months: number; content: string }


function formatDateNO(dateStr: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("no-NO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, account } = useAuth()
  const t = useTranslations("agreementDetail")
  const tc = useTranslations("common")
  const locale = useLocale()

  const [agreement, setAgreement] = useState<AgreementDetail | null>(null)
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [signed, setSigned] = useState(false)
  const [saved, setSaved] = useState(false)

  const [newFile, setNewFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [previewMode, setPreviewMode] = useState(false)
  const [previewContent, setPreviewContent] = useState("")
  const [generating, setGenerating] = useState(false)

  const [signers, setSigners] = useState<{ name: string; email: string }[]>([{ name: "", email: "" }])
  const [signerManuallySet, setSignerManuallySet] = useState(false)
  const [signingLoading, setSigningLoading] = useState(false)
  const [signingError, setSigningError] = useState("")
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [branding, setBranding] = useState<PDFBranding | undefined>(undefined)

  useEffect(() => {
    if (!user || !id) return
    fetchAgreement()
    fetchTemplates()
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((d) => setBranding({
        logoUrl: d.logo_url ?? null,
        companyName: d.name ?? null,
        address: d.address ?? null,
        postal_code: d.postal_code ?? null,
        city: d.city ?? null,
        phone: d.phone ?? null,
        email: d.contact_email ?? null,
      }))
  }, [user, id])

  async function fetchAgreement() {
    if (!supabase) return
    const { data } = await supabase
      .from("agreements")
      .select("*, customers(id, name, org_nummer)")
      .eq("id", id)
      .single()
    if (data) {
      const a = data as AgreementDetail
      setAgreement(a)
      setTitle(a.title)
      setStartDate(a.start_date)
      setEndDate(a.end_date)
      setContactName(a.contact_name ?? "")
      setContactEmail(a.contact_email ?? "")
      setContactPhone(a.contact_phone ?? "")
      setSigned(a.signed ?? false)
      if (!a.signing_status) {
        setSigners([{ name: a.signer_name ?? a.contact_name ?? "", email: a.signer_email ?? a.contact_email ?? "" }])
      }
    }
  }

  useEffect(() => {
    if (signerManuallySet) return
    if (agreement?.signing_status) return
    setSigners(prev => {
      const updated = [...prev]
      if (!agreement?.signer_name) updated[0] = { ...updated[0], name: contactName }
      if (!agreement?.signer_email) updated[0] = { ...updated[0], email: contactEmail }
      return updated
    })
  }, [contactName, contactEmail])

  async function fetchTemplates() {
    const res = await fetch("/api/templates")
    const { templates } = await res.json()
    setTemplates(templates ?? [])
  }

  async function handleSaveInfo() {
    if (!supabase || !agreement) return
    await supabase.from("agreements").update({
      title,
      start_date: startDate,
      end_date: endDate,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
    }).eq("id", id)
    setAgreement(prev => prev ? { ...prev, title, start_date: startDate, end_date: endDate, contact_name: contactName, contact_email: contactEmail, contact_phone: contactPhone } : prev)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSaveSigned(value: boolean) {
    if (!supabase) return
    await supabase.from("agreements").update({ signed: value }).eq("id", id)
    setAgreement(prev => prev ? { ...prev, signed: value } : prev)
  }

  async function handleUploadPDF() {
    if (!supabase || !newFile || !agreement) return
    setUploading(true)
    try {
      const ext = newFile.name.split(".").pop()
      const fileName = `${agreement.customers.id}/${Date.now()}.${ext}`
      const { data: upload, error } = await supabase.storage.from("agreements").upload(fileName, newFile)
      if (!error && upload) {
        const { data: urlData } = supabase.storage.from("agreements").getPublicUrl(upload.path)
        await supabase.from("agreements").update({ file_url: urlData.publicUrl }).eq("id", id)
        setAgreement(prev => prev ? { ...prev, file_url: urlData.publicUrl } : prev)
        setNewFile(null)
      }
    } finally {
      setUploading(false)
    }
  }

  function getPreviewHtml() {
    const tmpl = templates.find(t => t.id === selectedTemplateId)
    if (!tmpl?.content) return ""
    return substituteMergeFields(tmpl.content, {
      kunde_navn: agreement?.customers?.name,
      org_nummer: agreement?.customers?.org_nummer ?? undefined,
      firma_navn: account?.name,
      startdato: formatDateNO(startDate),
      sluttdato: formatDateNO(endDate),
    })
  }

  async function handleSaveFromPreview() {
    if (!supabase || !agreement) return
    setGenerating(true)
    try {
      const generatedFile = await generateBrandedPDF(previewContent, title, branding)
      const fileName = `${agreement.customers.id}/${Date.now()}.pdf`
      const { data: upload, error } = await supabase.storage.from("agreements").upload(fileName, generatedFile)
      if (!error && upload) {
        const { data: urlData } = supabase.storage.from("agreements").getPublicUrl(upload.path)
        await supabase.from("agreements").update({
          file_url: urlData.publicUrl,
          content: previewContent,
          template_id: selectedTemplateId || null,
        }).eq("id", id)
        setAgreement(prev => prev ? { ...prev, file_url: urlData.publicUrl } : prev)
        setPreviewMode(false)
        setSelectedTemplateId("")
      }
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendForSigning() {
    if (!agreement) return
    setSigningLoading(true)
    setSigningError("")
    try {
      const res = await fetch(`/api/agreements/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      await fetchAgreement()
    } catch {
      setSigningError(t("signingError"))
    } finally {
      setSigningLoading(false)
    }
  }

  async function handleArchive() {
    if (!supabase || !agreement) return
    const newArchived = !agreement.archived
    await supabase.from("agreements").update({ archived: newArchived }).eq("id", id)
    setAgreement(prev => prev ? { ...prev, archived: newArchived } : prev)
  }

  async function handleDelete() {
    if (!supabase || !window.confirm(t("deleteConfirm"))) return
    const customerId = agreement?.customer_id
    await supabase.from("agreements").delete().eq("id", id)
    router.push(`/customers/${customerId}`)
  }

  async function handleCopyLink(url: string, index: number) {
    await navigator.clipboard.writeText(url)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  function getExpiryBadge() {
    if (!agreement?.end_date || agreement.archived) return null
    const days = Math.ceil((new Date(agreement.end_date).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { text: t("statusExpired"),                       color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 7)  return { text: t("statusExpiresDays", { days }),          color: "bg-red-50 text-red-600 ring-red-200" }
    if (days <= 30) return { text: t("statusExpiresDays", { days }),          color: "bg-amber-50 text-amber-700 ring-amber-200" }
    return { text: t("statusActive"), color: "bg-green-50 text-green-700 ring-green-200" }
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

  if (previewMode) {
    return (
      <div className="fixed top-0 right-0 bottom-0 left-64 z-50 bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setPreviewMode(false)} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              {t("pdfBackToEdit")}
            </button>
            <button onClick={handleSaveFromPreview} disabled={generating} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {generating ? t("pdfGenerating") : t("pdfSaveAsPDF")}
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {formatDateNO(startDate)} – {formatDateNO(endDate)}
              {agreement?.customers?.name && <> · {agreement.customers.name}</>}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <RichTextEditor content={previewContent} onChange={setPreviewContent} placeholder="Innhold..." />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setPreviewMode(false)} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              {tc("cancel")}
            </button>
            <button onClick={handleSaveFromPreview} disabled={generating} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {generating ? t("pdfGenerating") : t("pdfSaveAsPDF")}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const badge = getExpiryBadge()

  return (
    <div className="p-8 max-w-3xl space-y-6">

      <Link href={`/customers/${agreement?.customer_id ?? ""}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        {agreement?.customers?.name ?? "..."}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{agreement?.title ?? ""}</h1>
          {agreement?.archived ? (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 ring-1 ring-gray-200 shrink-0">{t("archivedBanner")}</span>
          ) : badge ? (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ring-1 shrink-0 ${badge.color}`}>{badge.text}</span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200 shrink-0">{t("statusActive")}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleArchive} className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors">
            {agreement?.archived ? t("restoreButton") : t("archiveButton")}
          </button>
          <button onClick={handleDelete} className="text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors">
            {t("deleteAgreement")}
          </button>
        </div>
      </div>

      {/* Avtaleinformasjon */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t("infoTitle")}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelTitle")}</label>
            <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelStartDate")}</label>
              <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelEndDate")}</label>
              <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelContact")}</label>
            <input className={inputClass} value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelEmail")}</label>
              <input type="email" className={inputClass} value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("labelPhone")}</label>
              <input className={inputClass} value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
            </div>
          </div>
        </div>
        <button
          onClick={handleSaveInfo}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? "bg-green-600 text-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
        >
          {saved ? tc("saved") : tc("saveChanges")}
        </button>
      </div>

      {/* PDF-dokument */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t("pdfTitle")}</h2>

        {agreement?.file_url ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <a href={agreement.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                {t("pdfOpen")} ↗
              </a>
              {!agreement?.signing_status && (
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none text-gray-700">
                  <input
                    type="checkbox"
                    checked={signed}
                    onChange={e => { setSigned(e.target.checked); handleSaveSigned(e.target.checked) }}
                    className="h-4 w-4 rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                  />
                  {t("signedLabel")}
                </label>
              )}
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-medium text-gray-500">{t("pdfReplace")}</p>
              <input type="file" accept="application/pdf" onChange={e => setNewFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700" />
              {newFile && (
                <button onClick={handleUploadPDF} disabled={uploading} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
                  {uploading ? t("pdfUploading") : t("pdfUploadButton")}
                </button>
              )}
            </div>
            {templates.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-xs font-medium text-gray-500">{t("pdfFromTemplateLabel")}</p>
                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className={inputClass}>
                  <option value="">{t("pdfSelectTemplate")}</option>
                  {templates.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <button onClick={() => { setPreviewContent(getPreviewHtml()); setPreviewMode(true) }} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                    {t("pdfPreview")}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">{t("pdfUploadLabel")}</p>
              <input type="file" accept="application/pdf" onChange={e => setNewFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700" />
              {newFile && (
                <button onClick={handleUploadPDF} disabled={uploading} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors">
                  {uploading ? t("pdfUploading") : t("pdfUploadButton")}
                </button>
              )}
            </div>
            {templates.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{t("pdfOr")}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">{t("pdfFromTemplateLabel")}</p>
                  <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className={inputClass}>
                    <option value="">{t("pdfSelectTemplate")}</option>
                    {templates.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                    ))}
                  </select>
                  {selectedTemplateId && (
                    <button onClick={() => { setPreviewContent(getPreviewHtml()); setPreviewMode(true) }} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                      {t("pdfPreview")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Digital signering */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t("signingTitle")}</h2>

        {agreement?.signing_status === "signed" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm font-medium">{t("signingSignedLabel")}</span>
            </div>
            {agreement.signed_file_url && (
              <a href={agreement.signed_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                {t("signingSignedFile")} ↗
              </a>
            )}
          </div>
        ) : agreement?.signing_status === "pending" ? (
          (() => {
            const pendingSigners: DbSigner[] = (agreement.signers && agreement.signers.length > 0)
              ? agreement.signers
              : agreement.signing_url
                ? [{ name: agreement.signer_name ?? "", email: "", sessionId: "", url: agreement.signing_url, signed: false }]
                : []
            return (
              <div className="space-y-3">
                <div className="space-y-2">
                  {pendingSigners.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name || `Signatar ${i + 1}`}</p>
                        {s.signed
                          ? <p className="text-xs text-green-600 font-medium">{t("signedLabel")} ✓</p>
                          : <p className="text-xs text-amber-500">{t("signingPendingStatus")}</p>
                        }
                      </div>
                      {s.url && (
                        <button
                          onClick={() => handleCopyLink(s.url, i)}
                          className="shrink-0 text-xs text-slate-600 hover:text-slate-900 border border-gray-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {copiedIndex === i ? t("signingCopied") : t("signingCopyLink")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()
        ) : !agreement?.file_url ? (
          <p className="text-sm text-gray-400">{t("signingNoPDF")}</p>
        ) : (
          <div className="space-y-4">
            {signers.map((s, i) => (
              <div key={i} className="space-y-2">
                {signers.length > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400">Signatar {i + 1}</p>
                    <button
                      onClick={() => setSigners(prev => prev.filter((_, j) => j !== i))}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      {tc("delete")}
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("signingNameLabel")}</label>
                  <input
                    className={inputClass}
                    value={s.name}
                    onChange={e => { const n = [...signers]; n[i] = { ...n[i], name: e.target.value }; setSigners(n); setSignerManuallySet(true) }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t("signingEmailLabel")}</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={s.email}
                    onChange={e => { const n = [...signers]; n[i] = { ...n[i], email: e.target.value }; setSigners(n); setSignerManuallySet(true) }}
                  />
                </div>
              </div>
            ))}
            <div>
              <button
                onClick={() => setSigners(prev => [...prev, { name: "", email: "" }])}
                className="text-xs text-slate-600 hover:text-slate-900 underline underline-offset-2 transition-colors"
              >
                + {t("addSigner")}
              </button>
            </div>
            {signers.length === 1 && <p className="text-xs text-gray-400">{t("signingEmailHint")}</p>}
            {signingError && <p className="text-sm text-red-600">{signingError}</p>}
            <button
              onClick={handleSendForSigning}
              disabled={signingLoading || signers.every(s => !s.email)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              ✍ {signingLoading ? t("signingSending") : t("signingSend")}
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
