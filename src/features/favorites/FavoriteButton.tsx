import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/auth-context'
import {
  favoritesSchema,
  type Favorites,
  type NftPreview,
} from '@/shared/api/contracts'
import {
  favoritesOptions,
  addFavoriteRequest,
  removeFavoriteRequest,
} from './api'

export function FavoriteButton({
  nft,
  className = '',
}: {
  nft: NftPreview
  className?: string
}) {
  const { user } = useAuth()
  const ownerId = user?.id ?? ''
  const client = useQueryClient()
  const favorites = useQuery(favoritesOptions(ownerId))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const busy = useRef(false)
  const key = favoritesOptions(ownerId).queryKey
  const active =
    favorites.data?.items.some((item) => item.id === nft.id) ?? false
  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      next ? addFavoriteRequest(nft.id) : removeFavoriteRequest(nft.id),
    onMutate: async (next) => {
      setError('')
      setNotice('')
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Favorites>(key)
      if (previous) {
        client.setQueryData(key, {
          version: previous.version + 1,
          items: next
            ? [...previous.items.filter((item) => item.id !== nft.id), nft]
            : previous.items.filter((item) => item.id !== nft.id),
        } satisfies Favorites)
      }
      return previous
    },
    onError: (cause, _next, previous) => {
      if (previous) client.setQueryData(key, favoritesSchema.parse(previous))
      setError(cause.message)
    },
    onSuccess: (updated, next) => {
      client.setQueryData(key, updated)
      setNotice(
        next
          ? `${nft.name} adicionado aos favoritos.`
          : `${nft.name} removido dos favoritos.`,
      )
    },
    onSettled: () => {
      busy.current = false
      void client.invalidateQueries({ queryKey: key })
    },
  })
  const label = active
    ? `Remover ${nft.name} dos favoritos`
    : `Favoritar ${nft.name}`
  if (!user)
    return (
      <span className={className}>
        <Link
          to="/entrar"
          aria-label={`Entre para favoritar ${nft.name}`}
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-accent-foreground"
        >
          <Heart />
        </Link>
      </span>
    )
  return (
    <span className={className}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={favorites.isPending || mutation.isPending}
        onClick={() => {
          if (busy.current) return
          busy.current = true
          mutation.mutate(!active)
        }}
        className={`grid size-10 place-items-center rounded-full border border-border text-accent-foreground disabled:opacity-60 ${active ? 'bg-primary ring-2 ring-accent-foreground' : 'bg-card'}`}
      >
        <Heart />
      </button>
      {error && (
        <span
          role="alert"
          className="max-w-28 rounded bg-card p-1 text-xs text-destructive"
        >
          {error}
        </span>
      )}
      {notice && (
        <span role="status" className="sr-only">
          {notice}
        </span>
      )}
    </span>
  )
}

function Heart() {
  return (
    <span
      aria-hidden="true"
      className="block size-5 bg-contain bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/assets/heart.svg')" }}
    />
  )
}
