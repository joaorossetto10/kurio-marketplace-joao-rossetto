import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Icon } from '@/shared/ui/icon'
import { Panel } from '@/shared/ui/panel'
import { CartLink } from '@/features/cart/CartLink'
import { useAuth } from '@/features/auth/auth-context'

const accountLinks = [
  { to: '/perfil', label: 'Dados do perfil' },
  { to: '/carteiras', label: 'Carteiras' },
  { to: '/favoritos', label: 'Lista de interesse' },
] as const

function Header() {
  const auth = useAuth()
  const path = useLocation({ select: (location) => location.pathname })
  const divided = path === '/' || path === '/perfil' || path === '/carteiras'
  const visibility = path.startsWith('/nfts/')
    ? 'hidden xl:block'
    : path === '/entrar' || path === '/cadastro'
      ? 'hidden sm:block'
      : ''
  return (
    <header
      className={`market-container pt-6 ${visibility} ${divided ? 'xl:border-b xl:border-border' : ''}`}
    >
      <div
        className={`hidden items-center justify-between gap-8 xl:flex ${divided ? 'min-h-[44px]' : 'min-h-[45px]'}`}
      >
        <Link to="/" className="wordmark" aria-label="Kurio — início">
          KURIO
        </Link>
        <nav
          aria-label="Navegação principal"
          className="flex items-center gap-8 text-sm"
        >
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                'text-accent-foreground underline underline-offset-[14px]',
            }}
          >
            Início
          </Link>
          <Link
            to="/"
            hash="catalogo"
            className={
              path.startsWith('/nfts/') || path === '/carrinho'
                ? 'text-accent-foreground underline underline-offset-[14px]'
                : undefined
            }
          >
            Mercado
          </Link>
          <button
            disabled
            title="Disponível em breve"
            className="text-muted-foreground"
          >
            Criadores
          </button>
          <button
            disabled
            title="Disponível em breve"
            className="text-muted-foreground"
          >
            Aprenda
          </button>
        </nav>
        <div className="flex items-center gap-5">
          <a href="/#catalogo" aria-label="Explorar o mercado">
            <Icon name="search" />
          </a>
          <CartLink />
          {auth.user ? (
            <div className="flex items-center gap-3 text-xs">
              <span>{auth.user.name}</span>
              <Button
                variant="outline"
                onClick={() => {
                  void auth.signOut()
                }}
              >
                Sair
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/entrar">
                <Icon name="login" />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
      {path !== '/' && (
        <div className="flex items-center justify-between xl:hidden">
          <Link to="/" className="wordmark" aria-label="Kurio — início">
            KURIO
          </Link>
          <Panel
            title="Navegação"
            trigger={<Button variant="outline">Menu</Button>}
          >
            <nav className="grid gap-5" aria-label="Menu móvel">
              <Link to="/">Início</Link>
              <Link to="/carrinho">Carrinho de NFTs</Link>
              {accountLinks.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
              {auth.user ? (
                <button
                  onClick={() => {
                    void auth.signOut()
                  }}
                >
                  Sair de {auth.user.name}
                </button>
              ) : (
                <>
                  <Link to="/entrar">Entrar</Link>
                  <Link to="/cadastro">Criar conta</Link>
                </>
              )}
            </nav>
          </Panel>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="market-container mt-24 mb-6 text-xs leading-6 text-muted-foreground">
      <div className="grid gap-8 bg-card p-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          [
            'W',
            'Segurança da carteira',
            'Proteja sua carteira e colecione arte digital verificada com confiança.',
          ],
          [
            'C',
            'Criadores em destaque',
            'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
          ],
          [
            'D',
            'Alertas de lançamentos',
            'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
          ],
        ].map(([letter, title, text]) => (
          <div key={letter}>
            <span
              className="mb-4 grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
              aria-hidden="true"
            >
              {letter}
            </span>
            <h2 className="font-bold text-foreground">{title}</h2>
            <p className="mt-2">{text}</p>
          </div>
        ))}
        <div>
          <h2 className="mb-4 font-bold text-foreground">
            Antecipe-se ao próximo lançamento
          </h2>
          <label htmlFor="newsletter">Novidades por e-mail</label>
          <Input
            id="newsletter"
            placeholder="Disponível em breve"
            disabled
            className="my-2"
          />
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </div>
      </div>
      <div className="grid items-center gap-4 bg-[#38220f] p-6 md:grid-cols-4">
        <span className="font-bold tracking-widest text-foreground">KURIO</span>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <span>contato@email.com</span>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="grid gap-8 bg-card p-6 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <h2 className="mb-3 font-bold text-foreground">Meu perfil</h2>
          <nav className="grid gap-1" aria-label="Conta no rodapé">
            {accountLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
            <Link to="/entrar">Entrar</Link>
          </nav>
        </div>
        <div>
          <h2 className="mb-3 font-bold text-foreground">Central de ajuda</h2>
          <p>Como comprar NFTs</p>
          <p>Carteira e segurança</p>
          <p>Política do mercado</p>
          <p className="mt-2 text-text-subtle">
            Conteúdos disponíveis em breve.
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-bold text-foreground">Coleções</h2>
          <Link to="/" hash="catalogo">
            Arte digital
          </Link>
          <p>Fotografia</p>
          <p>Música</p>
          <p>Arte 3D</p>
          <p>Utilidade</p>
        </div>
        <div>
          <h2 className="mb-3 font-bold text-foreground">Redes sociais</h2>
          <div
            className="flex gap-2"
            aria-label="Redes sociais disponíveis em breve"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <img
                key={n}
                src={`/assets/social-${String(n)}.svg`}
                width={32}
                height={32}
                alt=""
              />
            ))}
          </div>
          <h2 className="mt-4 font-bold text-foreground">
            Carteiras compatíveis
          </h2>
          <p className="mt-2 rounded-md border border-border p-2 text-[10px]">
            METAMASK · WALLETCONNECT · COINBASE
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-center">
        <p>© 2026 Kurio. Propriedade digital para todos.</p>
        <Link to="/laboratorio" className="underline underline-offset-4">
          Laboratório de integração
        </Link>
      </div>
    </footer>
  )
}

