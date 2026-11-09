import { z } from 'zod'
export function visitorId(): string {
  const stored = localStorage.getItem('kurio.visitor.v1')
  if (stored && z.uuid().safeParse(stored).success) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('kurio.visitor.v1', id)
  return id
}
