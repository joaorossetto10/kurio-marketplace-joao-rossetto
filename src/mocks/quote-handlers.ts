import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { quoteInputSchema } from '@/shared/api/contracts'
import { requireUser } from './auth-store'
import { cartSummary, createQuote, readQuote } from './quote-store'
import { MockBusinessError } from './business-error'
import { MockCartError } from './cart-store'
import { apiFailure } from './catalog-handlers'

function visitor(request: Request) {
  const parsed = z.uuid().safeParse(request.headers.get('X-Visitor-Id'))
  if (!parsed.success)
    throw new MockBusinessError('Visitante inválido.', 400, 'INVALID_VISITOR')
  return parsed.data
}
function respond(
  request: Request,
  action: (ownerId: string, visitorId: string) => Response,
) {
  try {
    const visitorId = visitor(request)
    const ownerId = request.headers.has('Authorization')
      ? requireUser(request).id
      : ''
    return action(ownerId, visitorId)
  } catch (error) {
    return error instanceof MockBusinessError || error instanceof MockCartError
      ? apiFailure(error.status, error.code, error.message)
      : apiFailure(500, 'QUOTE_ERROR', 'Cotação indisponível.')
  }
}
export const quoteHandlers = [
  http.get('/api/cart/summary', ({ request }) =>
    respond(request, (ownerId, visitorId) =>
      HttpResponse.json(cartSummary(visitorId, ownerId || undefined)),
    ),
  ),
  http.post('/api/quotes', async ({ request }) => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    const input = quoteInputSchema.safeParse(raw)
    if (!input.success)
      return apiFailure(
        422,
        'INVALID_QUOTE',
        'Selecione carteira, rede e provedor.',
      )
    return respond(request, (ownerId, visitorId) => {
      if (!ownerId)
        return apiFailure(401, 'SESSION_EXPIRED', 'Entre para continuar.')
      return HttpResponse.json(createQuote(ownerId, visitorId, input.data), {
        status: 201,
      })
    })
  }),
  http.get('/api/quotes/:id', ({ request, params }) =>
    respond(request, (ownerId) => {
      if (!ownerId)
        return apiFailure(401, 'SESSION_EXPIRED', 'Entre para continuar.')
      return HttpResponse.json(readQuote(ownerId, String(params.id)))
    }),
  ),
]
