import "./globals.css"
import { AuthProvider } from "@/lib/AuthProvider"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { Analytics } from "@vercel/analytics/react"

export const metadata = {
  title: "Pactiva",
  description: "Customer and agreement management",
  icons: {
    icon: "/favicon.svg",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
