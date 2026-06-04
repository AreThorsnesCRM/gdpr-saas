"use client"

import { useRef, useState } from "react"
import { ArrowUpTrayIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline"
import { useTranslations } from "next-intl"

type CustomerRow = {
  name: string
  email: string
  phone: string
  org_nummer: string
  address: string
  postal_code: string
  city: string
  country: string
  website: string
}

type ImportRow = {
  customer: CustomerRow
  isDuplicate: boolean
  include: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  onImported: () => void
  existingCustomers?: Array<{ name: string; org_nummer: string | null }>
}

const COL_MAP: Record<string, keyof CustomerRow> = {
  // --- Navn / Name ---
  // NO
  navn: "name", firma: "name", bedrift: "name",
  // EN
  name: "name", company: "name",
  // SV
  namn: "name", företag: "name", foretag: "name", bolag: "name",
  // DA
  virksomhed: "name", selskab: "name",
  // FI
  nimi: "name", yritys: "name", yritysnimi: "name",
  // DE
  unternehmen: "name", gesellschaft: "name",
  // FR
  nom: "name", entreprise: "name", "société": "name", societe: "name", "raison sociale": "name",
  // ES
  nombre: "name", empresa: "name", sociedad: "name",
  // PT
  nome: "name", "razão social": "name", "razao social": "name",

  // --- E-post / Email ---
  // NO/SV/DA
  epost: "email", "e-post": "email", epostadresse: "email",
  // EN/DE/SV
  email: "email", mail: "email", "e-mail": "email",
  // FR
  courriel: "email",
  // ES
  correo: "email",
  // FI
  "sähköposti": "email", sahkoposti: "email", sposti: "email",

  // --- Telefon / Phone ---
  // NO/SV/DA/DE
  telefon: "phone", tlf: "phone", mobil: "phone", telefonnummer: "phone",
  // EN
  phone: "phone", mobile: "phone",
  // FI
  puhelin: "phone", puh: "phone", matkapuhelin: "phone",
  // DE
  handy: "phone",
  // FR
  "téléphone": "phone", telephone: "phone", portable: "phone",
  // ES
  "teléfono": "phone", telefono: "phone", "móvil": "phone", movil: "phone",
  // PT
  telefone: "phone", celular: "phone", "móvel": "phone", movel: "phone",

  // --- Org.nr ---
  // NO
  orgnr: "org_nummer", "org.nr": "org_nummer", org_nummer: "org_nummer",
  organisasjonsnummer: "org_nummer", "org nummer": "org_nummer", "org.nummer": "org_nummer",
  // SV/DE
  organisationsnummer: "org_nummer",
  // DA
  cvr: "org_nummer", "cvr-nr": "org_nummer", cvrnr: "org_nummer",
  // FI
  "y-tunnus": "org_nummer", ytunnus: "org_nummer",
  // FR
  siret: "org_nummer", siren: "org_nummer",
  // ES/PT
  nif: "org_nummer", cif: "org_nummer", cnpj: "org_nummer",

  // --- Adresse / Address ---
  // NO/DA
  adresse: "address", gateadresse: "address",
  // EN
  address: "address",
  // SV
  adress: "address", gatuadress: "address",
  // DE
  "straße": "address", strasse: "address", anschrift: "address",
  // FR
  rue: "address",
  // ES
  "dirección": "address", direccion: "address", calle: "address",
  // PT
  "endereço": "address", endereco: "address", rua: "address",
  // FI
  osoite: "address", katuosoite: "address",

  // --- Postnummer / Postal code ---
  // NO/SV/DA
  postnummer: "postal_code",
  // EN
  "postal code": "postal_code", postal_code: "postal_code", zip: "postal_code",
  // DE
  postleitzahl: "postal_code", plz: "postal_code",
  // FR
  "code postal": "postal_code",
  // ES/PT
  "código postal": "postal_code", "codigo postal": "postal_code",
  // PT/BR
  cep: "postal_code",
  // FI
  postinumero: "postal_code",

  // --- Sted / City ---
  // NO
  sted: "city", poststed: "city",
  // EN
  city: "city",
  // NO/DA
  by: "city",
  // SV
  stad: "city", ort: "city", postort: "city",
  // FR
  ville: "city",
  // ES
  ciudad: "city",
  // PT
  cidade: "city",
  // FI
  kaupunki: "city", paikkakunta: "city",

  // --- Nettside / Website ---
  // NO/DA
  nettside: "website", hjemmeside: "website",
  // EN
  website: "website", url: "website", web: "website",
  // SV
  hemsida: "website", webbplats: "website",
  // DE
  webseite: "website", homepage: "website",
  // FR
  "site web": "website",
  // ES
  "sitio web": "website",
  // PT
  site: "website",
  // FI
  verkkosivusto: "website", kotisivu: "website",

  // --- Land / Country ---
  // NO/SV/DA/DE
  land: "country",
  // EN
  country: "country",
  // FR
  pays: "country",
  // ES/PT
  "país": "country", pais: "country",
  // FI
  maa: "country",
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
    const customer: CustomerRow = { name: "", email: "", phone: "", org_nummer: "", address: "", postal_code: "", city: "", country: "", website: "" }
    fieldMap.forEach(({ colIdx, field }) => {
      customer[field] = String(row[colIdx] ?? "").trim()
    })
    return customer
  }).filter((c) => c.name)
}

