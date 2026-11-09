import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Button } from './button'
import { Icon } from './icon'

export function Panel({
  title,
  trigger,
  children,
}: {
  title: string
  trigger: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/90" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 w-[min(100%,420px)] overflow-y-auto border-l border-border bg-card p-6 shadow-xl"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest('a[href]')
            )
              setOpen(false)
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar painel">
                <Icon name="close" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-6 text-sm leading-6 text-muted-foreground">
            Explore o mercado e as áreas da sua conta.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
