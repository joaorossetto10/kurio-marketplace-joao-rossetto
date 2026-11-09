import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/auth-context'
import {
  applyCoupon,
  cartOptions,
  changeQuantity,
  removeCoupon,
  removeItem,
} from './api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { Feedback } from '@/shared/ui/feedback'
import { summaryOptions } from '@/features/checkout/api'

type CartAction =
  | { kind: 'quantity'; nftId: string; editionId: string; quantity: number }
  | { kind: 'remove'; nftId: string; editionId: string }
  | { kind: 'coupon'; code: string }
  | { kind: 'clearCoupon' }

export function CartPage() {
  useAuth()
  const client = useQueryClient()
  const query = useQuery(cartOptions())
  const summary = useQuery(summaryOptions())
  const [notice, setNotice] = useState('')
  const mutation = useMutation({
    mutationFn: (action: CartAction) => {
      if (action.kind === 'quantity')
        return changeQuantity(action.nftId, action.editionId, action.quantity)
      if (action.kind === 'remove')
        return removeItem(action.nftId, action.editionId)
      if (action.kind === 'coupon') return applyCoupon(action.code)
      return removeCoupon()
    },
    onMutate: async () => {
      setNotice('')
      await client.cancelQueries({ queryKey: cartOptions().queryKey })
    },
    onSuccess: (updated, action) => {
      client.setQueryData(cartOptions().queryKey, updated)
      void client.invalidateQueries({ queryKey: ['summary'] })
      void client.invalidateQueries({ queryKey: ['quote'] })
      setNotice(
        action.kind === 'coupon'
          ? 'Cupom aplicado.'
          : action.kind === 'clearCoupon'
            ? 'Cupom removido.'
            : 'Carrinho atualizado.',
      )
    },
    onError: (error) => {
      setNotice(error.message)
      void client.invalidateQueries({ queryKey: cartOptions().queryKey })
    },
  })
  return (
    <main className="market-container mt-8 min-h-[440px]">
      <h1 className="page-heading mb-8">Carrinho de NFTs</h1>
      {query.isPending ? (
        <div role="status" aria-label="Carregando carrinho">
          <Skeleton className="h-24" />
          <Skeleton className="mt-5 h-24" />
        </div>
      ) : query.isError ? (
        <Feedback
          title="Não foi possível abrir o carrinho"
          retry={() => {
            void query.refetch()
          }}
        >
          {query.error.message}
        </Feedback>
      ) : !query.data.items.length ? (
        <Feedback title="Seu carrinho está vazio">
          Explore o mercado e escolha uma edição para começar sua coleção.
        </Feedback>
      ) : (
        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_332px]">
          <ul className="space-y-4" aria-label="Itens do carrinho">
            {query.data.items.map((item) => (
              <li
                key={item.nftId + '-' + item.editionId}
                className="flex min-w-0 items-center gap-4 rounded-xl bg-card p-4"
              >
                <img
                  src={'/assets/' + item.artwork + '.png'}
                  width={80}
                  height={80}
                  className="size-20 shrink-0 rounded-lg object-cover"
                  alt={item.name}
                />
                <div className="min-w-0 flex-1 text-sm leading-6">
                  <h2 className="font-bold">
                    <Link to="/nfts/$nftId" params={{ nftId: item.nftId }}>
                      {item.name}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground">
                    Edição: {item.editionLabel} · Quantidade: {item.quantity}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">
                    Preço unitário: {item.unitPriceEth} ETH
                  </p>
                  <p className="break-all font-bold text-accent-foreground">
                    {item.lineTotalEth} ETH
                  </p>
                  {item.quantity > item.stock && (
                    <p role="alert" className="text-destructive">
                      Estoque reduzido: {item.stock}{' '}
                      {item.stock === 1 ? 'disponível' : 'disponíveis'}. Ajuste
                      a quantidade.
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Diminuir ${item.name}`}
                      disabled={mutation.isPending || item.quantity <= 1}
                      onClick={() =>
                        mutation.mutate({
                          kind: 'quantity',
                          nftId: item.nftId,
                          editionId: item.editionId,
                          quantity: item.quantity - 1,
                        })
                      }
                    >
                      −
                    </Button>
                    <span aria-label={`Quantidade de ${item.name}`}>
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Aumentar ${item.name}`}
                      disabled={
                        mutation.isPending || item.quantity >= item.stock
                      }
                      onClick={() =>
                        mutation.mutate({
                          kind: 'quantity',
                          nftId: item.nftId,
                          editionId: item.editionId,
                          quantity: item.quantity + 1,
                        })
                      }
                    >
                      +
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          kind: 'remove',
                          nftId: item.nftId,
                          editionId: item.editionId,
                        })
                      }
                    >
                      Remover {item.name}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <section
            className="rounded-xl bg-card p-6"
            aria-label="Resumo do carrinho"
          >
            <h2 className="mb-6 font-bold">Resumo do carrinho</h2>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                const code = new FormData(event.currentTarget).get('coupon')
                if (typeof code === 'string')
                  mutation.mutate({ kind: 'coupon', code })
              }}
            >
              <label className="sr-only" htmlFor="cart-coupon">
                Código promocional
              </label>
              <Input
                id="cart-coupon"
                name="coupon"
                placeholder="Código promocional"
                defaultValue={query.data.coupon ?? ''}
                className="min-w-0"
              />
              <Button type="submit" disabled={mutation.isPending}>
                Aplicar
              </Button>
            </form>
            {query.data.coupon && (
              <p className="mt-2 text-xs">
                Cupom {query.data.coupon}{' '}
                <button
                  className="text-accent-foreground underline"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ kind: 'clearCoupon' })}
                >
                  Remover cupom
                </button>
              </p>
            )}
            <p className="mt-5 flex justify-between gap-4 text-sm">
              <span>Quantidade total</span>
              <span>{query.data.totalQuantity}</span>
            </p>
            <p className="mt-4 flex flex-wrap justify-between gap-4 font-bold">
              <span>Subtotal</span>
              <span className="break-all text-accent-foreground">
                {query.data.subtotalEth} ETH
              </span>
            </p>
            {summary.data && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span>Desconto</span>
                  <span>{summary.data.discountEth} ETH</span>
                </p>
                <p className="flex justify-between">
                  <span>Taxa de rede</span>
                  <span>{summary.data.feeEth} ETH</span>
                </p>
                <p className="flex justify-between border-t border-border pt-2 font-bold text-accent-foreground">
                  <span>Total estimado</span>
                  <span>{summary.data.totalEth} ETH</span>
                </p>
              </div>
            )}
            {summary.isError && (
              <p role="alert" className="mt-3 text-sm">
                Não foi possível obter o total. {summary.error.message}
              </p>
            )}
            {notice && (
              <p role="status" className="mt-4 text-sm">
                {notice}
              </p>
            )}
            <Button asChild className="mt-6 h-[60px] w-full">
              <Link to="/pagamento">Conectar e finalizar</Link>
            </Button>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Taxa, desconto e total são confirmados na cotação da API antes da
              compra.
            </p>
          </section>
        </div>
      )}
      <Button variant="outline" asChild className="mt-8">
        <Link to="/">Continuar explorando</Link>
      </Button>
    </main>
  )
}
