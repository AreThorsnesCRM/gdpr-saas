export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-neutral-900 shadow-sm rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 ${className}`}>
      {children}
    </div>
  )
}
