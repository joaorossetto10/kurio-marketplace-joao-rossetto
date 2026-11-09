import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AccountSidebar } from '@/app/layout'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/shared/ui/button'
import { Feedback } from '@/shared/ui/feedback'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import { avatarSchema } from '@/shared/api/contracts'
import { profileOptions, savePassword, saveProfile } from './api'

const avatars = [
  { id: 'emerald', label: 'Emerald Ape' },
  { id: 'sage', label: 'Violet Nomad' },
  { id: 'ivory', label: 'Ivory Baron' },
  { id: 'golden', label: 'Golden Beat' },
] as const

export function ProfilePage() {
  const auth = useAuth()
  const ownerId = auth.user?.id ?? ''
  const client = useQueryClient()
  const profile = useQuery(profileOptions(ownerId))
  const [avatarChoice, setAvatar] = useState<
    (typeof avatars)[number]['id'] | null | undefined
  >(undefined)
  const avatar =
    avatarChoice === undefined ? (profile.data?.avatar ?? null) : avatarChoice
  const [notice, setNotice] = useState('')
  const [passwordNotice, setPasswordNotice] = useState('')
  const update = useMutation({
    mutationFn: saveProfile,
    onSuccess: (data) => {
      client.setQueryData(profileOptions(ownerId).queryKey, data)
      setAvatar(undefined)
      void client.invalidateQueries({ queryKey: ['session'] })
      setNotice('Perfil salvo.')
    },
    onError: (error) => setNotice(error.message),
  })
  const password = useMutation({
    mutationFn: savePassword,
    onSuccess: () => setPasswordNotice('Senha alterada.'),
    onError: (error) => setPasswordNotice(error.message),
  })
  const content =
    !auth.loading && !auth.user ? (
      <Feedback title="Acesso reservado">
        Entre na sua conta para acessar esta área.
        <Button asChild className="mt-6">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </Feedback>
    ) : auth.loading || profile.isPending ? (
      <div
        role="status"
        aria-label="Carregando perfil"
        className="min-w-0 flex-1"
      >
        <Skeleton className="h-12" />
        <Skeleton className="mt-6 h-72" />
      </div>
    ) : profile.isError ? (
      <Feedback
        title="Perfil indisponível"
        retry={() => void profile.refetch()}
      >
        {profile.error.message}
      </Feedback>
    ) : (
      <section className="min-w-0 flex-1" aria-label="Dados do perfil">
        <h1 className="mb-8 text-lg font-bold">Perfil do colecionador</h1>
        <form
          key={ownerId}
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const read = (key: string) => {
              const value = data.get(key)
              return typeof value === 'string' ? value.trim() : ''
            }
            setNotice('')
            update.mutate({
              name: read('name'),
              username: read('username'),
              email: read('email'),
              ens: read('ens'),
              walletNickname: read('walletNickname'),
              avatar,
            })
          }}
        >
          <div className="grid min-w-0 gap-x-7 gap-y-5 md:grid-cols-2">
            <div>
              <Label htmlFor="profile-name">Nome de exibição</Label>
              <Input
                id="profile-name"
                name="name"
                defaultValue={profile.data.name}
                minLength={2}
                required
                className="mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="profile-username">Nome de usuário</Label>
              <Input
                id="profile-username"
                name="username"
                defaultValue={profile.data.username}
                minLength={2}
                required
                className="mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="profile-email">E-mail</Label>
              <Input
                id="profile-email"
                name="email"
                type="email"
                defaultValue={profile.data.email}
                required
                className="mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="profile-ens">Nome ENS</Label>
              <Input
                id="profile-ens"
                name="ens"
                defaultValue={profile.data.ens}
                placeholder="nome.eth"
                className="mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="profile-wallet-nickname">
                Apelido da carteira
              </Label>
              <Input
                id="profile-wallet-nickname"
                name="walletNickname"
                defaultValue={profile.data.walletNickname}
                className="mt-2 h-11"
              />
            </div>
            <div>
              <Label htmlFor="profile-avatar">Avatar simulado</Label>
              <div className="mt-2 flex items-center gap-3">
                {avatar ? (
                  <img
                    src={`/assets/${avatar}.png`}
                    alt="Avatar selecionado"
                    className="size-11 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="grid size-11 place-items-center rounded-full bg-card"
                    aria-label="Sem avatar"
                  >
                    ?
                  </span>
                )}
                <select
                  id="profile-avatar"
                  value={avatar ?? ''}
                  onChange={(event) =>
                    setAvatar(
                      avatarSchema.safeParse(event.target.value).success
                        ? (event.target.value as typeof avatar)
                        : null,
                    )
                  }
                  className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sem avatar</option>
                  {avatars.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!avatar}
                  onClick={() => setAvatar(null)}
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
          <Button
            type="submit"
            disabled={update.isPending}
            className="mt-7 min-w-32"
          >
            {update.isPending ? 'Salvando…' : 'Salvar perfil'}
          </Button>
          {notice && (
            <p
              role={update.isError ? 'alert' : 'status'}
              className="mt-3 text-sm"
            >
              {notice}
            </p>
          )}
        </form>
        <form
          className="mt-10 max-w-[417px] space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const data = new FormData(form)
            const currentValue = data.get('currentPassword')
            const newValue = data.get('newPassword')
            const currentPassword =
              typeof currentValue === 'string' ? currentValue : ''
            const newPassword = typeof newValue === 'string' ? newValue : ''
            if (newPassword !== data.get('confirmation')) {
              setPasswordNotice('As novas senhas não conferem.')
              return
            }
            setPasswordNotice('')
            password.mutate(
              { currentPassword, newPassword },
              {
                onSuccess: () => form.reset(),
              },
            )
          }}
        >
          <h2 className="font-bold">Alterar senha</h2>
          <div>
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 h-11"
            />
          </div>
          <div>
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              className="mt-2 h-11"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              className="mt-2 h-11"
            />
          </div>
          <Button type="submit" disabled={password.isPending}>
            {password.isPending ? 'Alterando…' : 'Alterar senha'}
          </Button>
          {passwordNotice && (
            <p
              role={
                password.isError || passwordNotice.includes('não conferem')
                  ? 'alert'
                  : 'status'
              }
              className="text-sm"
            >
              {passwordNotice}
            </p>
          )}
        </form>
      </section>
    )
  return (
    <div className="market-container mt-8 flex min-h-[600px] flex-col gap-7 pb-32 xl:flex-row xl:pb-0">
      {auth.user && <AccountSidebar />}
      {content}
    </div>
  )
}
