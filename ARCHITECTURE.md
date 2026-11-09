# Arquitetura do NFT Marketplace

## Estado atual — Etapa 4, 08/11/2026

O fluxo comercial de demonstração agora vai do carrinho ao recibo via API MSW:
sessão, carteiras simuladas, cotação versionada, tentativa idempotente, pedido
pendente e liquidação confirmada ou recusada. Preço, desconto, taxa, estoque e
autorização são decididos nos handlers; a UI consome os contratos validados por
Zod via Axios e TanStack Query. Eventos `nft.updated` e `order.updated` passam
pelo transporte Socket.IO interceptado pelo MSW e provocam reconciliação REST.
Consulte [docs/STAGE-4.md](docs/STAGE-4.md) para endpoints, testes e limites.
As seções anteriores abaixo são históricas.

## Estado atual — Etapa 3, 08/11/2026

Catálogo com filtros combinados, ordenação, paginação e URL; detalhe com galeria,
edição e limites; primeira adição e leitura do carrinho via REST MSW com persistência
por visitante. Contratos Zod validam a fronteira e preços usam wei inteiro.
O escopo, as decisões visuais, as limitações e os 54 testes E2E executados estão em
[docs/STAGE-3.md](docs/STAGE-3.md). O conteúdo da Etapa 2 abaixo é histórico.

## Estado atual — 08/11/2026

A Etapa 2 implementa Tailwind/shadcn, identidade Kurio, Router/404, Query,
Axios com AbortSignal, validação Zod e MSW no build de demonstração. A home lê
previews pela rede; `/laboratorio` prova REST e Socket.IO real sobre WebSocket
interceptado. Componentes não importam mocks. Cache público: stale 30 s, GC 5 min,
um retry transitório; 4xx/JSON inválido sem retry; mutations sem retry automático.

O bootstrap aguarda o worker antes de importar/montar React e carregar o cliente
Socket.IO. Foram fixados MSW 2.15.0, binding 0.2.0 e cliente 4.8.4; não há backend.
O novo Figma abriu e seus contextos/assets locais fundamentam o tema. Login
mobile continua com limitação de captura. Não se afirma fidelidade integral.

Arquitetura efetiva, contratos, transporte, decisões visuais, evidências e
pendências estão em [docs/STAGE-2.md](docs/STAGE-2.md). Autenticação, carrinho,
checkout, persistência privada e eventos de negócio ainda não foram implementados.
Branch, HEAD e README original foram preservados, sem commit/push/deploy.

## Registro histórico

O conteúdo abaixo preserva o diagnóstico e as propostas da Etapa 1, em 06/11.
As antigas afirmações de ausência de integrações/Figma referem-se àquela data;
o estado atual é o descrito acima e em `docs/STAGE-2.md`.

## Estado em 06/11/2026

Somente a preparação da Etapa 1 foi implementada. A página inicial é uma
verificação técnica de execução; não representa o design nem um marketplace
funcional. O README original continua sendo a fonte dos requisitos.

O repositório começou apenas com `README.md`, na `main`, commit `fea4e7c`.
O trabalho acontece em `feat/etapa-1-foundation`. Nenhum commit, push ou deploy
está autorizado nesta etapa.

## Limitação do Figma

