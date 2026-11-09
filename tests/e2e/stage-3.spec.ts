import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { z } from 'zod'

async function openFilters(page: Page, info: TestInfo) {
  if (info.project.name !== 'desktop-1440')
    await page.getByRole('button', { name: 'Abrir filtros' }).click()
}
async function closeFilters(page: Page, info: TestInfo) {
  if (info.project.name !== 'desktop-1440') await page.keyboard.press('Escape')
}
const cartProofSchema = z.object({
  visitorId: z.uuid(),
  totalQuantity: z.number(),
  subtotalEth: z.string(),
  items: z.array(
    z.object({
      quantity: z.number(),
      nftId: z.string(),
      editionId: z.string(),
      lineTotalEth: z.string(),
    }),
  ),
})

test('catálogo combina categoria, coleção, rede, faixa de preço, busca e ordenação na URL', async ({
  page,
}, info) => {
  await page.goto('/?page=2')
  await expect(page.getByRole('article')).toHaveCount(9)
  await openFilters(page, info)
  await page.getByRole('checkbox', { name: /^Arte digital/ }).check()
  await expect(page).not.toHaveURL(/page=2/)
  await page.getByRole('checkbox', { name: /^Kurio Apes/ }).check()
  await page.getByRole('checkbox', { name: /^Ethereum/ }).check()
  await page.getByRole('textbox', { name: 'Mínimo ETH', exact: true }).fill('1')
  await page.getByRole('textbox', { name: 'Máximo ETH', exact: true }).fill('2')
  const response = page.waitForResponse(
    (r) =>
      r.url().includes('/api/nfts?') &&
      r.url().includes('min=1') &&
      r.url().includes('max=2'),
  )
  await page.getByRole('button', { name: 'Aplicar preço' }).click()
  const filtered = await response
  expect(filtered.fromServiceWorker()).toBe(true)
  const body = await filtered.text()
  expect(filtered.url()).toContain('categories=arte-digital')
  expect(filtered.url()).toContain('collections=kurio-apes')
  expect(filtered.url()).toContain('networks=ethereum')
  await closeFilters(page, info)
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(
    page.getByRole('status', { name: 'Resultados do catálogo' }),
  ).toHaveText('3 NFTs encontrados')
  await page
    .getByLabel('Ordenar por', { exact: true })
    .selectOption('price-asc')
  await expect(page.getByRole('article').first()).toContainText(
    'Emerald Ape #042',
  )
  await page
    .getByLabel('Ordenar por', { exact: true })
    .selectOption('price-desc')
  await expect(page.getByRole('article').first()).toContainText(
    'Moss Archive #119',
  )
  await expect(page).toHaveURL(/sort=price-desc/)
  const search = page.getByRole('searchbox', { name: 'Buscar NFTs' })
  await search.fill('Moss')
  await search.press('Enter')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(
    page.getByRole('searchbox', { name: 'Buscar NFTs' }),
  ).toHaveValue('Moss')
  await expect(page.getByLabel('Ordenar por', { exact: true })).toHaveValue(
    'price-desc',
  )
  await info.attach('combined-filter-response.json', {
    body,
    contentType: 'application/json',
  })
  await page
    .getByRole('link', { name: 'Ver Moss Archive #119', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Moss Archive #119', level: 1 }),
  ).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/q=Moss/)
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('busca sem resultados permite limpar o termo e recuperar o catálogo', async ({
  page,
}) => {
  await page.goto('/?q=nao-existe-abc')
  await expect(
    page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
  ).toBeVisible()
  await expect(
    page.getByRole('status', { name: 'Resultados do catálogo' }),
  ).toHaveText('0 NFTs encontrados')
  await page.getByRole('button', { name: 'Limpar busca e filtros' }).click()
  await expect(page.getByRole('article')).toHaveCount(9)
  await expect(
    page.getByRole('status', { name: 'Resultados do catálogo' }),
  ).toHaveText('21 NFTs encontrados')
  expect(new URL(page.url()).searchParams.has('q')).toBe(false)
})

test('página e contexto sobrevivem a refresh, voltar e avançar; filtro reinicia página', async ({
  page,
}, info) => {
  await page.goto('/?page=3')
  await expect(page.getByRole('article')).toHaveCount(3)
  const firstPageThree = await page
    .getByRole('article')
    .first()
    .getByRole('heading')
    .innerText()
  await page.getByRole('button', { name: 'Página 2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('article')).toHaveCount(9)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Página 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('article')).toHaveCount(9)
  await page.goBack()
  await expect(page).toHaveURL(/page=3/)
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(
    page.getByRole('article').first().getByRole('heading'),
  ).toHaveText(firstPageThree)
  await page.goForward()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('article')).toHaveCount(9)
  await openFilters(page, info)
  await page.getByRole('checkbox', { name: /^Polygon/ }).check()
  await expect(page).not.toHaveURL(/page=2/)
  await closeFilters(page, info)
  await expect(
    page.getByRole('button', { name: 'Página 1', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('preço inválido é explicado e falha transitória recupera com retry real', async ({
  page,
}, info) => {
  await page.goto('/?mock=retry')
  await expect(page.getByRole('alert')).toContainText(
    'temporariamente indisponível',
  )
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/nfts?') && r.status() === 200,
  )
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  expect((await response).fromServiceWorker()).toBe(true)
  await expect(page.getByRole('article')).toHaveCount(9)
  await openFilters(page, info)
  await page.getByRole('textbox', { name: 'Mínimo ETH', exact: true }).fill('2')
  await page.getByRole('textbox', { name: 'Máximo ETH', exact: true }).fill('1')
  await page.getByRole('button', { name: 'Aplicar preço' }).click()
  await expect(page.getByRole('alert')).toContainText('faixa ETH válida')
  expect(new URL(page.url()).searchParams.has('min')).toBe(false)
})

test('detalhe direto carrega a API, galeria e limites de edição/quantidade', async ({
  page,
}) => {
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/nfts/emerald-042',
  )
  await page.goto('/nfts/emerald-042')
  const nft = await response
  expect(nft.fromServiceWorker()).toBe(true)
  expect(nft.status()).toBe(200)
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Imagem 3 de Emerald Ape #042', exact: true })
    .click()
  await expect(
    page.getByRole('img', { name: 'Emerald Ape #042 — imagem 3', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('radio', { name: /^1\/1 — Esgotada/ }),
  ).toBeDisabled()
  await expect(
    page.getByRole('radio', { name: '1/50', exact: true }),
  ).toBeChecked()
  const quantity = page.getByRole('spinbutton', { name: 'Qtd.' })
  await expect(quantity).toHaveAttribute('max', '3')
  for (const invalid of ['0', '-1', '4', '1.5']) {
    await quantity.fill(invalid)
    await expect(
      page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }),
    ).toBeDisabled()
    await expect(page.getByRole('alert')).toContainText('entre 1 e 3')
  }
  await quantity.fill('3')
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()
  await page.getByText('1/10', { exact: true }).click()
  await expect(
    page.getByRole('radio', { name: '1/10', exact: true }),
  ).toBeChecked()
  await expect(quantity).toHaveValue('1')
  await expect(quantity).toHaveAttribute('max', '2')
  await expect(
    page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }),
  ).toBeEnabled()
})

test('detalhe tem loading, falha com retry e resposta 404 real para ID ausente', async ({
  page,
}) => {
  await page.goto('/nfts/emerald-042?mock=slow')
  await expect(
    page.getByRole('status', { name: 'Carregando detalhe do NFT' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }),
  ).toBeVisible()
  await page.goto('/nfts/emerald-042?mock=retry')
  await expect(page.getByRole('alert')).toContainText(
    'temporariamente indisponível',
  )
  await page
    .getByRole('button', { name: 'Tentar novamente', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }),
  ).toBeVisible()
  const response = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/nfts/nao-existe',
  )
  await page.goto('/nfts/nao-existe')
  expect((await response).status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'NFT não encontrado', level: 1 }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }),
  ).toHaveCount(0)
})

