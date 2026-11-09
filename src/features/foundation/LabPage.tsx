import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getValidated, requestValidated } from '@/shared/api/client'
import {
  healthSchema,
  resetResultSchema,
  type SocketProbe,
} from '@/shared/api/contracts'
import { openTransportProbe } from '@/shared/realtime/probe'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'

export function LabPage() {
  const reset = useMutation({
    mutationFn: () =>
      requestValidated(
        { method: 'POST', url: '/demo/reset' },
        resetResultSchema,
      ),
    onSuccess: () => window.location.assign('/laboratorio'),
  })
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getValidated('/health', healthSchema, { signal }),
    enabled: false,
    staleTime: 0,
  })
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState('Desconectado')
  const [payload, setPayload] = useState<SocketProbe | null>(null)
  const connection = useRef<Awaited<
    ReturnType<typeof openTransportProbe>
  > | null>(null)
  useEffect(() => {
    if (!enabled) return
    let disposed = false
    void openTransportProbe(
      (event) => {
        if (!disposed) setPayload(event)
      },
      (nextStatus) => {
        if (!disposed) setStatus(nextStatus)
      },
    )
      .then((client) => {
        if (disposed) {
          client.close()
          return
        }
        connection.current = client
        client.connect()
      })
      .catch(() => {
        if (!disposed) setStatus('Não foi possível conectar')
      })
    return () => {
      disposed = true
      connection.current?.close()
      connection.current = null
    }
  }, [enabled])
  return (
    <div className="market-container mt-8">
      <h1 className="page-heading">Laboratório de integração</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
        Área técnica da demonstração. As ações abaixo verificam os transportes
        REST e Socket.IO no build, sem servidor de backend ou operação
        comercial.
      </p>
      <div className="mt-8 grid gap-7 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>REST interceptado</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-sm leading-6 text-muted-foreground">
              UI → TanStack Query → Axios → MSW → resposta validada → UI.
            </p>
            <Button
              onClick={() => {
                void health.refetch()
              }}
              disabled={health.isFetching}
            >
              {health.isFetching ? 'Consultando…' : 'Consultar API'}
            </Button>
            <div role="status" className="mt-5 min-h-20 text-sm leading-7">
              {health.isError ? (
                <p role="alert">{health.error.message}</p>
              ) : health.data ? (
                <>
                  <p>{health.data.message}</p>
                  <p>Serviço: {health.data.service}</p>
                  <p>Cenário: {health.data.scenario}</p>
                </>
              ) : (
                'Aguardando consulta.'
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Transporte Socket.IO</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-sm leading-6 text-muted-foreground">
              MSW + binding → WebSocket / Engine.IO → socket.io-client →
              listener validado.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={enabled}
                onClick={() => {
                  setStatus('Conectando…')
                  setPayload(null)
                  setEnabled(true)
                }}
              >
                Conectar Socket.IO
              </Button>
              <Button
                variant="outline"
                disabled={!enabled || status !== 'Conectado via WebSocket'}
                onClick={() => connection.current?.request()}
              >
                Solicitar evento
              </Button>
              <Button
                variant="ghost"
                disabled={!enabled}
                onClick={() => {
                  setEnabled(false)
                  setStatus('Desconectado')
                  setPayload(null)
                }}
              >
                Desconectar
              </Button>
            </div>
            <div role="status" className="mt-5 min-h-20 text-sm leading-7">
              <p>{status}</p>
              {payload && (
                <>
                  <p>{payload.message}</p>
                  <p>Evento: {payload.eventId}</p>
                  <p>
                    Versão: {payload.version} · transporte: {payload.transport}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-7">
        <CardHeader>
          <CardTitle>
            <h2>Cenários reproduzíveis</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-7 text-muted-foreground">
            A seleção recarrega a página e limpa o cache em memória. Os cenários
            afetam a leitura REST; o teste Socket.IO permanece independente.
          </p>
          <form
            className="flex flex-wrap items-end gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const value = new FormData(event.currentTarget).get('mock')
              const selected = typeof value === 'string' ? value : 'success'
              window.location.assign(
                `/laboratorio?mock=${encodeURIComponent(selected)}`,
              )
            }}
          >
            <div className="min-w-0 max-w-full">
              <Label htmlFor="scenario">Cenário REST</Label>
              <select
                id="scenario"
                name="mock"
                defaultValue={
                  new URLSearchParams(window.location.search).get('mock') ??
                  'success'
                }
                className="mt-2 block h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="success">Sucesso</option>
                <option value="empty">Catálogo vazio</option>
                <option value="slow">Latência de 2 segundos</option>
                <option value="error">HTTP 503</option>
                <option value="invalid">Resposta inválida</option>
                <option value="offline">Falha de conexão</option>
                <option value="retry">
                  Falha transitória no catálogo/detalhe
                </option>
                <option value="cart-error">
                  Falha ao adicionar ao carrinho
                </option>
                <option value="favorite-error">Falha ao salvar favorito</option>
                <option value="session-expired">Sessão expirada</option>
                <option value="wallet-declined">Carteira recusada</option>
                <option value="order-declined">Pedido recusado</option>
                <option value="order-pending">Pedido pendente</option>
                <option value="timeout-after-create">
                  Timeout após criação
                </option>
                <option value="quote-expired">Cotação expirada</option>
              </select>
            </div>
            <Button variant="outline" type="submit">
              Aplicar cenário
            </Button>
          </form>
          <div className="mt-7 border-t border-border pt-6">
            <h3 className="font-bold">Restaurar demonstração</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Apaga contas criadas, sessão, carrinhos, favoritos, carteiras,
              cotações, pedidos e alterações do mercado neste navegador.
            </p>
            <Button
              variant="outline"
              disabled={reset.isPending}
              className="mt-4 h-auto whitespace-normal text-left"
              onClick={() => {
                if (
                  window.confirm(
                    'Restaurar todos os dados simulados neste navegador?',
                  )
                )
                  reset.mutate()
              }}
            >
              {reset.isPending
                ? 'Restaurando…'
                : 'Restaurar dados de demonstração'}
            </Button>
            {reset.isError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {reset.error.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
