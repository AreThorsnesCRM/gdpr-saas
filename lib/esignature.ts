const BASE_URL = "https://www.e-signature.eu/wp-json/signature"
const API_KEY = process.env.ESIGNATURE_API_TOKEN!
const USER_ID = process.env.ESIGNATURE_USER_ID ?? "6131"

function authHeaders() {
  return { "Content-Type": "application/json", "x-api-key": API_KEY }
}

export type EsignSigner = {
  firstname: string
  lastname: string
  email: string
  phone?: string
}

export type CreateSignatureResult = {
  idSign: number
  signers: { key: string; url: string }[]
}

export const SIGNING_METHODS = [
  { value: "otp-email-non-qualified",   labelKey: "methodOtpEmail" },
  { value: "veriff-advanced-signature", labelKey: "methodVeriff" },
  { value: "evrotrust-signature",       labelKey: "methodEvrotrust" },
  { value: "itsme-qes-signature",       labelKey: "methodItsme" },
] as const

export type SigningMethodValue = typeof SIGNING_METHODS[number]["value"]

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pactiva.io"

export async function createSignatureRequest(opts: {
  title: string
  pdfBase64: string
  signers: EsignSigner[]
  lang?: string
  method?: string
}): Promise<CreateSignatureResult> {
  const METHOD_ALIASES: Record<string, string> = {
    "otp_email": "otp-email-non-qualified",
    "otp-email": "otp-email-non-qualified",
  }
  const resolvedMethod = opts.method
    ? (METHOD_ALIASES[opts.method] ?? opts.method)
    : "otp-email-non-qualified"

  const res = await fetch(`${BASE_URL}/request?userid=${USER_ID}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      lang: opts.lang ?? "en",
      title: opts.title,
      signature_place: "position_auto",
      send_email: false,
      email_notification: true,
      reminder: 7,
      callback_url: `${APP_URL}/api/webhooks/esignature`,
      methods: [resolvedMethod],
      signers: opts.signers.map(s => ({
        firstname: s.firstname,
        lastname: s.lastname,
        email: s.email,
        phone: s.phone ?? "",
        sign_first: false,
      })),
      pdf_file_base64: opts.pdfBase64,
    }),
  })

  if (!res.ok) throw new Error(`e-signature.eu request error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  if (!data.success) throw new Error(`e-signature.eu error: ${JSON.stringify(data)}`)

  const idSign: number = data.result.id_sign
  const signers = Object.entries(data.result.signers as Record<string, any>).map(
    ([key, s]) => ({ key, url: s.signature_link as string })
  )
  return { idSign, signers }
}

export async function getSignatureRequest(idSign: number | string): Promise<{
  statusId: string
  signers: Record<string, { status: string; signing_time: string }>
  pdfBase64?: string
}> {
  const res = await fetch(`${BASE_URL}/getRequest?userid=${USER_ID}&id_sign=${idSign}`, {
    headers: { "x-api-key": API_KEY },
  })
  if (!res.ok) throw new Error(`getRequest error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return {
    statusId: data.result.status_id,
    signers: data.result.signers,
    pdfBase64: data.result.pdf_file_base64,
  }
}
