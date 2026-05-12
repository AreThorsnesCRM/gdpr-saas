import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"

const validLocales = ["no", "en", "es"]

function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return "no"
  const preferred = acceptLanguage.split(",").map((s) => s.split(";")[0].trim().toLowerCase())
  for (const lang of preferred) {
    if (lang.startsWith("es")) return "es"
    if (lang.startsWith("en")) return "en"
    if (lang.startsWith("no") || lang.startsWith("nb") || lang.startsWith("nn")) return "no"
  }
  return "no"
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value

  let safeLocale: string
  if (cookieLocale && validLocales.includes(cookieLocale)) {
    safeLocale = cookieLocale
  } else {
    const headerStore = await headers()
    safeLocale = detectLocaleFromAcceptLanguage(headerStore.get("accept-language"))
  }

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  }
})
