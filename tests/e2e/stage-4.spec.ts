import { expect, test, type Page } from '@playwright/test'
import { z } from 'zod'

const walletsSchema = z.array(z.object({ id: z.string(), network: z.string() }))
const quoteSchema = z.object({ id: z.uuid() })
const orderSchema = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'confirmed', 'declined']),
  quote: z.object({ totalEth: z.string() }),
})

async function addEmerald(page: Page) {
  await page.goto('/nfts/emerald-042')
  await expect(
    page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }),
  ).toBeEnabled()
  await page
    .getByRole('button', { name: 'Adicionar ao carrinho', exact: true })
    .click()
  await expect(
    page.getByText('1 unidade adicionada ao carrinho.'),
  ).toBeVisible()
}
async function signIn(
  page: Page,
  account: 'alice' | 'bruno' = 'alice',
  returnTo = '/carrinho',
) {
  await page.goto(`/entrar?returnTo=${encodeURIComponent(returnTo)}`)
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill(`${account}@kurio.test`)
  await page
    .getByLabel('Senha', { exact: true })
    .fill(account === 'alice' ? 'KurioAlice2026!' : 'KurioBruno2026!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(returnTo))
  await expect(
    page.getByRole('status', { name: 'Canal de eventos' }),
  ).toHaveText('Socket.IO conectado')
}
async function signOut(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('kurio.session.token.v1')),
    )
    .not.toBeNull()
  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    await expect(
      page.getByRole('button', { name: 'Sair', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: /Sair de/ }).click()
  }
  await expect(
    page.getByRole('link', { name: 'Entrar', exact: true }).first(),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('kurio.session.token.v1')),
    )
    .toBeNull()
}
async function browserApi(
  page: Page,
  path: string,
  method = 'GET',
  body?: unknown,
  extra?: Record<string, string>,
) {
  return page.evaluate(
    async ({ path, method, body, extra }) => {
      const token = localStorage.getItem('kurio.session.token.v1')
      const visitor =
        localStorage.getItem('kurio.visitor.v1') ?? crypto.randomUUID()
      const response = await fetch('/api' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Id': visitor,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      return {
        status: response.status,
        body: (await response.json()) as unknown,
      }
    },
    { path, method, body, extra },
  )
}

test('carrinho altera quantidade, cupom e remoção pela API com refresh', async ({
  page,
}) => {
  await addEmerald(page)
  await page.goto('/carrinho')
  await page.getByRole('button', { name: 'Aumentar Emerald Ape #042' }).click()
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Quantidade: 2')
  await page.reload()
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Quantidade: 2')
  await page.getByRole('textbox', { name: 'Código promocional' }).fill('BAD')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Cupom inválido.' }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Código promocional' })
    .fill('EXPIRED')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Cupom expirado.' }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Código promocional' })
    .fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('2.158 ETH')
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('KURIO10')
  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('2.396 ETH')
  await page.getByRole('button', { name: 'Remover Emerald Ape #042' }).click()
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('API de pedido autoriza replay, detecta corpo diferente e isola contas', async ({
  page,
}) => {
  await addEmerald(page)
  await signIn(page)
  const wallets = walletsSchema.parse((await browserApi(page, '/wallets')).body)
  const wallet = wallets.find((item) => item.id === 'alice-primary')
  expect(wallet).toBeDefined()
  if (!wallet) throw new Error('Carteira de teste ausente')
  expect(
    (
      await browserApi(page, '/wallets/connection', 'POST', {
        walletId: wallet.id,
        network: wallet.network,
        provider: 'metamask',
      })
    ).status,
  ).toBe(200)
  const quote = quoteSchema.parse(
    (
      await browserApi(page, '/quotes', 'POST', {
        walletId: wallet.id,
        network: wallet.network,
        provider: 'metamask',
      })
    ).body,
  )
  const body = {
    quoteId: quote.id,
    walletId: wallet.id,
    network: wallet.network,
    provider: 'metamask',
    buyer: { name: 'Alice Kurio', email: 'alice@kurio.test', note: '' },
  }
  const key = crypto.randomUUID()
  const response = page.waitForResponse(
    (item) =>
      new URL(item.url()).pathname === '/api/orders' &&
      item.request().method() === 'POST',
  )
  const first = await browserApi(page, '/orders', 'POST', body, {
    'Idempotency-Key': key,
  })
  expect((await response).fromServiceWorker()).toBe(true)
  expect(first.status).toBe(201)
  const order = orderSchema.parse(first.body)
  expect(order.status).toBe('pending')
  const replay = await browserApi(page, '/orders', 'POST', body, {
    'Idempotency-Key': key,
  })
  expect(replay.status).toBe(200)
  expect(orderSchema.parse(replay.body).id).toBe(order.id)
  expect(
    (
      await browserApi(
        page,
        '/orders',
        'POST',
        { ...body, buyer: { ...body.buyer, note: 'alterado' } },
        { 'Idempotency-Key': key },
      )
    ).status,
  ).toBe(409)
  await page.waitForTimeout(1900)
  const confirmed = orderSchema.parse(
    (await browserApi(page, `/orders/${order.id}`)).body,
  )
  expect(confirmed.status).toBe('confirmed')
  await browserApi(page, '/demo/nfts/emerald-042/change', 'POST', {
    priceEth: '9.99',
  })
  expect(
    orderSchema.parse((await browserApi(page, `/orders/${order.id}`)).body)
      .quote.totalEth,
  ).toBe('1.206')
  const replayAfterChange = await browserApi(page, '/orders', 'POST', body, {
    'Idempotency-Key': key,
  })
  expect(replayAfterChange.status).toBe(200)
  expect(orderSchema.parse(replayAfterChange.body).id).toBe(order.id)
  await signOut(page)
  await signIn(page, 'bruno')
  expect(
    (
      await browserApi(page, '/orders', 'POST', body, {
        'Idempotency-Key': key,
      })
    ).status,
  ).toBe(403)
  expect((await browserApi(page, `/orders/${order.id}`)).status).toBe(404)
  expect((await browserApi(page, `/quotes/${quote.id}`)).status).toBe(404)
})

