import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { loginInputSchema, registerInputSchema } from '@/shared/api/contracts'
import {
  login,
  logout,
  register,
  requireUser,
  sessionForToken,
} from './auth-store'
import { mergeVisitorCart, MockCartError } from './cart-store'
import { MockBusinessError } from './business-error'
import { apiFailure } from './catalog-handlers'
import { disconnectWallet } from './wallet-store'

function failure(error: unknown) {
  return error instanceof MockBusinessError || error instanceof MockCartError
    ? apiFailure(error.status, error.code, error.message)
    : apiFailure(500, 'AUTH_ERROR', 'Não foi possível acessar a conta.')
}
async function body(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    throw new MockBusinessError('Corpo JSON inválido.', 400, 'INVALID_JSON')
  }
}
function visitor(request: Request) {
  const id = z.uuid().safeParse(request.headers.get('X-Visitor-Id'))
  if (!id.success)
    throw new MockBusinessError(
      'Identificação de visitante inválida.',
      400,
      'INVALID_VISITOR',
    )
  return id.data
}
export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    try {
      const input = loginInputSchema.safeParse(await body(request))
      if (!input.success)
        return apiFailure(422, 'INVALID_LOGIN', 'Confira e-mail e senha.')
      const result = await login(input.data.email, input.data.password)
      mergeVisitorCart(visitor(request), result.user.id)
      return HttpResponse.json(result)
    } catch (error) {
      return failure(error)
    }
  }),
  http.post('/api/auth/register', async ({ request }) => {
    try {
      const input = registerInputSchema.safeParse(await body(request))
      if (!input.success)
        return apiFailure(
          422,
          'INVALID_REGISTRATION',
          'Confira nome, e-mail e senha.',
        )
      const result = await register(
        input.data.name,
        input.data.email,
        input.data.password,
      )
      mergeVisitorCart(visitor(request), result.user.id)
      return HttpResponse.json(result, { status: 201 })
    } catch (error) {
      return failure(error)
    }
  }),
  http.get('/api/auth/session', ({ request }) => {
    try {
      requireUser(request)
      const token =
        request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null
      return HttpResponse.json(sessionForToken(token))
    } catch (error) {
      return failure(error)
    }
  }),
  http.post('/api/auth/logout', ({ request }) => {
    try {
      const user = requireUser(request)
      disconnectWallet(user.id)
      logout(
        request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null,
      )
      return HttpResponse.json({ ok: true })
    } catch (error) {
      return failure(error)
    }
  }),
]
