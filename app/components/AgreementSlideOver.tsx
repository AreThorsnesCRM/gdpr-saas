"use client"

import { useEffect, useRef } from "react"

type Customer = { id: string; name: string }

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
  onSave: () => void
}

const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"

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
  onSave,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null)

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

  if (!open) return null

  const showCustomerPicker = customers && customers.length > 0 && !editingAgreement

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
              <label className="text-xs font-medium text-gray-500">Sluttdato *</label>
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

          {/* Filopplasting */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Last opp avtale (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
            />
          </div>
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
            onClick={onSave}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            {editingAgreement ? "Oppdater avtale" : "Lagre avtale"}
          </button>
        </div>
      </div>
    </div>
  )
}
