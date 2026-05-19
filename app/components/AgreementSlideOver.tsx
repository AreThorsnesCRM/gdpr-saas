"use client"

import { useEffect, useRef, useState } from "react"
import { substituteMergeFields } from "@/lib/mergeFields"
import RichTextEditor from "@/app/components/RichTextEditor"
import { useTranslations } from "next-intl"
import { generateBrandedPDF, type PDFBranding } from "@/lib/generateBrandedPDF"

type Customer = { id: string; name: string }
type Template = { id: string; name: string; duration_months: number; content: string }

type SaveOpts = {
  generatedFile?: File
  content?: string
  templateId?: string
}

type Props = {
  open: boolean
  onClose: () => void
  editingAgreement: any | null
  customers?: Customer[]
  customerId?: string
  setCustomerId?: (id: string) => void
  newTitle: string
  setNewTitle: (v: string) => void
  newStart: string
  setNewStart: (v: string) => void
  newEnd: string
  setNewEnd: (v: string) => void
  newContactName: string
  setNewContactName: (v: string) => void
  newContactEmail: string
  setNewContactEmail: (v: string) => void
  newContactPhone: string
  setNewContactPhone: (v: string) => void
  newSigned: boolean
  setNewSigned: (v: boolean) => void
  newFile: File | null
  setNewFile: (f: File | null) => void
  removeExistingFile: boolean
  setRemoveExistingFile: (v: boolean) => void
  mergeData?: { kunde_navn?: string; org_nummer?: string; firma_navn?: string }
  customerName?: string
  onSave: (opts?: SaveOpts) => void
}

const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

function calcEndDate(startDate: string, months: number): string {
  const d = new Date(startDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split("T")[0]
}

function formatDateNO(dateStr: string): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("no-NO", { day: "2-digit", month: "2-digit", year: "numeric" })
}


