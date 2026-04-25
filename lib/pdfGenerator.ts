"use client"

import jsPDF from "jspdf"

export function generateAgreementPDF(agreement: any, customer: any, company: any) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text("AVTALE", 105, 20, { align: "center" })

  // Company info
  doc.setFontSize(12)
  doc.text(`Firma: ${company?.company_name || "Ukjent"}`, 20, 40)
  doc.text(`Kontaktperson: ${company?.full_name || "Ukjent"}`, 20, 50)

  // Customer info
  doc.text(`Kunde: ${customer?.name || "Ukjent"}`, 20, 70)
  doc.text(`E-post: ${customer?.email || "Ikke oppgitt"}`, 20, 80)
  doc.text(`Telefon: ${customer?.phone || "Ikke oppgitt"}`, 20, 90)

  // Agreement details
  doc.setFontSize(14)
  doc.text("Avtaledetaljer", 20, 110)

  doc.setFontSize(12)
  doc.text(`Tittel: ${agreement.title}`, 20, 125)
  doc.text(`Beskrivelse: ${agreement.description || "Ingen beskrivelse"}`, 20, 135)
  doc.text(`Startdato: ${agreement.start_date}`, 20, 145)
  doc.text(`Sluttdato: ${agreement.end_date}`, 20, 155)

  // Footer
  doc.setFontSize(10)
  doc.text("Denne avtalen er generert elektronisk og er juridisk bindende.", 20, 180)
  doc.text(`Generert: ${new Date().toLocaleDateString("no-NO")}`, 20, 190)

  // Save the PDF
  doc.save(`avtale-${agreement.title.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}