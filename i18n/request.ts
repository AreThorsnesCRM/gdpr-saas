import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "no"
  const validLocales = ["no", "en"]
  const safeLocale = validLocales.includes(locale) ? locale : "no"

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  }
})
