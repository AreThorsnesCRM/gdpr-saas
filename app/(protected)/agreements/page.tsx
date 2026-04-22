import { Suspense } from "react"
import AgreementsPage from "./AgreementsPage"

export const dynamicParams = true

export default function AgreementsPageWrapper() {
  return (
    <Suspense fallback={<p>Laster avtaler...</p>}>
      <AgreementsPage />
    </Suspense>
  )
}
