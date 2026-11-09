export const ETH_PATTERN = /^(0|[1-9]\d*)(\.\d{1,18})?$/
const WEI = 10n ** 18n

export function toWei(value: string): bigint {
  if (!ETH_PATTERN.test(value)) throw new Error('Valor ETH inválido')
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * WEI + BigInt(fraction.padEnd(18, '0'))
}

export function fromWei(value: bigint): string {
  if (value < 0n) throw new Error('Valor ETH negativo')
  const fraction = (value % WEI).toString().padStart(18, '0').replace(/0+$/, '')
  return `${value / WEI}${fraction ? `.${fraction}` : ''}`
}
