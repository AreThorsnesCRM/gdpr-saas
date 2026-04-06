import "./globals.css"

export const metadata = {
  title: "AreCRM",
  description: "Kunde- og avtalesystem",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        {children}
      </body>
    </html>
  )
}
