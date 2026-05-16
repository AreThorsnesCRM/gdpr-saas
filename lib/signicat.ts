const BASE_URL = process.env.SIGNICAT_BASE_URL ?? "https://api.signicat.com"

export function getIdpForCountry(country: string | null | undefined): string {
  const map: Record<string, string> = {
    NO: "nbid",
    SE: "sebankid",
    DK: "dkmitid",
    FI: "ftn",
  }
  return map[(country ?? "").toUpperCase()] ?? "nbid"
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/open/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SIGNICAT_CLIENT_ID!,
      client_secret: process.env.SIGNICAT_CLIENT_SECRET!,
      scope: "signicat-api",
    }),
  })
  if (!res.ok) throw new Error(`Signicat token error: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token
}

export async function uploadDocument(pdfBuffer: ArrayBuffer): Promise<string> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/sign/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf", Authorization: `Bearer ${token}` },
    body: Buffer.from(pdfBuffer),
  })
  if (!res.ok) throw new Error(`Upload error: ${res.status} ${await res.text()}`)
  return (await res.json()).documentId
}

export async function createDocumentCollection(documentId: string): Promise<string> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/sign/document-collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ documents: [{ documentId }] }),
  })
  if (!res.ok) throw new Error(`Collection error: ${res.status} ${await res.text()}`)
  return (await res.json()).id
}

export async function createSigningSessions(opts: {
  documentCollectionId: string
  documentId: string
  title: string
  externalReference: string
  language?: string
  count: number
  idpName?: string
}): Promise<{ sessionId: string; signatureUrl: string }[]> {
  const token = await getAccessToken()
  const items = Array.from({ length: opts.count }, (_, i) => ({
    title: opts.title,
    externalReference: i === 0 ? opts.externalReference : `${opts.externalReference}-${i}`,
    documents: [{ action: "SIGN", documentCollectionId: opts.documentCollectionId, documentId: opts.documentId }],
    signingSetup: [{ identityProviders: [{ idpName: opts.idpName ?? "nbid" }], signingFlow: "AUTHENTICATION_BASED" }],
    packageTo: ["PADES_CONTAINER"],
    ui: { language: opts.language ?? "no" },
  }))
  const res = await fetch(`${BASE_URL}/sign/signing-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(items),
  })
  if (!res.ok) throw new Error(`Session error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.map((s: any) => ({ sessionId: s.id, signatureUrl: s.signatureUrl }))
}

export async function getSigningSession(sessionId: string) {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/sign/signing-sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Get session error: ${res.status}`)
  return res.json()
}

export async function downloadDocument(documentId: string): Promise<ArrayBuffer> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/sign/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Download error: ${res.status}`)
  return res.arrayBuffer()
}
