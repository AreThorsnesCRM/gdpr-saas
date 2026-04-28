import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = "AreCRM <onboarding@resend.dev>"

export async function sendTrialEndingEmail(to: string, name: string, daysLeft: number) {
  if (!resend) return
  const timeLeft = daysLeft === 14 ? "2 uker" : daysLeft === 7 ? "1 uke" : `${daysLeft} dager`
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Prøveperioden din utløper om ${timeLeft}`,
    html: `
      <p>Hei ${name},</p>
      <p>Prøveperioden din i AreCRM utløper om <strong>${timeLeft}</strong>.</p>
      <p>For å fortsette å bruke AreCRM uten avbrudd, start et abonnement nå.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">Start abonnement</a></p>
      <p style="margin-top:24px;color:#6b7280;font-size:14px">Du kan slå av disse varslene under Innstillinger i AreCRM.</p>
    `,
  })
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Betalingen din feilet — handling kreves",
    html: `
      <p>Hei ${name},</p>
      <p>Vi klarte dessverre ikke å trekke betalingen for abonnementet ditt i AreCRM.</p>
      <p>Vennligst oppdater betalingsinformasjonen din for å unngå avbrudd.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background:#dc2626;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px">Oppdater betalingsinfo</a></p>
      <p style="margin-top:24px;color:#6b7280;font-size:14px">Du kan slå av disse varslene under Innstillinger i AreCRM.</p>
    `,
  })
}
