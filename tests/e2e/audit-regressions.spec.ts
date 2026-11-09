import { expect, test, type Page } from '@playwright/test'

async function addEmerald(page: Page) {
  await page.goto('/nfts/emerald-042')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(
    page.getByText('1 unidade adicionada ao carrinho.'),
  ).toBeVisible()
}

async function signIn(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail', { exact: true }).fill('alice@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioAlice2026!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

test('carrinho com cupom cabe em 320 px e o campo acompanha a remoção', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await addEmerald(page)
  await page.goto('/carrinho')
  const summary = page.getByRole('region', { name: 'Resumo do carrinho' })
  const coupon = summary.getByLabel('Código promocional')
  const apply = summary.getByRole('button', { name: 'Aplicar' })
  const remove = summary.getByRole('button', { name: 'Remover cupom' })
  const checkout = summary.getByRole('link', { name: 'Conectar e finalizar' })
  await coupon.fill('KURIO10')
  await apply.click()
  await expect(remove).toBeVisible()
  await expect(summary).toContainText('1.087 ETH')
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBe(0)
  for (const control of [
    apply,
    checkout,
    page.getByRole('button', { name: 'Remover Emerald Ape #042' }),
  ]) {
    await control.scrollIntoViewIfNeeded()
    await expect(control).toBeInViewport({ ratio: 1 })
  }
  await remove.click()
  await expect(remove).toHaveCount(0)
  await expect(coupon).toHaveValue('')
  await expect(summary).toContainText('1.206 ETH')
  await checkout.click()
  await expect(
    page.getByRole('link', { name: 'Entrar e continuar' }),
  ).toBeVisible()
})

test('perfil e laboratório conservam os controles em 320 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await signIn(page)
  await page.goto('/perfil')
  const avatar = page.getByLabel('Avatar simulado')
  await avatar.selectOption('emerald')
  const remove = page.getByRole('button', { name: 'Remover', exact: true })
  await remove.scrollIntoViewIfNeeded()
  await expect(remove).toBeInViewport({ ratio: 1 })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBe(0)
  await page.goto('/laboratorio')
  const scenario = page.getByLabel('Cenário REST')
  await scenario.selectOption('retry')
  await scenario.scrollIntoViewIfNeeded()
  await expect(scenario).toBeInViewport({ ratio: 1 })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBe(0)
})

test('mudar de carteira exige nova cotação antes de revisar', async ({
  page,
}) => {
  await signIn(page)
  await addEmerald(page)
  await page.goto('/pagamento')
  const connect = page.getByRole('button', {
    name: 'Conectar carteira simulada',
  })
  const quote = page.getByRole('button', { name: 'Gerar nova cotação' })
  const review = page.getByRole('checkbox', { name: /Revisei itens/ })
  await connect.click()
  await quote.click()
  await review.check()
  const previous = await page.getByText(/^Cotação:/).innerText()
  await page.getByRole('radio', { name: /Principal/ }).check()
  await connect.click()
  await expect(page.getByText(/A carteira ou o provedor mudou/)).toBeVisible()
  await expect(review).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Confirmar compra' }),
  ).toBeDisabled()
  await quote.click()
  await expect(page.getByText(/^Cotação:/)).not.toHaveText(previous)
  await expect(review).toBeVisible()
})

test('checkout orienta a cadastrar carteira após remover todas', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/carteiras')
  page.on('dialog', (dialog) => void dialog.accept())
  for (const label of ['Principal', 'Reserva']) {
    const remove = page.getByRole('button', { name: `Remover ${label}` })
    await remove.click()
    await expect(remove).toHaveCount(0)
  }
  await page.goto('/pagamento')
  await expect(page.getByText('Nenhuma carteira cadastrada')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Conectar carteira simulada' }),
  ).toBeDisabled()
  await page.getByRole('link', { name: 'Cadastrar carteira' }).click()
  await expect(page).toHaveURL(/\/carteiras$/)
  await expect(
    page.getByRole('button', { name: 'Adicionar carteira' }),
  ).toBeVisible()
})
