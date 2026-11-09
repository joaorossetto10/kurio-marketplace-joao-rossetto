import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { SocketProbe } from '@/shared/api/contracts'
import { sessionForToken } from './auth-store'
import { subscribeBusiness } from './business-events'

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
// MSW 2 strips /socket.io/ before matching a WebSocket handler.
const endpoint = ws.link(`${protocol}//${window.location.host}`)
const dropConnections = new Set<() => void>()
export function dropBusinessSockets() {
  for (const drop of dropConnections) drop()
}

export const socketHandlers = [
  endpoint.addEventListener('connection', (connection) => {
    const drop = () => connection.client.close()
    dropConnections.add(drop)
    const io = toSocketIo(connection)
    let version = 0
    // The binding opens Engine.IO / the default namespace, but has no heartbeat timer.
    const heartbeat = window.setInterval(
      () => connection.client.send('2'),
      15_000,
    )
    connection.client.addEventListener('close', () =>
      window.clearInterval(heartbeat),
    )
    let subscriber: string | null = null
    let subscriberToken: string | null = null
    const unsubscribe = subscribeBusiness((event) => {
      if (
        event.type === 'order.updated' &&
        (!subscriber ||
          event.ownerId !== subscriber ||
          sessionForToken(subscriberToken)?.user.id !== subscriber)
      )
        return
      io.client.emit(event.type, event)
    })
    connection.client.addEventListener('close', () => {
      unsubscribe()
      dropConnections.delete(drop)
    })
    io.client.on('business.subscribe', (_event, token: string | null) => {
      subscriberToken = token
      subscriber = sessionForToken(token)?.user.id ?? null
    })
    io.client.on('probe.request', () => {
      version += 1
      const payload: SocketProbe = {
        eventId: `transport-probe-${String(version)}`,
        resourceId: 'transport-probe',
        version,
        transport: 'websocket',
        message: 'Evento recebido pelo cliente Socket.IO.',
      }
      io.client.emit('probe.result', payload)
    })
  }),
]
