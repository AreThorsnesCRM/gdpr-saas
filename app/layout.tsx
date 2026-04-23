import "./globals.css"
import { AuthProvider } from "@/lib/AuthProvider"

export const metadata = {
  title: "AreCRM",
  description: "Kunde- og avtalesystem",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
