import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Metadata } from "next"
import { DPA_VERSION } from "@/lib/dpa"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dpa")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  }
}

type DpaSection = {
  title: string
  body: string
  bullets?: string[]
  table?: { headers: string[]; rows: string[][] }
  footer?: string
  note?: string
}

export default async function DpaPage() {
  const t = await getTranslations("dpa")
  const sections = t.raw("sections") as DpaSection[]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-10">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
            {t("backLink")}
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-10 space-y-10">

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">{t("heading")}</h1>
              <span className="inline-block bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-xs font-medium px-2.5 py-1 rounded-full">
                {t("draftBadge")}
              </span>
            </div>
            <p className="text-gray-500 mt-2 text-sm">
              {t("version")}: {DPA_VERSION}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 text-sm text-amber-800 leading-relaxed">
            {t("draftNotice")}
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t("partiesHeading")}</h2>
            <p className="text-gray-600 leading-relaxed mb-4">{t("partiesIntro")}</p>
            <div className="space-y-3 text-gray-700">
              <p><strong>{t("controllerLabel")}</strong>: {t("controllerText")}</p>
              <p><strong>{t("processorLabel")}</strong>: {t("processorText")}</p>
            </div>
            <p className="text-gray-600 leading-relaxed mt-4">{t("electronicAcceptance")}</p>
          </section>

          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">{s.title}</h2>
              {s.body.split("\n\n").map((p, pi) => (
                <p key={pi} className="text-gray-600 leading-relaxed mb-3 last:mb-0">{p}</p>
              ))}

              {s.bullets && (
                <ul className="mt-3 space-y-2 list-disc pl-5 text-gray-700">
                  {s.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                </ul>
              )}

              {s.table && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {s.table.headers.map((h, hi) => (
                          <th key={hi} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {s.table.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-2.5 text-gray-700 align-top">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {s.footer && <p className="text-gray-600 leading-relaxed mt-3">{s.footer}</p>}
              {s.note && <p className="text-xs text-gray-400 italic mt-3">{s.note}</p>}
            </section>
          ))}

          <p className="text-sm text-gray-500 border-t border-gray-100 pt-6">{t("acceptanceFooter")}</p>

        </div>
      </div>
    </div>
  )
}
