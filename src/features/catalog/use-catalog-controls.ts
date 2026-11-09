import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  catalogParamsSchema,
  normalizeCatalogSearch,
  type CatalogParams,
} from './search'

export function useCatalogControls() {
  const search = useSearch({ from: '/' })
  const params = catalogParamsSchema.parse(search)
  const navigate = useNavigate()
  const update = (patch: Partial<CatalogParams>, resetPage = true) => {
    void navigate({
      to: '/',
      search: normalizeCatalogSearch({
        ...params,
        ...patch,
        ...(resetPage ? { page: 1 } : {}),
      }),
      hash: 'catalogo',
    })
  }
  return { search, params, update }
}