export default function AgreementSlideOver({
  open, onClose, editingAgreement,
  customers, customerId, setCustomerId,
  newTitle, setNewTitle,
  newStart, setNewStart,
  newEnd, setNewEnd,
  newContactName, setNewContactName,
  newContactEmail, setNewContactEmail,
  newContactPhone, setNewContactPhone,
  newSigned, setNewSigned,
  newFile, setNewFile,
  removeExistingFile, setRemoveExistingFile,
  mergeData,
  customerName,
  onSave,
}: Props) {
  const t = useTranslations("slideOver")
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [previewMode, setPreviewMode] = useState(false)
  const [previewContent, setPreviewContent] = useState("")
  const [generating, setGenerating] = useState(false)
  const [branding, setBranding] = useState<PDFBranding | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    fetch("/api/templates")
      .then((r) => r.json())
      .then(({ templates }) => setTemplates(templates ?? []))
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
  }, [open])

  useEffect(() => {
    if (!open) {
      setSelectedTemplateId("")
      setPreviewMode(false)
    }
  }, [open])

  useEffect(() => {
    if (!selectedTemplateId || !newStart) return
    const template = templates.find((t) => t.id === selectedTemplateId)
    if (template) setNewEnd(calcEndDate(newStart, template.duration_months))
  }, [newStart, selectedTemplateId])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  function handleBackdropClick(e: React.MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId)
    if (!templateId) return
    const template = templates.find((tmpl) => tmpl.id === templateId)
    if (!template) return
    if (!newTitle) setNewTitle(template.name)
    if (newStart) setNewEnd(calcEndDate(newStart, template.duration_months))
  }

  function getPreviewHtml(): string {
    const template = templates.find((tmpl) => tmpl.id === selectedTemplateId)
    if (!template?.content) return ""
    return substituteMergeFields(template.content, {
      ...mergeData,
      startdato: formatDateNO(newStart),
      sluttdato: formatDateNO(newEnd),
    })
  }

  async function handleSaveFromPreview() {
    setGenerating(true)
    try {
      const generatedFile = await generateBrandedPDF(previewContent, newTitle, branding)
      onSave({ generatedFile, content: previewContent, templateId: selectedTemplateId })
      setPreviewMode(false)
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveClick() {
    if (selectedTemplateId) {
      setPreviewContent(getPreviewHtml())
      setPreviewMode(true)
    } else {
      onSave()
    }
  }

  if (!open) return null

  if (previewMode) {
    return (
      <div className="fixed top-0 right-0 bottom-0 left-64 z-50 bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">

          <div className="flex items-center justify-between">
            <button
              onClick={() => setPreviewMode(false)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {t("backToForm")}
            </button>
            <button
              onClick={handleSaveFromPreview}
              disabled={generating}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {generating ? t("generating") : t("saveAsPDF")}
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">{newTitle}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {formatDateNO(newStart)} – {formatDateNO(newEnd)}
              {mergeData?.kunde_navn && <> · {mergeData.kunde_navn}</>}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <RichTextEditor
              content={previewContent}
              onChange={setPreviewContent}
              placeholder={t("contentPlaceholder")}
            />
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setPreviewMode(false)}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSaveFromPreview}
              disabled={generating}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {generating ? t("generating") : t("saveAsPDF")}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const showCustomerPicker = customers && customers.length > 0 && !editingAgreement
  const showTemplatePicker = templates.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 overflow-y-auto animate-slideIn"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editingAgreement ? t("editTitle") : t("newTitle")}
            </h2>
            {customerName && (
              <p className="text-xs text-gray-400 mt-0.5">{customerName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            {t("cancel")}
          </button>
        </div>

        <div className="px-5 py-6 space-y-4">

          {showTemplatePicker && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                {editingAgreement ? t("generatePDFFromTemplate") : t("useTemplate")}
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className={inputCls}
              >
                <option value="">{t("selectTemplate")}</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} — {tmpl.duration_months} {t("months")}
                  </option>
                ))}
              </select>
              {selectedTemplateId && !editingAgreement && (
                <p className="text-xs text-amber-600">{t("autoEndDateHint")}</p>
              )}
              {selectedTemplateId && editingAgreement && (
                <p className="text-xs text-amber-600">{t("pdfWillBeGenerated")}</p>
              )}
            </div>
          )}

          {showCustomerPicker && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t("customerLabel")}</label>
              <select
                value={customerId ?? ""}
                onChange={(e) => setCustomerId?.(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">{t("selectCustomer")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{t("titleLabel")}</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t("startDateLabel")}</label>
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                {t("endDateLabel")}
                {selectedTemplateId && <span className="text-amber-500 ml-1">{t("endDateAuto")}</span>}
              </label>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{t("contactPerson")}</label>
            <input
              type="text"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder={t("contactNamePlaceholder")}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t("contactEmailLabel")}</label>
              <input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder={t("contactEmailPlaceholder")}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t("contactPhoneLabel")}</label>
              <input
                type="text"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder={t("contactPhonePlaceholder")}
                className={inputCls}
              />
            </div>
          </div>

          {editingAgreement?.signing_status === "signed" ? (
            <div className="inline-flex items-center gap-2 text-sm text-green-600 font-medium">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {t("signedDigitally")}
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newSigned}
                onChange={(e) => setNewSigned(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-slate-800"
              />
              {t("signed")}
            </label>
          )}

          {editingAgreement?.file_url && !removeExistingFile && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm space-y-1">
              <p className="font-medium text-gray-700">{t("existingFile")}</p>
              <a
                href={editingAgreement.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 underline hover:text-slate-900"
              >
                {t("openAgreement")}
              </a>
              <button
                type="button"
                onClick={() => setRemoveExistingFile(true)}
                className="block text-sm text-red-500 hover:text-red-700"
              >
                {t("removeFile")}
              </button>
            </div>
          )}
          {editingAgreement && removeExistingFile && (
            <p className="text-sm text-red-600">{t("fileRemovedNote")}</p>
          )}

          {!selectedTemplateId && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t("uploadPDF")}</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSaveClick}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            {editingAgreement
              ? t("updateAgreement")
              : selectedTemplateId
              ? t("preview")
              : t("saveAgreement")}
          </button>
        </div>
      </div>
    </div>
  )
}
