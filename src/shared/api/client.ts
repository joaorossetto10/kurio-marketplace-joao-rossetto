import axios, { type AxiosRequestConfig } from 'axios'
import { z } from 'zod'
import { errorResponseSchema } from './contracts'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | undefined = undefined,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const http = axios.create({ baseURL: '/api', timeout: 8000 })

export async function getValidated<T>(
  url: string,
  schema: z.ZodType<T>,
  config: AxiosRequestConfig = {},
): Promise<T> {
  return requestValidated({ ...config, url, method: 'GET' }, schema)
}

export async function requestValidated<T>(
  config: AxiosRequestConfig,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await http.request<unknown>(config)
    if (String(response.headers['content-type']).startsWith('text/html')) {
      throw new ApiError(
        'A API da demonstração não respondeu. Recarregue a página para reconectar.',
        'API_NOT_INTERCEPTED',
        response.status,
      )
    }
    const parsed = schema.safeParse(response.data)
    if (!parsed.success) {
      throw new ApiError(
        'A resposta recebida não tem o formato esperado.',
        'INVALID_RESPONSE',
        response.status,
      )
    }
    return parsed.data
  } catch (error: unknown) {
    if (axios.isCancel(error) || error instanceof ApiError) throw error
    if (axios.isAxiosError<unknown>(error)) {
      const parsed = errorResponseSchema.safeParse(error.response?.data)
      throw new ApiError(
        parsed.success
          ? parsed.data.error.message
          : 'Não foi possível carregar os dados. Tente novamente.',
        parsed.success
          ? parsed.data.error.code
          : error.code === 'ECONNABORTED'
            ? 'TIMEOUT'
            : 'NETWORK_ERROR',
        error.response?.status,
      )
    }
    throw new ApiError(
      'Ocorreu uma falha inesperada ao carregar os dados.',
      'UNKNOWN_ERROR',
    )
  }
}
