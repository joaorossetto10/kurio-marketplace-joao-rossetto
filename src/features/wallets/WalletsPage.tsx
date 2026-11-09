import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AccountSidebar } from '@/app/layout'
import { useAuth } from '@/features/auth/auth-context'
import { walletsOptions } from '@/features/checkout/api'
import {
  walletInputSchema,
  type Wallet,
  type WalletInput,
} from '@/shared/api/contracts'
import { Button } from '@/shared/ui/button'
import { Feedback } from '@/shared/ui/feedback'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  createWalletRequest,
  updateWalletRequest,
  removeWalletRequest,
  setPrimaryWalletRequest,
} from './api'

type Action =
  | { kind: 'save'; id: string | null; input: WalletInput }
  | { kind: 'remove'; id: string }
  | { kind: 'primary'; id: string }

const fields = [
  { name: 'label', label: 'Nome de exibição', required: true },
  { name: 'nickname', label: 'Apelido da carteira', required: true },
  { name: 'profileName', label: 'Nome do perfil', required: true },
  { name: 'address', label: 'Endereço da carteira', required: true },
  {
    name: 'secondaryAddress',
    label: 'ENS ou carteira secundária',
    required: false,
  },
  { name: 'email', label: 'E-mail', required: true },
  { name: 'referralCode', label: 'Código de indicação', required: true },
  { name: 'ens', label: 'Nome ENS', required: true },
] as const

export function WalletsPage() {
  const auth = useAuth()
  const ownerId = auth.user?.id ?? ''
  const client = useQueryClient()
  const wallets = useQuery(walletsOptions(ownerId))
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const mutation = useMutation({
    mutationFn: async (action: Action): Promise<unknown> => {
      if (action.kind === 'remove') return removeWalletRequest(action.id)
      if (action.kind === 'primary') return setPrimaryWalletRequest(action.id)
      return action.id
        ? updateWalletRequest(action.id, action.input)
        : createWalletRequest(action.input)
    },
    onSuccess: (_result, action) => {
      void client.invalidateQueries({ queryKey: ['wallets', ownerId] })
      void client.invalidateQueries({
        queryKey: ['wallet-connection', ownerId],
      })
      void client.invalidateQueries({ queryKey: ['quote', ownerId] })
      setEditing(null)
      setNotice(
        action.kind === 'remove'
          ? 'Carteira removida.'
          : action.kind === 'primary'
            ? 'Carteira principal alterada.'
            : 'Carteira salva.',
      )
    },
    onError: (error) => setNotice(error.message),
  })
  const selected =
    editing && editing !== 'new'
      ? wallets.data?.find((wallet) => wallet.id === editing)
      : undefined
  const content =
    !auth.loading && !auth.user ? (
      <Feedback title="Acesso reservado">
        Entre na sua conta para acessar esta área.
        <Button asChild className="mt-6">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </Feedback>
    ) : auth.loading || wallets.isPending ? (
      <div
        role="status"
        aria-label="Carregando carteiras"
        className="min-w-0 flex-1"
      >
        <Skeleton className="h-72" />
      </div>
    ) : wallets.isError ? (
      <Feedback
        title="Carteiras indisponíveis"
        retry={() => void wallets.refetch()}
      >
        {wallets.error.message}
      </Feedback>
    ) : (
      <section className="min-w-0 flex-1" aria-label="Gerenciar carteiras">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">Carteiras</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Estas carteiras ficam disponíveis no pagamento simulado.
            </p>
          </div>
          <Button
            onClick={() => setEditing('new')}
            disabled={mutation.isPending}
          >
            Adicionar carteira
          </Button>
        </div>
        {wallets.data.length === 0 ? (
          <Feedback title="Nenhuma carteira cadastrada">
            Adicione uma carteira para cotar uma compra.
          </Feedback>
        ) : (
          <ul className="space-y-4" aria-label="Suas carteiras">
            {wallets.data.map((wallet) => (
              <li
                key={wallet.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold">
                      {wallet.label}{' '}
                      {wallet.isPrimary && (
                        <span className="ml-2 text-xs text-accent-foreground">
                          Principal
                        </span>
                      )}
                    </h2>
                    <p className="mt-2 break-all text-sm text-muted-foreground">
                      {wallet.address}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Rede {wallet.network} · {wallet.type}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(wallet.id)}
                    >
                      Editar {wallet.label}
                    </Button>
                    {!wallet.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ kind: 'primary', id: wallet.id })
                        }
                      >
                        Tornar principal {wallet.label}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(`Remover a carteira ${wallet.label}?`)
                        )
                          mutation.mutate({ kind: 'remove', id: wallet.id })
                      }}
                    >
                      Remover {wallet.label}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {editing && (
          <WalletForm
            key={editing}
            wallet={selected}
            ownerName={auth.user?.name ?? ''}
            ownerEmail={auth.user?.email ?? ''}
            pending={mutation.isPending}
            onCancel={() => setEditing(null)}
            onSave={(input) => {
              const checked = walletInputSchema.safeParse(input)
              if (!checked.success) {
                setNotice(
                  'Confira endereço, e-mail e campos obrigatórios da carteira.',
                )
                return
              }
              setNotice('')
              mutation.mutate({
                kind: 'save',
                id: editing === 'new' ? null : editing,
                input: checked.data,
              })
            }}
          />
        )}
        {notice && (
          <p
            role={
              mutation.isError || notice.startsWith('Confira')
                ? 'alert'
                : 'status'
            }
            className="mt-5 text-sm"
          >
            {notice}
          </p>
        )}
      </section>
    )
  return (
    <div className="market-container mt-8 flex min-h-[600px] flex-col gap-7 pb-32 xl:flex-row xl:pb-0">
      {auth.user && <AccountSidebar />}
      {content}
    </div>
  )
}

