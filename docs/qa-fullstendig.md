# Pactiva — Fullstendig QA-sjekkliste
**Versjon:** Juni 2026 &nbsp;|&nbsp; **Tester:** __________________ &nbsp;|&nbsp; **Dato:** __________________

> **Slik bruker du listen:**  
> Gå gjennom som en helt ny bruker i privat nettleserfane på **app.pactiva.io**.  
> Marker hvert punkt: ✅ OK &nbsp;|&nbsp; ❌ Feil &nbsp;|&nbsp; ⚠️ Avvik &nbsp;|&nbsp; — Ikke testet  
> Noter hva som skjer vs. hva som burde skje.

---

## DEL 1 — AUTENTISERING

### 1.1 Registrering (ny bruker)
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 1 | Gå til app.pactiva.io — vises login-siden? | | |
| 2 | Klikk «Registrer deg» — fungerer lenken? | | |
| 3 | Fyll inn firmanavn, navn, e-post og passord | | |
| 4 | Klikk «Opprett konto» — spinner/laster uten feil? | | |
| 5 | Blir du sendt til /check-email siden? | | |
| 6 | Motta bekreftelsesmail i innboks | | |
| 7 | Avsenderen er support@pactiva.io (ikke noreply@supabase) | | |
| 8 | Klikk bekreftelseslenken i mailen | | |
| 9 | Blir du sendt til /dashboard (ikke /login) | | |
| 10 | Dashboard laster uten feil i konsollen | | |
| 11 | Firmanavn er riktig (ikke «Firma mangler») | | |
| 12 | Trial-banner vises øverst («X dager gratis igjen») | | |
| 13 | Trial-lengden er **14 dager** (teller fra i dag) | | |

### 1.2 Innlogging og utlogging
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 14 | Logg ut — fungerer «Logg ut»-knappen? | | |
| 15 | Blir du sendt til /login etter utlogging? | | |
| 16 | Forsøk å gå til /dashboard uten å være innlogget — redirectes til /login? | | |
| 17 | Logg inn med riktig e-post og passord | | |
| 18 | Dashboard laster, brukerdata er intakt | | |
| 19 | Logg inn med feil passord — vises feilmelding? | | |
| 20 | Logg inn med ukjent e-post — vises feilmelding? | | |

### 1.3 Glemt passord
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 21 | Klikk «Glemt passord» på login-siden | | |
| 22 | Fyll inn e-post og send — vises bekreftelse? | | |
| 23 | Motta reset-mail i innboks | | |
| 24 | Klikk lenken — kommer du til siden for nytt passord? | | |
| 25 | Sett nytt passord — bekreftes det? | | |
| 26 | Logg inn med nytt passord — fungerer det? | | |

### 1.4 Teaminvitasjon
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 27 | Gå til Innstillinger → Brukere → Inviter bruker | | |
| 28 | Skriv inn en annen e-postadresse og send | | |
| 29 | Mottaker får invitasjonsmail | | |
| 30 | Mottaker klikker lenken → /invite/confirm | | |
| 31 | Mottaker setter passord og fullfører | | |
| 32 | Mottaker ser samme konto (kunder, avtaler) som admin | | |
| 33 | Mottaker vises i brukerlisten med «member»-rolle | | |

---

## DEL 2 — ONBOARDING

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 34 | Onboarding-modal vises ved første innlogging | | |
| 35 | Velg land fra dropdown — lagres det? | | |
| 36 | Modal kan lukkes/fullføres | | |
| 37 | Onboarding-sjekkliste vises i dashboard etterpå | | |
| 38 | Sjekkliste-steg markeres som fullført etter hvert | | |

---

## DEL 3 — DASHBOARD

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 39 | «Kunder»-kortet viser riktig tall | | |
| 40 | «Usignerte avtaler»-kortet viser riktig tall | | |
| 41 | «Aktive avtaler»-kortet viser riktig tall | | |
| 42 | «Utløper snart»-kortet viser riktig tall | | |
| 43 | «Sendt til signering»-listen viser riktige avtaler | | |
| 44 | «Kunder uten aktiv avtale»-listen fungerer | | |
| 45 | «Ikke kontaktet»-listen fungerer | | |
| 46 | AI-widget («Hva bør du gjøre i dag?») laster og gir forslag | | |
| 47 | AI kan slås av og på i Innstillinger | | |

