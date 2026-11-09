import { z } from 'zod'
import type { AuthResult, Session, Profile } from '@/shared/api/contracts'
import { MockBusinessError } from './business-error'
import { readScenario } from './scenarios'
import { disconnectWallet } from './wallet-store'

const userRecord = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  salt: z.string(),
  hash: z.string(),
  username: z.string().optional(),
  ens: z.string().optional(),
  walletNickname: z.string().optional(),
  avatar: z.enum(['emerald', 'sage', 'ivory', 'golden']).nullable().optional(),
})
const sessionRecord = z.object({
  token: z.uuid(),
  userId: z.string(),
  expiresAt: z.number().int(),
})
type UserRecord = z.infer<typeof userRecord>
const usersKey = 'kurio.mock.users.v1'
const sessionsKey = 'kurio.mock.sessions.v1'
const seed: UserRecord[] = [
  {
    id: 'alice',
    name: 'Alice Kurio',
    email: 'alice@kurio.test',
    salt: 'kurio-alice-v1',
    hash: 'f3be066166a5a3a0944bf1be16a5d210c1d1bf74b9ea164185e1d9a6a0b0bafd',
  },
  {
    id: 'bruno',
    name: 'Bruno Kurio',
    email: 'bruno@kurio.test',
    salt: 'kurio-bruno-v1',
    hash: '6b3c5c7b4c908c2c29973d19c581a020b8cd667e0c6e6dbca1010223e447ce51',
  },
]
function readArray<T>(key: string, schema: z.ZodType<T[]>, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? schema.parse(JSON.parse(raw) as unknown) : fallback
  } catch {
    throw new MockBusinessError(
      'Dados da conta indisponíveis.',
      503,
      'AUTH_STORAGE_ERROR',
    )
  }
}
function users() {
  return readArray(usersKey, z.array(userRecord), seed)
}
function sessions() {
  return readArray(sessionsKey, z.array(sessionRecord), [])
}
function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new MockBusinessError(
      'Não foi possível salvar a sessão.',
      503,
      'AUTH_STORAGE_ERROR',
    )
  }
}
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
function publicUser(record: UserRecord) {
  return { id: record.id, name: record.name, email: record.email }
}
function profileOf(record: UserRecord): Profile {
  return {
    id: record.id,
    name: record.name,
    username: record.username ?? record.email.split('@')[0] ?? record.name,
    email: record.email,
    ens: record.ens ?? '',
    walletNickname: record.walletNickname ?? '',
    avatar: record.avatar ?? null,
  }
}
export function readProfile(ownerId: string): Profile {
  const record = users().find((item) => item.id === ownerId)
  if (!record)
    throw new MockBusinessError(
      'Perfil não encontrado.',
      404,
      'PROFILE_NOT_FOUND',
    )
  return profileOf(record)
}
export function updateProfile(
  ownerId: string,
  input: Omit<Profile, 'id'>,
): Profile {
  const current = users()
  const record = current.find((item) => item.id === ownerId)
  if (!record)
    throw new MockBusinessError(
      'Perfil não encontrado.',
      404,
      'PROFILE_NOT_FOUND',
    )
  const email = input.email.toLowerCase()
  if (current.some((item) => item.id !== ownerId && item.email === email))
    throw new MockBusinessError(
      'Este e-mail já está cadastrado.',
      409,
      'EMAIL_EXISTS',
    )
  const updated: UserRecord = {
    ...record,
    name: input.name,
    username: input.username,
    email,
    ens: input.ens,
    walletNickname: input.walletNickname,
    avatar: input.avatar,
  }
  save(
    usersKey,
    current.map((item) => (item.id === ownerId ? updated : item)),
  )
  return profileOf(updated)
}
export async function changePassword(
  ownerId: string,
  currentPassword: string,
  newPassword: string,
) {
  const current = users()
  const record = current.find((item) => item.id === ownerId)
  if (!record)
    throw new MockBusinessError(
      'Perfil não encontrado.',
      404,
      'PROFILE_NOT_FOUND',
    )
  if ((await passwordHash(currentPassword, record.salt)) !== record.hash)
    throw new MockBusinessError('Senha atual incorreta.', 403, 'WRONG_PASSWORD')
  const salt = crypto.randomUUID()
  const hash = await passwordHash(newPassword, salt)
  save(
    usersKey,
    current.map((item) =>
      item.id === ownerId ? { ...item, salt, hash } : item,
    ),
  )
  return { changed: true as const }
}
function issue(record: UserRecord): AuthResult {
  const token = crypto.randomUUID()
  const expiresAt = Date.now() + 15 * 60_000
  save(sessionsKey, [
    ...sessions().filter((item) => item.expiresAt > Date.now()),
    { token, userId: record.id, expiresAt },
  ])
  return { token, user: publicUser(record), expiresAt }
}
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const record = users().find((item) => item.email === email.toLowerCase())
  if (!record || (await passwordHash(password, record.salt)) !== record.hash)
    throw new MockBusinessError(
      'E-mail ou senha inválidos.',
      401,
      'INVALID_CREDENTIALS',
    )
  return issue(record)
}
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const current = users()
  if (current.some((item) => item.email === email.toLowerCase()))
    throw new MockBusinessError(
      'Este e-mail já está cadastrado.',
      409,
      'EMAIL_EXISTS',
    )
  const salt = crypto.randomUUID()
  const record: UserRecord = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    salt,
    hash: await passwordHash(password, salt),
  }
  save(usersKey, [...current, record])
  return issue(record)
}
export function sessionForToken(token: string | null): Session | null {
  if (!token) return null
  const item = sessions().find((session) => session.token === token)
  if (!item) return null
  if (item.expiresAt <= Date.now() || readScenario() === 'session-expired') {
    disconnectWallet(item.userId)
    return null
  }
  const user = users().find((record) => record.id === item.userId)
  return user ? { user: publicUser(user), expiresAt: item.expiresAt } : null
}
export function requireUser(request: Request): Session['user'] {
  const token =
    request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null
  const session = sessionForToken(token)
  if (!session)
    throw new MockBusinessError(
      'Sessão expirada. Entre novamente.',
      401,
      'SESSION_EXPIRED',
    )
  return session.user
}
export function logout(token: string | null) {
  if (token)
    save(
      sessionsKey,
      sessions().filter((item) => item.token !== token),
    )
}