export function AccountSidebar() {
  return (
    <nav
      aria-label="Conta do colecionador"
      className="flex flex-wrap gap-2 rounded-md bg-card p-5 xl:w-[310px] xl:flex-none xl:flex-col xl:gap-4"
    >
      <h2 className="w-full text-lg font-bold">Meu perfil</h2>
      {accountLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="rounded-md px-3 py-2 text-sm"
          activeProps={{ className: 'bg-primary text-primary-foreground' }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

export function RootLayout() {
  const path = useLocation({ select: (location) => location.pathname })
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    main.current?.focus()
  }, [path])
  const account = path === '/perfil' || path === '/carteiras'
  const detail = path.startsWith('/nfts/')
  const transaction =
    path === '/carrinho' ||
    path === '/pagamento' ||
    path === '/entrar' ||
    path === '/cadastro' ||
    path.startsWith('/pedidos/')
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-primary focus:p-3 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="main" ref={main} tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      {!account && (
        <div className={detail || transaction ? 'hidden xl:block' : undefined}>
          <Footer />
        </div>
      )}
      {!detail && !transaction && (
        <nav
          aria-label="Navegação inferior"
          className="mobile-tabbar xl:hidden"
        >
          <Link to="/" activeOptions={{ exact: true }}>
            <Icon name="home" />
            <span>Início</span>
          </Link>
          <Link to="/favoritos">
            <Icon name="heart" />
            <span>Favoritos</span>
          </Link>
          <CartLink mobile />
          <Link to="/perfil">
            <Icon name="user" />
            <span>Perfil</span>
          </Link>
        </nav>
      )}
    </>
  )
}
