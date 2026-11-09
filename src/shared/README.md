# Recursos compartilhados (planejados)

- `ui/`: componentes shadcn/ui adaptados ao design e componentes acessíveis.
- `api/`: instância Axios, erros e contratos comuns de transporte.
- `lib/`: utilitários puros, incluindo conversão ETH/wei com `bigint`.
- `realtime/`: cliente Socket.IO, ciclo de vida e reconciliação.

Na Etapa 2, `api/` tem Axios, erros e schemas Zod; `ui/` tem componentes em uso;
`realtime/` tem o spike de transporte; `lib/` contém `cn` para compor classes.
Conversão ETH/wei, reconciliação e regras comerciais acima são planejamento
futuro e não estão implementadas neste lote.
