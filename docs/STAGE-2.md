# Etapa 2 — design system e base integrada

Lote de 08/11/2026. Branch preservada: `feat/etapa-1-foundation`, HEAD original `fea4e7c`. Não houve commit, push, deploy, backend, pagamento ou autenticação completos. O README oficial permanece intacto.

## Implementação disponível

| Área           | Código e comportamento efetivos                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tema Kurio     | `src/app/theme.css`: Tailwind 4 via plugin Vite, tokens sRGB, aliases semânticos, Roboto Mono local 400/500/700, container de 1200, hero de 450, grid/sidebar e breakpoints                  |
| shadcn/ui      | Button, Input, Card, Label e Skeleton locais, obtidos do registry oficial New York, todos usados nas páginas. CVA/Slot, estilos de foco, disabled e tema adaptados; Skeleton recebeu shimmer |
| Acessibilidade | Skip link, landmarks, headings, labels, mensagens status/alert, foco visível, navegação por teclado, Sheet composto com Radix Dialog, Escape/retorno de foco, movimento reduzido             |
| Layout         | Header desktop, busca mobile, navegação inferior, footer, sidebar de conta, cards e hero com variantes de composição                                                                         |
| Navegação      | TanStack Router: home, detalhe por ID, carrinho, pagamento, pedido por ID, login, cadastro, perfil, carteiras, favoritos, laboratório e 404; acesso direto/refresh no preview SPA            |
| REST           | Home lê nove previews e busca por nome; formulário altera `q` na URL; Query → Axios `/api/nfts` → MSW → Zod → cards. Nenhuma fixture importada pela UI                                       |
| Query          | Queries por termo normalizado, stale 30 s, GC 5 min; um retry para falhas transitórias, nenhum para 4xx/resposta inválida; mutations sem retry automático                                    |
| Cenários       | `mock=success/empty/slow/error/invalid/offline`, deterministicamente definidos no MSW; recarregar reconstitui as fixtures e limpa cache em memória; parâmetro preservado nos links internos  |
| Socket.IO      | `/laboratorio`: cliente 4.8.4 com WebSocket, handshake do binding, `probe.request` e `probe.result`, validação de evento e limpeza de listeners/conexão                                      |
| Build de demo  | `dev` e `build` usam modo demo e `.env.demo`; worker inicia antes de importar/montar React e antes de carregar `socket.io-client`; assets/fontes locais                                      |

As rotas comerciais e de conta, exceto a leitura da seleção da home, são **páginas de disponibilidade futura**, não fluxos funcionais completos. Não contêm dados privados, pedidos confirmados ou formulários que fingem sucesso. Detalhe aceita ID na rota, mas ainda não consulta o recurso nem trata NFT inexistente. O 404 refere-se a rota inexistente. A ausência de guardas de sessão não expõe dados privados neste lote, porque nenhum recurso privado foi implementado.

## Design e decisões verificáveis

