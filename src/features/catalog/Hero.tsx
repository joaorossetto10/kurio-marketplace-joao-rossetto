import { Button } from '@/shared/ui/button'

export function Hero() {
  return (
    <section
      className="hero flex items-center justify-between px-4 py-2 sm:p-8 xl:h-[450px] xl:py-0 xl:pr-0 xl:pl-10"
      aria-labelledby="hero-title"
    >
      <div className="min-w-0 sm:w-[55%] xl:w-[600px]">
        <p className="text-xs leading-4 sm:text-sm">Bem-vindo à Kurio</p>
        <h1 id="hero-title" className="hero-title mt-2">
          <span className="hidden sm:inline">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </span>
          <span className="sm:hidden">
            SEJA DONO DA
            <br />
            CULTURA DIGITAL
          </span>
        </h1>
        <p className="mt-2 max-w-[557px] text-xs leading-[18px] text-muted-foreground sm:mt-4 sm:text-sm sm:leading-6">
          <span className="hidden sm:inline">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </span>
          <span className="sm:hidden">
            Descubra NFTs selecionados de criadores do mundo todo.
          </span>
        </p>
        <Button asChild className="hero-cta">
          <a href="#catalogo">
            EXPLORAR{' '}
            <span className="-rotate-90 sm:hidden" aria-hidden="true">
              <img src="/assets/arrow-mobile.svg" alt="" />
            </span>
          </a>
        </Button>
      </div>
      <div className="relative flex-none sm:w-2/5 xl:w-[450px]">
        <img
          src="/assets/emerald.png"
          width={1254}
          height={1254}
          className="hero-art"
          alt="Emerald Ape, macaco com óculos e jaqueta verde"
          fetchPriority="high"
        />
        <img
          src="/assets/sage.png"
          width={1254}
          height={1254}
          className="absolute -bottom-2 left-0 aspect-square w-[42%] rounded-2xl object-cover sm:hidden"
          alt=""
        />
      </div>
      <img
        src="/assets/hero-dots.svg"
        alt=""
        className="hero-dots hidden sm:block"
      />
      <img
        src="/assets/hero-mobile-dots.svg"
        alt=""
        className="hero-dots sm:hidden"
      />
    </section>
  )
}

export function MarketplacePromos() {
  return (
    <section
      className="mt-24 grid gap-7 md:grid-cols-2"
      aria-label="Explore o mercado"
    >
      {[
        {
          image: 'emerald',
          title: 'Lançamentos gênesis de edição limitada',
          text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
        },
        {
          image: 'ivory',
          title: 'Arte digital selecionada e muito mais',
          text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
        },
      ].map((promo) => (
        <div
          key={promo.title}
          className="flex min-w-0 items-center gap-5 overflow-hidden rounded-xl bg-card"
        >
          <img
            src={`/assets/${promo.image}.png`}
            width={1254}
            height={1254}
            alt=""
            loading="lazy"
            className="w-2/5 self-stretch object-cover"
          />
          <div className="min-w-0 py-5 pr-5 text-right">
            <h2 className="text-base font-bold">{promo.title}</h2>
            <p className="my-3 text-xs leading-6 text-muted-foreground">
              {promo.text}
            </p>
            <Button variant="outline" asChild>
              <a href="#catalogo">Explorar</a>
            </Button>
          </div>
        </div>
      ))}
    </section>
  )
}
