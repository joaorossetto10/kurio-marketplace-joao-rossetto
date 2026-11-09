import { http, HttpResponse } from 'msw'
import { connectWalletSchema, walletInputSchema } from '@/shared/api/contracts'
import { requireUser } from './auth-store'
import {
  readWallets,
  readConnection,
  connectWallet,
  disconnectWallet,
  createWallet,
  updateWallet,
  removeWallet,
  makePrimary,
} from './wallet-store'
import { MockBusinessError } from './business-error'
import { apiFailure } from './catalog-handlers'

function respond(request: Request, action: (ownerId: string) => Response) {
  try {
    return action(requireUser(request).id)
  } catch (error) {
    return error instanceof MockBusinessError
      ? apiFailure(error.status, error.code, error.message)
      : apiFailure(500, 'WALLET_ERROR', 'Falha na carteira simulada.')
  }
}
export const walletHandlers = [
  http.get('/api/wallets', ({ request }) =>
    respond(request, (id) => HttpResponse.json(readWallets(id))),
  ),
  http.post('/api/wallets', async ({ request }) => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    return respond(request, (ownerId) => {
      const input = walletInputSchema.safeParse(raw)
      if (!input.success)
        return apiFailure(
          422,
          'INVALID_WALLET',
          'Confira os dados da carteira.',
        )
      return HttpResponse.json(createWallet(ownerId, input.data), {
        status: 201,
      })
    })
  }),
  http.patch('/api/wallets/:id', async ({ request, params }) => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    return respond(request, (ownerId) => {
      const input = walletInputSchema.safeParse(raw)
      if (!input.success)
        return apiFailure(
          422,
          'INVALID_WALLET',
          'Confira os dados da carteira.',
        )
      return HttpResponse.json(
        updateWallet(ownerId, String(params.id), input.data),
      )
    })
  }),
  http.delete('/api/wallets/connection', ({ request }) =>
    respond(request, (id) => HttpResponse.json(disconnectWallet(id))),
  ),
  http.delete('/api/wallets/:id', ({ request, params }) =>
    respond(request, (ownerId) =>
      HttpResponse.json(removeWallet(ownerId, String(params.id))),
    ),
  ),
  http.put('/api/wallets/:id/primary', ({ request, params }) =>
    respond(request, (ownerId) =>
      HttpResponse.json(makePrimary(ownerId, String(params.id))),
    ),
  ),
  http.get('/api/wallets/connection', ({ request }) =>
    respond(request, (id) => HttpResponse.json(readConnection(id))),
  ),
  http.post('/api/wallets/connection', async ({ request }) => {
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return apiFailure(400, 'INVALID_JSON', 'Corpo JSON inválido.')
    }
    const input = connectWalletSchema.safeParse(raw)
    if (!input.success)
      return apiFailure(
        422,
        'INVALID_WALLET',
        'Selecione carteira, rede e provedor.',
      )
    return respond(request, (id) =>
      HttpResponse.json(connectWallet(id, input.data)),
    )
  }),
]