test('login mescla visitante, logout limpa cache e duas contas ficam isoladas', async ({
  page,
}) => {
  await addEmerald(page)
  await signIn(page)
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Emerald Ape #042')
  await signOut(page)
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  await signIn(page, 'bruno')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  await signOut(page)
  await signIn(page, 'alice')
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Emerald Ape #042')
})

test('mesclagem preserva itens quando o estoque cai e permite reduzir a quantidade', async ({
  page,
}) => {
  await signIn(page)
  await addEmerald(page)
  await page.goto('/carrinho')
  await signOut(page)
  await addEmerald(page)
  expect(
    (
      await browserApi(page, '/demo/nfts/emerald-042/change', 'POST', {
        editionId: 'fifty',
        stock: 1,
      })
    ).status,
  ).toBe(200)
  await signIn(page)
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Quantidade: 2')
  await expect(page.getByText(/Estoque reduzido: 1 disponível/)).toBeVisible()
  await page.getByRole('button', { name: 'Diminuir Emerald Ape #042' }).click()
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Quantidade: 1')
  await expect(page.getByText(/Estoque reduzido/)).toHaveCount(0)
})

test('páginas da conta exigem sessão e logout desconecta a carteira', async ({
  page,
}) => {
  for (const path of ['/perfil', '/carteiras', '/favoritos']) {
    await page.goto(path)
    await expect(
      page.getByText('Entre na sua conta para acessar esta área.'),
    ).toBeVisible()
  }
  await signIn(page)
  expect(
    (
      await browserApi(page, '/wallets/connection', 'POST', {
        walletId: 'alice-primary',
        network: 'ethereum',
        provider: 'metamask',
      })
    ).status,
  ).toBe(200)
  await signOut(page)
  expect((await browserApi(page, '/wallets/connection')).status).toBe(401)
  await signIn(page)
  expect((await browserApi(page, '/wallets/connection')).body).toBeNull()
})

