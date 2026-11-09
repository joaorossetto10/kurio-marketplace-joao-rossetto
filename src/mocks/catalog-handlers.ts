import { delay, http, HttpResponse } from 'msw'
import { catalogParamsSchema } from '@/features/catalog/search'
import { toWei } from '@/shared/lib/eth'
import { categories, collections, networks, toPreview } from './fixtures'
import { readScenario } from './scenarios'
import { allNfts, readNft } from './commerce-state'

const attempts = new Map<string, number>()
export function resetCatalogAttempts() {
  attempts.clear()
}
export const apiFailure = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status })
export async function simulatedFailure(key: string, query = '') {
  const scenario = readScenario()
  await delay(scenario === 'slow' ? 2000 : query === 'Emerald' ? 600 : 120)
  const count = (attempts.get(key) ?? 0) + 1
  attempts.set(key, count)
  if (scenario === 'error' || (scenario === 'retry' && count <= 2))
    return apiFailure(
      503,
      'SERVICE_UNAVAILABLE',
      'O mercado está temporariamente indisponível.',
    )
  if (scenario === 'offline') return HttpResponse.error()
  if (scenario === 'invalid') return HttpResponse.json({ invalid: true })
  return undefined
}
export const catalogHandlers = [
  http.get('/api/nfts', async ({ request }) => {
    const url = new URL(request.url)
    const failure = await simulatedFailure(
      url.pathname + url.search,
      url.searchParams.get('q') ?? '',
    )
    if (failure) return failure
    const input = catalogParamsSchema.safeParse({
      q: url.searchParams.get('q') ?? '',
      categories: url.searchParams.getAll('categories'),
      collections: url.searchParams.getAll('collections'),
      networks: url.searchParams.getAll('networks'),
      min: url.searchParams.get('min') ?? '',
      max: url.searchParams.get('max') ?? '',
      sort: url.searchParams.get('sort') ?? 'recent',
      page: url.searchParams.get('page') ?? 1,
    })
    if (!input.success)
      return apiFailure(
        400,
        'INVALID_FILTERS',
        'Verifique os filtros informados.',
      )
    const p = input.data
    const catalog = allNfts()
    let filtered = catalog.filter(
      (nft) =>
        nft.name
          .toLocaleLowerCase('pt-BR')
          .includes(p.q.toLocaleLowerCase('pt-BR')) &&
        (!p.categories.length || p.categories.includes(nft.category)) &&
        (!p.collections.length || p.collections.includes(nft.collection)) &&
        (!p.networks.length || p.networks.includes(nft.network)) &&
        (!p.min || toWei(nft.priceEth) >= toWei(p.min)) &&
        (!p.max || toWei(nft.priceEth) <= toWei(p.max)),
    )
    if (readScenario() === 'empty') filtered = []
    if (p.sort === 'name')
      filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    if (p.sort === 'price-asc' || p.sort === 'price-desc')
      filtered.sort((a, b) => {
        const left = toWei(a.priceEth),
          right = toWei(b.priceEth)
        const comparison =
          left === right ? a.id.localeCompare(b.id) : left < right ? -1 : 1
        return p.sort === 'price-desc' ? -comparison : comparison
      })
    const total = filtered.length,
      totalPages = Math.max(1, Math.ceil(total / 9)),
      page = Math.min(p.page, totalPages)
    return HttpResponse.json({
      items: filtered.slice((page - 1) * 9, page * 9).map(toPreview),
      total,
      query: p.q,
      page,
      pageSize: 9,
      totalPages,
      facets: {
        categories: categories.map((item) => ({
          ...item,
          count: catalog.filter((n) => n.category === item.id).length,
        })),
        collections: collections.map((item) => ({
          ...item,
          count: catalog.filter((n) => n.collection === item.id).length,
        })),
        networks: networks.map((item) => ({
          ...item,
          count: catalog.filter((n) => n.network === item.id).length,
        })),
      },
    })
  }),
  http.get('/api/nfts/:id', async ({ params, request }) => {
    const failure = await simulatedFailure(new URL(request.url).pathname)
    if (failure) return failure
    const nft = readNft(String(params.id))
    if (!nft) return apiFailure(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json({
      ...nft,
      related: allNfts()
        .filter((n) => n.id !== nft.id && n.collection === nft.collection)
        .slice(0, 5)
        .map(toPreview),
    })
  }),
]
