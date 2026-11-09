import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import {
  businessEventSchema,
  nftDetailSchema,
  nftListSchema,
  orderSchema,
} from '@/shared/api/contracts'
import { useAuth } from '@/features/auth/auth-context'

export function BusinessRealtime() {
  const client = useQueryClient()
  const { token, user } = useAuth()
  const ownerId = user?.id ?? null
  const [notice, setNotice] = useState('')
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    let cancelled = false
    let socket: Socket | null = null
    const seen = new Set<string>()
    const versions = new Map<string, number>()
    let connects = 0
    void import('socket.io-client').then(({ io }) => {
      if (cancelled) return
      socket = io(window.location.origin, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        reconnection: true,
        timeout: 5000,
      })
      socket.on('connect', () => {
        setConnected(true)
        connects += 1
        if (connects > 1)
          setNotice('Conexão restaurada; dados reconciliados com a API.')
        socket?.emit('business.subscribe', token)
        void client.invalidateQueries({ queryKey: ['nfts'] })
        void client.invalidateQueries({ queryKey: ['cart'] })
        void client.invalidateQueries({ queryKey: ['summary'] })
        if (ownerId) {
          void client.invalidateQueries({ queryKey: ['order'] })
          void client.invalidateQueries({ queryKey: ['quote'] })
        }
      })
      socket.on('disconnect', () => setConnected(false))
      socket.on('nft.updated', (raw: unknown) => {
        const parsed = businessEventSchema.safeParse(raw)
        if (!parsed.success || parsed.data.type !== 'nft.updated') return
        const event = parsed.data
        const detail = nftDetailSchema.safeParse(
          client.getQueryData(['nfts', 'detail', event.resourceId]),
        )
        const listVersions = client
          .getQueriesData({ queryKey: ['nfts', 'list'] })
          .flatMap(([, data]) => {
            const list = nftListSchema.safeParse(data)
            return list.success
              ? list.data.items
                  .filter((item) => item.id === event.resourceId)
                  .map((item) => item.version)
              : []
          })
        const known = Math.max(
          versions.get(event.resourceId) ?? 0,
          detail.success ? detail.data.version : 0,
          ...listVersions,
        )
        if (seen.has(event.eventId) || event.version <= known) return
        seen.add(event.eventId)
        versions.set(event.resourceId, event.version)
        void client.invalidateQueries({ queryKey: ['nfts'] })
        void client.invalidateQueries({ queryKey: ['cart'] })
        void client.invalidateQueries({ queryKey: ['summary'] })
        void client.invalidateQueries({ queryKey: ['quote'] })
        setNotice(
          'Preço ou disponibilidade de um NFT mudou. Revise o carrinho e gere nova cotação.',
        )
      })
      socket.on('order.updated', (raw: unknown) => {
        const parsed = businessEventSchema.safeParse(raw)
        if (
          !parsed.success ||
          parsed.data.type !== 'order.updated' ||
          parsed.data.ownerId !== ownerId
        )
          return
        const event = parsed.data
        const cached = orderSchema.safeParse(
          client.getQueryData(['order', ownerId, event.resourceId]),
        )
        const known = Math.max(
          versions.get(event.resourceId) ?? 0,
          cached.success ? cached.data.version : 0,
        )
        if (seen.has(event.eventId) || event.version <= known) return
        seen.add(event.eventId)
        versions.set(event.resourceId, event.version)
        void client.invalidateQueries({
          queryKey: ['order', ownerId, event.resourceId],
        })
        void client.invalidateQueries({ queryKey: ['orders', ownerId] })
        void client.invalidateQueries({ queryKey: ['cart'] })
        setNotice('Estado do pedido atualizado. Consulte o resultado da API.')
      })
      socket.connect()
    })
    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [client, token, ownerId])
  return (
    <>
      <span role="status" aria-label="Canal de eventos" className="sr-only">
        {connected ? 'Socket.IO conectado' : 'Socket.IO desconectado'}
      </span>
      {notice && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 max-w-sm rounded-lg border border-primary bg-card p-4 text-sm shadow-xl"
        >
          {notice}
          <button
            className="ml-3 text-accent-foreground underline"
            onClick={() => setNotice('')}
          >
            Fechar
          </button>
        </div>
      )}
    </>
  )
}