test('cadastro valida senha, evita conflito e não salva senha em texto puro', async ({
  page,
}) => {
  await page.goto('/entrar')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('alice@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('senha errada')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'E-mail ou senha inválidos',
  )
  await page.goto('/cadastro')
  await page
    .getByRole('textbox', { name: 'Nome de usuário' })
    .fill('Nova Pessoa')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('nova@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaNova2026!')
  await page.getByLabel('Confirme a senha').fill('outra senha')
  await page.getByRole('button', { name: 'Criar perfil' }).click()
  await expect(page.getByRole('alert')).toContainText('As senhas não conferem')
  await page.getByLabel('Confirme a senha').fill('SenhaNova2026!')
  await page.getByRole('button', { name: 'Criar perfil' }).click()
  await expect(page).toHaveURL(/\/carrinho/)
  const stored = await page.evaluate(
    () => localStorage.getItem('kurio.mock.users.v1') ?? '',
  )
  expect(stored).not.toContain('SenhaNova2026!')
  expect(stored).toContain('"hash"')
  await signOut(page)
  await page.goto('/cadastro')
  await page
    .getByRole('textbox', { name: 'Nome de usuário' })
    .fill('Nova Pessoa')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('nova@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaNova2026!')
  await page.getByLabel('Confirme a senha').fill('SenhaNova2026!')
  await page.getByRole('button', { name: 'Criar perfil' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Este e-mail já está cadastrado',
  )
})

test('order.updated passa pelo Socket.IO e dados antigos ou de outra conta são ignorados', async ({
  page,
}) => {
  await addEmerald(page)
  await signIn(page)
  await expect(
    page.getByRole('status', { name: 'Canal de eventos' }),
  ).toHaveText('Socket.IO conectado')
  await browserApi(page, '/wallets/connection', 'POST', {
    walletId: 'alice-primary',
    network: 'ethereum',
    provider: 'metamask',
  })
  const quote = quoteSchema.parse(
    (
      await browserApi(page, '/quotes', 'POST', {
        walletId: 'alice-primary',
        network: 'ethereum',
        provider: 'metamask',
      })
    ).body,
  )
  const body = {
    quoteId: quote.id,
    walletId: 'alice-primary',
    network: 'ethereum',
    provider: 'metamask',
    buyer: { name: 'Alice Kurio', email: 'alice@kurio.test', note: '' },
  }
  const order = orderSchema.parse(
    (
      await browserApi(page, '/orders', 'POST', body, {
        'Idempotency-Key': crypto.randomUUID(),
      })
    ).body,
  )
  const event = {
    eventId: crypto.randomUUID(),
    resourceId: order.id,
    version: 2,
    ownerId: 'alice',
    type: 'order.updated',
  }
  expect((await browserApi(page, '/demo/events', 'POST', event)).status).toBe(
    200,
  )
  await expect(page.getByText(/Estado do pedido atualizado/)).toBeVisible()
  await page.getByRole('button', { name: 'Fechar' }).click()
  await browserApi(page, '/demo/events', 'POST', event)
  await browserApi(page, '/demo/events', 'POST', {
    ...event,
    eventId: crypto.randomUUID(),
    version: 1,
  })
  await browserApi(page, '/demo/events', 'POST', {
    ...event,
    eventId: crypto.randomUUID(),
    ownerId: 'bruno',
    version: 3,
  })
  await page.waitForTimeout(250)
  await expect(page.getByText(/Estado do pedido atualizado/)).toHaveCount(0)
})

test('compra simulada percorre visitante, login, cotação, pedido e recibo', async ({
  page,
}, info) => {
  await page.goto('/nfts/emerald-042')
  await expect(
    page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }),
  ).toBeEnabled()
  await page
    .getByRole('button', { name: 'Adicionar ao carrinho', exact: true })
    .click()
  await expect(
    page.getByText('1 unidade adicionada ao carrinho.'),
  ).toBeVisible()
  await page.goto('/carrinho')
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Emerald Ape #042')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({ path: info.outputPath('cart.png'), fullPage: true })
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(
    page.getByRole('heading', { name: 'Pagamento com carteira', level: 1 }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Entrar e continuar' }).click()
  await page.screenshot({ path: info.outputPath('login.png'), fullPage: true })
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('alice@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioAlice2026!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/pagamento/)
  await expect(page.getByRole('radio', { name: /Reserva/ })).toBeChecked()
  await page.getByRole('button', { name: 'Conectar carteira simulada' }).click()
  await expect(page.getByText('Carteira simulada conectada.')).toBeVisible()
  await page.getByRole('button', { name: 'Gerar nova cotação' }).click()
  await expect(page.getByText('Total revisado: 1.206 ETH')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('payment.png'),
    fullPage: true,
  })
  await page.getByRole('checkbox', { name: /Revisei itens/ }).check()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page).toHaveURL(/\/pedidos\/[a-f0-9-]+/)
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
    }),
  ).toBeVisible({ timeout: 10000 })
  await expect(
    page.getByRole('region', { name: 'Estado do pedido' }),
  ).toContainText('1.206 ETH')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('receipt.png'),
    fullPage: true,
  })
  await page.reload()
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
    }),
  ).toBeVisible()
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