test('adição atravessa POST MSW, atualiza o indicador e persiste após refresh', async ({
  page,
}, info) => {
  await page.goto('/nfts/emerald-042')
  const add = page.getByRole('button', {
    name: 'Adicionar ao carrinho',
    exact: true,
  })
  await expect(add).toBeEnabled()
  await page.getByRole('spinbutton', { name: 'Qtd.' }).fill('2')
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/cart/items',
  )
  await add.click()
  const posted = await response
  expect(posted.fromServiceWorker()).toBe(true)
  expect(posted.status()).toBe(201)
  expect(JSON.parse(posted.request().postData() ?? '{}')).toEqual({
    nftId: 'emerald-042',
    editionId: 'fifty',
    quantity: 2,
  })
  const body = await posted.text()
  const cart = cartProofSchema.parse(JSON.parse(body))
  expect(cart.totalQuantity).toBe(2)
  expect(cart.subtotalEth).toBe('2.38')
  await expect(
    page.getByText('2 unidades adicionadas ao carrinho.', { exact: true }),
  ).toBeVisible()
  for (const badge of await page
    .getByRole('status', { name: 'Itens no carrinho', exact: true })
    .all())
    await expect(badge).toHaveText('2')
  await page.reload()
  await expect(page.getByRole('spinbutton', { name: 'Qtd.' })).toHaveAttribute(
    'max',
    '1',
  )
  await page
    .getByRole('link', { name: 'Carrinho de NFTs', exact: true })
    .first()
    .click()
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Quantidade: 2')
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('2.38 ETH')
  const responseGet = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/cart',
  )
  await page.reload()
  const get = await responseGet
  expect(get.fromServiceWorker()).toBe(true)
  expect(cartProofSchema.parse(await get.json()).visitorId).toBe(cart.visitorId)
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Quantidade: 2')
  await info.attach('cart-response.json', {
    body,
    contentType: 'application/json',
  })
})

