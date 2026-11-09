const arrayKeys = ['categories', 'collections', 'networks'] as const

// Do not JSON-parse scalar search params: ETH must never pass through Number.
export function parseAppSearch(value: string): Record<string, unknown> {
  const params = new URLSearchParams(value)
  const result: Record<string, unknown> = Object.fromEntries(params)
  for (const key of arrayKeys) {
    if (!params.has(key)) continue
    const values = params.getAll(key)
    const first = values[0]
    if (values.length === 1 && first?.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(first)
        result[key] = parsed
        continue
      } catch {
        /* Validate the raw value below. */
      }
    }
    result[key] = values
  }
  return result
}

export function stringifyAppSearch(value: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, entry] of Object.entries(value)) {
    if (
      entry === undefined ||
      entry === null ||
      entry === '' ||
      (key === 'page' && entry === 1) ||
      (key === 'sort' && entry === 'recent')
    )
      continue
    if (Array.isArray(entry)) {
      for (const item of entry)
        if (typeof item === 'string') params.append(key, item)
    } else if (
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean'
    )
      params.set(key, String(entry))
  }
  const encoded = params.toString()
  return encoded ? '?' + encoded : ''
}
