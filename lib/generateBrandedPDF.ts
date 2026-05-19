export type PDFBranding = {
  logoUrl?: string | null
  companyName?: string | null
  address?: string | null
  postal_code?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
}

async function logoToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read logo"))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function buildBrandingHeader(logoDataUrl: string | null, b: PDFBranding): string {
  if (!logoDataUrl && !b.companyName) return ""

  const logo = logoDataUrl
    ? `<img src="${logoDataUrl}" style="max-height:56px;max-width:160px;object-fit:contain;display:block;" />`
    : `<div style="width:1px;"></div>`

  const addrParts = [
    b.address,
    [b.postal_code, b.city].filter(Boolean).join(" "),
  ].filter(Boolean)

  const infoLines = [
    b.companyName
      ? `<div style="font-size:14px;font-weight:700;color:#111;margin-bottom:2px;">${b.companyName}</div>`
      : "",
    ...addrParts.map((l) => `<div style="font-size:11px;color:#888;">${l}</div>`),
    b.phone ? `<div style="font-size:11px;color:#888;">${b.phone}</div>` : "",
    b.email ? `<div style="font-size:11px;color:#888;">${b.email}</div>` : "",
  ]
    .filter(Boolean)
    .join("")

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:2px solid #e5e7eb;margin-bottom:32px;">
      ${logo}
      <div style="text-align:right;">${infoLines}</div>
    </div>
  `
}

const BASE_CSS = `<style>
h1{font-size:22px;font-weight:700;margin:0 0 1em}
h2{font-size:18px;font-weight:600;margin:1.2em 0 0.4em}
h3{font-size:15px;font-weight:600;margin:1em 0 0.3em}
p{margin:0 0 0.8em}
ul,ol{margin:0 0 0.8em;padding-left:1.8em}
li{margin:0.2em 0}
strong{font-weight:700}
em{font-style:italic}
u{text-decoration:underline}
s{text-decoration:line-through}
hr{border:none;border-top:1px solid #ccc;margin:1.5em 0}
blockquote{border-left:3px solid #ccc;padding-left:1em;color:#555;margin:1em 0}
</style>`

export async function generateBrandedPDF(
  html: string,
  title: string,
  branding?: PDFBranding
): Promise<File> {
  let logoDataUrl: string | null = null
  if (branding?.logoUrl) {
    logoDataUrl = await logoToDataUrl(branding.logoUrl)
  }

  const header = branding ? buildBrandingHeader(logoDataUrl, branding) : ""

  const container = document.createElement("div")
  container.style.cssText =
    "position:fixed;left:-9999px;top:0;width:794px;padding:60px 80px;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;background:white;color:#111;"
  container.innerHTML = `${BASE_CSS}${header}${html}`
  document.body.appendChild(container)

  const html2canvasLib = (await import("html2canvas")).default
  const canvas = await html2canvasLib(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  })
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
