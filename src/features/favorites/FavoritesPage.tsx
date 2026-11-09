import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/auth-context'
import { NftCard } from '@/features/catalog/NftCard'
import { Button } from '@/shared/ui/button'
import { Feedback } from '@/shared/ui/feedback'
import { Skeleton } from '@/shared/ui/skeleton'
import { favoritesOptions } from './api'

export function FavoritesPage() {
  const auth = useAuth()
  const favorites = useQuery(favoritesOptions(auth.user?.id ?? ''))
  return (
    <div className="market-container mt-8 min-h-[440px] pb-32 xl:pb-0">
      <h1 className="page-heading mb-8">Lista de interesse</h1>
      {auth.loading ? (
        <Skeleton className="h-64" />
      ) : !auth.user ? (
        <Feedback title="Acesso reservado">
          Entre na sua conta para acessar esta área.
          <Button asChild className="mt-6">
            <Link to="/entrar">Entrar</Link>
          </Button>
        </Feedback>
      ) : favorites.isPending ? (
        <div
          role="status"
          aria-label="Carregando favoritos"
          className="nft-grid"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : favorites.isError ? (
        <Feedback
          title="Favoritos indisponíveis"
          retry={() => void favorites.refetch()}
        >
          {favorites.error.message}
        </Feedback>
      ) : favorites.data.items.length === 0 ? (
        <Feedback title="Sua lista de interesse está vazia">
          Explore o mercado e marque os NFTs que deseja acompanhar.
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </Feedback>
      ) : (
        <div className="nft-grid" aria-label="NFTs favoritos">
          {favorites.data.items.map((nft) => (
            <NftCard key={nft.id} nft={nft} />
          ))}
        </div>
      )}
    </div>
  )
}