async function preparePayment(page: Page, scenario?: string) {
  await addEmerald(page)
  await signIn(page, 'alice', '/pagamento')
  if (scenario) await page.goto(`/pagamento?mock=${scenario}`)
  await expect(page.getByRole('radio', { name: /Reserva/ })).toBeChecked()
}
async function readyQuote(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira simulada' }).click()
  await expect(page.getByText('Carteira simulada conectada.')).toBeVisible()
  await page.getByRole('button', { name: 'Gerar nova cotação' }).click()
  await expect(page.getByText('Total revisado: 1.206 ETH')).toBeVisible()
}

test('recusa conserva o carrinho; pedido pendente recupera após refresh', async ({
  page,
}) => {
  await preparePayment(page, 'order-declined')
  await readyQuote(page)
  await page.getByRole('checkbox', { name: /Revisei itens/ }).check()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(
    page.getByRole('heading', { name: 'Compra recusada' }),
  ).toBeVisible({ timeout: 10000 })
  await page.goto('/carrinho')
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Emerald Ape #042')
  await page.goto('/pagamento?mock=order-pending')
  await page.getByRole('button', { name: 'Gerar nova cotação' }).click()
  await expect(page.getByText('Total revisado: 1.206 ETH')).toBeVisible()
  await page.getByRole('checkbox', { name: /Revisei itens/ }).check()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(
    page.getByRole('heading', { name: 'Pedido pendente' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Pedido pendente' }),
  ).toBeVisible()
  await page.goto(page.url().replace('mock=order-pending', 'mock=success'))
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
    }),
  ).toBeVisible({ timeout: 10000 })
})

test('timeout após criação retoma a mesma tentativa sem pedido duplicado', async ({
  page,
}) => {
  test.setTimeout(45000)
  await preparePayment(page, 'timeout-after-create')
  await readyQuote(page)
  await page.getByRole('checkbox', { name: /Revisei itens/ }).check()
  const submitted = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === '/api/orders' &&
      request.method() === 'POST',
  )
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const request = await submitted
  const saved = await page.evaluate(() =>
    localStorage.getItem('kurio.checkout.attempt.v1.alice'),
  )
  expect(saved).not.toBeNull()
  const attempt = z
    .object({ key: z.uuid(), ownerId: z.literal('alice'), body: z.unknown() })
    .parse(JSON.parse(saved ?? '{}') as unknown)
  expect(request.headers()['idempotency-key']).toBe(attempt.key)
  expect(request.postDataJSON()).toEqual(attempt.body)
  await expect(
    page.getByText(/A resposta do pedido não foi confirmada/),
  ).toBeVisible({ timeout: 15000 })
  await page.reload()
  await page.getByRole('button', { name: 'Retomar tentativa' }).click()
  await expect(page).toHaveURL(/\/pedidos\/[a-f0-9-]+/)
  const orders = await browserApi(page, '/orders')
  expect(orders.status).toBe(200)
  expect(z.array(orderSchema).parse(orders.body)).toHaveLength(1)
})

test('mudança de preço invalida cotação e estoque esgotado bloqueia nova cotação', async ({
  page,
}) => {
  await preparePayment(page)
  await readyQuote(page)
  const oldQuote = await page.getByText(/^Cotação:/).textContent()
  const quoteId = oldQuote?.replace('Cotação: ', '') ?? ''
  const changed = await browserApi(
    page,
    '/demo/nfts/emerald-042/change',
    'POST',
    { priceEth: '1.49' },
  )
  expect(changed.status).toBe(200)
  await expect(page.getByText(/Carrinho ou preço mudou/)).toBeVisible()
  await expect(
    page.getByText(/Preço ou disponibilidade de um NFT mudou/),
  ).toBeVisible()
  const staleBody = {
    quoteId,
    walletId: 'alice-reserve',
    network: 'polygon',
    provider: 'coinbase',
    buyer: { name: 'Alice Kurio', email: 'alice@kurio.test', note: '' },
  }
  expect(
    (
      await browserApi(page, '/orders', 'POST', staleBody, {
        'Idempotency-Key': crypto.randomUUID(),
      })
    ).status,
  ).toBe(409)
  await browserApi(page, '/demo/nfts/emerald-042/change', 'POST', {
    editionId: 'fifty',
    stock: 0,
  })
  await page.getByRole('button', { name: 'Gerar nova cotação' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: /Estoque alterado/ }),
  ).toBeVisible()
})

