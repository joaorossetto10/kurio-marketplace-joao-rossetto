import type { Socket } from 'socket.io-client'
import { socketProbeSchema, type SocketProbe } from '@/shared/api/contracts'

interface ServerEvents {
  'probe.result': (payload: unknown) => void
}
interface ClientEvents {
  'probe.request': () => void
}

export async function openTransportProbe(
  onResult: (payload: SocketProbe) => void,
  onStatus: (status: string) => void,
) {
  // Loaded only after the MSW bootstrap has installed WebSocket interception.
  const { io } = await import('socket.io-client')
  const socket: Socket<ServerEvents, ClientEvents> = io(
    window.location.origin,
    {
      transports: ['websocket'],
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      timeout: 5000,
    },
  )
  socket.on('connect', () => {
    onStatus('Conectado via WebSocket')
    socket.emit('probe.request')
  })
  socket.on('probe.result', (payload) => {
    const result = socketProbeSchema.safeParse(payload)
    if (result.success) onResult(result.data)
    else onStatus('Evento inválido recebido')
  })
  socket.on('connect_error', () => onStatus('Não foi possível conectar'))
  socket.on('disconnect', () => onStatus('Desconectado'))
  return {
    connect: () => socket.connect(),
    request: () => socket.emit('probe.request'),
    close: () => {
      socket.removeAllListeners()
      socket.disconnect()
    },
  }
}
