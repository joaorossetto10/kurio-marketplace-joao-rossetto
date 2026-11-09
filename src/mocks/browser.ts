import { setupWorker } from 'msw/browser'
import { restHandlers } from './handlers'
import { socketHandlers } from './socket'
import { catalogHandlers } from './catalog-handlers'
import { cartHandlers } from './cart-handlers'
import { authHandlers } from './auth-handlers'
import { walletHandlers } from './wallet-handlers'
import { quoteHandlers } from './quote-handlers'
import { orderHandlers } from './order-handlers'
import { demoHandlers } from './demo-handlers'
import { profileHandlers } from './profile-handlers'
import { favoriteHandlers } from './favorite-handlers'

export const worker = setupWorker(
  ...restHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...authHandlers,
  ...profileHandlers,
  ...favoriteHandlers,
  ...walletHandlers,
  ...quoteHandlers,
  ...orderHandlers,
  ...demoHandlers,
  ...socketHandlers,
)