---

## DEL 4 — INNSTILLINGER

### 4.1 Firma
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 46 | Gå til Innstillinger → Firma | | |
| 47 | Fyll inn firmanavn — lagres etter klikk? | | |
| 48 | Fyll inn org.nr og adresse — lagres? | | |
| 49 | Last opp logo (PNG/SVG) — vises forhåndsvisning? | | |
| 50 | Logo vises i header på genererte PDF-er | | |
| 51 | Fjern logo — forsvinner den? | | |
| 52 | Bytt språk (EN) — bytter hele grensesnittet? | | |
| 53 | Velg land — lagres og vises korrekt? | | |

### 4.2 Brukerprofil
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 54 | Gå til Innstillinger → Profil | | |
| 55 | Endre navn — lagres det? | | |
| 56 | E-postadressen vises korrekt | | |

### 4.3 Signering
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 57 | Gå til Innstillinger → Signering | | |
| 58 | Standard signeringsmetode vises (OTP e-post?) | | |
| 59 | Bytt til annen metode og lagre — bekreftes? | | |
| 60 | Metode-beskrivelse/forklaring vises? | | |

### 4.4 Brukere og roller
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 61 | Liste over nåværende brukere vises | | |
| 62 | Rolle (admin/member) vises per bruker | | |
| 63 | Endre rolle på invitert bruker — lagres? | | |
| 64 | Fjern en bruker — bekreftes og forsvinner? | | |
| 65 | Prøv å invitere mer enn 5 brukere — blokkeres? | | |

### 4.5 Kategorier
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 66 | Forhåndsdefinerte kategorier vises (6 stk.) | | |
| 67 | Forhåndsdefinerte kan ikke slettes | | |
| 68 | Opprett ny egendefinert kategori — lagres? | | |
| 69 | Rediger egendefinert kategori — lagres? | | |
| 70 | Slett egendefinert kategori — forsvinner? | | |

### 4.6 Varsler
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 71 | Gå til Innstillinger → Varsler | | |
| 72 | Toggle varsler av/på — lagres det? | | |
| 73 | Varselpreferanser huskes etter innlogging | | |

### 4.7 Abonnement
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 74 | Gå til Innstillinger → Abonnement | | |
| 75 | Nåværende plan og status vises korrekt | | |
| 76 | «Administrer abonnement»-knapp åpner Stripe-portal | | |
| 77 | I Stripe-portalen: fakturaer vises | | |
| 78 | I Stripe-portalen: avbestilling er mulig | | |

---

## DEL 5 — ABONNEMENT OG BETALING

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 79 | Trial-banner vises med korrekt antall dager | | |
| 80 | Klikk «Oppgrader» — sendes til Stripe checkout? | | |
| 81 | Stripe checkout viser riktig pris (349 NOK / 34 USD) | | |
| 82 | Gjennomfør betaling med testkort (4242 4242...) | | |
| 83 | Etter betaling: redirectes til /billing/success | | |
| 84 | Trial-banner forsvinner etter betaling | | |
| 85 | Abonnementsstatus i innstillinger viser «Aktiv» | | |
| 86 | Stripe-portal viser ny faktura | | |

---

## DEL 6 — KUNDER

### 6.1 Oppretting og redigering
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 87 | Gå til Kunder — listen laster | | |
| 88 | Klikk «Ny kunde» | | |
| 89 | Fyll inn: navn, org.nr., kontaktperson, e-post, telefon, land | | |
| 90 | Lagre — kunden vises i listen? | | |
| 91 | Åpne kunden — alle felt vises korrekt? | | |
| 92 | Rediger felt og lagre — oppdateres? | | |
| 93 | Søk på kundenavn — filtrerer korrekt? | | |
| 94 | Filtrer på land — fungerer? | | |
| 95 | Slett en testkunde — forsvinner fra listen? | | |

