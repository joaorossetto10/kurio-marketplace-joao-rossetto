import { queryOptions } from '@tanstack/react-query'
import { ApiError, getValidated, requestValidated } from '@/shared/api/client'
import {
  addCartItemSchema,
  cartSchema,
  type AddCartItem,
  cartQuantitySchema,
  couponInputSchema,
} from '@/shared/api/contracts'
import { authHeaders, authToken } from '@/features/auth/api'
import { visitorId } from './visitor'

export { visitorId } from './visitor'
export function cartOptions() {
  const id = visitorId()
  const owner = authToken()
  return queryOptions({
    queryKey: ['cart', owner ?? 'visitor', id],
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const cart = await getValidated('/cart', cartSchema, {
        signal,
        headers: { 'X-Visitor-Id': id, ...authHeaders() },
      })
      if (cart.visitorId !== id)
        throw new ApiError(
          'Identificação do carrinho inválida.',
          'INVALID_RESPONSE',
        )
      return cart
    },
  })
}
export async function postCartItem(input: AddCartItem) {
  const id = visitorId()
  const cart = await requestValidated(
    {
      url: '/cart/items',
      method: 'POST',
      data: addCartItemSchema.parse(input),
      headers: { 'X-Visitor-Id': id, ...authHeaders() },
    },
    cartSchema,
  )
  if (cart.visitorId !== id)
    throw new ApiError(
      'Identificação do carrinho inválida.',
      'INVALID_RESPONSE',
    )
  return cart
}
function cartConfig() {
  return { 'X-Visitor-Id': visitorId(), ...authHeaders() }
}
export function changeQuantity(
  nftId: string,
  editionId: string,
  quantity: number,
) {
  return requestValidated(
    {
      method: 'PATCH',
      url: `/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`,
      data: cartQuantitySchema.parse({ quantity }),
      headers: cartConfig(),
    },
    cartSchema,
  )
}
export function removeItem(nftId: string, editionId: string) {
  return requestValidated(
    {
      method: 'DELETE',
      url: `/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`,
      headers: cartConfig(),
    },
    cartSchema,
  )
}
export function applyCoupon(code: string) {
  return requestValidated(
    {
      method: 'PUT',
      url: '/cart/coupon',
      data: couponInputSchema.parse({ code }),
      headers: cartConfig(),
    },
    cartSchema,
  )
}
export function removeCoupon() {
  return requestValidated(
    { method: 'DELETE', url: '/cart/coupon', headers: cartConfig() },
    cartSchema,
  )
}
