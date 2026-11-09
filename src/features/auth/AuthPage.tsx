import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useAuth } from './auth-context'
import { loginRequest, registerRequest } from './api'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { signIn } = useAuth()
  const [error, setError] = useState('')
  const returnToRaw = new URLSearchParams(window.location.search).get(
    'returnTo',
  )
  const returnTo = returnToRaw === '/pagamento' ? returnToRaw : '/carrinho'
  const mutation = useMutation({
    mutationFn: async (input: {
      name: string
      email: string
      password: string
    }) =>
      mode === 'login'
        ? loginRequest({ email: input.email, password: input.password })
        : registerRequest(input),
    onSuccess: async (result) => {
      await signIn(result)
      const mock = new URLSearchParams(window.location.search).get('mock')
      window.location.assign(
        returnTo + (mock ? `?mock=${encodeURIComponent(mock)}` : ''),
      )
    },
    onError: (cause) => setError(cause.message),
  })
  return (
    <div className="market-container min-h-[650px] pt-24 pb-12 sm:py-20">
      <div className="mx-auto w-full max-w-[500px] sm:rounded-[20px] sm:bg-card sm:px-12 sm:py-10 sm:shadow-2xl">
        <Link
          to="/"
          className="wordmark mb-10 block text-center text-[32px] tracking-[3px]"
        >
          KURIO
        </Link>
        <div className="mb-8 hidden border-b border-border text-sm sm:flex">
          <Link
            to="/entrar"
            search={{ returnTo }}
            className={`flex-1 pb-3 text-center ${mode === 'login' ? 'border-b-2 border-primary text-accent-foreground' : ''}`}
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            search={{ returnTo }}
            className={`flex-1 pb-3 text-center ${mode === 'register' ? 'border-b-2 border-primary text-accent-foreground' : ''}`}
          >
            Criar conta
          </Link>
        </div>
        <h1 className="page-heading mb-8 text-center">
          {mode === 'login'
            ? 'Entrar na Kurio'
            : 'Criar perfil de colecionador'}
        </h1>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const read = (name: string) => {
              const value = data.get(name)
              return typeof value === 'string' ? value : ''
            }
            const password = read('password')
            if (mode === 'register' && password !== read('confirmation')) {
              setError('As senhas não conferem.')
              return
            }
            setError('')
            mutation.mutate({
              name: read('name').trim(),
              email: read('email').trim(),
              password,
            })
          }}
        >
          {mode === 'register' && (
            <div>
              <Label htmlFor="auth-name">Nome de usuário</Label>
              <Input
                id="auth-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                className="mt-2 h-[50px]"
              />
            </div>
          )}
          <div>
            <Label htmlFor="auth-email">E-mail</Label>
            <Input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 h-[50px]"
            />
          </div>
          <div>
            <Label htmlFor="auth-password">Senha</Label>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              required
              minLength={mode === 'register' ? 10 : 1}
              className="mt-2 h-[50px]"
            />
          </div>
          {mode === 'register' && (
            <div>
              <Label htmlFor="auth-confirmation">Confirme a senha</Label>
              <Input
                id="auth-confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                className="mt-2 h-[50px]"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="mt-5 h-[60px] w-full"
          >
            {mutation.isPending
              ? 'Aguarde…'
              : mode === 'login'
                ? 'Entrar'
                : 'Criar perfil'}
          </Button>
        </form>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {mode === 'login' ? 'Novo na Kurio?' : 'Já tem uma conta?'}{' '}
          <Link
            to={mode === 'login' ? '/cadastro' : '/entrar'}
            search={{ returnTo }}
            className="text-accent-foreground underline"
          >
            {mode === 'login' ? 'Crie uma conta' : 'Entre'}
          </Link>
        </p>
      </div>
    </div>
  )
}
