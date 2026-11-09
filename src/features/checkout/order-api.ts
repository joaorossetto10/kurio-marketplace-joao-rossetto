import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getValidated, requestValidated } from '@/shared/api/client'
import { createOrderSchema, orderSchema } from '@/shared/api/contracts'
import { authHeaders } from '@/features/auth/api'
import { visitorId } from '@/features/cart/visitor'
import type { Attempt } from './attempt'

const headers = () => ({ ...authHeaders(), 'X-Visitor-Id': visitorId() })
export function postOrder(attempt: Attempt) {
  return requestValidated(
    {
      method: 'POST',
      url: '/orders',
      data: createOrderSchema.parse(attempt.body),
      headers: { ...headers(), 'Idempotency-Key': attempt.key },
    },
    orderSchema,
  )
}
export function orderOptions(ownerId: string, id: string) {
  return queryOptions({
    queryKey: ['order', ownerId, id],
    enabled: Boolean(ownerId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated(`/orders/${encodeURIComponent(id)}`, orderSchema, {
        signal,
        headers: headers(),
      }),
  })
}
export function ordersOptions(ownerId: string) {
  return queryOptions({
    queryKey: ['orders', ownerId],
    enabled: Boolean(ownerId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated('/orders', z.array(orderSchema), {
        signal,
        headers: headers(),
      }),
  })
}
