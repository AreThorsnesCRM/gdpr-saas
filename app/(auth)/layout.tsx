import LanguageSwitcher from "@/app/components/LanguageSwitcher"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher variant="light" />
      </div>
    </>
  )
}
