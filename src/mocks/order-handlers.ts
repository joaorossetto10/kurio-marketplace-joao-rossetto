import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { requireUser } from './auth-store'
import { createOrder, listOrders, readOrder } from './order-store'
import { MockBusinessError } from './business-error'
import { MockCartError } from './cart-store'
import { apiFailure } from './catalog-handlers'
import { readScenario } from './scenarios'

function respond(
  request: Request,
  action: (ownerId: string) => Response | Promise<Response>,
) {
  try {
    return action(requireUser(request).id)
  } catch (error) {
    return error instanceof MockBusinessError || error instanceof MockCartError
      ? apiFailure(error.status, error.code, error.message)
      : apiFailure(500, 'ORDER_ERROR', 'Pedido indisponível.')
  }
}
export const orderHandlers = [
  http.get('/api/orders', ({ request }) =>
    respond(request, (ownerId) => HttpResponse.json(listOrders(ownerId))),
  ),
  http.get('/api/orders/:id', ({ request, params }) =>
    respond(request, (ownerId) =>
      HttpResponse.json(readOrder(ownerId, String(params.id))),
    ),
  ),
  http.post('/api/orders', async ({ request }) => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    const key = z.uuid().safeParse(request.headers.get('Idempotency-Key'))
    const visitor = z.uuid().safeParse(request.headers.get('X-Visitor-Id'))
    if (!key.success || !visitor.success)
      return apiFailure(
        400,
        'INVALID_ATTEMPT',
        'Tentativa ou visitante inválido.',
      )
    const result = await respond(request, (ownerId) => {
      const { order, replay } = createOrder(
        ownerId,
        visitor.data,
        key.data,
        raw,
      )
      return HttpResponse.json(order, { status: replay ? 200 : 201 })
    })
    if (readScenario() === 'timeout-after-create' && result.status === 201)
      await delay(9000)
    return result
  }),
]
