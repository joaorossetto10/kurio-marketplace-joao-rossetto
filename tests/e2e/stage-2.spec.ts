import { expect, test } from '@playwright/test'

test('busca percorre UI, Query, Axios e MSW; URL e dados sobrevivem a refresh', async ({
  page,
}, info) => {
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/nfts'),
  )
  await page.goto('/')
  const initial = await responsePromise
  expect(initial.fromServiceWorker()).toBe(true)
  expect(initial.status()).toBe(200)
  await expect(page.getByRole('article')).toHaveCount(9)
  const responseSearch = page.waitForResponse((response) =>
    response.url().includes('/api/nfts?q=Emerald'),
  )
  const search = page.getByRole('searchbox', { name: 'Buscar NFTs' })
  await search.fill('Emerald')
  await search.press('Enter')
  const filtered = await responseSearch
  const filteredBody = await filtered.text()
  expect(filtered.fromServiceWorker()).toBe(true)
  await expect(page).toHaveURL(/q=Emerald/)
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(
    page.getByRole('searchbox', { name: 'Buscar NFTs' }),
  ).toHaveValue('Emerald')
  await info.attach('rest-response.json', {
    body: filteredBody,
    contentType: 'application/json',
  })
})

test('resposta de busca antiga não substitui o termo mais recente', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/')
  await expect(page.getByRole('article')).toHaveCount(9)
  const search = page.getByRole('searchbox', { name: 'Buscar NFTs' })
  const request = page.waitForRequest((request) =>
    request.url().includes('/api/nfts?q=Emerald'),
  )
  await search.fill('Emerald')
  await search.press('Enter')
  await request
  const nextSearch = page.getByRole('searchbox', { name: 'Buscar NFTs' })
  await nextSearch.fill('Sage')
  await nextSearch.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'Sage Nomad #009' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toHaveCount(0)
  await expect(page).toHaveURL(/q=Sage/)
  await page.clock.runFor(1000)
  await expect(
    page.getByRole('heading', { name: 'Sage Nomad #009' }),
  ).toBeVisible()
})

test('rotas internas, acesso direto, refresh e 404 funcionam no build', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('article')).toHaveCount(9)
  await page
    .getByRole('link', { name: 'Ver Emerald Ape #042', exact: true })
    .click()
  await expect(page).toHaveURL(/\/nfts\/emerald-042/)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 }),
  ).toBeVisible()
  for (const [url, title] of [
    ['/carrinho', 'Carrinho de NFTs'],
    ['/pagamento', 'Pagamento com carteira'],
    ['/entrar', 'Entrar na Kurio'],
    ['/cadastro', 'Criar perfil de colecionador'],
    ['/pedidos/exemplo', 'Acompanhar pedido'],
    ['/nao-existe', 'Página não encontrada'],
  ]) {
    if (!url || !title) throw new Error('Rota de teste inválida')
    await page.goto(url)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: title, level: 1 }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  }
  for (const url of ['/perfil', '/carteiras', '/favoritos']) {
    await page.goto(url)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Acesso reservado' }),
    ).toBeVisible()
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Entrar' }),
    ).toBeVisible()
  }
})

test('cenários lento, vazio, erro e resposta inválida são tratados pela interface', async ({
  page,
}) => {
  await page.goto('/?mock=slow')
  await expect(
    page.getByRole('status', { name: 'Carregando NFTs' }),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(9)
  await page.goto('/?mock=empty')
  await expect(
    page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
  ).toBeVisible()
  await page.goto('/?mock=error')
  await expect(page.getByRole('alert')).toContainText(
    'O mercado está temporariamente indisponível.',
  )
  const retryResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/nfts') && response.status() === 503,
  )
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  expect((await retryResponse).fromServiceWorker()).toBe(true)
  await page.goto('/?mock=invalid')
  await expect(page.getByRole('alert')).toContainText(
    'A resposta recebida não tem o formato esperado.',
  )
})

test('laboratório consulta REST real e recebe eventos através de socket.io-client', async ({
  page,
}, info) => {
  await page.clock.install()
  await page.goto('/laboratorio')
  const response = page.waitForResponse((response) =>
    response.url().endsWith('/api/health'),
  )
  await page.getByRole('button', { name: 'Consultar API' }).click()
  expect((await response).fromServiceWorker()).toBe(true)
  await expect(
    page.getByText('Resposta REST recebida do MSW.', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Conectar Socket.IO', exact: true })
    .click()
  await expect(
    page.getByText('Conectado via WebSocket', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Evento recebido pelo cliente Socket.IO.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Evento: transport-probe-1', { exact: true }),
  ).toBeVisible()
  await page.clock.runFor(31_000)
  await expect(
    page.getByText('Conectado via WebSocket', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Solicitar evento' }).click()
  await expect(
    page.getByText('Evento: transport-probe-2', { exact: true }),
  ).toBeVisible()
  await info.attach('socket-proof.txt', {
    body: await page.getByRole('main').innerText(),
    contentType: 'text/plain',
  })
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click()
  await expect(page.getByText('Desconectado', { exact: true })).toBeVisible()
  await expect(page.getByText('Evento: transport-probe-2')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Conectar Socket.IO', exact: true })
    .click()
  await expect(
    page.getByText('Evento: transport-probe-1', { exact: true }),
  ).toBeVisible()
})

test('layout, fonte local, imagens e painel acessível', async ({
  page,
}, info) => {
  await page.goto('/')
  await expect(page.getByRole('article')).toHaveCount(9)
  await page.evaluate(() => document.fonts.ready)
  expect(
    await page.evaluate(() => document.fonts.check('400 14px "Roboto Mono"')),
  ).toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  for (const image of await page.locator('main img:visible').all()) {
    await image.scrollIntoViewIfNeeded()
    await expect(image).toHaveJSProperty('complete', true)
    expect(
      await image.evaluate(
        (element) => (element as HTMLImageElement).naturalWidth,
      ),
    ).toBeGreaterThan(0)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  if (info.project.name !== 'desktop-1440') {
    const trigger = page.getByRole('button', { name: 'Abrir filtros' })
    await trigger.click()
    await expect(
      page.getByRole('dialog', { name: 'Explorar coleções' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
  await page.screenshot({ path: info.outputPath('home.png'), fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?mock=slow')
  await expect(
    page.getByRole('status', { name: 'Carregando NFTs' }),
  ).toBeVisible()
  const animation = await page
    .locator('.skeleton-shimmer')
    .first()
    .evaluate((element) => getComputedStyle(element, '::after').animationName)
  expect(animation).toBe('none')
})
