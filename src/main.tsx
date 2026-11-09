import { bootstrapMocks } from '@/app/bootstrap'
import '@/app/styles.css'

async function start() {
  await bootstrapMocks()
  const { mount } = await import('@/app/mount')
  mount()
}

void start().catch(() => {
  const root = document.getElementById('root')
  if (root)
    root.textContent =
      'Não foi possível iniciar a demonstração. Recarregue a página para tentar novamente.'
})
