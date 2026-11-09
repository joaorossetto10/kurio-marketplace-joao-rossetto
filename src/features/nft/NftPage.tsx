import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, notFound, useParams } from '@tanstack/react-router'
import { nftDetailOptions } from '@/features/catalog/api'
import { NftCard } from '@/features/catalog/NftCard'
import { cartOptions, postCartItem } from '@/features/cart/api'
import { CartLink } from '@/features/cart/CartLink'
import { ApiError } from '@/shared/api/client'
import type { NftDetail } from '@/shared/api/contracts'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Icon } from '@/shared/ui/icon'
import { Feedback } from '@/shared/ui/feedback'
import { Skeleton } from '@/shared/ui/skeleton'
import './detail.css'
import { useAuth } from '@/features/auth/auth-context'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'

function Gallery({ nft }: { nft: NftDetail }) {
  const [selected, setSelected] = useState(0)
  return (
    <div className="detail-gallery" aria-label="Galeria do NFT">
      <div className="detail-gallery-controls">
        {nft.gallery.map((artwork, index) => (
          <button
            key={index}
            type="button"
            aria-label={'Imagem ' + String(index + 1) + ' de ' + nft.name}
            aria-pressed={selected === index}
            className="detail-thumbnail"
            onClick={() => setSelected(index)}
          >
            <img
              src={'/assets/' + artwork + '.png'}
              width={100}
              height={100}
              alt=""
            />
            <span className="detail-gallery-dot" />
          </button>
        ))}
      </div>
      <div className="detail-art-main">
        <img
          src={'/assets/' + (nft.gallery[selected] ?? nft.artwork) + '.png'}
          width={1254}
          height={1254}
          alt={nft.name + ' — imagem ' + String(selected + 1)}
        />
      </div>
      <div className="detail-mobile-actions">
        <Button variant="outline" size="icon" asChild>
          <Link
            to="/"
            search={(previous) => previous}
            hash="catalogo"
            aria-label="Voltar ao catálogo"
          >
            <Icon name="back" />
          </Link>
        </Button>
        <FavoriteButton nft={nft} />
      </div>
    </div>
  )
}

