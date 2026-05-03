"use client"

import { useEffect, useRef, useState } from "react"
import { substituteMergeFields } from "@/lib/mergeFields"

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
  // Kunde-velger — vises kun fra avtalelisten (ikke fra kundesiden)
  customers?: Customer[]
  customerId?: string
  setCustomerId?: (id: string) => void
  // Avtalefelt
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
  // Flettefelt-data for forhåndsvisning
  mergeData?: { kunde_navn?: string; org_nummer?: string; firma_navn?: string }
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

async function generatePDFFile(html: string, title: string): Promise<File> {
  const container = document.createElement("div")
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;padding:60px 80px;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;background:white;color:#111;"
  container.innerHTML = `<style>h2{font-size:18px;font-weight:600;margin:1.2em 0 0.4em}h3{font-size:15px;font-weight:600;margin:1em 0 0.3em}p{margin:0 0 0.8em}ul,ol{margin:0 0 0.8em;padding-left:1.8em}li{margin:0.2em 0}strong{font-weight:700}em{font-style:italic}</style>${html}`
  document.body.appendChild(container)

  const html2canvasLib = (await import("html2canvas")).default
  const canvas = await html2canvasLib(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false })
  document.body.removeChild(container)

  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "mm", format: "a4" })
  const pdfW = 210
  const pdfH = 297
  const pageHeightPx = (pdfH / pdfW) * canvas.width

  let yPx = 0
  let page = 0
  while (yPx < canvas.height) {
    if (page > 0) pdf.addPage()
    const sliceH = Math.min(pageHeightPx, canvas.height - yPx)
    const tmp = document.createElement("canvas")
    tmp.width = canvas.width
    tmp.height = sliceH
    const ctx = tmp.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, sliceH)
    ctx.drawImage(canvas, 0, yPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    pdf.addImage(tmp.toDataURL("image/png"), "PNG", 0, 0, pdfW, (sliceH / pageHeightPx) * pdfH)
    yPx += pageHeightPx
    page++
  }

  const blob = pdf.output("blob")
  const safeName = (title || "avtale").replace(/[^a-z0-9æøå\s.-]/gi, "_")
  return new File([blob], `${safeName}.pdf`, { type: "application/pdf" })
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
  onSave,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [previewMode, setPreviewMode] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Hent maler én gang når slide-overen åpnes
  useEffect(() => {
    if (!open || editingAgreement) return
    fetch("/api/templates")
      .then((r) => r.json())
      .then(({ templates }) => setTemplates(templates ?? []))
  }, [open, editingAgreement])

  // Nullstill mal-valg og preview når slide-overen lukkes
  useEffect(() => {
    if (!open) {
      setSelectedTemplateId("")
      setPreviewMode(false)
    }
  }, [open])

  // Beregn sluttdato automatisk når startdato endres og en mal er valgt
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
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    if (!newTitle) setNewTitle(template.name)
    if (newStart) setNewEnd(calcEndDate(newStart, template.duration_months))
  }

  function getPreviewHtml(): string {
    const template = templates.find((t) => t.id === selectedTemplateId)
    if (!template?.content) return ""
    return substituteMergeFields(template.content, {
      ...mergeData,
      startdato: formatDateNO(newStart),
      sluttdato: formatDateNO(newEnd),
    })
  }

  async function handleSaveFromPreview() {
    const template = templates.find((t) => t.id === selectedTemplateId)
    if (!template) return
    setGenerating(true)
    try {
      const previewHtml = getPreviewHtml()
      const generatedFile = await generatePDFFile(previewHtml, newTitle)
      onSave({ generatedFile, content: template.content, templateId: selectedTemplateId })
      setPreviewMode(false)
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveClick() {
    if (selectedTemplateId) {
      setPreviewMode(true)
    } else {
      onSave()
    }
  }

  if (!open) return null

  // --- Forhåndsvisnings-modus ---
  if (previewMode) {
    const previewHtml = getPreviewHtml()
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
        onMouseDown={handleBackdropClick}
      >
        <div
          ref={panelRef}
          className="h-full w-full max-w-2xl bg-white shadow-xl border-l border-gray-200 flex flex-col animate-slideIn"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Forhåndsvisning</h2>
              <p className="text-xs text-gray-400 mt-0.5">{newTitle}</p>
            </div>
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              Lukk
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div
              className="text-sm text-gray-800 leading-relaxed
                [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-gray-900
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-gray-900
                [&_p]:mb-3 [&_p]:text-gray-700
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3
                [&_li]:mb-0.5 [&_li]:text-gray-700
                [&_strong]:font-semibold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: previewHtml || "<p class='text-gray-400'>Ingen innhold i malen.</p>" }}
            />
          </div>

          <div className="flex justify-between items-center gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setPreviewMode(false)}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← Tilbake til skjema
            </button>
            <button
              onClick={handleSaveFromPreview}
              disabled={generating}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {generating ? "Genererer PDF..." : "Lagre som PDF"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Skjema-modus ---
  const showCustomerPicker = customers && customers.length > 0 && !editingAgreement
  const showTemplatePicker = !editingAgreement && templates.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 overflow-y-auto animate-slideIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {editingAgreement ? "Rediger avtale" : "Ny avtale"}
          </h2>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Lukk
          </button>
        </div>

        <div className="px-5 py-6 space-y-4">

          {/* Mal-velger */}
          {showTemplatePicker && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Bruk mal</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className={inputCls}
              >
                <option value="">Velg mal (valgfritt)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.duration_months} mnd
                  </option>
                ))}
              </select>
              {selectedTemplateId && (
                <p className="text-xs text-amber-600">
                  Sluttdato beregnes automatisk · Forhåndsvis innhold før lagring
                </p>
              )}
            </div>
          )}

          {/* Kunde-velger (kun fra avtalelisten) */}
          {showCustomerPicker && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Kunde *</label>
              <select
                value={customerId ?? ""}
                onChange={(e) => setCustomerId?.(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Velg kunde</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tittel */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Tittel *</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="F.eks. Serviceavtale 2025"
              className={inputCls}
            />
          </div>

          {/* Datoer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Startdato *</label>
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">
                Sluttdato *
                {selectedTemplateId && <span className="text-amber-500 ml-1">auto</span>}
              </label>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Kontaktperson */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Kontaktperson</label>
            <input
              type="text"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Navn"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">E-post</label>
              <input
                type="email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                placeholder="e-post@eksempel.no"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Telefon</label>
              <input
                type="text"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="+47 000 00 000"
                className={inputCls}
              />
            </div>
          </div>

          {/* Signert */}
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={newSigned}
              onChange={(e) => setNewSigned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-slate-800"
            />
            Signert
          </label>

          {/* Eksisterende fil */}
          {editingAgreement?.file_url && !removeExistingFile && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm space-y-1">
              <p className="font-medium text-gray-700">Eksisterende fil</p>
              <a
                href={editingAgreement.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 underline hover:text-slate-900"
              >
                Åpne avtale
              </a>
              <button
                type="button"
                onClick={() => setRemoveExistingFile(true)}
                className="block text-sm text-red-500 hover:text-red-700"
              >
                Fjern fil
              </button>
            </div>
          )}
          {editingAgreement && removeExistingFile && (
            <p className="text-sm text-red-600">Filen fjernes når du lagrer.</p>
          )}

          {/* Filopplasting — skjul når mal er valgt (PDF genereres automatisk) */}
          {!selectedTemplateId && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Last opp avtale (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleSaveClick}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            {editingAgreement
              ? "Oppdater avtale"
              : selectedTemplateId
              ? "Forhåndsvis →"
              : "Lagre avtale"}
          </button>
        </div>
      </div>
    </div>
  )
}
