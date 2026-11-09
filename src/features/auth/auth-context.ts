import { createContext, useContext } from 'react'
import type { AuthResult, Session } from '@/shared/api/contracts'

export type AuthContextValue = {
  token: string | null
  user: Session['user'] | null
  loading: boolean
  signIn: (result: AuthResult) => Promise<void>
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider ausente.')
  return value
}
