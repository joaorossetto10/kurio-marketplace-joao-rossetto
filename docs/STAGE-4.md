# Etapa 4 — fluxo comercial simulado

Estado em 08/11/2026, branch `feat/etapa-1-foundation`, sem commit, push ou deploy. O `README.md`, o lockfile e as versões das dependências foram preservados. Este build usa MSW no navegador e armazenamento local; não há backend, blockchain ou pagamento real.

## Caminho funcional

Catálogo → detalhe → carrinho → login/cadastro → carteira fictícia → cotação → revisão explícita → pedido pendente → confirmação/recusa → recibo. A resposta da API determina cada estado; clicar em “Confirmar compra” não cria confirmação visual imediata. Carrinho, sessão, cotação, tentativa e pedido sobrevivem a refresh no mesmo navegador. A sessão expira em 15 minutos.

O carrinho pertence ao visitante até o login, quando é mesclado com o da conta. Se o estoque cair durante a mesclagem, as quantidades são preservadas e a interface solicita redução antes da nova cotação. `KURIO10` aplica 10% ao subtotal; o desconto é divisão inteira de wei (arredondamento para baixo). A taxa simulada é `0.016 ETH` em carrinhos não vazios. A API recalcula todos os totais em `bigint`, representa ETH como string decimal e rejeita cotação expirada, estoque insuficiente, mudança de preço/carrinho ou carteira desconectada.

Cadastro usa PBKDF2/SHA-256 com salt e não persiste senha em claro. Contas de demonstração: `alice@kurio.test` / `KurioAlice2026!` e `bruno@kurio.test` / `KurioBruno2026!`. Tokens e hashes no `localStorage` pertencem **somente à simulação** e não representam segurança de produção. Logout e expiração desconectam a carteira; troca de token cancela consultas, limpa o cache Query e substitui listeners Socket.IO. Handlers privados validam sessão e proprietário; o replay verifica proprietário antes de devolver o pedido.

## Endpoints adicionados

| Área              | Endpoints                                                                                                                                         | Decisão da API                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Carrinho          | `GET /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:nftId/:editionId`, `PUT/DELETE /api/cart/coupon`, `GET /api/cart/summary` | Estado persistido por conta/visitante; estoque, cupom e totais               |
| Conta             | `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/session`                                                                           | Credenciais, sessão, mesclagem e expiração                                   |
| Carteiras         | `GET /api/wallets`, `GET/POST/DELETE /api/wallets/connection`                                                                                     | Duas carteiras fictícias por conta, rede, provedor e recusa simulada         |
| Cotação           | `POST /api/quotes`, `GET /api/quotes/:id`                                                                                                         | Snapshot, proprietário, versões, validade e total                            |
| Pedidos           | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`                                                                                      | Chave de idempotência, revalidação, pendência, liquidação e recibo           |
| Controle de teste | `POST /api/demo/nfts/:id/change`, `/api/demo/events`, `/api/demo/socket/drop-and-change`                                                          | Alteração determinística e teste do transporte; não usados pela UI comercial |

Contratos Zod estão em `src/shared/api/contracts.ts`. O cliente REST está em `src/shared/api/client.ts`; os serviços ficam em `src/features/{auth,cart,checkout}/api.ts` e `order-api.ts`. Regras comerciais e persistência ficam em `src/mocks/{auth,cart,wallet,quote,order,commerce}-store.ts`. Componentes não importam mocks. O `Idempotency-Key` e o corpo são persistidos juntos em `src/features/checkout/attempt.ts` **antes** do POST. Mesmo par retorna o pedido original; corpo diferente dá 409; outra conta dá 403. Um timeout após gravação do pedido permite replay sem criar outro. Recibo lê o snapshot do pedido, mesmo após alteração do preço do NFT. Na confirmação, só as quantidades compradas são subtraídas; recusa mantém o carrinho.

`src/mocks/socket.ts` usa `@mswjs/socket.io-binding` sobre WebSocket interceptado. `src/features/realtime/BusinessRealtime.tsx` recebe eventos no `socket.io-client`, descarta ID duplicado, versão obsoleta e proprietário diferente, compara a versão com o cache REST e invalida consultas. Na conexão ou reconexão, reconsulta REST. O mock revalida a sessão para cada evento privado. O estado do pedido também é consultado periodicamente enquanto pendente, permitindo recuperação sem socket.

## Referência visual e limites

Foram usados os frames oficiais locais `design-oficial/frames/03` (carrinho desktop), `04` (pagamento), `05` (confirmação), `06`/`07` (login/cadastro), `12` (carrinho mobile), `13` (pagamento mobile) e `15` (cadastro mobile). O frame `14` de login mobile contém metadados, sem captura. Roboto Mono, paleta Kurio, botões, cards e retratos já presentes foram mantidos; os retratos usados no carrinho coincidem com os assets previamente importados. Nenhum asset de concorrente foi usado.

As capturas Playwright de carrinho, login, pagamento e recibo ficam em `test-results/stage-4-compra-simulada-*/`. A comparação mostrou diferenças: o carrinho mobile ainda não reproduz o painel de total fixo do frame; o pagamento usa um formulário funcional mais longo, com cotação antes da revisão final no mobile; login e recibo são páginas em vez de overlays desktop. O rodapé e a navegação inferior foram ocultados nas telas comerciais mobile para não competir com as ações. A adaptação do recibo mobile é uma decisão funcional, pois não há frame específico. **Não se afirma fidelidade pixel a pixel.**

## Verificação e pendências

Antes da Etapa 4, `npm run check`, `npm run build` e os 54 E2E existentes passaram. Os E2E da Etapa 4 cobrem os três tamanhos 390, 768 e 1440 px, inclusive MSW real (`Response.fromServiceWorker()`), eventos Socket.IO, reconexão com evento perdido, autenticação com duas contas, timeout, idempotência, cotação inválida, estoque, recusa e recibo após refresh. Veja `docs/evidence/stage-4-checks.json` para a execução final e `tests/e2e/stage-4.spec.ts` para asserções reproduzíveis.

Pendências para a entrega integral: CRUD de perfil, avatar, senha e carteiras; favoritos autenticados com atualização otimista; reset integral de cenário; auditorias Lighthouse; refinamento visual dos overlays e baselines versionadas. O build informa um chunk acima de 500 kB; o aviso não impede execução, mas deve ser revisto no ajuste de performance.
