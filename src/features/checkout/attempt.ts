import { z } from 'zod'
import { createOrderSchema } from '@/shared/api/contracts'

const attemptSchema = z.object({
  key: z.uuid(),
  ownerId: z.string(),
  body: createOrderSchema,
  createdAt: z.number().int(),
})
export type Attempt = z.infer<typeof attemptSchema>
const storageKey = (ownerId: string) => `kurio.checkout.attempt.v1.${ownerId}`
export function readAttempt(ownerId: string): Attempt | null {
  const raw = localStorage.getItem(storageKey(ownerId))
  if (!raw) return null
  try {
    const attempt = attemptSchema.parse(JSON.parse(raw) as unknown)
    return attempt.ownerId === ownerId ? attempt : null
  } catch {
    return null
  }
}
export function persistAttempt(
  ownerId: string,
  body: z.infer<typeof createOrderSchema>,
): Attempt {
  const previous = readAttempt(ownerId)
  if (previous) return previous
  const attempt = {
    key: crypto.randomUUID(),
    ownerId,
    body,
    createdAt: Date.now(),
  }
  localStorage.setItem(storageKey(ownerId), JSON.stringify(attempt))
  return attempt
}
export function clearAttempt(ownerId: string, quoteId?: string) {
  if (quoteId && readAttempt(ownerId)?.body.quoteId !== quoteId) return
  localStorage.removeItem(storageKey(ownerId))
}
