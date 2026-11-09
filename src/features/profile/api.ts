import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getValidated, requestValidated } from '@/shared/api/client'
import {
  passwordInputSchema,
  profileInputSchema,
  profileSchema,
} from '@/shared/api/contracts'
import { authHeaders } from '@/features/auth/api'

export function profileOptions(ownerId: string) {
  return queryOptions({
    queryKey: ['profile', ownerId],
    enabled: Boolean(ownerId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated('/profile', profileSchema, {
        signal,
        headers: authHeaders(),
      }),
  })
}
export function saveProfile(input: z.infer<typeof profileInputSchema>) {
  return requestValidated(
    {
      method: 'PATCH',
      url: '/profile',
      data: profileInputSchema.parse(input),
      headers: authHeaders(),
    },
    profileSchema,
  )
}
export function savePassword(input: z.infer<typeof passwordInputSchema>) {
  return requestValidated(
    {
      method: 'POST',
      url: '/profile/password',
      data: passwordInputSchema.parse(input),
      headers: authHeaders(),
    },
    z.object({ changed: z.literal(true) }),
  )
}
