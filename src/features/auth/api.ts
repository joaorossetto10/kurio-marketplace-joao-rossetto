import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getValidated, requestValidated } from '@/shared/api/client'
import {
  authResultSchema,
  loginInputSchema,
  registerInputSchema,
  sessionSchema,
} from '@/shared/api/contracts'
import { visitorId } from '@/features/cart/visitor'

const tokenKey = 'kurio.session.token.v1'
export function authToken() {
  return localStorage.getItem(tokenKey)
}
export function saveAuthToken(token: string | null) {
  if (token) localStorage.setItem(tokenKey, token)
  else localStorage.removeItem(tokenKey)
}
export function authHeaders(): Record<string, string> {
  const token = authToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
export function sessionOptions(token: string | null) {
  return queryOptions({
    queryKey: ['session', token],
    enabled: Boolean(token),
    staleTime: 0,
    queryFn: ({ signal }) =>
      getValidated('/auth/session', sessionSchema, {
        signal,
        headers: { Authorization: `Bearer ${token ?? ''}` },
      }),
  })
}
export function loginRequest(input: { email: string; password: string }) {
  return requestValidated(
    {
      method: 'POST',
      url: '/auth/login',
      data: loginInputSchema.parse(input),
      headers: { 'X-Visitor-Id': visitorId() },
    },
    authResultSchema,
  )
}
export function registerRequest(input: {
  name: string
  email: string
  password: string
}) {
  return requestValidated(
    {
      method: 'POST',
      url: '/auth/register',
      data: registerInputSchema.parse(input),
      headers: { 'X-Visitor-Id': visitorId() },
    },
    authResultSchema,
  )
}
export function logoutRequest() {
  return requestValidated(
    { method: 'POST', url: '/auth/logout', headers: authHeaders() },
    z.object({ ok: z.literal(true) }),
  )
}
