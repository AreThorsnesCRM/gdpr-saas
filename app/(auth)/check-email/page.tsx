export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">Sjekk e‑posten din</h1>
        <p className="text-gray-600">
          Vi har sendt deg en e‑post for å bekrefte kontoen din.  
          Klikk på lenken i e‑posten for å fullføre registreringen.
        </p>

        <p className="mt-4 text-sm text-gray-500">
          Hvis du ikke finner e‑posten, sjekk søppelpost eller vent et par minutter.
        </p>
      </div>
    </div>
  );
}
