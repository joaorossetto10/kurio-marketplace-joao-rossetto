import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { getValidated } from '@/shared/api/client'
import { nftListSchema, nftDetailSchema } from '@/shared/api/contracts'
import {
  catalogParamsSchema,
  catalogQueryString,
  type CatalogSearch,
} from './search'

export function catalogOptions(search: CatalogSearch) {
  const params = catalogParamsSchema.parse(search)
  return queryOptions({
    queryKey: ['nfts', 'list', params],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      getValidated(`/nfts?${catalogQueryString(params)}`, nftListSchema, {
        signal,
      }),
  })
}

export function nftDetailOptions(id: string) {
  return queryOptions({
    queryKey: ['nfts', 'detail', id],
    queryFn: ({ signal }) =>
      getValidated(`/nfts/${encodeURIComponent(id)}`, nftDetailSchema, {
        signal,
      }),
  })
}
