import { z } from 'zod'
import {
  categorySchema,
  collectionSchema,
  networkSchema,
  decimalEth,
} from '@/shared/api/contracts'
import { toWei } from '@/shared/lib/eth'

export const catalogParamsSchema = z
  .object({
    q: z.string().trim().max(80).default(''),
    categories: z.array(categorySchema).max(4).default([]),
    collections: z.array(collectionSchema).max(3).default([]),
    networks: z.array(networkSchema).max(3).default([]),
    min: z.union([decimalEth, z.literal('')]).default(''),
    max: z.union([decimalEth, z.literal('')]).default(''),
    sort: z
      .enum(['recent', 'price-asc', 'price-desc', 'name'])
      .default('recent'),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
  })
  .refine(
    (p) => !p.min || !p.max || toWei(p.min) <= toWei(p.max),
    'Preço mínimo maior que o máximo',
  )
export type CatalogParams = z.infer<typeof catalogParamsSchema>
export type CatalogSearch = Partial<CatalogParams>

function arrayValue(value: unknown) {
  return typeof value === 'string' ? [value] : value
}
export function normalizeCatalogSearch(
  raw: Record<string, unknown>,
): CatalogSearch {
  const fields = catalogParamsSchema.safeParse({
    q: z.string().trim().max(80).catch('').parse(raw.q),
    categories: z
      .array(categorySchema)
      .catch([])
      .parse(arrayValue(raw.categories)),
    collections: z
      .array(collectionSchema)
      .catch([])
      .parse(arrayValue(raw.collections)),
    networks: z.array(networkSchema).catch([]).parse(arrayValue(raw.networks)),
    min: z
      .union([decimalEth, z.literal('')])
      .catch('')
      .parse(raw.min),
    max: z
      .union([decimalEth, z.literal('')])
      .catch('')
      .parse(raw.max),
    sort: z
      .enum(['recent', 'price-asc', 'price-desc', 'name'])
      .catch('recent')
      .parse(raw.sort),
    page: z.coerce.number().int().min(1).max(10_000).catch(1).parse(raw.page),
  })
  const p = fields.success ? fields.data : catalogParamsSchema.parse({})
  return {
    ...(p.q ? { q: p.q } : {}),
    ...(p.categories.length
      ? { categories: [...new Set(p.categories)].sort() }
      : {}),
    ...(p.collections.length
      ? { collections: [...new Set(p.collections)].sort() }
      : {}),
    ...(p.networks.length ? { networks: [...new Set(p.networks)].sort() } : {}),
    ...(p.min ? { min: p.min } : {}),
    ...(p.max ? { max: p.max } : {}),
    ...(p.sort !== 'recent' ? { sort: p.sort } : {}),
    ...(p.page > 1 ? { page: p.page } : {}),
  }
}

export function catalogQueryString(params: CatalogParams): string {
  const search = new URLSearchParams({ q: params.q })
  for (const key of ['categories', 'collections', 'networks'] as const)
    for (const value of params[key]) search.append(key, value)
  if (params.min) search.set('min', params.min)
  if (params.max) search.set('max', params.max)
  search.set('sort', params.sort)
  search.set('page', String(params.page))
  return search.toString()
}

export function validateCatalogSearch(
  raw: Record<string, unknown>,
): CatalogSearch {
  // Supply defaults too, so invalid raw params cannot survive Router's search merge.
  return catalogParamsSchema.parse(normalizeCatalogSearch(raw))
}