function DetailView({ nft }: { nft: NftDetail }) {
  useAuth()
  const [selected, setSelected] = useState(nft.defaultEditionId)
  const [quantity, setQuantity] = useState('1')
  const [notice, setNotice] = useState('')
  const [infoTab, setInfoTab] = useState<'details' | 'reviews'>('details')
  const client = useQueryClient()
  const cart = useQuery(cartOptions())
  const edition = nft.editions.find((e) => e.id === selected) ?? nft.editions[0]
  const inCart =
    cart.data?.items.find(
      (line) => line.nftId === nft.id && line.editionId === edition?.id,
    )?.quantity ?? 0
  const remaining = Math.max(0, (edition?.stock ?? 0) - inCart)
  const numericQuantity = /^\d{1,4}$/.test(quantity) ? Number(quantity) : 0
  const valid = numericQuantity >= 1 && numericQuantity <= remaining
  const add = useMutation({
    mutationFn: postCartItem,
    onMutate: async () => {
      setNotice('')
      await client.cancelQueries({ queryKey: cartOptions().queryKey })
    },
    onSuccess: (updated, input) => {
      client.setQueryData(cartOptions().queryKey, updated)
      setNotice(
        String(input.quantity) +
          (input.quantity === 1
            ? ' unidade adicionada ao carrinho.'
            : ' unidades adicionadas ao carrinho.'),
      )
      setQuantity('1')
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: cartOptions().queryKey })
      void client.invalidateQueries({ queryKey: ['nfts', 'detail', nft.id] })
    },
  })
  return (
    <div className="detail-page">
      <nav
        aria-label="Caminho de navegação"
        className="mb-3 hidden text-xs text-muted-foreground xl:block"
      >
        <Link to="/" search={(previous) => previous}>
          Início / Mercado
        </Link>
      </nav>
      <div className="detail-product">
        <Gallery nft={nft} />
        <section className="detail-sheet" aria-labelledby="nft-title">
          <div className="flex flex-wrap items-start justify-between gap-3 xl:block">
            <h1
              id="nft-title"
              className="text-xl font-bold leading-8 xl:text-[28px]"
            >
              {nft.name}
            </h1>
            <FavoriteButton nft={nft} className="hidden sm:inline-flex" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground xl:mt-4 xl:justify-end">
              <img src="/assets/star.svg" alt="" />
              <span>
                {nft.rating} ({nft.reviewCount})
              </span>
            </div>
          </div>
          <p className="mt-3 hidden text-[22px] font-bold text-accent-foreground xl:block">
            {edition?.priceEth ?? nft.priceEth} ETH
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {nft.description}
          </p>
          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (valid && edition && !add.isPending && cart.data)
                add.mutate({
                  nftId: nft.id,
                  editionId: edition.id,
                  quantity: numericQuantity,
                })
            }}
          >
            <fieldset disabled={add.isPending}>
              <legend className="mb-3 text-sm font-bold">Edição:</legend>
              <div className="flex flex-wrap gap-3">
                {nft.editions.map((option) => (
                  <label
                    key={option.id}
                    className={
                      option.stock === 0
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer'
                    }
                  >
                    <input
                      type="radio"
                      name="edition"
                      value={option.id}
                      checked={edition?.id === option.id}
                      disabled={option.stock === 0}
                      className="peer sr-only"
                      onChange={() => {
                        setSelected(option.id)
                        setQuantity('1')
                        setNotice('')
                        add.reset()
                      }}
                    />
                    <span className="inline-block rounded-full border border-border px-2 py-1 text-xs text-muted-foreground peer-checked:border-primary peer-checked:text-accent-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring">
                      {option.label}
                      {option.stock === 0 && (
                        <span className="sr-only"> — Esgotada</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p id="edition-stock" className="mt-3 text-xs text-text-subtle">
              {edition?.stock ?? 0} disponíveis nesta edição
              {inCart ? ' · ' + String(inCart) + ' no carrinho' : ''}.{' '}
              {remaining === 0 ? 'Esgotada para adicionar.' : ''}
            </p>
            <dl className="mt-4 space-y-3 text-sm leading-5 text-text-subtle">
              <div>
                <dt className="inline">ID do token: </dt>
                <dd className="inline">{nft.tokenId}</dd>
              </div>
              <div>
                <dt className="inline">Coleção: </dt>
                <dd className="inline">{nft.collectionLabel}</dd>
              </div>
              <div>
                <dt className="inline">Rede: </dt>
                <dd className="inline">{nft.networkLabel}</dd>
              </div>
              <div>
                <dt className="inline">Atributos: </dt>
                <dd className="inline">{nft.attributes.join(', ')}</dd>
              </div>
            </dl>
            <div className="detail-buy-bar">
              <div className="flex items-center justify-between gap-3">
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  <label
                    htmlFor="nft-quantity"
                    className="text-sm text-muted-foreground"
                  >
                    Qtd.
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    className="rounded-full"
                    aria-label="Diminuir quantidade"
                    disabled={numericQuantity <= 1 || add.isPending}
                    onClick={() =>
                      setQuantity(String(Math.max(1, numericQuantity - 1)))
                    }
                  >
                    <img src="/assets/minus.svg" alt="" />
                  </Button>
                  <Input
                    id="nft-quantity"
                    type="number"
                    min={1}
                    max={remaining}
                    value={quantity}
                    disabled={add.isPending || !remaining}
                    onChange={(event) => {
                      setQuantity(event.target.value)
                      setNotice('')
                      add.reset()
                    }}
                    aria-invalid={!valid && remaining > 0}
                    aria-describedby="quantity-error edition-stock"
                    className="quantity-input h-9 w-8 border-0 bg-transparent px-0 text-center sm:w-12"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="rounded-full"
                    aria-label="Aumentar quantidade"
                    disabled={
                      numericQuantity >= remaining ||
                      !remaining ||
                      add.isPending
                    }
                    onClick={() =>
                      setQuantity(
                        String(
                          Math.min(remaining, Math.max(1, numericQuantity + 1)),
                        ),
                      )
                    }
                  >
                    <img src="/assets/plus.svg" alt="" />
                  </Button>
                </div>
                <p className="max-w-[45%] text-right text-lg font-bold wrap-anywhere text-accent-foreground xl:hidden">
                  {edition?.priceEth ?? nft.priceEth} ETH
                </p>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <Button
                  type="submit"
                  className="h-[60px] flex-1 rounded-full xl:h-10 xl:flex-none xl:rounded-md"
                  disabled={!valid || add.isPending || !cart.data}
                >
                  {add.isPending ? 'Adicionando…' : 'Adicionar ao carrinho'}
                </Button>
                <CartLink />
              </div>
              <p
                id="quantity-error"
                className="mt-2 text-xs text-destructive"
                role={!valid && remaining > 0 ? 'alert' : undefined}
              >
                {!valid && remaining > 0
                  ? 'Informe uma quantidade inteira entre 1 e ' +
                    String(remaining) +
                    '.'
                  : ''}
              </p>
              {cart.isError && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  Não foi possível consultar o carrinho.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      void cart.refetch()
                    }}
                  >
                    Tentar novamente
                  </button>
                </p>
              )}
              {add.isError && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {add.error.message}
                </p>
              )}
              <p role="status" className="mt-2 text-sm text-accent-foreground">
                {notice}
              </p>
            </div>
          </form>
        </section>
      </div>
      <section
        className="detail-information"
        aria-label="Informações adicionais"
      >
        <div
          role="tablist"
          aria-label="Informações do NFT"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
              return
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 'details'
                : event.key === 'End'
                  ? 'reviews'
                  : infoTab === 'details'
                    ? 'reviews'
                    : 'details'
            setInfoTab(next)
            document.getElementById(next + '-tab')?.focus()
          }}
          className="mb-6 flex flex-wrap gap-5 border-b border-border text-sm"
        >
          <button
            type="button"
            role="tab"
            id="details-tab"
            aria-controls="nft-information"
            aria-selected={infoTab === 'details'}
            tabIndex={infoTab === 'details' ? 0 : -1}
            className="py-3 aria-selected:border-b-2 aria-selected:border-primary aria-selected:text-accent-foreground"
            onClick={() => setInfoTab('details')}
          >
            Detalhes do NFT
          </button>
          <button
            type="button"
            role="tab"
            id="reviews-tab"
            aria-controls="nft-information"
            aria-selected={infoTab === 'reviews'}
            tabIndex={infoTab === 'reviews' ? 0 : -1}
            className="py-3 aria-selected:border-b-2 aria-selected:border-primary aria-selected:text-accent-foreground"
            onClick={() => setInfoTab('reviews')}
          >
            Avaliações de colecionadores ({nft.reviewCount})
          </button>
        </div>
        <div
          id="nft-information"
          role="tabpanel"
          aria-labelledby={
            infoTab === 'details' ? 'details-tab' : 'reviews-tab'
          }
          className="space-y-4 text-sm leading-7 text-muted-foreground"
        >
          {infoTab === 'details' ? (
            <>
              <p>
                {nft.name} é uma obra digital da coleção {nft.collectionLabel}.{' '}
                {nft.description}
              </p>
              <p>
                Criador: {nft.creator}. Direitos autorais: {nft.royaltyLabel}.
              </p>
              <dl>
                <dt>Rede:</dt>
                <dd>{nft.networkLabel}</dd>
                <dt className="mt-2">Contrato:</dt>
                <dd>{nft.contractAddress}</dd>
              </dl>
              <p className="text-xs">
                Dados de demonstração. Nenhuma transação blockchain é realizada.
              </p>
            </>
          ) : (
            <p>
              Nota {nft.rating} de 5 em {nft.reviewCount} avaliações de
              demonstração. Comentários individuais ainda não estão disponíveis.
            </p>
          )}
        </div>
      </section>
      <section className="detail-related" aria-labelledby="related-heading">
        <h2
          id="related-heading"
          className="mb-8 text-lg font-bold text-accent-foreground"
        >
          Mais desta coleção
        </h2>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {nft.related.map((item) => (
            <NftCard key={item.id} nft={item} />
          ))}
        </div>
      </section>
    </div>
  )
}

export function NftNotFound() {
  return (
    <div className="market-container py-16">
      <p className="text-accent-foreground">404</p>
      <h1 className="page-heading mt-4">NFT não encontrado</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Este item não existe no catálogo ou não está mais disponível.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao catálogo</Link>
      </Button>
    </div>
  )
}

export function NftPage() {
  const { nftId } = useParams({ from: '/nfts/$nftId' })
  const query = useQuery(nftDetailOptions(nftId))
  if (query.isPending)
    return (
      <div
        className="market-container mt-8 xl:min-h-screen"
        role="status"
        aria-label="Carregando detalhe do NFT"
      >
        <div className="grid gap-8 xl:grid-cols-2">
          <Skeleton className="h-[448px] rounded-2xl" />
          <div className="space-y-6">
            <Skeleton className="h-10" />
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    )
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      // TanStack Router uses a control-flow object for its not-found boundary.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw notFound()
    }
    return (
      <div className="market-container mt-8">
        <Feedback
          title="Não foi possível abrir o NFT"
          retry={() => {
            void query.refetch()
          }}
        >
          {query.error.message}
        </Feedback>
      </div>
    )
  }
  return <DetailView key={query.data.id} nft={query.data} />
}
