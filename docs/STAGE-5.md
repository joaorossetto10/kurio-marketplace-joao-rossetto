# Etapa 5 — conta e reset da demonstração

## Fluxos implementados

- `/perfil`: consulta e edição por conta, seleção simulada de avatar com quatro imagens oficiais já usadas no catálogo, alteração de senha com validação da senha atual. O mock mantém apenas salt e hash PBKDF2; sessão expirada bloqueia a tela e a API.
- `/carteiras`: consulta, cadastro, edição, exclusão confirmada e escolha de principal. Endereço, rede, tipo e demais campos passam por Zod no formulário e no MSW. A exclusão ou edição da carteira conectada a desconecta; novas cotações a rejeitam. O checkout consome a mesma lista.
- Catálogo, detalhe e `/favoritos`: ações autenticadas, persistência por conta, atualização otimista com rollback e trava para dois cliques consecutivos. A troca de sessão limpa o cache Query existente.
- `/laboratorio`: reset confirmado por `POST /api/demo/reset`; o mock apaga todas as chaves de estado conhecidas, derruba sockets, limpa tentativas em memória e a página recarrega sem cenário de falha. O novo carregamento descarta cache e listeners do cliente.

## Contratos REST

`GET/PATCH /api/profile`, `POST /api/profile/password`, `GET/POST /api/wallets`, `PATCH/DELETE /api/wallets/:id`, `PUT /api/wallets/:id/primary`, `GET/POST /api/favorites`, `DELETE /api/favorites/:nftId`, `POST /api/demo/reset`. A UI acessa esses endpoints por Axios e TanStack Query; somente os handlers MSW leem os stores. Operações privadas verificam sessão e proprietário. A documentação dos contratos está nos schemas de `src/shared/api/contracts.ts`.

## Referência visual e decisões

Os frames oficiais locais `design-oficial/frames/08` (Perfil do Colecionador, node `9:1238`) e `09` (Carteiras, node `9:1670`) orientam a barra lateral, colunas, cores, fonte e campos. No perfil, a seleção de avatar substitui o upload do frame para manter a simulação determinística. Em carteiras, a lista e as ações CRUD aparecem antes do formulário de edição para deixar o estado salvo e a carteira principal explícitos; essa é uma diferença visual do frame, que mostra o formulário primeiro. Em 390 e 768 px, os formulários seguem os padrões móveis existentes e reservam espaço para a navegação inferior; não existem frames mobile dessas telas. Não há alegação de fidelidade pixel a pixel.

## Verificação e limites

Em 09/11/2026, `npm run check`, `npm run build` e os 117 testes Playwright passaram. Os 18 novos casos de `tests/e2e/stage-5.spec.ts` cobrem 390, 768 e 1440 px, refresh, isolamento, erros, concorrência, checkout e reset. As capturas de perfil e carteiras ficam em `test-results/stage-5-*/`. O build emite aviso de chunk acima de 500 kB. O estado é local ao navegador de demonstração; não há backend nem carteira blockchain real. Não houve alteração de dependências, README, commit, push ou deploy. CI, Lighthouse e publicação ainda dependem da revisão final.
