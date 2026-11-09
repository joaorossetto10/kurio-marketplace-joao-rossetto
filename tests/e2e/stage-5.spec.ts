import { expect, test, type Page } from '@playwright/test'
import { z } from 'zod'

const walletInput = {
  label: 'Coleção Azul',
  nickname: 'Azul',
  profileName: 'Alice Kurio',
  address: '0x1111111111111111111111111111111111111111',
  secondaryAddress: '',
  email: 'alice@kurio.test',
  referralCode: 'KURIO',
  ens: 'azul.eth',
  network: 'polygon',
  type: 'coinbase',
}
const walletSchema = z.object({
  id: z.string(),
  label: z.string(),
  isPrimary: z.boolean(),
  network: z.string(),
})
const quoteSchema = z.object({ id: z.uuid() })
const orderSchema = z.object({ id: z.uuid() })

async function api(
  page: Page,
  path: string,
  method = 'GET',
  body?: unknown,
  headers?: Record<string, string>,
) {
  return page.evaluate(
    async ({ path, method, body, headers }) => {
      const token = localStorage.getItem('kurio.session.token.v1')
      const visitor =
        localStorage.getItem('kurio.visitor.v1') ?? crypto.randomUUID()
      const response = await fetch('/api' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Visitor-Id': visitor,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      return {
        status: response.status,
        body: (await response.json()) as unknown,
      }
    },
    { path, method, body, headers },
  )
}
async function signIn(
  page: Page,
  account: 'alice' | 'bruno' = 'alice',
  password?: string,
) {
  await page.goto('/entrar')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill(`${account}@kurio.test`)
  await page
    .getByLabel('Senha', { exact: true })
    .fill(
      password ?? (account === 'alice' ? 'KurioAlice2026!' : 'KurioBruno2026!'),
    )
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho/)
  await expect(
    page.getByRole('status', { name: 'Canal de eventos' }),
  ).toHaveText('Socket.IO conectado')
}
async function signOut(page: Page) {
  await page.goto('/perfil')
  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('button', { name: /Sair de/ }).click()
  }
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('kurio.session.token.v1')),
    )
    .toBeNull()
}
async function addEmerald(page: Page) {
  await page.goto('/nfts/emerald-042')
  await page
    .getByRole('button', { name: 'Adicionar ao carrinho', exact: true })
    .click()
  await expect(
    page.getByText('1 unidade adicionada ao carrinho.'),
  ).toBeVisible()
}

test('perfil, avatar e senha persistem; senha atual incorreta não altera credenciais', async ({
  page,
}, info) => {
  await signIn(page)
  await page.goto('/perfil')
  await expect(
    page.getByRole('heading', { name: 'Perfil do colecionador' }),
  ).toBeVisible()
  await page.getByLabel('Nome de exibição').fill('Alice Atualizada')
  await page.getByLabel('Nome de usuário').fill('alice.atualizada')
  await page.getByLabel('Nome ENS').fill('alice.eth')
  await page.getByLabel('Apelido da carteira').fill('Acervo')
  await page.getByLabel('Avatar simulado').selectOption('sage')
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Perfil salvo.' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome de exibição')).toHaveValue(
    'Alice Atualizada',
  )
  await expect(page.getByLabel('Nome de usuário')).toHaveValue(
    'alice.atualizada',
  )
  await expect(page.getByLabel('Avatar simulado')).toHaveValue('sage')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('profile.png'),
    fullPage: true,
  })
  await page.getByLabel('Senha atual').fill('incorreta')
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha2026!')
  await page.getByLabel('Confirmar nova senha').fill('NovaSenha2026!')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByRole('alert')).toContainText('Senha atual incorreta')
  await page.getByLabel('Senha atual').fill('KurioAlice2026!')
  await page.getByLabel('Confirmar nova senha').fill('diferente')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'As novas senhas não conferem',
  )
  await page.getByLabel('Confirmar nova senha').fill('NovaSenha2026!')
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Senha alterada.' }),
  ).toBeVisible()
  const stored = await page.evaluate(
    () => localStorage.getItem('kurio.mock.users.v1') ?? '',
  )
  expect(stored).not.toContain('NovaSenha2026!')
  await signOut(page)
  await page.goto('/entrar')
  await page
    .getByRole('textbox', { name: 'E-mail', exact: true })
    .fill('alice@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioAlice2026!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'E-mail ou senha inválidos',
  )
  await page.getByLabel('Senha', { exact: true }).fill('NovaSenha2026!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho/)
})