### 6.2 Aktivitetslogg
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 96 | Logg notat på en kunde | | |
| 97 | Logg samtale — vises med riktig type-ikon? | | |
| 98 | Logg møte | | |
| 99 | Logg e-post | | |
| 100 | Aktiviteter vises kronologisk (nyest øverst) | | |
| 101 | «Sist kontaktet»-dato oppdateres etter aktivitet | | |

### 6.3 AI og eksport
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 102 | Klikk AI-oppsummering på en kunde — gir svar? | | |
| 103 | AI-knapp er opt-in (krever at AI er aktivert?) | | |
| 104 | Eksporter kundeliste til Excel — åpnes filen? | | |
| 105 | Excel-filen inneholder alle kunder og felt | | |

### 6.4 Import
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 106 | Importer kunder fra Excel (.xlsx) | | |
| 107 | Korrekte kunder importeres og vises i listen | | |
| 108 | Feil i Excel-filen gir forståelig feilmelding | | |

---

## DEL 7 — AVTALEMALER

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 109 | Gå til Maler — listen laster | | |
| 110 | Opprett ny mal med tittel og innhold | | |
| 111 | Bruk flettefelt: {{kunde_navn}}, {{org_nummer}} o.l. | | |
| 112 | Lagre mal — vises i listen? | | |
| 113 | Åpne og rediger mal — lagres endringer? | | |
| 114 | Slett mal — forsvinner fra listen? | | |

---

## DEL 8 — AVTALER

### 8.1 Oppretting
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 115 | Gå til Avtaler — listen laster | | |
| 116 | Klikk «Ny avtale» | | |
| 117 | Opprett fra scratch: tittel, kunde, datoer, kategori | | |
| 118 | Lagre — vises i avtalelisten? | | |
| 119 | Opprett avtale fra mal — flettefelt fylles ut? | | |
| 120 | Last opp PDF-dokument | | |
| 121 | «Åpne PDF»-knapp åpner riktig fil | | |
| 122 | Bytt ut PDF med ny fil — oppdateres korrekt? | | |
| 123 | Generer PDF fra mal — ser riktig ut med logo? | | |

### 8.2 Digital signering
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 124 | Send avtale til signering (én signatar — din e-post) | | |
| 125 | E-post mottas fra support@pactiva.io | | |
| 126 | Lenke peker til e-signature.eu (ikke signicat.com) | | |
| 127 | Klikk lenken — kommer du til signeringssiden? | | |
| 128 | Signer med OTP-kode på e-post | | |
| 129 | Tilbake i appen: status viser «Digitalt signert ✓» | | |
| 130 | «Åpne signert PDF» — er dokumentet korrekt? | | |
| 131 | Test med to signatarer — begge mottar e-post? | | |
| 132 | Signert PDF lagres kun når BEGGE har signert | | |
| 133 | Override signeringsmetode på avtalesiden fungerer | | |

### 8.3 Oversikt og status
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 134 | Avtalelisten viser riktig status per avtale | | |
| 135 | Status «Usignert» vises korrekt | | |
| 136 | Status «Til signering» vises under signering | | |
| 137 | Status «Aktiv» vises etter signering | | |
| 138 | Status «Utløpt» vises for utgåtte avtaler | | |
| 139 | Filtrer på status — fungerer? | | |
| 140 | Søk på avtaletittel — fungerer? | | |
| 141 | Sorter på kolonne (dato, navn o.l.) | | |

### 8.4 Arkiv
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 142 | Arkiver en avtale — forsvinner fra hovedlisten? | | |
| 143 | Gå til Arkiv — den arkiverte avtalen vises? | | |
| 144 | Gjenopprett avtale fra arkiv | | |
| 145 | Søk og filtrer i arkivet | | |

### 8.5 Eksport
| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 146 | Eksporter avtaleliste til Excel | | |
| 147 | Excel-filen inneholder alle avtaler og felt | | |

---