Referência principal: [cópia oficial do Figma](https://www.figma.com/design/mYZDrnYbgsLFgIw7WhQ7DB/Frontend-Challenge--Copy-?node-id=0-1). Fontes locais da auditoria: `C:\Projetos\junglegaming\design-oficial`, relatórios 00/01/02/03/04, contextos de design e capturas dos frames `2:2` (home desktop) e `14:5226` (home mobile). Não foi usado código ou asset de participante.

Identidade aplicada: KURIO/Kurio, Roboto Mono, fundo `#140D0A`, cards `#241612`, superfície `#2F1D15`, texto `#F5F1EB`/`#CFB28C`, cobre `#D28A4C` e destaque `#E89B55`. GreenMint permanece apenas como nome da página no Figma. A home usa os títulos específicos de cada plataforma.

Foram selecionados **22 assets do Figma**, incluindo quatro PNG distintos reutilizados, fundos/dots do hero, ícones de navegação e cinco SVG sociais. Origem, frame, variável, nós, dimensões e SHA-256 estão em [design-assets.json](evidence/design-assets.json). Os SVG foram copiados sem editar seus paths. A fonte vem de `@fontsource/roboto-mono`; sua licença OFL foi incluída em `public/assets/Roboto-Mono-OFL.txt`. Não há URL temporária do Figma no runtime.

As seguintes decisões/adaptações são nossas, e não medições novas do Figma:

- Quebra desktop a 1280 px; tablet fluido com grade de três colunas em 768 e duas no mobile. Não há frame tablet.
- Contorno de input `#95724D`, mais visível que a borda decorativa `#3F2319`; coral como erro semântico, além do uso original de asterisco. Ambos devem ser reavaliados nos formulários completos.
- Barra inferior com labels e quatro destinos, sem a ação central não especificada; ações comerciais/favoritos permanecem indisponíveis.
- Busca textual extra na área de catálogo desktop. Ordenação, filtros de coleção/preço/rede, tabs comerciais e paginação não estão implementados; o painel declara essa disponibilidade futura. Seus nomes são composição do layout, não filtros que aparentam funcionar.
- A posição sem nome na grade original recebeu fixture `Amber Echo #208`; não é copy extraída do Figma. O domínio da próxima fatia deverá definir o catálogo definitivo.
- Footer compacto em mobile e indicação de newsletter/social ainda indisponíveis. Editorial/Blog e carrosséis não foram implementados. Dots do hero são decorativos, sem anunciar controle de slides.
- Páginas futuras usam Card e mensagem clara. Não reproduzem ainda os formulários/modal de auth, carrinho ou recibo. Adaptações completas de confirmação/perfil/carteiras mobile seguem no relatório 03 e não estão concluídas neste lote.

Foi feita comparação visual manual com os previews do Figma e inspeção de geometria do build: em 1440, hero x=120/y=101/1200×450, arte x=870/450² e catálogo y=647. Capturas próprias de 390/768/1440 estão nos artefatos Playwright; há uma captura adicional 414 no diretório externo de evidências. Isso verifica as âncoras e a identidade, **não certifica fidelidade integral**. Diferenças de composição acima são conhecidas; não foram criadas ou atualizadas baselines para esconder diferenças. Login mobile segue sem captura oficial por limite Starter, conforme relatório de design 04.

## Compatibilidade do transporte

A instalação inicial resolveu MSW 3.0.4, incompatível com o peer `^2.10.2` do binding publicado 0.2.0. Foi substituído por **MSW 2.15.0**, com lockfile válido. A API publicada é `toSocketIo`, diferente da API `SocketIo` atualmente mostrada na branch principal do pacote. A implementação segue o código/tipos do pacote instalado.

MSW 2.15 remove `/socket.io/` antes de comparar o handler WebSocket (`WebSocketHandler.parse`). Por isso o handler usa `ws(s)://location.host`, enquanto o cliente realmente conecta a `/socket.io/?EIO=4&transport=websocket`. A primeira tentativa usava o path no handler e não interceptava o handshake; o erro foi investigado no trace e corrigido, sem servidor de fallback.

O binding faz o handshake Engine.IO/default namespace e codifica os eventos. O mock mantém um ping a cada 15 s e cancela o timer no fechamento. O cliente é carregado depois do interceptor, usa `forceNew`, desabilita reconexão automática neste spike e remove listeners antes de desconectar. A UI só recebe payload pelo listener `socket.io-client`; não importa nem chama o emissor do mock.

Limites: somente WebSocket, namespace padrão e eventos textuais neste lote. Polling, binários, acknowledgements, rooms, eventos privados e reconciliação de negócio não foram implementados. O teste de transporte não substitui `nft.updated`/`order.updated`, deduplicação, versões e retomada de pedido da Etapa 6. O relógio do Playwright avança 31 s para verificar a conexão através dos heartbeats, sem espera real prolongada.

## Contratos em uso

- `GET /api/nfts?q=...` → `{items:[{id,name,artwork,priceEth,version}],total,query}`. `artwork` é enum local permitido; preço é string decimal com até 18 casas, quantidade/versão inteira quando aplicável. O termo é limitado a 80 caracteres na URL.
- `GET /api/health` → `{service:'kurio-demo',revision,scenario,message}`; consulta manual no laboratório.
- Erro REST → `{error:{code,message}}` com status HTTP; Axios normaliza erro de rede/timeout e mantém status/código em `ApiError`. Cancelamento permanece um cancelamento Axios, não erro de negócio.
- `probe.request` sem payload → `probe.result` com `{eventId,resourceId:'transport-probe',version,transport:'websocket',message}`; validado com Zod antes de apresentar.

Esquemas estão em `src/shared/api/contracts.ts`. A fronteira usa `unknown` e `safeParse`; TS não substitui validação de JSON. O MSW está restrito a endpoints implementados, com erro para `/api/*` não tratado; arquivos estáticos permanecem pass-through. A seleção de cenários ocorre por URL na camada de mocks, não por import ou acesso direto à fixture na UI.

## Validação e reprodução

```powershell
npm ci
npm run check
npm run build
npm run test:e2e
npm run test:e2e:report
```

Playwright serve o build via Vite preview, em Chromium e 390/768/1440. A suíte cobre bootstrap/refresh sem erro, REST respondido pelo service worker, busca na URL e resposta fora de ordem, rotas diretas e 404, loading/vazio/HTTP503/retry/JSON inválido, fonte/imagens locais, painel com Escape/foco e reduced-motion, handshake/evento/heartbeat/desconexão/nova conexão Socket.IO. HTML em `playwright-report/index.html`, JSON em `test-results/results.json`, screenshots e anexos por teste. Não são baselines de regressão visual.

Resultado final da execução e inventário de arquivos são registrados em [stage-2-checks.json](evidence/stage-2-checks.json), após os comandos. A primeira rodada teve falhas e foi preservada fora do workspace em `C:\Projetos\junglegaming\etapa-2-evidencias\primeira-rodada`: captura do corpo HTTP depois de navegar, busca duplicada em tablet, verificação prematura de imagens lazy e path do handler Socket.IO. Não se declarou aquela rodada aprovada.

## Pendências e próxima fatia

O build ainda avisa sobre chunk de aplicação acima de 500 kB; não foi alterado o limite para ocultá-lo. Os quatro PNG originais somam aproximadamente 8 MB: otimização e tamanhos responsivos devem entrar antes da avaliação de performance. Não houve Lighthouse nem certificação de contraste/teclado de fluxos completos. Runtime de mocks deve continuar presente na demo avaliada.

O lote encerra com design system, estrutura e integrações demonstradas. Não entram agora autenticação, carrinho ou checkout completos. Próxima fatia recomendada: **catálogo/detalhe real**, com filtros/ordenação/paginação na URL e API, galeria e edições, inexistente/esgotado, cancelamento/erros e E2E; depois conectar carrinho visitante e sessão sem misturar sua fonte de verdade com a UI.

## Inventário e fontes técnicas

[stage-2-files.json](evidence/stage-2-files.json) lista arquivos criados/alterados
em relação aos 31 arquivos da preparação auditada. O inventário com SHA-256 fica
também em `C:\Projetos\junglegaming\etapa-2-evidencias\inventario-final.json`.
HEAD não identifica sozinho as mudanças ainda sem commit.

Fontes primárias consultadas: [Tailwind com Vite](https://tailwindcss.com/docs/installation/using-vite),
[roteamento por código](https://tanstack.com/router/latest/docs/framework/react/routing/code-based-routing),
[registry do Button shadcn](https://ui.shadcn.com/r/styles/new-york/button.json) e
[binding Socket.IO](https://github.com/mswjs/socket.io-binding). Para o binding,
os tipos, README e fonte da versão **0.2.0 instalada** prevaleceram sobre os exemplos
da branch principal, que já descrevem outra API.
