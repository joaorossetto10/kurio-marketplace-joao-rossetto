import {
  createRootRoute,
  createRoute,
  createRouter,
  retainSearchParams,
} from '@tanstack/react-router'
import { RootLayout } from './layout'
import { HomePage } from '@/features/catalog/HomePage'
import { NotFoundPage } from '@/features/foundation/pages'
import { NftPage, NftNotFound } from '@/features/nft/NftPage'
import { CartPage } from '@/features/cart/CartPage'
import { LabPage } from '@/features/foundation/LabPage'
import { validateCatalogSearch } from '@/features/catalog/search'
import { parseAppSearch, stringifyAppSearch } from './search-serialization'
import { AuthPage } from '@/features/auth/AuthPage'
import { PaymentPage } from '@/features/checkout/PaymentPage'
import { OrderPage } from '@/features/checkout/OrderPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { WalletsPage } from '@/features/wallets/WalletsPage'
import { FavoritesPage } from '@/features/favorites/FavoritesPage'

const root = createRootRoute({
  search: { middlewares: [retainSearchParams(['mock'])] },
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  validateSearch: (search: Record<string, unknown>): { mock?: string } =>
    typeof search.mock === 'string' ? { mock: search.mock } : {},
})
const home = createRoute({
  getParentRoute: () => root,
  path: '/',
  component: HomePage,
  validateSearch: validateCatalogSearch,
})
const detail = createRoute({
  getParentRoute: () => root,
  path: '/nfts/$nftId',
  validateSearch: validateCatalogSearch,
  component: NftPage,
  notFoundComponent: NftNotFound,
})
const cart = createRoute({
  getParentRoute: () => root,
  path: '/carrinho',
  component: CartPage,
})
const payment = createRoute({
  getParentRoute: () => root,
  path: '/pagamento',
  component: PaymentPage,
})
const order = createRoute({
  getParentRoute: () => root,
  path: '/pedidos/$orderId',
  component: OrderPage,
})
const login = createRoute({
  getParentRoute: () => root,
  path: '/entrar',
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } =>
    search.returnTo === '/pagamento' ? { returnTo: '/pagamento' } : {},
  component: () => <AuthPage mode="login" />,
})
const register = createRoute({
  getParentRoute: () => root,
  path: '/cadastro',
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } =>
    search.returnTo === '/pagamento' ? { returnTo: '/pagamento' } : {},
  component: () => <AuthPage mode="register" />,
})
const profile = createRoute({
  getParentRoute: () => root,
  path: '/perfil',
  component: ProfilePage,
})
const wallets = createRoute({
  getParentRoute: () => root,
  path: '/carteiras',
  component: WalletsPage,
})
const favorites = createRoute({
  getParentRoute: () => root,
  path: '/favoritos',
  component: FavoritesPage,
})
const lab = createRoute({
  getParentRoute: () => root,
  path: '/laboratorio',
  component: LabPage,
})

export const router = createRouter({
  parseSearch: parseAppSearch,
  stringifySearch: stringifyAppSearch,
  routeTree: root.addChildren([
    home,
    detail,
    cart,
    payment,
    order,
    login,
    register,
    profile,
    wallets,
    favorites,
    lab,
  ]),
  scrollRestoration: true,
})
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
