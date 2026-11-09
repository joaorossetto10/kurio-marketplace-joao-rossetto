import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        count < 1 &&
        error instanceof ApiError &&
        error.code !== 'INVALID_RESPONSE' &&
        (error.status === undefined || error.status >= 500),
      retryDelay: 300,
    },
    mutations: { retry: false },
  },
})
