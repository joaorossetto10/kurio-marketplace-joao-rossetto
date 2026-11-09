import { Button } from './button'

export function Feedback({
  title,
  children,
  retry,
}: {
  title: string
  children: React.ReactNode
  retry?: () => void
}) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-6"
      role={retry ? 'alert' : 'status'}
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
      {retry && (
        <Button variant="outline" onClick={retry} className="mt-4">
          Tentar novamente
        </Button>
      )}
    </section>
  )
}
