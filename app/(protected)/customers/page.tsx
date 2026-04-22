import { Suspense } from "react"
import CustomersPage from "./CustomersPage"

export const dynamicParams = true

export default function CustomersPageWrapper() {
  return (
    <Suspense fallback={<p>Laster kunder...</p>}>
      <CustomersPage />
    </Suspense>
  )
}