export default function ExcelImportModal({ open, onClose, onImported, existingCustomers = [] }: Props) {
  const t = useTranslations("excelImport")
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState("")
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)

  if (!open) return null

  const fields: { key: keyof CustomerRow; label: string }[] = [
    { key: "name",        label: t("columnName") },
    { key: "email",       label: t("columnEmail") },
    { key: "phone",       label: t("columnPhone") },
    { key: "org_nummer",  label: t("columnOrg") },
    { key: "address",     label: t("columnAddress") },
    { key: "postal_code", label: t("columnPostal") },
    { key: "city",        label: t("columnCity") },
    { key: "country",     label: t("columnCountry") },
    { key: "website",     label: t("columnWebsite") },
  ]

  const includedCount = rows.filter((r) => r.include).length
  const duplicateCount = rows.filter((r) => r.isDuplicate).length

  function toggleInclude(idx: number) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, include: !r.include } : r))
  }

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
      setError(t("noValidRows"))
      return
    }
    const importRows: ImportRow[] = parsed.map((customer) => {
      const isDuplicate = existingCustomers.some(
        (e) =>
          e.name.toLowerCase().trim() === customer.name.toLowerCase().trim() ||
          (customer.org_nummer && e.org_nummer &&
            e.org_nummer.trim() === customer.org_nummer.trim())
      )
      return { customer, isDuplicate, include: !isDuplicate }
    })
    setRows(importRows)
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
    const toImport = rows.filter((r) => r.include === true).map((r) => r.customer)
    if (!toImport.length) return
    setImporting(true)
    setError("")
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customers: toImport }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? t("cancel")); return }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{t("title")}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {imported !== null ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircleIcon className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-gray-900">{t("successCount", { count: imported })}</p>
              <button onClick={handleClose}
                className="mt-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                {t("close")}
              </button>
            </div>
          ) : (
            <>
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
                  <p className="text-sm font-medium text-gray-700">{t("dropzone")}</p>
                  <p className="text-xs text-gray-400 mt-1">{t("dropzoneHint")}</p>
                  <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
                </div>
              )}

              {!rows.length && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 space-y-1">
                  <p className="font-medium">{t("columnsTitle")}</p>
                  <p className="text-blue-600">
                    <strong>{t("columnName")}</strong> (påkrevd) · {t("columnEmail")} · {t("columnPhone")} · {t("columnOrg")} · {t("columnAddress")} · {t("columnPostal")} · {t("columnCity")} · {t("columnCountry")} · {t("columnWebsite")}
                  </p>
                  <p className="text-blue-500 mt-1">{t("columnsEnglish")}</p>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              {rows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fileName}</p>
                      <p className="text-xs text-gray-400">{t("readyToImport", { count: includedCount })}</p>
                    </div>
                    <button onClick={() => { setRows([]); setFileName(""); }}
                      className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                      {t("changeFile")}
                    </button>
                  </div>

                  {duplicateCount > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800 space-y-0.5">
                      <p className="font-medium">{t("duplicatesFound", { count: duplicateCount })}</p>
                      <p className="text-amber-700">{t("duplicateHint")}</p>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{t("importColumn")}</th>
                            {fields.map((f) => (
                              <th key={f.key} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                                {f.label}{f.key === "name" && <span className="text-red-400 ml-0.5">*</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(({ customer: row, isDuplicate, include }, i) => (
                            <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${isDuplicate && !include ? "opacity-50" : ""}`}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={include}
                                  onChange={() => toggleInclude(i)}
                                  className="rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                                />
                              </td>
                              {fields.map((f) => (
                                <td key={f.key} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                                  {f.key === "name" && isDuplicate
                                    ? <span className="flex items-center gap-1.5">
                                        <span className="truncate">{row[f.key]}</span>
                                        <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">{t("possibleDuplicate")}</span>
                                      </span>
                                    : row[f.key] || <span className="text-gray-300">—</span>
                                  }
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

        {rows.length > 0 && imported === null && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
            <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              {t("cancel")}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || includedCount === 0}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {importing ? t("importing") : t("importButton", { count: includedCount })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
