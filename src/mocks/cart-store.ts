import { z } from 'zod'
import type { AddCartItem, Cart } from '@/shared/api/contracts'
import { readNft } from './commerce-state'
import { fromWei, toWei } from '@/shared/lib/eth'

const storedCartSchema = z.object({
  version: z.number().int().nonnegative(),
  coupon: z.string().nullable().optional(),
  items: z.array(
    z.object({
      nftId: z.string(),
      editionId: z.string(),
      quantity: z.number().int().positive().max(2000),
    }),
  ),
})
type StoredCart = z.infer<typeof storedCartSchema>
export class MockCartError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
  }
}
function key(id: string, ownerId?: string) {
  return `kurio.mock.cart.v1.${ownerId ? `account.${ownerId}` : id}`
}
function load(id: string, ownerId?: string): StoredCart {
  try {
    const value = localStorage.getItem(key(id, ownerId))
    if (!value) return { version: 0, coupon: null, items: [] }
    const raw: unknown = JSON.parse(value)
    return storedCartSchema.parse(raw)
  } catch {
    throw new MockCartError(
      'Não foi possível ler o carrinho salvo neste navegador.',
      503,
      'CART_STORAGE_ERROR',
    )
  }
}
function present(visitorId: string, state: StoredCart): Cart {
  const items = state.items.map((line) => {
    const nft = readNft(line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    if (!nft || !edition)
      throw new MockCartError(
        'Um item do carrinho não está mais disponível.',
        409,
        'CART_ITEM_UNAVAILABLE',
      )
    return {
      ...line,
      name: nft.name,
      artwork: nft.artwork,
      editionLabel: edition.label,
      unitPriceEth: edition.priceEth,
      lineTotalEth: fromWei(toWei(edition.priceEth) * BigInt(line.quantity)),
      stock: edition.stock,
    }
  })
  return {
    visitorId,
    version: state.version,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalEth: fromWei(
      items.reduce((sum, item) => sum + toWei(item.lineTotalEth), 0n),
    ),
    coupon: state.coupon ?? null,
  }
}
function commit(id: string, state: StoredCart, ownerId?: string): Cart {
  const cart = present(id, state)
  try {
    localStorage.setItem(key(id, ownerId), JSON.stringify(state))
  } catch {
    throw new MockCartError(
      'Não foi possível salvar o carrinho neste navegador.',
      503,
      'CART_STORAGE_ERROR',
    )
  }
  return cart
}
export function readCart(id: string, ownerId?: string): Cart {
  return present(id, load(id, ownerId))
}
export function addCartItem(
  id: string,
  input: AddCartItem,
  ownerId?: string,
): Cart {
  const nft = readNft(input.nftId)
  const edition = nft?.editions.find((e) => e.id === input.editionId)
  if (!nft) throw new MockCartError('NFT não encontrado.', 404, 'NFT_NOT_FOUND')
  if (!edition)
    throw new MockCartError('Edição não encontrada.', 422, 'INVALID_EDITION')
  const state = load(id, ownerId)
  const previous = state.items.find(
    (line) => line.nftId === input.nftId && line.editionId === input.editionId,
  )
  const quantity = (previous?.quantity ?? 0) + input.quantity
  if (quantity > edition.stock)
    throw new MockCartError(
      'Quantidade indisponível para esta edição. Revise seu carrinho.',
      409,
      'INSUFFICIENT_STOCK',
    )
  const items = state.items.filter((line) => line !== previous)
  const next = {
    version: state.version + 1,
    coupon: state.coupon ?? null,
    items: [
      ...items,
      { nftId: input.nftId, editionId: input.editionId, quantity },
    ],
  }
  return commit(id, next, ownerId)
}
export function changeCartQuantity(
  id: string,
  nftId: string,
  editionId: string,
  quantity: number,
  ownerId?: string,
) {
  const state = load(id, ownerId)
  const line = state.items.find(
    (item) => item.nftId === nftId && item.editionId === editionId,
  )
  if (!line)
    throw new MockCartError(
      'Item não encontrado no carrinho.',
      404,
      'CART_LINE_NOT_FOUND',
    )
  const edition = readNft(nftId)?.editions.find((item) => item.id === editionId)
  if (!edition || (quantity > edition.stock && quantity >= line.quantity))
    throw new MockCartError(
      'Estoque insuficiente para esta edição.',
      409,
      'INSUFFICIENT_STOCK',
    )
  return commit(
    id,
    {
      ...state,
      version: state.version + 1,
      items: state.items.map((item) =>
        item === line ? { ...item, quantity } : item,
      ),
    },
    ownerId,
  )
}
export function removeCartItem(
  id: string,
  nftId: string,
  editionId: string,
  ownerId?: string,
) {
  const state = load(id, ownerId)
  const items = state.items.filter(
    (item) => item.nftId !== nftId || item.editionId !== editionId,
  )
  if (items.length === state.items.length)
    throw new MockCartError(
      'Item não encontrado no carrinho.',
      404,
      'CART_LINE_NOT_FOUND',
    )
  return commit(id, { ...state, version: state.version + 1, items }, ownerId)
}
export function setCartCoupon(
  id: string,
  code: string | null,
  ownerId?: string,
) {
  const normalized = code?.trim().toUpperCase() ?? null
  if (normalized && normalized !== 'KURIO10')
    throw new MockCartError(
      normalized === 'EXPIRED' ? 'Cupom expirado.' : 'Cupom inválido.',
      422,
      normalized === 'EXPIRED' ? 'COUPON_EXPIRED' : 'INVALID_COUPON',
    )
  const state = load(id, ownerId)
  return commit(
    id,
    { ...state, version: state.version + 1, coupon: normalized },
    ownerId,
  )
}
export function mergeVisitorCart(id: string, ownerId: string) {
  const guest = load(id)
  if (!guest.items.length && !guest.coupon) return
  const account = load(id, ownerId)
  const items = [...account.items]
  for (const line of guest.items) {
    const existing = items.find(
      (item) => item.nftId === line.nftId && item.editionId === line.editionId,
    )
    const edition = readNft(line.nftId)?.editions.find(
      (item) => item.id === line.editionId,
    )
    if (!edition)
      throw new MockCartError(
        'Um item do visitante não está mais disponível.',
        409,
        'MERGE_ITEM_UNAVAILABLE',
      )
    if (existing) existing.quantity += line.quantity
    else items.push({ ...line })
  }
  commit(
    id,
    {
      version: account.version + 1,
      items,
      coupon: account.coupon ?? guest.coupon ?? null,
    },
    ownerId,
  )
  localStorage.removeItem(key(id))
}
export function subtractPurchased(
  id: string,
  ownerId: string,
  purchased: { nftId: string; editionId: string; quantity: number }[],
) {
  const state = load(id, ownerId)
  const items = state.items
    .map((line) => {
      const bought =
        purchased.find(
          (item) =>
            item.nftId === line.nftId && item.editionId === line.editionId,
        )?.quantity ?? 0
      return { ...line, quantity: line.quantity - bought }
    })
    .filter((line) => line.quantity > 0)
  return commit(id, { ...state, version: state.version + 1, items }, ownerId)
}
