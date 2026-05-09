"use client"

import { useRef, useState } from "react"
import { ArrowUpTrayIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline"

type CustomerRow = {
  name: string
  email: string
  phone: string
  org_nummer: string
  address: string
  postal_code: string
  city: string
}

type Props = {
  open: boolean
  onClose: () => void
  onImported: () => void
}

// Normaliserer kolonnenavn fra Excel til våre felt
const COL_MAP: Record<string, keyof CustomerRow> = {
  navn: "name", name: "name", firma: "name", company: "name", bedrift: "name",
  epost: "email", "e-post": "email", email: "email", mail: "email", epostadresse: "email",
  telefon: "phone", phone: "phone", tlf: "phone", mobil: "phone", mobile: "phone", telefonnummer: "phone",
  orgnr: "org_nummer", "org.nr": "org_nummer", org_nummer: "org_nummer",
  organisasjonsnummer: "org_nummer", "org nummer": "org_nummer", "org.nummer": "org_nummer",
  adresse: "address", address: "address", gateadresse: "address",
  postnummer: "postal_code", "postal code": "postal_code", postal_code: "postal_code", zip: "postal_code",
  sted: "city", by: "city", city: "city", poststed: "city",
}

function normalizeKey(raw: string): keyof CustomerRow | null {
  return COL_MAP[raw.toLowerCase().trim()] ?? null
}

function parseSheet(data: any[][]): CustomerRow[] {
  if (data.length < 2) return []
  const headers = (data[0] as any[]).map((h) => String(h ?? ""))
  const fieldMap: { colIdx: number; field: keyof CustomerRow }[] = []
  headers.forEach((h, i) => {
    const field = normalizeKey(h)
    if (field) fieldMap.push({ colIdx: i, field })
  })

  return data.slice(1).map((row) => {
    const customer: CustomerRow = { name: "", email: "", phone: "", org_nummer: "", address: "", postal_code: "", city: "" }
    fieldMap.forEach(({ colIdx, field }) => {
      customer[field] = String(row[colIdx] ?? "").trim()
    })
    return customer
  }).filter((c) => c.name)
}

export default function ExcelImportModal({ open, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [fileName, setFileName] = useState("")
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)

  if (!open) return null

  async function handleFile(file: File) {
    setError("")
    setRows([])
    setImported(null)
    setFileName(file.name)

    const XLSX = await import("xlsx")
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: "array" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
    const parsed = parseSheet(data)

    if (parsed.length === 0) {
      setError("Ingen gyldige rader funnet. Sjekk at filen har en Navn-kolonne.")
      return
    }
    setRows(parsed)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleImport() {
    if (!rows.length) return
    setImporting(true)
    setError("")
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: rows }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Noe gikk galt"); return }
      setImported(json.imported)
      onImported()
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    setRows([]); setFileName(""); setImported(null); setError("")
    onClose()
  }

  const fields: { key: keyof CustomerRow; label: string }[] = [
    { key: "name", label: "Navn" },
    { key: "email", label: "E-post" },
    { key: "phone", label: "Telefon" },
    { key: "org_nummer", label: "Org.nr" },
    { key: "address", label: "Adresse" },
    { key: "postal_code", label: "Postnr" },
    { key: "city", label: "Sted" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Importer kunder fra Excel</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Suksess */}
          {imported !== null ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircleIcon className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-gray-900">{imported} kunder importert!</p>
              <button onClick={handleClose}
                className="mt-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                Lukk
              </button>
            </div>
          ) : (
            <>
              {/* Filslipp */}
              {!rows.length && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    dragOver ? "border-slate-400 bg-slate-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <ArrowUpTrayIcon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700">Dra og slipp en Excel-fil her</p>
                  <p className="text-xs text-gray-400 mt-1">eller klikk for å velge fil (.xlsx)</p>
                  <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
                </div>
              )}

              {/* Hint om kolonner */}
              {!rows.length && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 space-y-1">
                  <p className="font-medium">Forventede kolonnenavn i Excel-filen:</p>
                  <p className="text-blue-600">
                    <strong>Navn</strong> (påkrevd) · E-post · Telefon · Org.nr · Adresse · Postnummer · Sted
                  </p>
                  <p className="text-blue-500 mt-1">Kolonnenavnene kan også være på engelsk (Name, Email, Phone, osv.)</p>
                </div>
              )}

              {/* Feilmelding */}
              {error && <p className="text-sm text-red-600">{error}</p>}

              {/* Forhåndsvisning */}
              {rows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fileName}</p>
                      <p className="text-xs text-gray-400">{rows.length} kunder klar til import</p>
                    </div>
                    <button onClick={() => { setRows([]); setFileName("") }}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                      Velg ny fil
                    </button>
                  </div>

                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {fields.map((f) => (
                              <th key={f.key} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                                {f.label}{f.key === "name" && <span className="text-red-400 ml-0.5">*</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                              {fields.map((f) => (
                                <td key={f.key} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                                  {row[f.key] || <span className="text-gray-300">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && imported === null && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
            <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Avbryt
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {importing ? "Importerer..." : `Importer ${rows.length} kunder`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