test('carteira pode recusar conexão; sessão expirada protege checkout', async ({
  page,
}) => {
  await preparePayment(page, 'wallet-declined')
  await page.getByRole('button', { name: 'Conectar carteira simulada' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Conexão recusada' }),
  ).toBeVisible()
  await page.goto('/pagamento?mock=session-expired')
  await page.reload()
  await expect(
    page.getByRole('link', { name: 'Entrar e continuar' }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('kurio.session.token.v1')),
  ).toBeNull()
})

test('cotação expirada não confirma compra nem remove itens', async ({
  page,
}) => {
  await preparePayment(page, 'quote-expired')
  await readyQuote(page)
  await page.waitForTimeout(500)
  await page.getByRole('checkbox', { name: /Revisei itens/ }).check()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Cotação expirada' }),
  ).toBeVisible()
  await page.goto('/carrinho')
  await expect(
    page.getByRole('list', { name: 'Itens do carrinho' }),
  ).toContainText('Emerald Ape #042')
})

test('Socket.IO entrega mudança, ignora evento antigo e reconcilia após reconexão', async ({
  page,
}) => {
  await addEmerald(page)
  await page.goto('/carrinho')
  await expect(
    page.getByRole('status', { name: 'Canal de eventos' }),
  ).toHaveText('Socket.IO conectado')
  const changed = await browserApi(
    page,
    '/demo/nfts/emerald-042/change',
    'POST',
    { priceEth: '1.49' },
  )
  expect(changed.status).toBe(200)
  await expect(
    page.getByText(/Preço ou disponibilidade de um NFT mudou/),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('1.506 ETH')
  await page.getByRole('button', { name: 'Fechar' }).click()
  const stale = {
    eventId: crypto.randomUUID(),
    resourceId: 'emerald-042',
    version: 1,
    ownerId: null,
    type: 'nft.updated',
  }
  expect((await browserApi(page, '/demo/events', 'POST', stale)).status).toBe(
    200,
  )
  await page.waitForTimeout(250)
  await expect(
    page.getByText(/Preço ou disponibilidade de um NFT mudou/),
  ).toHaveCount(0)
  expect(
    (
      await browserApi(page, '/demo/socket/drop-and-change', 'POST', {
        priceEth: '1.79',
      })
    ).status,
  ).toBe(200)
  await expect(page.getByText(/Conexão restaurada/)).toBeVisible({
    timeout: 10000,
  })
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('1.806 ETH')
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Resumo do carrinho' }),
  ).toContainText('1.806 ETH')
})

test('cliques repetidos criam um pedido e a liquidação preserva itens acrescentados', async ({
  page,
}) => {
  await addEmerald(page)
  await signIn(page)
  await browserApi(page, '/wallets/connection', 'POST', {
    walletId: 'alice-primary',
    network: 'ethereum',
    provider: 'metamask',
  })
  const quote = quoteSchema.parse(
    (
      await browserApi(page, '/quotes', 'POST', {
        walletId: 'alice-primary',
        network: 'ethereum',
        provider: 'metamask',
      })
    ).body,
  )
  const body = {
    quoteId: quote.id,
    walletId: 'alice-primary',
    network: 'ethereum',
    provider: 'metamask',
    buyer: { name: 'Alice Kurio', email: 'alice@kurio.test', note: '' },
  }
  const key = crypto.randomUUID()
  const [first, repeated] = await Promise.all([
    browserApi(page, '/orders', 'POST', body, { 'Idempotency-Key': key }),
    browserApi(page, '/orders', 'POST', body, { 'Idempotency-Key': key }),
  ])
  expect([first.status, repeated.status].sort()).toEqual([200, 201])
  const order = orderSchema.parse(first.body)
  expect(orderSchema.parse(repeated.body).id).toBe(order.id)
  expect(
    (
      await browserApi(page, '/cart/items', 'POST', {
        nftId: 'emerald-042',
        editionId: 'fifty',
        quantity: 1,
      })
    ).status,
  ).toBe(201)
  await page.waitForTimeout(1900)
  expect(
    orderSchema.parse((await browserApi(page, `/orders/${order.id}`)).body)
      .status,
  ).toBe('confirmed')
  const cart = (await browserApi(page, '/cart')).body
  expect(
    z.object({ totalQuantity: z.number() }).parse(cart).totalQuantity,
  ).toBe(1)
  expect(
    z.array(orderSchema).parse((await browserApi(page, '/orders')).body),
  ).toHaveLength(1)
})