Arquivo solicitado:
[Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

Foram tentados `create_session` e `get_metadata` no conector Figma. Ambos
retornaram falta de permissão de edição. A abertura pela ferramenta web também
falhou. Nenhum frame, token, componente, fonte ou asset pôde ser inspecionado.
Não se afirma fidelidade visual. A lista de telas em `docs/REQUIREMENTS.md` vem
do README, e não de uma leitura do Figma.

Antes de implementar o design system, é necessário conseguir acesso ao arquivo
ou referências exportadas verificáveis. Cores e fonte de sistema da página de
preparação são provisórias e não foram extraídas do design.

## Organização e dependências

SPA com React, TypeScript e Vite. A separação por funcionalidade mantém os
componentes, contratos e serviços de um fluxo próximos. A área compartilhada
receberá apenas código reutilizado de fato; evita-se uma abstração genérica para
cada arquivo. O custo é manter disciplina nas fronteiras entre os módulos.

```text
src/
  main.tsx              # monta o React no HTML
  app/                  # composição global e estilos iniciais
  features/             # módulos por fluxo; apenas orientação nesta etapa
  shared/               # infraestrutura comum; apenas orientação nesta etapa
  mocks/                # simulação de rede; apenas orientação nesta etapa
public/                 # assets locais futuros
tests/e2e/              # smoke test da preparação
docs/                   # requisitos, execução e evidências
```

As configurações do TypeScript separam navegador, ferramentas Node e testes E2E.
Os testes têm tipos Node e DOM porque executam código nos dois ambientes. `strict`,
`noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` ajudam a encontrar
contratos incorretos antes da execução. O alias `@/` aponta para `src/` tanto no
TypeScript quanto no Vite. ESLint também analisa tipos; seu custo adicional de
execução é aceitável para detectar promises e operações inseguras.

React e React DOM renderizam a interface. Vite serve os módulos e produz o build;
o build executa também o TypeScript, pois transformar TS não substitui verificar
tipos. Prettier padroniza a escrita. Playwright comprova que o JavaScript do build
realmente monta a página no Chromium; não substitui os testes funcionais futuros.

Node foi limitado à linha 24 e a versão de referência registrada em
`.node-version`. TypeScript 6.0.3 foi escolhido porque a versão 7 disponível no
registro está fora do intervalo de suporte declarado pelo `typescript-eslint`
8.72.1 (`>=4.8.4 <6.1.0`). As dependências são salvas com versões exatas e lockfile.

O audit inicial identificou o
[aviso GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
no `minimatch` 10.2.6 usado pelas ferramentas de lint. Um override fixa a versão
corrigida 11.0.1. Trata-se de uma troca de versão major transitiva: foram
inspecionados os usos de `Minimatch` e a compatibilidade foi verificada por lint,
tipos, build e smoke. Remover o override quando os consumidores adotarem uma
versão corrigida; futuras atualizações devem revisar essa restrição.

## Stack nas próximas etapas

| Tecnologia               | Responsabilidade                                     | Introdução prevista |
| ------------------------ | ---------------------------------------------------- | ------------------- |
| TanStack Router          | Rotas, parâmetros de busca e guardas de autenticação | 2                   |
| TanStack Query           | Consultas, mutations, cache e invalidação            | 2–6                 |
| Axios                    | Único transporte REST da aplicação, com cancelamento | 2                   |
| Tailwind CSS             | Estilos e tokens do design                           | 2                   |
| shadcn/ui                | Componentes locais acessíveis adaptados ao Figma     | 2                   |
| MSW                      | Interceptação REST, cenários e persistência simulada | 2–6                 |
| socket.io-client         | Conexão, eventos e reconexão no navegador            | 6                   |
| Socket.IO                | Protocolo e contratos da integração em tempo real    | 6                   |
| @mswjs/socket.io-binding | Ponte MSW/Socket.IO a validar com WebSocket          | 6                   |
| Playwright               | Smoke inicial; depois E2E e regressão visual         | 1 e 7               |
| Lighthouse               | Auditorias do build completo                         | 7                   |

As dependências das etapas futuras não estão instaladas nem ativas. shadcn/ui
fornece código de componentes para o projeto; instalar seu CLI não significa
integrar seus componentes. A obrigação de usar efetivamente toda a stack se
aplica à entrega completa, e ainda está pendente.

## Fluxo de dados planejado

Interface → hooks de funcionalidade → Query → serviços Axios → REST interceptado
pelo MSW → base de simulação. As respostas fazem o caminho inverso. Componentes,
hooks e Axios não importam fixtures nem recebem alternativas fictícias de negócio.

Estado de busca pertence à URL; estado remoto pertence ao Query; campos e abertura
de diálogos são estado local React. Carrinho, sessão e pedidos persistem na camada
simulada, e não em cópias independentes mantidas por cada componente.

### Contratos, sessão e cache (decisões propostas)

- Contratos por recurso, com identificador, versão e erros tipados. Tipos TS não
  validam JSON em runtime: validação de respostas será definida ao criar a API.
- Sessão recuperada pela API antes de liberar rotas privadas. Login preserva o
  destino e mescla o carrinho visitante; expiração preserva o contexto do checkout.
- Chaves privadas incluem o usuário. Logout/troca de conta cancela consultas,
  remove o cache privado e encerra subscriptions antes de abrir outra sessão.
- Listagens incluem todos os parâmetros normalizados na chave; Axios recebe o
  `AbortSignal` do Query para cancelar respostas obsoletas.
- Política inicial proposta: `staleTime` de 30 segundos para catálogo/detalhe,
  sessão e cotação sempre revalidadas, cache inativo por 5 minutos. Valores serão
  confirmados na implementação, conforme os cenários.
- Consultas GET podem repetir uma vez em falha transitória; 4xx não têm retry
  automático. Mutations não repetem indiscriminadamente. Pedidos só podem ser
  retomados com a mesma chave de idempotência e mesmo conteúdo.
- Favoritos terão mutation otimista com snapshot, rollback e invalidação final.

### Precisão monetária e compra

ETH trafega em strings decimais. A proposta é converter para `bigint` em wei
(18 casas) em utilitários puros, calcular com inteiros e converter de volta para
string. Não usar `Number`, `parseFloat` ou multiplicação de floats para valores.
`bigint` não é serializado em JSON: a fronteira HTTP/persistência usa strings.
Percentuais exigem política explícita de arredondamento e testes de limites.

A API de cotação será a autoridade para preços, descontos, disponibilidade e
taxas. A criação envia a versão da cotação e chave de idempotência persistida.
Mudanças exigem revisão explícita. Mesma chave e conteúdo recuperam o pedido;
mesma chave com conteúdo diferente retorna conflito. Timeout não autoriza uma
nova compra. O recibo usa snapshot imutável; só confirmação da simulação permite
mostrar sucesso e remover as quantidades efetivamente compradas.

### Tempo real e persistência

MSW e sua integração Socket.IO compartilharão a base com os handlers REST.
Será feito um teste de compatibilidade com `socket.io-client` e transporte
WebSocket antes de implementar os fluxos de eventos. O binding ainda não foi
instalado nem validado; não se assume suporte ao transporte polling.

Eventos `nft.updated` e `order.updated` carregarão `eventId`, recurso e versão;
eventos privados também terão identidade da sessão/usuário. O cliente descarta
duplicatas e versões antigas. Reconexão invalida e reconcilia recursos ativos
com REST, inclusive pedido pendente. Confirmado e recusado são estados terminais.
O socket nunca será substituído por chamadas diretas a setters ou ao cache.

Persistência simulada será versionada e isolada por usuário. Fixtures terão no
mínimo dois usuários, senhas fictícias derivadas com salt, cenários reproduzíveis
e reset integral. O armazenamento local demonstra comportamento, sem representar
segurança de produção. Não haverá blockchain, carteira ou pagamento real.

## Qualidade e entrega ainda pendentes

O smoke atual só verifica inicialização, refresh, ausência de erros no navegador e
overflow em 390/768/1440 pixels. Não valida catálogo, sessão, compra, API ou socket.
Não há baselines visuais nem auditorias Lighthouse nesta etapa. Auditar a página
de preparação não demonstraria a performance exigida do marketplace.

Os testes completos precisarão de reset por teste e controle de relógio, latência
e eventos. Lighthouse usará build otimizado com assets reais: início/detalhe ×
mobile/desktop × 3 medições, medianas, LCP/CLS/TBT e relatórios HTML/JSON.

O deploy final exigirá fallback SPA, mocks disponíveis no build e refresh em todas
as rotas. Repositório próprio, commit, push e deploy aguardam autorização explícita.

## Referências consultadas

- [Vite: início e requisitos do ambiente](https://vite.dev/guide/)
- [React com TypeScript](https://react.dev/learn/typescript)
- [TypeScript: modo strict](https://www.typescriptlang.org/tsconfig/strict.html)
- Versões, engines e peer dependencies consultadas no registro npm em 06/11/2026.