function WalletForm({
  wallet,
  ownerName,
  ownerEmail,
  pending,
  onCancel,
  onSave,
}: {
  wallet: Wallet | undefined
  ownerName: string
  ownerEmail: string
  pending: boolean
  onCancel: () => void
  onSave: (input: WalletInput) => void
}) {
  return (
    <form
      className="mt-8 rounded-xl border border-border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const read = (name: string) => {
          const value = data.get(name)
          return typeof value === 'string' ? value.trim() : ''
        }
        onSave({
          label: read('label'),
          nickname: read('nickname'),
          profileName: read('profileName'),
          address: read('address'),
          secondaryAddress: read('secondaryAddress'),
          email: read('email'),
          referralCode: read('referralCode'),
          ens: read('ens'),
          network: read('network') as WalletInput['network'],
          type: read('type') as WalletInput['type'],
        })
      }}
    >
      <h2 className="mb-6 font-bold">
        {wallet ? `Editar ${wallet.label}` : 'Adicionar carteira'}
      </h2>
      <div className="grid min-w-0 gap-x-7 gap-y-5 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name}>
            <Label htmlFor={`wallet-${field.name}`}>{field.label}</Label>
            <Input
              id={`wallet-${field.name}`}
              name={field.name}
              required={field.required}
              defaultValue={
                wallet?.[field.name] ??
                (field.name === 'profileName'
                  ? ownerName
                  : field.name === 'email'
                    ? ownerEmail
                    : '')
              }
              type={field.name === 'email' ? 'email' : 'text'}
              placeholder={
                field.name === 'address' ? '0x… ou nome.eth' : undefined
              }
              className="mt-2 h-11"
            />
          </div>
        ))}
        <div>
          <Label htmlFor="wallet-network">Rede</Label>
          <select
            id="wallet-network"
            name="network"
            defaultValue={wallet?.network ?? 'ethereum'}
            className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ethereum">Ethereum</option>
            <option value="polygon">Polygon</option>
            <option value="solana">Solana</option>
          </select>
        </div>
        <div>
          <Label htmlFor="wallet-type">Tipo de carteira</Label>
          <select
            id="wallet-type"
            name="type"
            defaultValue={wallet?.type ?? 'metamask'}
            className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="metamask">MetaMask</option>
            <option value="walletconnect">WalletConnect</option>
            <option value="coinbase">Coinbase Wallet</option>
          </select>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