test('carteira criada, editada e principal chega ao checkout; remoção invalida conexão', async ({
  page,
}, info) => {
  await signIn(page)
  await page.goto('/carteiras')
  await expect(
    page.getByRole('list', { name: 'Suas carteiras' }).getByRole('listitem'),
  ).toHaveCount(2)
  await page.getByRole('button', { name: 'Adicionar carteira' }).click()
  await page.getByLabel('Nome de exibição').fill(walletInput.label)
  await page.getByLabel('Apelido da carteira').fill(walletInput.nickname)
  await page.getByLabel('Nome do perfil').fill(walletInput.profileName)
  await page.getByLabel('Endereço da carteira').fill(walletInput.address)
  await page.getByLabel('E-mail').fill(walletInput.email)
  await page.getByLabel('Código de indicação').fill(walletInput.referralCode)
  await page.getByLabel('Nome ENS').fill(walletInput.ens)
  await page.getByLabel('Rede').selectOption(walletInput.network)
  await page.getByLabel('Tipo de carteira').selectOption(walletInput.type)
  await page.getByLabel('Endereço da carteira').fill('endereco-invalido')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Confira endereço, e-mail e campos obrigatórios da carteira.',
  )
  await page.getByLabel('Endereço da carteira').fill(walletInput.address)
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Carteira salva.' }),
  ).toBeVisible()
  const wallets = z
    .array(walletSchema)
    .parse((await api(page, '/wallets')).body)
  const created = wallets.find((wallet) => wallet.label === walletInput.label)
  expect(created).toBeDefined()
  if (!created) throw new Error('Carteira não criada')
  await page
    .getByRole('button', { name: 'Tornar principal Coleção Azul' })
    .click()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Coleção Azul' }),
  ).toContainText('Principal')
  await page.getByRole('button', { name: 'Editar Coleção Azul' }).click()
  await page.getByLabel('Nome de exibição').fill('Coleção Verde')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Coleção Verde' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Coleção Verde' }),
  ).toContainText('Principal')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('wallets.png'),
    fullPage: true,
  })
  await addEmerald(page)
  await page.goto('/pagamento')
  await expect(page.getByRole('radio', { name: /Coleção Verde/ })).toBeVisible()
  await page.getByRole('radio', { name: /Coleção Verde/ }).check()
  await page.getByRole('button', { name: 'Conectar carteira simulada' }).click()
  await expect(page.getByText('Carteira simulada conectada.')).toBeVisible()
  await page.getByRole('button', { name: 'Gerar nova cotação' }).click()
  await expect(page.getByText(/Total revisado:/)).toBeVisible()
  await page.goto('/carteiras')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Remover Coleção Verde' }).click()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Coleção Verde' }),
  ).toHaveCount(0)
  expect((await api(page, '/wallets/connection')).body).toBeNull()
  expect(
    (
      await api(page, '/quotes', 'POST', {
        walletId: created.id,
        network: 'polygon',
        provider: 'coinbase',
      })
    ).status,
  ).toBe(422)
})

test('favoritos persistem, aparecem no detalhe e não vazam entre contas', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/')
  const add = page
    .getByRole('button', { name: 'Favoritar Emerald Ape #042' })
    .first()
  await add.click()
  await expect(
    page
      .getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' })
      .first(),
  ).toBeVisible()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Emerald Ape #042 adicionado aos favoritos.' }),
  ).toHaveText('Emerald Ape #042 adicionado aos favoritos.')
  await page.reload()
  await expect(
    page
      .getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' })
      .first(),
  ).toBeVisible()
  await page.goto('/favoritos')
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
  await signOut(page)
  await signIn(page, 'bruno')
  await page.goto('/favoritos')
  await expect(
    page.getByText('Sua lista de interesse está vazia'),
  ).toBeVisible()
  await signOut(page)
  await signIn(page)
  await page.goto('/nfts/emerald-042')
  await expect(
    page.getByRole('button', {
      name: 'Remover Emerald Ape #042 dos favoritos',
    }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' })
    .click()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Emerald Ape #042 removido dos favoritos.' }),
  ).toHaveText('Emerald Ape #042 removido dos favoritos.')
  await page.goto('/favoritos')
  await expect(
    page.getByText('Sua lista de interesse está vazia'),
  ).toBeVisible()
})

