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
    return attemptSchema.parse(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}
export function persistAttempt(
  ownerId: string,
  body: z.infer<typeof createOrderSchema>,
): Attempt {
  const previous = readAttempt(ownerId)
  if (previous && JSON.stringify(previous.body) === JSON.stringify(body))
    return previous
  const attempt = {
    key: crypto.randomUUID(),
    ownerId,
    body,
    createdAt: Date.now(),
  }
  localStorage.setItem(storageKey(ownerId), JSON.stringify(attempt))
  return attempt
}
export function clearAttempt(ownerId: string) {
  localStorage.removeItem(storageKey(ownerId))
}
