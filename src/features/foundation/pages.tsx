import { Link } from '@tanstack/react-router'
import { AccountSidebar } from '@/app/layout'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { useAuth } from '@/features/auth/auth-context'

export function FeaturePage({
  title,
  description,
  account = false,
  protectedPage = false,
}: {
  title: string
  description: string
  account?: boolean
  protectedPage?: boolean
}) {
  const auth = useAuth()
  const requiresAccount = account || protectedPage
  const content = (
    <Card className="min-w-0 flex-1 border-border">
      <CardHeader>
        <CardTitle>
          <h1 className="page-heading">{title}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requiresAccount && !auth.loading && !auth.user ? (
          <>
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para acessar esta área.
            </p>
            <Button asChild className="mt-6">
              <Link to="/entrar">Entrar</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
            <p className="mt-4 text-sm text-text-subtle">
              Esta área estará disponível em breve.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/">Continuar explorando</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
  return (
    <div className="market-container mt-8 flex min-h-[440px] flex-col gap-7 xl:flex-row">
      {account && <AccountSidebar />}
      {content}
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="market-container py-20">
      <p className="mb-4 text-accent-foreground">404</p>
      <h1 className="page-heading">Página não encontrada</h1>
      <p className="my-6 text-sm text-muted-foreground">
        O endereço pode ter mudado. Continue explorando o mercado.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  )
}
