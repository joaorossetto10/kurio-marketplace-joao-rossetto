export const scenarioNames = [
  'success',
  'empty',
  'slow',
  'error',
  'invalid',
  'offline',
  'retry',
  'cart-error',
  'session-expired',
  'wallet-declined',
  'order-declined',
  'order-pending',
  'timeout-after-create',
  'quote-expired',
  'favorite-error',
] as const
export type ScenarioName = (typeof scenarioNames)[number]

export function readScenario(): ScenarioName {
  const value = new URL(window.location.href).searchParams.get('mock')
  return scenarioNames.find((name) => name === value) ?? 'success'
}
