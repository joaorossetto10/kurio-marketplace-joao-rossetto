import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getValidated, requestValidated } from '@/shared/api/client'
import {
  cartSummarySchema,
  connectWalletSchema,
  quoteInputSchema,
  quoteSchema,
  walletConnectionSchema,
  walletsSchema,
} from '@/shared/api/contracts'
import { authHeaders, authToken } from '@/features/auth/api'
import { visitorId } from '@/features/cart/visitor'

const headers = () => ({ ...authHeaders(), 'X-Visitor-Id': visitorId() })
export function summaryOptions() {
  return queryOptions({
    queryKey: ['summary', authToken() ?? 'visitor', visitorId()],
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated('/cart/summary', cartSummarySchema, {
        signal,
        headers: headers(),
      }),
  })
}
export function walletsOptions(ownerId: string) {
  return queryOptions({
    queryKey: ['wallets', ownerId],
    enabled: Boolean(ownerId),
    queryFn: ({ signal }) =>
      getValidated('/wallets', walletsSchema, { signal, headers: headers() }),
  })
}
export function connectionOptions(ownerId: string) {
  return queryOptions({
    queryKey: ['wallet-connection', ownerId],
    enabled: Boolean(ownerId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated('/wallets/connection', walletConnectionSchema.nullable(), {
        signal,
        headers: headers(),
      }),
  })
}
export function connectWalletRequest(
  input: z.infer<typeof connectWalletSchema>,
) {
  return requestValidated(
    {
      method: 'POST',
      url: '/wallets/connection',
      data: connectWalletSchema.parse(input),
      headers: headers(),
    },
    walletConnectionSchema,
  )
}
export function disconnectWalletRequest() {
  return requestValidated(
    { method: 'DELETE', url: '/wallets/connection', headers: headers() },
    z.object({ connected: z.literal(false) }),
  )
}
export function createQuoteRequest(input: z.infer<typeof quoteInputSchema>) {
  return requestValidated(
    {
      method: 'POST',
      url: '/quotes',
      data: quoteInputSchema.parse(input),
      headers: headers(),
    },
    quoteSchema,
  )
}
export function quoteOptions(ownerId: string, id: string) {
  return queryOptions({
    queryKey: ['quote', ownerId, id],
    enabled: Boolean(ownerId && id),
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated(`/quotes/${encodeURIComponent(id)}`, quoteSchema, {
        signal,
        headers: headers(),
      }),
  })
}
