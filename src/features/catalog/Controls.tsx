import { useState } from 'react'
import type { NftList } from '@/shared/api/contracts'
import { decimalEth } from '@/shared/api/contracts'
import { toWei } from '@/shared/lib/eth'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Icon } from '@/shared/ui/icon'
import { Skeleton } from '@/shared/ui/skeleton'
import { catalogParamsSchema } from './search'
import { useCatalogControls } from './use-catalog-controls'

export function MarketSearch({ compact = false }: { compact?: boolean }) {
  const { params, update } = useCatalogControls()
  return (
    <form
      key={params.q}
      role="search"
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const term = new FormData(event.currentTarget).get('q')
        update({ q: typeof term === 'string' ? term.trim().slice(0, 80) : '' })
      }}
    >
      <Label
        htmlFor={compact ? 'mobile-search' : 'catalog-search'}
        className="sr-only"
      >
        Buscar NFTs
      </Label>
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <Icon name="search" />
        </span>
        <Input
          id={compact ? 'mobile-search' : 'catalog-search'}
          name="q"
          type="search"
          maxLength={80}
          defaultValue={params.q}
          placeholder="Explorar coleções"
          className="h-[45px] border-0 bg-card pl-11 text-sm placeholder:text-text-subtle"
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className={compact ? 'sr-only focus:not-sr-only' : ''}
      >
        Buscar
      </Button>
    </form>
  )
}

export function MarketFilters({
  facets,
  idPrefix,
}: {
  facets: NftList['facets'] | undefined
  idPrefix: string
}) {
  const { params, update } = useCatalogControls()
  const [priceError, setPriceError] = useState('')
  if (!facets)
    return (
      <div
        role="status"
        aria-label="Carregando filtros"
        className="space-y-5 p-5"
      >
        <Skeleton className="h-8" />
        <Skeleton className="h-48" />
      </div>
    )
  const groups = [
    { key: 'categories', title: 'Categorias', options: facets.categories },
    { key: 'collections', title: 'Coleções', options: facets.collections },
    { key: 'networks', title: 'Rede', options: facets.networks },
  ] as const
  return (
    <div className="space-y-7 bg-card p-5 text-sm">
      {groups.map((group) => (
        <fieldset key={group.key}>
          <legend className="mb-3 text-lg font-bold">{group.title}</legend>
          {group.options.map((option) => {
            const selected: string[] = params[group.key]
            return (
              <label
                key={option.id}
                className="flex min-h-10 items-center justify-between gap-3 text-muted-foreground"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    className="size-4 accent-primary"
                    onChange={() =>
                      update(
                        catalogParamsSchema.parse({
                          ...params,
                          [group.key]: selected.includes(option.id)
                            ? selected.filter((id) => id !== option.id)
                            : [...selected, option.id],
                        }),
                      )
                    }
                  />
                  {option.label}
                </span>
                <span
                  aria-label={`${String(option.count)} NFTs no catálogo`}
                  className="text-xs"
                >
                  ({option.count})
                </span>
              </label>
            )
          })}
        </fieldset>
      ))}
      <form
        key={`${params.min}-${params.max}`}
        onSubmit={(event) => {
          event.preventDefault()
          const values = new FormData(event.currentTarget)
          const minRaw = values.get('min'),
            maxRaw = values.get('max')
          const min = typeof minRaw === 'string' ? minRaw.trim() : '',
            max = typeof maxRaw === 'string' ? maxRaw.trim() : ''
          if (
            (min && !decimalEth.safeParse(min).success) ||
            (max && !decimalEth.safeParse(max).success) ||
            (min && max && toWei(min) > toWei(max))
          ) {
            setPriceError(
              'Informe uma faixa ETH válida, do menor para o maior valor.',
            )
            return
          }
          setPriceError('')
          update({ min, max })
        }}
      >
        <h3 className="mb-3 text-lg font-bold">Faixa de preço</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${idPrefix}-min`}>Mínimo ETH</Label>
            <Input
              id={`${idPrefix}-min`}
              name="min"
              inputMode="decimal"
              maxLength={40}
              defaultValue={params.min}
              aria-describedby={`${idPrefix}-price-error`}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-max`}>Máximo ETH</Label>
            <Input
              id={`${idPrefix}-max`}
              name="max"
              inputMode="decimal"
              maxLength={40}
              defaultValue={params.max}
              aria-describedby={`${idPrefix}-price-error`}
              className="mt-2"
            />
          </div>
        </div>
        <p
          id={`${idPrefix}-price-error`}
          role={priceError ? 'alert' : undefined}
          className="mt-2 text-xs leading-5 text-destructive"
        >
          {priceError}
        </p>
        <Button type="submit" size="sm" className="mt-3">
          Aplicar preço
        </Button>
      </form>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setPriceError('')
          update({
            categories: [],
            collections: [],
            networks: [],
            min: '',
            max: '',
          })
        }}
      >
        Limpar filtros
      </Button>
      <p className="text-xs leading-5 text-text-subtle">
        Contagens totais do catálogo. Combine os filtros para refinar os
        resultados.
      </p>
    </div>
  )
}

export function SortControl() {
  const { params, update } = useCatalogControls()
  return (
    <div className="flex items-center gap-2 text-xs">
      <Label htmlFor="catalog-sort" className="text-xs">
        Ordenar por
      </Label>
      <select
        id="catalog-sort"
        value={params.sort}
        className="min-h-10 max-w-full rounded-md border border-input bg-background px-2"
        onChange={(event) =>
          update({
            sort: catalogParamsSchema.parse({
              ...params,
              sort: event.target.value,
            }).sort,
          })
        }
      >
        <option value="recent">Listados recentemente</option>
        <option value="price-asc">Menor preço</option>
        <option value="price-desc">Maior preço</option>
        <option value="name">Nome A–Z</option>
      </select>
    </div>
  )
}
