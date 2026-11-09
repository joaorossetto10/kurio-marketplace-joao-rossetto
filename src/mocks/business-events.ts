import type { BusinessEvent } from '@/shared/api/contracts'

const listeners = new Set<(event: BusinessEvent) => void>()
export function subscribeBusiness(listener: (event: BusinessEvent) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function publishBusiness(event: Omit<BusinessEvent, 'eventId'>) {
  const payload: BusinessEvent = { ...event, eventId: crypto.randomUUID() }
  emitBusiness(payload)
  return payload
}
export function emitBusiness(payload: BusinessEvent) {
  for (const listener of listeners) listener(payload)
}
