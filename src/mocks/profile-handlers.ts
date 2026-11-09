import { http, HttpResponse } from 'msw'
import { passwordInputSchema, profileInputSchema } from '@/shared/api/contracts'
import {
  requireUser,
  readProfile,
  updateProfile,
  changePassword,
} from './auth-store'
import { MockBusinessError } from './business-error'
import { apiFailure } from './catalog-handlers'

function failure(error: unknown) {
  return error instanceof MockBusinessError
    ? apiFailure(error.status, error.code, error.message)
    : apiFailure(500, 'PROFILE_ERROR', 'Perfil indisponível.')
}
async function readBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown
  } catch {
    throw new MockBusinessError('Corpo JSON inválido.', 400, 'INVALID_JSON')
  }
}

export const profileHandlers = [
  http.get('/api/profile', ({ request }) => {
    try {
      return HttpResponse.json(readProfile(requireUser(request).id))
    } catch (error) {
      return failure(error)
    }
  }),
  http.patch('/api/profile', async ({ request }) => {
    try {
      const ownerId = requireUser(request).id
      const input = profileInputSchema.safeParse(await readBody(request))
      if (!input.success)
        return apiFailure(422, 'INVALID_PROFILE', 'Confira os dados do perfil.')
      return HttpResponse.json(updateProfile(ownerId, input.data))
    } catch (error) {
      return failure(error)
    }
  }),
  http.post('/api/profile/password', async ({ request }) => {
    try {
      const ownerId = requireUser(request).id
      const input = passwordInputSchema.safeParse(await readBody(request))
      if (!input.success)
        return apiFailure(422, 'INVALID_PASSWORD', 'Confira a nova senha.')
      return HttpResponse.json(
        await changePassword(
          ownerId,
          input.data.currentPassword,
          input.data.newPassword,
        ),
      )
    } catch (error) {
      return failure(error)
    }
  }),
]