test('API recusa quantidade, edição e campos forjados sem modificar o carrinho', async ({
  page,
}) => {
  const request = page.waitForRequest(
    (r) => new URL(r.url()).pathname === '/api/cart',
  )
  await page.goto('/nfts/emerald-042')
  const id = (await (await request).allHeaders())['x-visitor-id']
  if (!id) throw new Error('Visitor ID não enviado pelo cliente')
  await expect(
    page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }),
  ).toBeEnabled()
  const invalid: { body: unknown; status: number }[] = [
    {
      body: { nftId: 'emerald-042', editionId: 'fifty', quantity: 0 },
      status: 422,
    },
    {
      body: { nftId: 'emerald-042', editionId: 'fifty', quantity: -1 },
      status: 422,
    },
    {
      body: { nftId: 'emerald-042', editionId: 'fifty', quantity: 1.5 },
      status: 422,
    },
    {
      body: { nftId: 'emerald-042', editionId: 'fifty', quantity: 4 },
      status: 409,
    },
    {
      body: { nftId: 'emerald-042', editionId: 'one', quantity: 1 },
      status: 409,
    },
    {
      body: { nftId: 'emerald-042', editionId: 'inexistente', quantity: 1 },
      status: 422,
    },
    {
      body: { nftId: 'nao-existe', editionId: 'fifty', quantity: 1 },
      status: 404,
    },
    {
      body: {
        nftId: 'emerald-042',
        editionId: 'fifty',
        quantity: 1,
        priceEth: '0.01',
      },
      status: 422,
    },
  ]
  for (const entry of invalid) {
    const result = await page.evaluate(
      async ({ id, body }) => {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': id },
          body: JSON.stringify(body),
        })
        return response.status
      },
      { id, body: entry.body },
    )
    expect(result).toBe(entry.status)
  }
  await page.goto('/carrinho')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
  ).toBeVisible()
})

test('falha de adição preserva o carrinho e permite uma nova tentativa', async ({
  page,
}) => {
  await page.goto('/nfts/emerald-042?mock=cart-error')
  const add = page.getByRole('button', {
    name: 'Adicionar ao carrinho',
    exact: true,
  })
  await expect(add).toBeEnabled()
  await add.click()
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível adicionar o NFT',
  )
  await expect(add).toBeEnabled()
  await expect(
    page.getByText('1 unidade adicionada ao carrinho.', { exact: true }),
  ).toHaveCount(0)
  await page.goto('/carrinho?mock=success')
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está vazio' }),
  ).toBeVisible()
  await page.goto('/nfts/emerald-042')
  await expect(add).toBeEnabled()
  await add.click()
  await expect(
    page.getByText('1 unidade adicionada ao carrinho.', { exact: true }),
  ).toBeVisible()
})

test('um wei mantém precisão em filtro e total do carrinho', async ({
  page,
}) => {
  await page.goto(
    '/?min=0.000000000000000001&max=0.000000000000000001&sort=price-asc',
  )
  await expect(page.getByRole('article')).toHaveCount(1)
  await page
    .getByRole('link', { name: 'Ver Velvet Orbit #514', exact: true })
    .click()
  const add = page.getByRole('button', {
    name: 'Adicionar ao carrinho',
    exact: true,
  })
  await expect(add).toBeEnabled()
  await page.getByRole('spinbutton', { name: 'Qtd.' }).fill('2')
  await add.click()
  await expect(
    page.getByText('2 unidades adicionadas ao carrinho.', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('link', { name: 'Carrinho de NFTs', exact: true })
    .first()
    .click()
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('0.000000000000000002 ETH')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('catálogo e detalhe têm geometria responsiva e capturas para revisão', async ({
  page,
}, info) => {
  await page.goto('/')
  await expect(page.getByRole('article')).toHaveCount(9)
  await page.evaluate(() => document.fonts.ready)
  for (const card of await page.getByRole('article').all()) {
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('img')).toHaveJSProperty('complete', true)
    expect(
      await card
        .locator('img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: info.outputPath('catalogo.png'),
    fullPage: true,
  })
  await page
    .getByRole('link', { name: 'Ver Emerald Ape #042', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }),
  ).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await expect(
    page.getByRole('img', { name: 'Emerald Ape #042 — imagem 1', exact: true }),
  ).toHaveJSProperty('complete', true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.getByRole('tab', { name: 'Detalhes do NFT', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: /Avaliações de colecionadores/ }),
  ).toBeFocused()
  await page.keyboard.press('Home')
  await expect(
    page.getByRole('tab', { name: 'Detalhes do NFT', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path: info.outputPath('detalhe.png'),
    fullPage: true,
  })
  const geometry = await page
    .locator(
      '.detail-gallery, .detail-art-main, .detail-sheet, .detail-buy-bar',
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect()
        return {
          className: node.getAttribute('class'),
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        }
      }),
    )
  await info.attach('detail-geometry.json', {
    body: JSON.stringify(geometry, null, 2),
    contentType: 'application/json',
  })
})
