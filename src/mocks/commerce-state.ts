import { z } from 'zod'
import type { NftDetail } from '@/shared/api/contracts'
import { decimalEth } from '@/shared/api/contracts'
import { fromWei, toWei } from '@/shared/lib/eth'
import { nftCatalog } from './fixtures'
import { MockBusinessError } from './business-error'

const changeSchema = z
  .object({
    priceEth: decimalEth.optional(),
    editionId: z.string().optional(),
    stock: z.number().int().min(0).max(1000).optional(),
  })
  .strict()
const stateSchema = z.object({
  version: z.number().int().positive(),
  overrides: z.record(
    z.string(),
    z.object({
      priceEth: decimalEth.optional(),
      stock: z.record(z.string(), z.number().int().nonnegative()).default({}),
      version: z.number().int().positive(),
    }),
  ),
})
type State = z.infer<typeof stateSchema>
const key = 'kurio.mock.commerce.v1'
function read(): State {
  try {
    const raw = localStorage.getItem(key)
    return raw
      ? stateSchema.parse(JSON.parse(raw) as unknown)
      : { version: 1, overrides: {} }
  } catch {
    throw new MockBusinessError(
      'Dados comerciais indisponíveis.',
      503,
      'COMMERCE_STORAGE_ERROR',
    )
  }
}
function save(state: State) {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    throw new MockBusinessError(
      'Não foi possível atualizar o mercado.',
      503,
      'COMMERCE_STORAGE_ERROR',
    )
  }
}
export function commercialVersion() {
  return read().version
}
export function readNft(id: string): NftDetail | undefined {
  const base = nftCatalog.find((item) => item.id === id)
  if (!base) return undefined
  const override = read().overrides[id]
  if (!override) return base
  const priceEth = override.priceEth ?? base.priceEth
  const editions = base.editions.map((edition) => ({
    ...edition,
    stock: override.stock[edition.id] ?? edition.stock,
    priceEth: override.priceEth
      ? edition.id === 'ten'
        ? fromWei(toWei(priceEth) + toWei('0.2'))
        : priceEth
      : edition.priceEth,
  }))
  return { ...base, priceEth, version: override.version, editions }
}
export function allNfts(): NftDetail[] {
  return nftCatalog.map((item) => readNft(item.id) ?? item)
}
export function changeNft(id: string, raw: unknown): NftDetail {
  const input = changeSchema.safeParse(raw)
  if (
    !input.success ||
    (input.data.priceEth === undefined && input.data.stock === undefined)
  )
    throw new MockBusinessError(
      'Informe preço ou estoque válido.',
      422,
      'INVALID_NFT_CHANGE',
    )
  const base = nftCatalog.find((item) => item.id === id)
  if (!base)
    throw new MockBusinessError('NFT não encontrado.', 404, 'NFT_NOT_FOUND')
  if (
    input.data.stock !== undefined &&
    !base.editions.some((item) => item.id === input.data.editionId)
  )
    throw new MockBusinessError(
      'Edição não encontrada.',
      422,
      'INVALID_EDITION',
    )
  const state = read(),
    previous = state.overrides[id]
  const version = (previous?.version ?? base.version) + 1
  state.overrides[id] = {
    priceEth: input.data.priceEth ?? previous?.priceEth,
    stock: {
      ...previous?.stock,
      ...(input.data.stock !== undefined && input.data.editionId
        ? { [input.data.editionId]: input.data.stock }
        : {}),
    },
    version,
  }
  state.version += 1
  save(state)
  return readNft(id) ?? base
}
