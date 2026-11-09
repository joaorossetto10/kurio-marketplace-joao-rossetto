import { z } from 'zod'
import type {
  Wallet,
  WalletConnection,
  WalletInput,
} from '@/shared/api/contracts'
import { walletConnectionSchema, walletsSchema } from '@/shared/api/contracts'
import { MockBusinessError } from './business-error'
import { readScenario } from './scenarios'

const key = (ownerId: string) => `kurio.mock.wallets.v1.${ownerId}`
const connectionKey = (ownerId: string) =>
  `kurio.mock.wallet-connection.v1.${ownerId}`
function defaults(ownerId: string): Wallet[] {
  return [
    {
      id: `${ownerId}-primary`,
      ownerId,
      label: 'Principal',
      address: '0xA91F00000000000000000000000000000000E82C',
      network: 'ethereum',
      nickname: 'Principal',
      profileName: ownerId,
      type: 'metamask',
      email: `${ownerId}@kurio.test`,
      ens: `${ownerId}.eth`,
      referralCode: 'KURIO',
      secondaryAddress: '',
      isPrimary: true,
    },
    {
      id: `${ownerId}-reserve`,
      ownerId,
      label: 'Reserva',
      address: `${ownerId}.kurio.eth`,
      network: 'polygon',
      nickname: 'Reserva',
      profileName: ownerId,
      type: 'coinbase',
      email: `${ownerId}@kurio.test`,
      ens: `${ownerId}.kurio.eth`,
      referralCode: 'KURIO',
      secondaryAddress: '',
      isPrimary: false,
    },
  ]
}
export function readWallets(ownerId: string): Wallet[] {
  try {
    const raw = localStorage.getItem(key(ownerId))
    return raw
      ? walletsSchema.parse(JSON.parse(raw) as unknown)
      : defaults(ownerId)
  } catch {
    throw new MockBusinessError(
      'Carteiras indisponíveis.',
      503,
      'WALLET_STORAGE_ERROR',
    )
  }
}
function saveWallets(ownerId: string, wallets: Wallet[]) {
  try {
    localStorage.setItem(key(ownerId), JSON.stringify(wallets))
  } catch {
    throw new MockBusinessError(
      'Carteiras indisponíveis.',
      503,
      'WALLET_STORAGE_ERROR',
    )
  }
}
function assertUniqueAddress(
  wallets: Wallet[],
  address: string,
  exceptId?: string,
) {
  if (
    wallets.some(
      (wallet) =>
        wallet.id !== exceptId &&
        wallet.address.toLowerCase() === address.toLowerCase(),
    )
  )
    throw new MockBusinessError(
      'Endereço já cadastrado nesta conta.',
      409,
      'WALLET_ADDRESS_EXISTS',
    )
}
export function createWallet(ownerId: string, input: WalletInput): Wallet {
  const current = readWallets(ownerId)
  assertUniqueAddress(current, input.address)
  const wallet: Wallet = {
    ...input,
    id: crypto.randomUUID(),
    ownerId,
    isPrimary: current.length === 0,
  }
  saveWallets(ownerId, [...current, wallet])
  return wallet
}
export function updateWallet(
  ownerId: string,
  walletId: string,
  input: WalletInput,
): Wallet {
  const current = readWallets(ownerId)
  const existing = current.find(
    (wallet) => wallet.id === walletId && wallet.ownerId === ownerId,
  )
  if (!existing)
    throw new MockBusinessError(
      'Carteira não encontrada.',
      404,
      'WALLET_NOT_FOUND',
    )
  assertUniqueAddress(current, input.address, walletId)
  const updated = { ...existing, ...input }
  saveWallets(
    ownerId,
    current.map((wallet) => (wallet.id === walletId ? updated : wallet)),
  )
  if (readConnection(ownerId)?.walletId === walletId) disconnectWallet(ownerId)
  return updated
}
export function removeWallet(ownerId: string, walletId: string) {
  const current = readWallets(ownerId)
  const existing = current.find(
    (wallet) => wallet.id === walletId && wallet.ownerId === ownerId,
  )
  if (!existing)
    throw new MockBusinessError(
      'Carteira não encontrada.',
      404,
      'WALLET_NOT_FOUND',
    )
  const remaining = current.filter((wallet) => wallet.id !== walletId)
  if (existing.isPrimary && remaining[0]) remaining[0].isPrimary = true
  saveWallets(ownerId, remaining)
  if (readConnection(ownerId)?.walletId === walletId) disconnectWallet(ownerId)
  return { removed: true as const }
}
export function makePrimary(ownerId: string, walletId: string): Wallet[] {
  const current = readWallets(ownerId)
  if (
    !current.some(
      (wallet) => wallet.id === walletId && wallet.ownerId === ownerId,
    )
  )
    throw new MockBusinessError(
      'Carteira não encontrada.',
      404,
      'WALLET_NOT_FOUND',
    )
  const updated = current.map((wallet) => ({
    ...wallet,
    isPrimary: wallet.id === walletId,
  }))
  saveWallets(ownerId, updated)
  return updated
}
export function readConnection(ownerId: string): WalletConnection | null {
  try {
    const raw = localStorage.getItem(connectionKey(ownerId))
    return raw ? walletConnectionSchema.parse(JSON.parse(raw) as unknown) : null
  } catch {
    throw new MockBusinessError(
      'Conexão indisponível.',
      503,
      'WALLET_STORAGE_ERROR',
    )
  }
}
export function connectWallet(
  ownerId: string,
  input:
    | z.infer<typeof walletConnectionSchema>
    | {
        walletId: string
        network: Wallet['network']
        provider: WalletConnection['provider']
      },
): WalletConnection {
  const wallet = readWallets(ownerId).find((item) => item.id === input.walletId)
  if (!wallet || wallet.ownerId !== ownerId)
    throw new MockBusinessError(
      'Carteira não encontrada.',
      404,
      'WALLET_NOT_FOUND',
    )
  if (wallet.network !== input.network)
    throw new MockBusinessError(
      'A rede não corresponde à carteira.',
      422,
      'WALLET_NETWORK_MISMATCH',
    )
  if (readScenario() === 'wallet-declined')
    throw new MockBusinessError(
      'Conexão recusada pela carteira simulada.',
      409,
      'WALLET_DECLINED',
    )
  const connection: WalletConnection = {
    walletId: wallet.id,
    network: wallet.network,
    provider: input.provider,
    connected: true,
  }
  try {
    localStorage.setItem(connectionKey(ownerId), JSON.stringify(connection))
  } catch {
    throw new MockBusinessError(
      'Conexão indisponível.',
      503,
      'WALLET_STORAGE_ERROR',
    )
  }
  return connection
}
export function disconnectWallet(ownerId: string) {
  localStorage.removeItem(connectionKey(ownerId))
  return { connected: false as const }
}
