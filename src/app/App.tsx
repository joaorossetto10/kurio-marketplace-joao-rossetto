import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './query-client'
import { router } from './router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { BusinessRealtime } from '@/features/realtime/BusinessRealtime'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BusinessRealtime />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
