import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/client'
import { authToken, logoutRequest, saveAuthToken, sessionOptions } from './api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const [token, setToken] = useState(authToken)
  const session = useQuery(sessionOptions(token))
  const replaceToken = useCallback(
    async (next: string | null) => {
      saveAuthToken(next)
      await client.cancelQueries()
      client.clear()
      setToken(next)
    },
    [client],
  )
  useEffect(() => {
    if (!(session.error instanceof ApiError) || session.error.status !== 401)
      return
    const timer = window.setTimeout(() => {
      void replaceToken(null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [session.error, replaceToken])
  useEffect(() => {
    if (!session.data) return
    const remaining = session.data.expiresAt - Date.now()
    const timer = window.setTimeout(
      () => {
        void replaceToken(null)
      },
      Math.max(0, remaining),
    )
    return () => window.clearTimeout(timer)
  }, [session.data, replaceToken])
  return (
    <AuthContext.Provider
      value={{
        token,
        user: token ? (session.data?.user ?? null) : null,
        loading: Boolean(token) && session.isPending,
        signIn: async (result) => {
          await replaceToken(result.token)
          client.setQueryData(sessionOptions(result.token).queryKey, {
            user: result.user,
            expiresAt: result.expiresAt,
          })
        },
        signOut: async () => {
          try {
            if (token) await logoutRequest()
          } finally {
            await replaceToken(null)
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
