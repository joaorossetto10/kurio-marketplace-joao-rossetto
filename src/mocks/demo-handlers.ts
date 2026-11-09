import { http, HttpResponse } from 'msw'
import { businessEventSchema } from '@/shared/api/contracts'
import { changeNft } from './commerce-state'
import { MockBusinessError } from './business-error'
import { emitBusiness, publishBusiness } from './business-events'
import { apiFailure, resetCatalogAttempts } from './catalog-handlers'
import { dropBusinessSockets } from './socket'

export const demoHandlers = [
  http.post('/api/demo/reset', () => {
    dropBusinessSockets()
    resetCatalogAttempts()
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string => key !== null)
    for (const key of keys) {
      if (
        key.startsWith('kurio.mock.') ||
        key.startsWith('kurio.checkout.') ||
        key === 'kurio.session.token.v1' ||
        key === 'kurio.visitor.v1'
      )
        localStorage.removeItem(key)
    }
    return HttpResponse.json({ reset: true as const })
  }),
  http.post('/api/demo/socket/drop-and-change', async ({ request }) => {
    try {
      const raw: unknown = await request.json()
      dropBusinessSockets()
      const nft = changeNft('emerald-042', raw)
      publishBusiness({
        type: 'nft.updated',
        resourceId: nft.id,
        version: nft.version,
        ownerId: null,
      })
      return HttpResponse.json({ nft, dropped: true })
    } catch (error) {
      return error instanceof MockBusinessError
        ? apiFailure(error.status, error.code, error.message)
        : apiFailure(400, 'INVALID_CHANGE', 'Mudança inválida.')
    }
  }),
  http.post('/api/demo/socket/drop', () => {
    dropBusinessSockets()
    return HttpResponse.json({ dropped: true })
  }),
  http.post('/api/demo/nfts/:id/change', async ({ request, params }) => {
    try {
      const raw: unknown = await request.json()
      const nft = changeNft(String(params.id), raw)
      const event = publishBusiness({
        type: 'nft.updated',
        resourceId: nft.id,
        version: nft.version,
        ownerId: null,
      })
      return HttpResponse.json({ nft, event })
    } catch (error) {
      return error instanceof MockBusinessError
        ? apiFailure(error.status, error.code, error.message)
        : apiFailure(400, 'INVALID_CHANGE', 'Mudança inválida.')
    }
  }),
  http.post('/api/demo/events', async ({ request }) => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    const event = businessEventSchema.safeParse(raw)
    if (!event.success)
      return apiFailure(422, 'INVALID_EVENT', 'Evento inválido.')
    emitBusiness(event.data)
    return HttpResponse.json({ sent: true })
  }),
]
