import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Feedback } from '@/shared/ui/feedback'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  connectWalletRequest,
  connectionOptions,
  createQuoteRequest,
  disconnectWalletRequest,
  quoteOptions,
  summaryOptions,
  walletsOptions,
} from './api'
import { clearAttempt, persistAttempt, readAttempt } from './attempt'
import { postOrder } from './order-api'
import { ApiError } from '@/shared/api/client'

const quoteKey = (ownerId: string) => `kurio.checkout.quote.v1.${ownerId}`
const providers = [
  { id: 'walletconnect', label: 'WalletConnect' },
  { id: 'metamask', label: 'MetaMask' },
  { id: 'coinbase', label: 'Coinbase Wallet' },
] as const

export function PaymentPage() {
  const auth = useAuth(),
    ownerId = auth.user?.id ?? ''
  const client = useQueryClient()
  const wallets = useQuery(walletsOptions(ownerId))
  const connection = useQuery(connectionOptions(ownerId))
  const summary = useQuery(summaryOptions())
  const [walletId, setWalletId] = useState('')
  const [provider, setProvider] =
    useState<(typeof providers)[number]['id']>('coinbase')
  const [quoteId, setQuoteId] = useState(() =>
    ownerId ? (localStorage.getItem(quoteKey(ownerId)) ?? '') : '',
  )
  const effectiveQuoteId =
    quoteId || (ownerId ? (localStorage.getItem(quoteKey(ownerId)) ?? '') : '')
  const [reviewed, setReviewed] = useState(false)
  const [notice, setNotice] = useState('')
  const quote = useQuery(quoteOptions(ownerId, effectiveQuoteId))
  const selected =
    wallets.data?.find((item) => item.id === walletId) ??
    wallets.data?.[1] ??
    wallets.data?.[0]
  const connected =
    connection.data?.connected &&
    connection.data.walletId === selected?.id &&
    connection.data.provider === provider
  const stale = Boolean(
    quote.data &&
    summary.data &&
    (quote.data.cartVersion !== summary.data.cartVersion ||
      quote.data.commercialVersion !== summary.data.commercialVersion ||
      quote.data.totalEth !== summary.data.totalEth),
  )
  const connect = useMutation({
    mutationFn: connectWalletRequest,
    onSuccess: (data) => {
      client.setQueryData(connectionOptions(ownerId).queryKey, data)
      setNotice('Carteira simulada conectada.')
    },
    onError: (error) => setNotice(error.message),
  })
  const disconnect = useMutation({
    mutationFn: disconnectWalletRequest,
    onSuccess: () => {
      client.setQueryData(connectionOptions(ownerId).queryKey, null)
      setReviewed(false)
      setNotice('Carteira desconectada.')
    },
    onError: (error) => setNotice(error.message),
  })
  const quoteMutation = useMutation({
    mutationFn: createQuoteRequest,
    onSuccess: (data) => {
      localStorage.setItem(quoteKey(ownerId), data.id)
      setQuoteId(data.id)
      client.setQueryData(quoteOptions(ownerId, data.id).queryKey, data)
      setReviewed(false)
      setNotice('Cotação criada. Confira os valores e confirme a revisão.')
    },
    onError: (error) => setNotice(error.message),
  })
  const orderMutation = useMutation({
    mutationFn: postOrder,
    onSuccess: (order) => {
      const mock = new URLSearchParams(window.location.search).get('mock')
      window.location.assign(
        `/pedidos/${order.id}` +
          (mock ? `?mock=${encodeURIComponent(mock)}` : ''),
      )
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        [
          'QUOTE_STALE',
          'QUOTE_EXPIRED',
          'WALLET_DISCONNECTED',
          'INSUFFICIENT_STOCK',
        ].includes(error.code)
      ) {
        clearAttempt(ownerId)
        setReviewed(false)
        setNotice(`${error.message} Gere uma nova cotação e revise novamente.`)
        void client.invalidateQueries({ queryKey: ['summary'] })
        return
      }
      setNotice(
        `A resposta do pedido não foi confirmada: ${error.message} Use “Retomar tentativa” antes de criar outra.`,
      )
    },
  })
  const pendingAttempt = ownerId ? readAttempt(ownerId) : null
  if (auth.loading)
    return (
      <main className="market-container py-12">
        <Skeleton className="h-80" />
      </main>
    )
  if (!auth.user)
    return (
      <main className="market-container py-12">
        <h1 className="page-heading mb-6">Pagamento com carteira</h1>
        <Feedback title="Entre para continuar a compra">
          Seu carrinho de visitante será mesclado à conta após o login.
        </Feedback>
        <Button asChild className="mt-6">
          <Link to="/entrar" search={{ returnTo: '/pagamento' }}>
            Entrar e continuar
          </Link>
        </Button>
      </main>
    )
  return (
    <main className="market-container mt-8 min-h-[650px]">
      <h1 className="page-heading mb-8">Pagamento com carteira</h1>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="order-1 space-y-7 xl:col-start-1 xl:row-start-1">
          <section aria-label="Carteiras cadastradas">
            <h2 className="mb-4 font-bold">Carteira conectada</h2>
            {wallets.isPending ? (
              <Skeleton className="h-32" />
            ) : wallets.isError ? (
              <Feedback
                title="Carteiras indisponíveis"
                retry={() => {
                  void wallets.refetch()
                }}
              >
                {wallets.error.message}
              </Feedback>
            ) : (
              <fieldset className="space-y-3">
                <legend className="sr-only">Escolha uma carteira</legend>
                {wallets.data.map((wallet) => (
                  <label
                    key={wallet.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <input
                      type="radio"
                      name="wallet"
                      checked={selected?.id === wallet.id}
                      onChange={() => {
                        setWalletId(wallet.id)
                        setReviewed(false)
                      }}
                    />
                    <span>
                      <strong className="block">{wallet.label}</strong>
                      <span className="text-sm text-muted-foreground">
                        {wallet.address.startsWith('0x') &&
                        wallet.address.length > 16
                          ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
                          : wallet.address}{' '}
                        · Rede {wallet.network}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
          </section>
          <section aria-label="Carteira e rede">
            <h2 className="mb-4 font-bold">Carteira e rede</h2>
            <fieldset className="space-y-3">
              <legend className="sr-only">Provedor simulado</legend>
              {providers.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <input
                    type="radio"
                    name="provider"
                    checked={provider === item.id}
                    onChange={() => {
                      setProvider(item.id)
                      setReviewed(false)
                    }}
                  />
                  {item.label}
                </label>
              ))}
            </fieldset>
            <p className="mt-3 text-sm">
              Rede selecionada: {selected?.network ?? 'Aguardando carteira'}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={!selected || connect.isPending}
                onClick={() => {
                  if (selected)
                    connect.mutate({
                      walletId: selected.id,
                      network: selected.network,
                      provider,
                    })
                }}
              >
                {connected
                  ? 'Reconectar carteira'
                  : 'Conectar carteira simulada'}
              </Button>
              <Button
                variant="outline"
                disabled={!connection.data?.connected || disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                Desconectar
              </Button>
            </div>
          </section>
        </div>
        <form
          id="buyer-form"
          className="order-3 space-y-4 xl:col-start-1 xl:row-start-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!quote.data || !selected || stale || !reviewed || !connected)
              return
            const data = new FormData(event.currentTarget)
            const read = (key: string) => {
              const value = data.get(key)
              return typeof value === 'string' ? value : ''
            }
            const body = {
              quoteId: quote.data.id,
              walletId: selected.id,
              network: selected.network,
              provider,
              buyer: {
                name: read('buyerName').trim(),
                email: read('buyerEmail').trim(),
                note: read('buyerNote').trim(),
              },
            }
            orderMutation.mutate(persistAttempt(ownerId, body))
          }}
        >
          <h2 className="font-bold">Perfil do colecionador</h2>
          <div>
            <Label htmlFor="buyer-name">Nome de exibição</Label>
            <Input
              id="buyer-name"
              name="buyerName"
              defaultValue={auth.user.name}
              minLength={2}
              required
              className="mt-2 h-[50px]"
            />
          </div>
          <div>
            <Label htmlFor="buyer-email">E-mail</Label>
            <Input
              id="buyer-email"
              name="buyerEmail"
              type="email"
              defaultValue={auth.user.email}
              required
              className="mt-2 h-[50px]"
            />
          </div>
          <div>
            <Label htmlFor="buyer-note">Observação opcional</Label>
            <textarea
              id="buyer-note"
              name="buyerNote"
              maxLength={500}
              className="mt-2 min-h-20 w-full rounded-md border border-border bg-card p-3"
            />
          </div>
          {quote.data && !stale && (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              Revisei itens, desconto, taxa e total desta cotação.
            </label>
          )}
          <Button
            type="submit"
            disabled={
              !reviewed || stale || !connected || orderMutation.isPending
            }
            className="h-[60px] w-full"
          >
            {orderMutation.isPending ? 'Enviando pedido…' : 'Confirmar compra'}
          </Button>
        </form>
        <aside
          className="order-2 rounded-xl bg-card p-6 xl:col-start-2 xl:row-span-2 xl:row-start-1"
          aria-label="Revisão da compra"
        >
          <h2 className="mb-5 font-bold">Seus NFTs</h2>
          {summary.isPending ? (
            <Skeleton className="h-36" />
          ) : summary.isError ? (
            <Feedback
              title="Resumo indisponível"
              retry={() => {
                void summary.refetch()
              }}
            >
              {summary.error.message}
            </Feedback>
          ) : (
            <div className="space-y-2 text-sm">
              <p>Subtotal: {summary.data.subtotalEth} ETH</p>
              <p>Desconto: {summary.data.discountEth} ETH</p>
              <p>Taxa de rede: {summary.data.feeEth} ETH</p>
              <p className="font-bold text-accent-foreground">
                Total estimado: {summary.data.totalEth} ETH
              </p>
            </div>
          )}
          <Button
            className="mt-6 w-full"
            disabled={
              !connected ||
              quoteMutation.isPending ||
              !summary.data ||
              summary.data.totalEth === '0'
            }
            onClick={() => {
              if (selected)
                quoteMutation.mutate({
                  walletId: selected.id,
                  network: selected.network,
                  provider,
                })
            }}
          >
            Gerar nova cotação
          </Button>
          {quote.data && (
            <div className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
              <p>Cotação: {quote.data.id}</p>
              <ul className="space-y-2">
                {quote.data.items.map((item) => (
                  <li key={item.nftId + item.editionId}>
                    {item.name} × {item.quantity}: {item.lineTotalEth} ETH
                  </li>
                ))}
              </ul>
              <p>Desconto: {quote.data.discountEth} ETH</p>
              <p>Taxa: {quote.data.feeEth} ETH</p>
              <p className="font-bold text-accent-foreground">
                Total revisado: {quote.data.totalEth} ETH
              </p>
              <p>
                Válida até{' '}
                {new Date(quote.data.expiresAt).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          )}
          {stale && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              Carrinho ou preço mudou. Gere uma nova cotação e revise novamente.
            </p>
          )}
          {pendingAttempt && (
            <Button
              variant="outline"
              className="mt-5 w-full"
              disabled={orderMutation.isPending}
              onClick={() => orderMutation.mutate(pendingAttempt)}
            >
              Retomar tentativa
            </Button>
          )}
          {notice && (
            <p role="status" className="mt-4 text-sm">
              {notice}
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}
