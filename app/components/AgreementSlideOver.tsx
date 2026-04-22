"use client"

import { useEffect, useRef, useState } from "react"

export default function AgreementSlideOver({
  open,
  onClose,
  editingAgreement,
  newTitle,
  setNewTitle,
  newStart,
  setNewStart,
  newEnd,
  setNewEnd,
  newContactName,
  setNewContactName,
  newContactEmail,
  setNewContactEmail,
  newContactPhone,
  setNewContactPhone,
  newSigned,
  setNewSigned,
  newFile,
  setNewFile,
  removeExistingFile,
  setRemoveExistingFile,
  onSave,
}: any) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  // ESC to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (pdfModalOpen) {
          setPdfModalOpen(false)
          setPdfUrl(null)
        } else {
          onClose()
        }
      }
    }
    if (open || pdfModalOpen) document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, pdfModalOpen, onClose])

  // Click outside to close
  function handleBackdropClick(e: any) {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      onClose()
    }
  }

  function openPdfModal(url: string) {
    setPdfUrl(url)
    setPdfModalOpen(true)
  }

  function closePdfModal() {
    setPdfModalOpen(false)
    setPdfUrl(null)
  }

  if (!open) return null

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
        onMouseDown={handleBackdropClick}
      >
      <div
        ref={panelRef}
        className="h-full w-full max-w-md bg-white shadow-xl border-l border-gray-200 overflow-y-auto animate-slideIn"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">
            {editingAgreement ? "Rediger avtale" : "Ny avtale"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Lukk
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-4">
          {/* Tittel */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Tittel</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Datoer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Startdato
              </label>
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Sluttdato
              </label>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Kontaktperson */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Kontaktperson
            </label>
            <input
              type="text"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Kontakt epost */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Kontakt e‑post
            </label>
            <input
              type="email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Kontakt telefon */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Kontakt telefon
            </label>
            <input
              type="text"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Signert */}
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={newSigned}
              onChange={(e) => setNewSigned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900"
            />
            Signert
          </label>

          {/* Eksisterende fil */}
          {editingAgreement && editingAgreement.file_url && !removeExistingFile && (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
              <p className="font-medium text-gray-800">Eksisterende fil:</p>
              <button
                onClick={() => openPdfModal(editingAgreement.file_url)}
                className="text-gray-900 underline"
              >
                Åpne avtale
              </button>
              <button
                type="button"
                onClick={() => setRemoveExistingFile(true)}
                className="mt-2 block text-sm text-red-600 hover:text-red-700"
              >
                Fjern eksisterende fil
              </button>
            </div>
          )}

          {editingAgreement && removeExistingFile && (
            <p className="text-sm text-red-700">
              Eksisterende fil vil bli fjernet når du lagrer avtalen.
            </p>
          )}

          {/* Filopplasting */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Last opp avtale (PDF)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-black"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Avbryt
          </button>
          <button
            onClick={onSave}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            {editingAgreement ? "Oppdater avtale" : "Lagre avtale"}
          </button>
        </div>
      </div>

      {/* PDF Modal */}
      {pdfModalOpen && pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <h3 className="text-lg font-semibold">Avtale PDF</h3>
              <button
                onClick={closePdfModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <iframe
                src={pdfUrl}
                className="w-full h-[70vh]"
                title="Avtale PDF"
              />
            </div>
          </div>
        </div>
      )}

    </>
  )
}
