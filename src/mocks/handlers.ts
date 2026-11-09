import { delay, http, HttpResponse } from 'msw'
import { readScenario } from './scenarios'

const failure = () =>
  HttpResponse.json(
    {
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'O mercado está temporariamente indisponível.',
      },
    },
    { status: 503 },
  )

export const restHandlers = [
  http.get('/api/health', async () => {
    const scenario = readScenario()
    await delay(scenario === 'slow' ? 2000 : 120)
    if (scenario === 'error') return failure()
    if (scenario === 'offline') return HttpResponse.error()
    if (scenario === 'invalid') return HttpResponse.json({ service: false })
    return HttpResponse.json({
      service: 'kurio-demo',
      revision: 1,
      scenario,
      message: 'Resposta REST recebida do MSW.',
    })
  }),
]