test('favorito otimista reverte após falha e bloqueia cliques concorrentes', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/nfts/emerald-042?mock=favorite-error')
  const button = page.getByRole('button', {
    name: 'Favoritar Emerald Ape #042',
  })
  await expect(button).toBeEnabled()
  let posts = 0
  page.on('request', (request) => {
    if (
      new URL(request.url()).pathname === '/api/favorites' &&
      request.method() === 'POST'
    )
      posts += 1
  })
  await button.evaluate((element: HTMLButtonElement) => {
    element.click()
    element.click()
  })
  await expect(
    page.getByRole('button', {
      name: 'Remover Emerald Ape #042 dos favoritos',
    }),
  ).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText(
    'Falha ao salvar favorito',
    { timeout: 10000 },
  )
  await expect(
    page.getByRole('button', { name: 'Favoritar Emerald Ape #042' }),
  ).toBeEnabled()
  expect(posts).toBe(1)
  expect(
    z
      .object({ items: z.array(z.unknown()) })
      .parse((await api(page, '/favorites')).body).items,
  ).toHaveLength(0)
})

test('reset restaura usuários, carrinho, favoritos, carteiras, pedidos e preços', async ({
  page,
}) => {
  await signIn(page)
  await addEmerald(page)
  expect(
    (await api(page, '/cart/coupon', 'PUT', { code: 'KURIO10' })).status,
  ).toBe(200)
  expect(
    (await api(page, '/favorites', 'POST', { nftId: 'emerald-042' })).status,
  ).toBe(201)
  expect(
    (
      await api(page, '/profile', 'PATCH', {
        name: 'Alice Reset',
        username: 'alice.reset',
        email: 'alice@kurio.test',
        ens: 'reset.eth',
        walletNickname: 'Reset',
        avatar: 'ivory',
      })
    ).status,
  ).toBe(200)
  expect((await api(page, '/wallets/alice-reserve', 'DELETE')).status).toBe(200)
  expect(
    (
      await api(page, '/demo/nfts/emerald-042/change', 'POST', {
        priceEth: '2.50',
      })
    ).status,
  ).toBe(200)
  expect(
    (
      await api(page, '/wallets/connection', 'POST', {
        walletId: 'alice-primary',
        network: 'ethereum',
        provider: 'metamask',
      })
    ).status,
  ).toBe(200)
  const quote = quoteSchema.parse(
    (
      await api(page, '/quotes', 'POST', {
        walletId: 'alice-primary',
        network: 'ethereum',
        provider: 'metamask',
      })
    ).body,
  )
  const order = orderSchema.parse(
    (
      await api(
        page,
        '/orders',
        'POST',
        {
          quoteId: quote.id,
          walletId: 'alice-primary',
          network: 'ethereum',
          provider: 'metamask',
          buyer: { name: 'Alice Reset', email: 'alice@kurio.test', note: '' },
        },
        { 'Idempotency-Key': crypto.randomUUID() },
      )
    ).body,
  )
  expect(order.id).toBeTruthy()
  await page.goto('/laboratorio?mock=favorite-error')
  page.once('dialog', (dialog) => void dialog.accept())
  await page
    .getByRole('button', { name: 'Restaurar dados de demonstração' })
    .click()
  await expect(page).toHaveURL(/\/laboratorio$/)
  const keys = await page.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith('kurio.')),
  )
  expect(
    keys.filter(
      (key) =>
        key.startsWith('kurio.mock.') ||
        key.startsWith('kurio.checkout.') ||
        key === 'kurio.session.token.v1',
    ),
  ).toEqual([])
  await signIn(page)
  const profile = z
    .object({ name: z.string(), avatar: z.unknown() })
    .parse((await api(page, '/profile')).body)
  expect(profile.name).toBe('Alice Kurio')
  expect(profile.avatar).toBeNull()
  expect(
    z.array(walletSchema).parse((await api(page, '/wallets')).body),
  ).toHaveLength(2)
  expect(
    z
      .object({ items: z.array(z.unknown()) })
      .parse((await api(page, '/favorites')).body).items,
  ).toHaveLength(0)
  expect(
    z
      .object({ items: z.array(z.unknown()), coupon: z.unknown() })
      .parse((await api(page, '/cart')).body),
  ).toMatchObject({ items: [], coupon: null })
  expect(
    z.array(orderSchema).parse((await api(page, '/orders')).body),
  ).toHaveLength(0)
  expect(
    z
      .object({ priceEth: z.string() })
      .parse((await api(page, '/nfts/emerald-042')).body).priceEth,
  ).toBe('1.19')
})

test('sessão expirada protege perfil, carteiras e favoritos; formulários não têm overflow', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/perfil?mock=session-expired')
  await page.reload()
  await expect(
    page.getByText('Entre na sua conta para acessar esta área.'),
  ).toBeVisible()
  for (const path of ['/profile', '/wallets', '/favorites'])
    expect((await api(page, path)).status).toBe(401)
  await page.goto('/carteiras')
  await expect(
    page.getByText('Entre na sua conta para acessar esta área.'),
  ).toBeVisible()
  await page.goto('/favoritos')
  await expect(
    page.getByText('Entre na sua conta para acessar esta área.'),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
