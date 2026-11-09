import { z } from 'zod'
import {
  createOrderSchema,
  orderSchema,
  type Order,
} from '@/shared/api/contracts'
import { MockBusinessError } from './business-error'
import { readQuote, validateQuote } from './quote-store'
import { subtractPurchased } from './cart-store'
import { readScenario } from './scenarios'
import { publishBusiness } from './business-events'

const entrySchema = z.object({
  key: z.uuid(),
  fingerprint: z.string(),
  order: orderSchema,
})
type Entry = z.infer<typeof entrySchema>
const storageKey = 'kurio.mock.orders.v1'
function readAll(): Entry[] {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? z.array(entrySchema).parse(JSON.parse(raw) as unknown) : []
  } catch {
    throw new MockBusinessError(
      'Pedidos indisponíveis.',
      503,
      'ORDER_STORAGE_ERROR',
    )
  }
}
function save(entries: Entry[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries))
  } catch {
    throw new MockBusinessError(
      'Não foi possível salvar o pedido.',
      503,
      'ORDER_STORAGE_ERROR',
    )
  }
}
function settle(entry: Entry, entries: Entry[]): Order {
  const order = entry.order
  if (
    order.status !== 'pending' ||
    Date.now() - order.createdAt < 1800 ||
    readScenario() === 'order-pending'
  )
    return order
  const status = readScenario() === 'order-declined' ? 'declined' : 'confirmed'
  if (status === 'confirmed')
    subtractPurchased(
      order.visitorId,
      order.ownerId,
      order.quote.items.map(({ nftId, editionId, quantity }) => ({
        nftId,
        editionId,
        quantity,
      })),
    )
  entry.order = {
    ...order,
    status,
    version: order.version + 1,
    transactionRef:
      status === 'confirmed'
        ? `0x${order.id.replaceAll('-', '').toUpperCase()}`
        : null,
  }
  save(entries)
  publishBusiness({
    type: 'order.updated',
    resourceId: order.id,
    version: entry.order.version,
    ownerId: order.ownerId,
  })
  return entry.order
}
export function createOrder(
  ownerId: string,
  visitorId: string,
  key: string,
  raw: unknown,
): { order: Order; replay: boolean } {
  const body = createOrderSchema.safeParse(raw)
  if (!body.success)
    throw new MockBusinessError(
      'Revise os dados do comprador e da cotação.',
      422,
      'INVALID_ORDER',
    )
  const fingerprint = JSON.stringify(body.data)
  const entries = readAll(),
    existing = entries.find((item) => item.key === key)
  if (existing) {
    if (existing.order.ownerId !== ownerId)
      throw new MockBusinessError(
        'Tentativa de outro usuário.',
        403,
        'IDEMPOTENCY_FORBIDDEN',
      )
    if (existing.fingerprint !== fingerprint)
      throw new MockBusinessError(
        'Chave já usada com outro conteúdo.',
        409,
        'IDEMPOTENCY_CONFLICT',
      )
    return { order: settle(existing, entries), replay: true }
  }
  const pending = entries.filter(
    ({ order }) => order.ownerId === ownerId && order.status === 'pending',
  )
  for (const entry of pending) {
    if (settle(entry, entries).status === 'pending')
      throw new MockBusinessError(
        'Há um pedido em processamento. Consulte o pedido antes de comprar novamente.',
        409,
        'ORDER_PENDING',
      )
  }
  const quote = readQuote(ownerId, body.data.quoteId)
  if (
    quote.walletId !== body.data.walletId ||
    quote.network !== body.data.network ||
    quote.provider !== body.data.provider
  )
    throw new MockBusinessError(
      'A carteira mudou. Revise a cotação.',
      409,
      'QUOTE_STALE',
    )
  validateQuote(ownerId, visitorId, quote)
  const order: Order = {
    id: crypto.randomUUID(),
    ownerId,
    visitorId,
    status: 'pending',
    version: 1,
    createdAt: Date.now(),
    transactionRef: null,
    quote,
    buyer: body.data.buyer,
  }
  save([...entries, { key, fingerprint, order }])
  return { order, replay: false }
}
export function readOrder(ownerId: string, id: string): Order {
  const entries = readAll()
  const entry = entries.find((item) => item.order.id === id)
  if (!entry || entry.order.ownerId !== ownerId)
    throw new MockBusinessError(
      'Pedido não encontrado.',
      404,
      'ORDER_NOT_FOUND',
    )
  return settle(entry, entries)
}
export function listOrders(ownerId: string) {
  const entries = readAll()
  return entries
    .filter((item) => item.order.ownerId === ownerId)
    .map((item) => settle(item, entries))
}
