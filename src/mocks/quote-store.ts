import { z } from 'zod'
import {
  quoteSchema,
  type CartSummary,
  type Quote,
} from '@/shared/api/contracts'
import { fromWei, toWei } from '@/shared/lib/eth'
import { readCart } from './cart-store'
import { commercialVersion } from './commerce-state'
import { readConnection, readWallets } from './wallet-store'
import { MockBusinessError } from './business-error'
import { readScenario } from './scenarios'

const key = (ownerId: string) => `kurio.mock.quotes.v1.${ownerId}`
function readAll(ownerId: string): Quote[] {
  try {
    const raw = localStorage.getItem(key(ownerId))
    return raw ? z.array(quoteSchema).parse(JSON.parse(raw) as unknown) : []
  } catch {
    throw new MockBusinessError(
      'Cotações indisponíveis.',
      503,
      'QUOTE_STORAGE_ERROR',
    )
  }
}
function save(ownerId: string, quotes: Quote[]) {
  try {
    localStorage.setItem(key(ownerId), JSON.stringify(quotes))
  } catch {
    throw new MockBusinessError(
      'Não foi possível salvar a cotação.',
      503,
      'QUOTE_STORAGE_ERROR',
    )
  }
}
export function cartSummary(visitorId: string, ownerId?: string): CartSummary {
  const cart = readCart(visitorId, ownerId)
  const subtotal = toWei(cart.subtotalEth)
  const discount = cart.coupon === 'KURIO10' ? subtotal / 10n : 0n
  const fee = cart.items.length ? toWei('0.016') : 0n
  return {
    cartVersion: cart.version,
    commercialVersion: commercialVersion(),
    coupon: cart.coupon,
    subtotalEth: fromWei(subtotal),
    discountEth: fromWei(discount),
    feeEth: fromWei(fee),
    totalEth: fromWei(subtotal - discount + fee),
  }
}
export function createQuote(
  ownerId: string,
  visitorId: string,
  input: {
    walletId: string
    network: Quote['network']
    provider: Quote['provider']
  },
): Quote {
  const wallet = readWallets(ownerId).find((item) => item.id === input.walletId)
  const connection = readConnection(ownerId)
  if (!wallet || wallet.ownerId !== ownerId || wallet.network !== input.network)
    throw new MockBusinessError(
      'Carteira ou rede inválida.',
      422,
      'INVALID_WALLET',
    )
  if (
    !connection?.connected ||
    connection.walletId !== input.walletId ||
    connection.network !== input.network ||
    connection.provider !== input.provider
  )
    throw new MockBusinessError(
      'Conecte a carteira selecionada antes de cotar.',
      409,
      'WALLET_NOT_CONNECTED',
    )
  const cart = readCart(visitorId, ownerId)
  if (!cart.items.length)
    throw new MockBusinessError('Carrinho vazio.', 409, 'EMPTY_CART')
  if (cart.items.some((item) => item.quantity > item.stock))
    throw new MockBusinessError(
      'Estoque alterado. Revise o carrinho.',
      409,
      'INSUFFICIENT_STOCK',
    )
  const summary = cartSummary(visitorId, ownerId)
  const quote: Quote = {
    id: crypto.randomUUID(),
    ownerId,
    expiresAt:
      Date.now() + (readScenario() === 'quote-expired' ? 300 : 5 * 60_000),
    cartVersion: cart.version,
    commercialVersion: summary.commercialVersion,
    items: cart.items,
    coupon: cart.coupon,
    subtotalEth: summary.subtotalEth,
    discountEth: summary.discountEth,
    feeEth: summary.feeEth,
    totalEth: summary.totalEth,
    walletId: wallet.id,
    network: wallet.network,
    provider: input.provider,
  }
  save(ownerId, [...readAll(ownerId), quote])
  return quote
}
export function readQuote(ownerId: string, id: string): Quote {
  const quote = readAll(ownerId).find((item) => item.id === id)
  if (!quote)
    throw new MockBusinessError(
      'Cotação não encontrada.',
      404,
      'QUOTE_NOT_FOUND',
    )
  return quote
}
export function validateQuote(
  ownerId: string,
  visitorId: string,
  quote: Quote,
) {
  if (quote.ownerId !== ownerId)
    throw new MockBusinessError('Cotação não autorizada.', 403, 'FORBIDDEN')
  if (quote.expiresAt <= Date.now())
    throw new MockBusinessError(
      'Cotação expirada. Revise novamente.',
      409,
      'QUOTE_EXPIRED',
    )
  const cart = readCart(visitorId, ownerId)
  const summary = cartSummary(visitorId, ownerId)
  if (
    cart.version !== quote.cartVersion ||
    summary.commercialVersion !== quote.commercialVersion ||
    summary.totalEth !== quote.totalEth ||
    cart.items.some((item) => item.quantity > item.stock)
  )
    throw new MockBusinessError(
      'Preço, estoque ou carrinho mudou. Gere uma nova cotação.',
      409,
      'QUOTE_STALE',
    )
  const connection = readConnection(ownerId)
  if (
    !connection?.connected ||
    connection.walletId !== quote.walletId ||
    connection.network !== quote.network ||
    connection.provider !== quote.provider
  )
    throw new MockBusinessError(
      'Conexão da carteira mudou.',
      409,
      'WALLET_DISCONNECTED',
    )
}
