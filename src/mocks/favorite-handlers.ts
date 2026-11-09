import { delay, http, HttpResponse } from 'msw'
import { favoriteInputSchema } from '@/shared/api/contracts'
import { requireUser } from './auth-store'
import { addFavorite, listFavorites, removeFavorite } from './favorite-store'
import { MockBusinessError } from './business-error'
import { apiFailure } from './catalog-handlers'
import { readScenario } from './scenarios'

function failure(error: unknown) {
  return error instanceof MockBusinessError
    ? apiFailure(error.status, error.code, error.message)
    : apiFailure(500, 'FAVORITE_ERROR', 'Favoritos indisponíveis.')
}
export const favoriteHandlers = [
  http.get('/api/favorites', ({ request }) => {
    try {
      return HttpResponse.json(listFavorites(requireUser(request).id))
    } catch (error) {
      return failure(error)
    }
  }),
  http.post('/api/favorites', async ({ request }) => {
    try {
      const ownerId = requireUser(request).id
      const raw: unknown = await request.json()
      const input = favoriteInputSchema.safeParse(raw)
      if (!input.success)
        return apiFailure(422, 'INVALID_FAVORITE', 'Informe um NFT válido.')
      await delay(readScenario() === 'favorite-error' ? 500 : 120)
      if (readScenario() === 'favorite-error')
        return apiFailure(
          503,
          'FAVORITE_UNAVAILABLE',
          'Falha ao salvar favorito.',
        )
      return HttpResponse.json(addFavorite(ownerId, input.data.nftId), {
        status: 201,
      })
    } catch (error) {
      return failure(error)
    }
  }),
  http.delete('/api/favorites/:id', async ({ request, params }) => {
    try {
      const ownerId = requireUser(request).id
      await delay(readScenario() === 'favorite-error' ? 500 : 120)
      if (readScenario() === 'favorite-error')
        return apiFailure(
          503,
          'FAVORITE_UNAVAILABLE',
          'Falha ao remover favorito.',
        )
      return HttpResponse.json(removeFavorite(ownerId, String(params.id)))
    } catch (error) {
      return failure(error)
    }
  }),
]
