import Link from "next/link"

export const metadata = {
  title: "Personvernerklæring — AreCRM",
  description: "Hvordan AreCRM behandler dine personopplysninger.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-10">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            ← Tilbake
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-10 space-y-10">

          <div>
            <h1 className="text-3xl font-bold text-gray-900">Personvernerklæring</h1>
            <p className="text-gray-500 mt-2 text-sm">Sist oppdatert: mai 2026</p>
          </div>

          <Section title="1. Behandlingsansvarlig">
            <p>
              AreCRM er utviklet og driftet av Are Thorsnes (heretter «vi», «oss» eller «AreCRM»).
              Vi er behandlingsansvarlig for personopplysningene som behandles i tjenesten.
            </p>
            <p className="mt-3">
              <strong>Kontakt:</strong><br />
              E-post: <a href="mailto:are.thorsnes@gmail.com" className="text-slate-700 underline">are.thorsnes@gmail.com</a>
            </p>
          </Section>

          <Section title="2. Hvilke opplysninger behandler vi">
            <p>Vi behandler følgende kategorier av personopplysninger:</p>
            <ul className="mt-3 space-y-2 list-disc pl-5 text-gray-700">
              <li><strong>Brukerdata:</strong> navn, e-postadresse, passord (kryptert)</li>
              <li><strong>Firmadata:</strong> firmanavn, organisasjonsnummer, adresse, telefon, kontakt-e-post</li>
              <li><strong>Kundedata du registrerer:</strong> navn, e-post, telefon, org.nr, adresse, notater og aktivitetslogg</li>
              <li><strong>Avtaledata:</strong> avtaletitler, datoer, opplastede PDF-dokumenter, signeringsstatus</li>
              <li><strong>Betalingsinformasjon:</strong> abonnementsstatus og fakturainformasjon (selve kortdata håndteres av Stripe)</li>
              <li><strong>Bruksdata:</strong> innloggingstidspunkt og aktivitet i appen (lagres i databaselogg)</li>
            </ul>
          </Section>

          <Section title="3. Formål og rettslig grunnlag">
            <table className="w-full text-sm mt-3 border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600 font-medium">Formål</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Rettslig grunnlag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2.5 pr-4 text-gray-700">Levere CRM-tjenesten</td>
                  <td className="py-2.5 text-gray-700">Avtale (GDPR art. 6 b)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-gray-700">Fakturering og abonnementshåndtering</td>
                  <td className="py-2.5 text-gray-700">Avtale (GDPR art. 6 b)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-gray-700">Sende varsler om utløpende avtaler</td>
                  <td className="py-2.5 text-gray-700">Berettiget interesse (GDPR art. 6 f)</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-gray-700">AI-assistent (analysere og svare på spørsmål)</td>
                  <td className="py-2.5 text-gray-700">Samtykke (GDPR art. 6 a) — opt-in i innstillinger</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-gray-700">Sikkerhet og feilsøking</td>
                  <td className="py-2.5 text-gray-700">Berettiget interesse (GDPR art. 6 f)</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="4. Databehandlere og tredjeparter">
            <p>Vi benytter følgende underleverandører som behandler personopplysninger på våre vegne. Alle er bundet av databehandleravtaler.</p>
            <div className="mt-4 space-y-4">
              <Processor
                name="Supabase"
                role="Database og autentisering"
                location="EU (Frankfurt, Tyskland)"
                note="Alle data lagres i EU. Ingen overføring til tredjeland."
              />
              <Processor
                name="Stripe"
                role="Betalingsbehandling"
                location="USA"
                note="Overføring skjer på grunnlag av Standard Contractual Clauses (SCC). Selve kortdata lagres hos Stripe, ikke hos oss."
              />
              <Processor
                name="Resend"
                role="Utsendelse av e-post (signeringslenker, varsler)"
                location="USA"
                note="Overføring skjer på grunnlag av Standard Contractual Clauses (SCC)."
              />
              <Processor
                name="Anthropic"
                role="AI-assistent (kun hvis aktivert av kontoadministrator)"
                location="USA"
                note="Overføring skjer på grunnlag av Standard Contractual Clauses (SCC). Aktivering krever eksplisitt samtykke. Anthropic bruker ikke API-data til trening av modeller."
              />
              <Processor
                name="Signicat"
                role="Digital signering med BankID / MitID / FTN"
                location="EU (Norge)"
                note="Behandler signeringsdata og e-ID-verifisering."
              />
            </div>
          </Section>

          <Section title="5. Lagring og sletting">
            <ul className="space-y-2 list-disc pl-5 text-gray-700">
              <li>Data lagres så lenge kontoen er aktiv.</li>
              <li>Ved oppsigelse av abonnement beholdes data i 30 dager, deretter slettes de automatisk.</li>
              <li>Du kan når som helst be om sletting av din konto og tilhørende data ved å kontakte oss.</li>
              <li>Regnskapsmessige data (fakturaer) beholdes i 5 år i henhold til bokføringsloven.</li>
            </ul>
          </Section>

          <Section title="6. Dine rettigheter">
            <p>Etter GDPR har du følgende rettigheter:</p>
            <ul className="mt-3 space-y-2 list-disc pl-5 text-gray-700">
              <li><strong>Innsyn:</strong> du kan be om en kopi av opplysningene vi har om deg</li>
              <li><strong>Retting:</strong> du kan korrigere feilaktige opplysninger</li>
              <li><strong>Sletting:</strong> du kan be om at opplysningene slettes («retten til å bli glemt»)</li>
              <li><strong>Portabilitet:</strong> du kan be om å få utlevert dine data i maskinlesbart format</li>
              <li><strong>Innsigelse:</strong> du kan protestere mot behandling basert på berettiget interesse</li>
              <li><strong>Trekke samtykke:</strong> du kan når som helst deaktivere AI-assistenten i Innstillinger</li>
            </ul>
            <p className="mt-4">
              Send forespørsler til <a href="mailto:are.thorsnes@gmail.com" className="text-slate-700 underline">are.thorsnes@gmail.com</a>.
              Du har også rett til å klage til <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" className="text-slate-700 underline">Datatilsynet</a>.
            </p>
          </Section>

          <Section title="7. Informasjonskapsler (cookies)">
            <p>
              AreCRM bruker kun funksjonelle informasjonskapsler for å holde deg innlogget (sesjonstoken).
              Vi bruker ingen sporings- eller reklamecookies.
            </p>
          </Section>

          <Section title="8. Endringer">
            <p>
              Vi kan oppdatere denne erklæringen. Ved vesentlige endringer varsles du på e-post.
              Oppdatert dato vises øverst på siden.
            </p>
          </Section>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} AreCRM · <a href="mailto:are.thorsnes@gmail.com" className="underline">are.thorsnes@gmail.com</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function Processor({ name, role, location, note }: {
  name: string; role: string; location: string; note: string
}) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">{name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{role}</p>
        </div>
        <span className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
          {location}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{note}</p>
    </div>
  )
}
