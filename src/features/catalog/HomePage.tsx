import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { catalogOptions } from './api'
import { Hero, MarketplacePromos } from './Hero'
import { MarketFilters, MarketSearch, SortControl } from './Controls'
import { useCatalogControls } from './use-catalog-controls'
import { NftCard } from './NftCard'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { Icon } from '@/shared/ui/icon'
import { Feedback } from '@/shared/ui/feedback'
import { Panel } from '@/shared/ui/panel'

export function HomePage() {
  const { search, params, update } = useCatalogControls()
  const query = useQuery(catalogOptions(search))
  const navigate = useNavigate()
  const actualPage = query.data?.page
  useEffect(() => {
    if (
      actualPage !== undefined &&
      !query.isPlaceholderData &&
      actualPage !== params.page
    ) {
      void navigate({
        to: '/',
        search: (previous) => ({ ...previous, page: actualPage }),
        replace: true,
        hash: 'catalogo',
      })
    }
  }, [actualPage, query.isPlaceholderData, params.page, navigate])
  const loading = query.isPending || query.isPlaceholderData
  return (
    <div className="market-container mt-4 xl:mt-8">
      <div className="mb-4 flex gap-2 xl:hidden">
        <MarketSearch compact />
        <Panel
          title="Explorar coleções"
          trigger={
            <Button
              size="icon"
              aria-label="Abrir filtros"
              className="size-[45px] rounded-[14px]"
            >
              <Icon name="filter" />
            </Button>
          }
        >
          <MarketFilters facets={query.data?.facets} idPrefix="mobile" />
        </Panel>
      </div>
      <Hero />
      <section
        id="catalogo"
        className="catalog-layout mt-4 sm:mt-12 xl:mt-section"
        aria-labelledby="catalog-title"
      >
        <aside className="hidden xl:block" aria-label="Coleções e redes">
          <MarketFilters facets={query.data?.facets} idPrefix="desktop" />
          <div className="mt-8 rounded-lg bg-card p-4 text-center">
            <h2 className="font-bold text-accent-foreground">
              NFT EM DESTAQUE
            </h2>
            <p className="mt-2 text-xs">OFERTA LIMITADA</p>
            <img
              src="/assets/sage.png"
              width={1254}
              height={1254}
              className="mt-4 w-full rounded-xl"
              alt="Sage Nomad de chapéu e moletom roxo"
              loading="lazy"
            />
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 xl:mb-8">
            <h2
              id="catalog-title"
              className="border-b-2 border-primary py-1 text-sm font-bold text-accent-foreground"
            >
              Todos os NFTs
            </h2>
            <SortControl />
          </div>
          <div className="mb-6 hidden xl:block">
            <MarketSearch />
          </div>
          <p
            role="status"
            aria-label="Resultados do catálogo"
            className="mb-5 text-xs text-muted-foreground"
          >
            {loading
              ? 'Carregando resultados…'
              : query.data
                ? String(query.data.total) + ' NFTs encontrados'
                : ''}
          </p>
          {loading ? (
            <div
              role="status"
              aria-label="Carregando NFTs"
              className="nft-grid"
            >
              {Array.from({ length: 9 }, (_, n) => (
                <div key={n}>
                  <Skeleton className="h-[200px] rounded-xl sm:h-[300px]" />
                  <Skeleton className="mt-3 h-5 w-4/5" />
                  <Skeleton className="mt-2 h-5 w-1/2" />
                </div>
              ))}
            </div>
          ) : query.isError ? (
            <Feedback
              title="Não foi possível abrir o mercado"
              retry={() => {
                void query.refetch()
              }}
            >
              {query.error.message}
            </Feedback>
          ) : query.data.items.length === 0 ? (
            <Feedback title="Nenhum NFT encontrado">
              Tente buscar por outro nome ou remova os filtros.
              <Button
                variant="outline"
                className="mt-4 block"
                onClick={() =>
                  update({
                    q: '',
                    categories: [],
                    collections: [],
                    networks: [],
                    min: '',
                    max: '',
                  })
                }
              >
                Limpar busca e filtros
              </Button>
            </Feedback>
          ) : (
            <div className="nft-grid">
              {query.data.items.map((nft) => (
                <NftCard key={nft.id} nft={nft} />
              ))}
            </div>
          )}
          {query.data && !query.isError && (
            <nav
              aria-label="Paginação do catálogo"
              className="mt-16 flex flex-wrap items-center justify-end gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={loading || params.page <= 1}
                onClick={() => update({ page: params.page - 1 }, false)}
              >
                Anterior
              </Button>
              {Array.from(
                { length: query.data.totalPages },
                (_, i) => i + 1,
              ).map((page) => (
                <Button
                  key={page}
                  variant={page === params.page ? 'default' : 'outline'}
                  size="sm"
                  aria-label={'Página ' + String(page)}
                  aria-current={page === params.page ? 'page' : undefined}
                  disabled={loading}
                  onClick={() => update({ page }, false)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={loading || params.page >= query.data.totalPages}
                onClick={() => update({ page: params.page + 1 }, false)}
              >
                Próxima
              </Button>
            </nav>
          )}
        </div>
      </section>
      <MarketplacePromos />
    </div>
  )
}
