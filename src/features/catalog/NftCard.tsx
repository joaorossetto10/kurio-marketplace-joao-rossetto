import { Link } from '@tanstack/react-router'
import type { NftPreview } from '@/shared/api/contracts'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'

export function NftCard({ nft }: { nft: NftPreview }) {
  return (
    <article className="min-w-0" aria-labelledby={`nft-${nft.id}`}>
      <div className="relative">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          search={(previous) => previous}
          className="nft-art"
          aria-label={`Ver ${nft.name}`}
        >
          <img
            src={`/assets/${nft.artwork}.png`}
            width={1254}
            height={1254}
            alt={nft.name}
            loading="lazy"
            decoding="async"
          />
        </Link>
        <FavoriteButton nft={nft} className="absolute right-3 top-3 z-10" />
      </div>
      <div className="mt-3 pl-2 text-[15px] leading-6 sm:pl-0">
        <h3 id={`nft-${nft.id}`}>
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            search={(previous) => previous}
          >
            {nft.name}
          </Link>
        </h3>
        <p className="text-base font-bold text-accent-foreground sm:text-lg">
          {nft.priceEth} ETH
        </p>
      </div>
    </article>
  )
}
