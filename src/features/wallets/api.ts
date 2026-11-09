import { requestValidated } from '@/shared/api/client'
import { z } from 'zod'
import {
  walletInputSchema,
  walletSchema,
  walletsSchema,
  type WalletInput,
} from '@/shared/api/contracts'
import { authHeaders } from '@/features/auth/api'

export function createWalletRequest(input: WalletInput) {
  return requestValidated(
    {
      method: 'POST',
      url: '/wallets',
      data: walletInputSchema.parse(input),
      headers: authHeaders(),
    },
    walletSchema,
  )
}
export function updateWalletRequest(id: string, input: WalletInput) {
  return requestValidated(
    {
      method: 'PATCH',
      url: `/wallets/${encodeURIComponent(id)}`,
      data: walletInputSchema.parse(input),
      headers: authHeaders(),
    },
    walletSchema,
  )
}
export function removeWalletRequest(id: string) {
  return requestValidated(
    {
      method: 'DELETE',
      url: `/wallets/${encodeURIComponent(id)}`,
      headers: authHeaders(),
    },
    z.object({ removed: z.literal(true) }),
  )
}
export function setPrimaryWalletRequest(id: string) {
  return requestValidated(
    {
      method: 'PUT',
      url: `/wallets/${encodeURIComponent(id)}/primary`,
      headers: authHeaders(),
    },
    walletsSchema,
  )
}
