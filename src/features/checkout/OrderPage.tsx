import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/shared/ui/button'
import { Feedback } from '@/shared/ui/feedback'
import { Skeleton } from '@/shared/ui/skeleton'
import { orderOptions } from './order-api'

export function OrderPage() {
  const { orderId } = useParams({ from: '/pedidos/$orderId' })
  const auth = useAuth()
  const ownerId = auth.user?.id ?? ''
  const query = useQuery({
    ...orderOptions(ownerId, orderId),
    refetchInterval: (state) =>
      state.state.data?.status === 'pending' ? 1000 : false,
  })
  if (auth.loading)
    return (
      <main className="market-container py-12">
        <Skeleton className="h-80" />
      </main>
    )
  if (!auth.user)
    return (
      <main className="market-container py-12">
        <h1 className="page-heading">Acompanhar pedido</h1>
        <Feedback title="Acesso reservado">
          Entre para consultar seus pedidos.
        </Feedback>
        <Button asChild className="mt-6">
          <Link to="/entrar">Entrar</Link>
        </Button>
      </main>
    )
  return (
    <main className="market-container py-12">
      <h1 className="page-heading mb-8">Acompanhar pedido</h1>
      {query.isPending ? (
        <div role="status" aria-label="Carregando pedido">
          <Skeleton className="mx-auto h-[500px] max-w-[578px]" />
        </div>
      ) : query.isError ? (
        <Feedback
          title="Pedido indisponível"
          retry={() => {
            void query.refetch()
          }}
        >
          {query.error.message}
        </Feedback>
      ) : (
        <section
          className="mx-auto max-w-[578px] rounded-xl bg-card p-7 shadow-2xl"
          aria-label="Estado do pedido"
        >
          {query.data.status === 'pending' ? (
            <>
              <h2 className="text-center text-xl font-bold text-accent-foreground">
                Pedido pendente
              </h2>
              <p role="status" className="mt-4 text-center text-sm">
                Aguardando resposta da simulação. Você pode recarregar esta
                página com segurança.
              </p>
            </>
          ) : query.data.status === 'declined' ? (
            <>
              <h2 className="text-center text-xl font-bold">Compra recusada</h2>
              <p role="alert" className="mt-4 text-center text-sm">
                Nenhum item foi retirado do carrinho. Revise sua carteira e
                tente novamente com uma nova cotação.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/carrinho">Voltar ao carrinho</Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-center text-xl font-bold text-accent-foreground">
                Seus NFTs agora estão na sua carteira
              </h2>
              <p className="mt-5 text-center text-xs">
                Transação simulada, sem blockchain real.
              </p>
            </>
          )}
          <div className="mt-7 grid grid-cols-2 gap-4 border-y border-border py-4 text-xs">
            <div>
              <span className="block text-muted-foreground">Pedido</span>
              {query.data.id}
            </div>
            <div>
              <span className="block text-muted-foreground">Data</span>
              {new Date(query.data.createdAt).toLocaleString('pt-BR')}
            </div>
            <div>
              <span className="block text-muted-foreground">Carteira</span>
              {query.data.quote.walletId}
            </div>
            <div>
              <span className="block text-muted-foreground">Total</span>
              {query.data.quote.totalEth} ETH
            </div>
          </div>
          <h3 className="mt-6 font-bold">Detalhes da transação</h3>
          <ul className="mt-4 space-y-3">
            {query.data.quote.items.map((item) => (
              <li
                key={item.nftId + item.editionId}
                className="flex items-center gap-3"
              >
                <img
                  src={`/assets/${item.artwork}.png`}
                  alt={item.name}
                  className="size-14 rounded-md object-cover"
                />
                <span className="min-w-0 flex-1 text-sm">
                  {item.name}
                  <span className="block text-xs text-muted-foreground">
                    {item.editionLabel} × {item.quantity}
                  </span>
                </span>
                <strong className="text-xs text-accent-foreground">
                  {item.lineTotalEth} ETH
                </strong>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <p className="flex justify-between">
              <span>Subtotal</span>
              <span>{query.data.quote.subtotalEth} ETH</span>
            </p>
            <p className="flex justify-between">
              <span>Desconto</span>
              <span>{query.data.quote.discountEth} ETH</span>
            </p>
            <p className="flex justify-between">
              <span>Taxa de rede</span>
              <span>{query.data.quote.feeEth} ETH</span>
            </p>
            <p className="flex justify-between font-bold text-accent-foreground">
              <span>Total</span>
              <span>{query.data.quote.totalEth} ETH</span>
            </p>
          </div>
          {query.data.transactionRef && (
            <p className="mt-5 break-all text-xs">
              Referência simulada: {query.data.transactionRef}
            </p>
          )}
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => {
              void query.refetch()
            }}
          >
            Atualizar estado
          </Button>
        </section>
      )}
    </main>
  )
}
