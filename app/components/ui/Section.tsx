export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </section>
  )
}
