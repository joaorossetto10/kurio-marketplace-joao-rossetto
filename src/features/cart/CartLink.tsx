import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cartOptions } from './api'
import { Icon } from '@/shared/ui/icon'
import { useAuth } from '@/features/auth/auth-context'

export function CartLink({ mobile = false }: { mobile?: boolean }) {
  useAuth()
  const cart = useQuery(cartOptions())
  return (
    <Link
      to="/carrinho"
      aria-label="Carrinho de NFTs"
      className={
        mobile
          ? 'relative grid justify-items-center'
          : 'relative inline-flex min-h-10 items-center gap-1'
      }
    >
      <Icon name="cart" />
      {mobile && <span>Carrinho</span>}
      <span
        role="status"
        aria-label="Itens no carrinho"
        className="absolute -top-1 -right-2 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground"
      >
        {cart.data ? cart.data.totalQuantity : cart.isError ? '!' : '…'}
      </span>
    </Link>
  )
}
