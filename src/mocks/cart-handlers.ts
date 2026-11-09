import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  addCartItemSchema,
  cartQuantitySchema,
  couponInputSchema,
} from '@/shared/api/contracts'
import {
  addCartItem,
  changeCartQuantity,
  readCart,
  removeCartItem,
  setCartCoupon,
  MockCartError,
} from './cart-store'
import { requireUser } from './auth-store'
import { MockBusinessError } from './business-error'
import { apiFailure } from './catalog-handlers'
import { readScenario } from './scenarios'

function cartResponse(
  request: Request,
  action: (id: string, ownerId?: string) => Response,
) {
  const id = z.uuid().safeParse(request.headers.get('X-Visitor-Id'))
  if (!id.success)
    return apiFailure(
      400,
      'INVALID_VISITOR',
      'Identificação de visitante inválida.',
    )
  try {
    const ownerId = request.headers.has('Authorization')
      ? requireUser(request).id
      : undefined
    return action(id.data, ownerId)
  } catch (error: unknown) {
    return error instanceof MockCartError || error instanceof MockBusinessError
      ? apiFailure(error.status, error.code, error.message)
      : apiFailure(500, 'CART_ERROR', 'Não foi possível atualizar o carrinho.')
  }
}
export const cartHandlers = [
  http.get('/api/cart', async ({ request }) => {
    await delay(80)
    return cartResponse(request, (id, ownerId) =>
      HttpResponse.json(readCart(id, ownerId)),
    )
  }),
  http.post('/api/cart/items', async ({ request }) => {
    await delay(150)
    if (readScenario() === 'cart-error')
      return apiFailure(
        503,
        'CART_UNAVAILABLE',
        'Não foi possível adicionar o NFT. Tente novamente.',
      )
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    const input = addCartItemSchema.safeParse(raw)
    if (!input.success)
      return apiFailure(
        422,
        'INVALID_CART_ITEM',
        'Informe NFT, edição e quantidade inteira maior que zero.',
      )
    return cartResponse(request, (id, ownerId) =>
      HttpResponse.json(addCartItem(id, input.data, ownerId), { status: 201 }),
    )
  }),
  http.patch(
    '/api/cart/items/:nftId/:editionId',
    async ({ request, params }) => {
      let raw: unknown
      try {
        raw = await request.json()
      } catch {
        return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
      }
      const input = cartQuantitySchema.safeParse(raw)
      if (!input.success)
        return apiFailure(
          422,
          'INVALID_QUANTITY',
          'Informe quantidade inteira válida.',
        )
      return cartResponse(request, (id, ownerId) =>
        HttpResponse.json(
          changeCartQuantity(
            id,
            String(params.nftId),
            String(params.editionId),
            input.data.quantity,
            ownerId,
          ),
        ),
      )
    },
  ),
  http.delete('/api/cart/items/:nftId/:editionId', ({ request, params }) =>
    cartResponse(request, (id, ownerId) =>
      HttpResponse.json(
        removeCartItem(
          id,
          String(params.nftId),
          String(params.editionId),
          ownerId,
        ),
      ),
    ),
  ),
  http.put('/api/cart/coupon', async ({ request }) => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    const input = couponInputSchema.safeParse(raw)
    if (!input.success)
      return apiFailure(422, 'INVALID_COUPON', 'Informe um código promocional.')
    return cartResponse(request, (id, ownerId) =>
      HttpResponse.json(setCartCoupon(id, input.data.code, ownerId)),
    )
  }),
  http.delete('/api/cart/coupon', ({ request }) =>
    cartResponse(request, (id, ownerId) =>
      HttpResponse.json(setCartCoupon(id, null, ownerId)),
    ),
  ),
]