## DEL 9 — AI-ASSISTENT

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 148 | AI-assistenten vises i grensesnittet | | |
| 149 | Send en melding — får du svar (streaming)? | | |
| 150 | Svaret er kontekstuelt (kjenner til dine kunder/avtaler)? | | |
| 151 | GDPR-toggle for AI er opt-in (av som standard)? | | |
| 152 | Slå av AI — forsvinner assistenten? | | |

---

## DEL 10 — FLERBRUKERTILGANG

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 153 | Logg inn som invitert bruker (member-rolle) | | |
| 154 | Member kan se kunder og avtaler | | |
| 155 | Member kan opprette kunder og avtaler | | |
| 156 | Member kan IKKE endre innstillinger (firma, brukere) | | |
| 157 | Member kan IKKE invitere nye brukere | | |
| 158 | Logg ut og inn som admin — all data intakt | | |
| 159 | Admin og member ser samme kunder og avtaler | | |

---

## DEL 11 — MOBILVISNING

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 160 | Åpne app.pactiva.io på mobil (eller DevTools mobil-modus) | | |
| 161 | Hamburger-meny vises på mobil | | |
| 162 | Hamburger-meny åpner og lukker sidebar | | |
| 163 | Dashboard ser bra ut på mobil | | |
| 164 | Kundeliste er brukbar på mobil | | |
| 165 | Avtaleliste er brukbar på mobil | | |
| 166 | Skjema «Ny kunde» er brukbart på mobil | | |
| 167 | Skjema «Ny avtale» er brukbart på mobil | | |
| 168 | Innstillingssider er brukbare på mobil | | |

---

## DEL 12 — INTERNASJONALISERING

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 169 | Bytt til engelsk — alle synlige tekster oversatt? | | |
| 170 | Bytt til svensk — alle synlige tekster oversatt? | | |
| 171 | Bytt tilbake til norsk — alt fungerer? | | |
| 172 | Datoer formateres riktig per språk | | |
| 173 | Feilmeldinger er på valgt språk | | |
| 174 | E-poster sendes på kontoens valgte språk? | | |

---

## DEL 13 — SIKKERHET OG TILGANGSKONTROLL

| # | Testpunkt | Status | Kommentar |
|---|-----------|--------|-----------|
| 175 | /dashboard uten innlogging → redirect til /login | | |
| 176 | /customers uten innlogging → redirect til /login | | |
| 177 | /agreements uten innlogging → redirect til /login | | |
| 178 | /settings uten innlogging → redirect til /login | | |
| 179 | Prøv å åpne en annen kontos kunderside direkte — 404 eller tomt? | | |
| 180 | Logg ut — session slettes, ny request krever innlogging | | |
| 181 | Utløpt trial → redirect til /billing/upgrade | | |
| 182 | Kansellert abonnement → redirect til /billing/upgrade | | |

---

## SAMMENDRAG

| Seksjon | Totalt | OK ✅ | Feil ❌ | Avvik ⚠️ |
|---------|--------|--------|---------|----------|
| 1. Autentisering (1–33) | 33 | | | |
| 2. Onboarding (34–38) | 5 | | | |
| 3. Dashboard (39–45) | 7 | | | |
| 4. Innstillinger (46–78) | 33 | | | |
| 5. Abonnement (79–86) | 8 | | | |
| 6. Kunder (87–108) | 22 | | | |
| 7. Maler (109–114) | 6 | | | |
| 8. Avtaler (115–147) | 33 | | | |
| 9. AI-assistent (148–152) | 5 | | | |
| 10. Flerbrukertilgang (153–159) | 7 | | | |
| 11. Mobilvisning (160–168) | 9 | | | |
| 12. Internasjonalisering (169–174) | 6 | | | |
| 13. Sikkerhet (175–182) | 8 | | | |
| **TOTALT** | **182** | | | |

---

### Funn — logg her

| # | Testpunkt | Beskrivelse av feil | Prioritet |
|---|-----------|---------------------|-----------|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

---

*Pactiva QA — Juni 2026*
