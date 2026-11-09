import { z } from 'zod'
import type { Favorites, NftPreview } from '@/shared/api/contracts'
import { readNft } from './commerce-state'
import { MockBusinessError } from './business-error'

const savedSchema = z.object({
  version: z.number().int().nonnegative(),
  ids: z.array(z.string()),
})
type Saved = z.infer<typeof savedSchema>
const key = (ownerId: string) => `kurio.mock.favorites.v1.${ownerId}`
function read(ownerId: string): Saved {
  try {
    const raw = localStorage.getItem(key(ownerId))
    return raw
      ? savedSchema.parse(JSON.parse(raw) as unknown)
      : { version: 0, ids: [] }
  } catch {
    throw new MockBusinessError(
      'Favoritos indisponíveis.',
      503,
      'FAVORITE_STORAGE_ERROR',
    )
  }
}
function save(ownerId: string, value: Saved) {
  try {
    localStorage.setItem(key(ownerId), JSON.stringify(value))
  } catch {
    throw new MockBusinessError(
      'Favoritos indisponíveis.',
      503,
      'FAVORITE_STORAGE_ERROR',
    )
  }
}
function preview(id: string): NftPreview | null {
  const nft = readNft(id)
  if (!nft) return null
  return {
    id: nft.id,
    name: nft.name,
    artwork: nft.artwork,
    priceEth: nft.priceEth,
    version: nft.version,
    category: nft.category,
    collection: nft.collection,
    network: nft.network,
  }
}
export function listFavorites(ownerId: string): Favorites {
  const saved = read(ownerId)
  return {
    version: saved.version,
    items: saved.ids
      .map(preview)
      .filter((item): item is NftPreview => item !== null),
  }
}
export function addFavorite(ownerId: string, id: string): Favorites {
  if (!preview(id))
    throw new MockBusinessError('NFT não encontrado.', 404, 'NFT_NOT_FOUND')
  const saved = read(ownerId)
  if (!saved.ids.includes(id))
    save(ownerId, { version: saved.version + 1, ids: [...saved.ids, id] })
  return listFavorites(ownerId)
}
export function removeFavorite(ownerId: string, id: string): Favorites {
  const saved = read(ownerId)
  if (saved.ids.includes(id))
    save(ownerId, {
      version: saved.version + 1,
      ids: saved.ids.filter((item) => item !== id),
    })
  return listFavorites(ownerId)
}
