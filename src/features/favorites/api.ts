import { queryOptions } from '@tanstack/react-query'
import { getValidated, requestValidated } from '@/shared/api/client'
import { favoriteInputSchema, favoritesSchema } from '@/shared/api/contracts'
import { authHeaders } from '@/features/auth/api'

export function favoritesOptions(ownerId: string) {
  return queryOptions({
    queryKey: ['favorites', ownerId],
    enabled: Boolean(ownerId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated('/favorites', favoritesSchema, {
        signal,
        headers: authHeaders(),
      }),
  })
}
export function addFavoriteRequest(nftId: string) {
  return requestValidated(
    {
      method: 'POST',
      url: '/favorites',
      data: favoriteInputSchema.parse({ nftId }),
      headers: authHeaders(),
    },
    favoritesSchema,
  )
}
export function removeFavoriteRequest(nftId: string) {
  return requestValidated(
    {
      method: 'DELETE',
      url: `/favorites/${encodeURIComponent(nftId)}`,
      headers: authHeaders(),
    },
    favoritesSchema,
  )
}
