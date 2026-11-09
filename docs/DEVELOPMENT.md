# Execução e aprendizado — Etapa 2

Estado atual: [Etapa 3](STAGE-3.md). No build de demonstração, `/` oferece busca,
filtros, ordenação e paginação; `/nfts/emerald-042` permite selecionar edição e
adicionar ao carrinho; `/carrinho` lê o estado persistido do visitante. Execute
`npm run check`, `npm run build` e `npm run test:e2e` **nessa ordem**, com o servidor
de preview externo parado. Não rode build e Playwright simultaneamente: o preview
serve `dist/` durante o teste. A suíte atual tem 54 casos em 390, 768 e 1440 px.

O `README.md` original permanece intacto. Esta documentação descreve somente o
que já está disponível e como verificar a base integrada.

## Ambiente

- Windows com Node.js 24.20.0 e npm 11.16.0 (ambiente verificado).
- Git 2.55.0.windows.5.
- Referência de Node em `.node-version`; use sua ferramenta de gerenciamento de
  versões preferida. Não é necessário alterar ferramentas globais.
- `.env.demo` habilita `VITE_ENABLE_MOCKS=true` nos scripts dev/build. Não há
  credencial, API externa ou backend necessário. Variáveis `VITE_*` são públicas:
  nunca colocar segredos nelas. Fonte e assets são servidos localmente.

## Instalação e execução

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:5173`. A home Kurio carrega nove previews via MSW; busque
`Emerald` e pressione Enter para observar URL e cards. Em `/laboratorio`, use
“Consultar API” e “Conectar Socket.IO” para as provas técnicas. Pare com `Ctrl+C`.
O servidor só escuta a máquina local; porta ocupada causa erro explícito.

```powershell
npm run check
npm run build
npm run preview
```

O preview serve o build em `http://127.0.0.1:4173`. Pare-o antes de executar os
testes: o Playwright inicia seu próprio preview e não reutiliza servidor externo.

## Verificação no navegador

```powershell
npx playwright install chromium
npm run build
npm run test:e2e
npm run test:e2e:report
```

Os testes rodam Chromium em 390, 768 e 1440 pixels e verificam montagem, refresh,
rotas, REST pelo service worker, validação/erros e transporte Socket.IO. O HTML fica
em `playwright-report/`; traces e screenshots são retidos em caso de falha, em
`test-results/`, junto ao JSON de execução e capturas. Ambos são ignorados pelo Git.

Para acompanhar interativamente, use `npm run test:e2e:ui`. Esses testes ainda
não cobrem compra/autenticação completas nem são baselines de regressão visual.

## Comandos disponíveis

| Comando                   | Objetivo                                               |
| ------------------------- | ------------------------------------------------------ |
| `npm run dev`             | Servidor Vite com atualização durante a edição         |
| `npm run typecheck`       | Verifica os projetos TypeScript de app e ferramentas   |
| `npm run lint`            | ESLint, incluindo regras que usam tipos e regras React |
| `npm run format:check`    | Confere formatação sem modificar arquivos              |
| `npm run format`          | Formata os arquivos; exclui o README original          |
| `npm run check`           | Executa tipos, lint e formatação                       |
| `npm run build`           | Verifica tipos e gera `dist/`                          |
| `npm run preview`         | Serve o conteúdo de `dist/`                            |
| `npm run test:e2e`        | Executa o smoke de inicialização nos três tamanhos     |
| `npm run test:e2e:ui`     | Abre a interface de acompanhamento dos testes          |
| `npm run test:e2e:report` | Abre o relatório HTML da última execução               |

Cenários por URL: `/?mock=success`, `empty`, `slow`, `error`, `invalid` e `offline`.
“Aplicar cenário” no laboratório recarrega a página, reiniciando o cache e as
fixtures desta base de leitura. Volte a `/?mock=success` para resetar. Lighthouse
permanece para a etapa de auditoria; não há comando que finja executá-lo.

## Entenda a base React e TypeScript

`index.html` fornece `root`. `src/main.tsx` inicia o MSW e então importa `mount`,
que usa `createRoot` para montar `App`. `App` compõe QueryProvider e RouterProvider.
Arquivos `.tsx` permitem JSX com TypeScript. O CSS global carrega no início.

React compõe telas a partir de componentes. **Props** são entradas fornecidas por
outro componente; **estado** guarda valores que podem mudar e causar nova
renderização. A home usa Query para dados remotos e Router para o termo de busca.
`StrictMode` ativa verificações extras em desenvolvimento, ajudando a detectar
problemas no ciclo de vida quando houver conexões e subscriptions.

TypeScript confere os tipos antes da execução, mas o navegador executa JavaScript.
Por isso usamos tanto `typecheck` quanto teste no navegador. Tipos também não
garantem que uma resposta de rede seja válida: Zod valida a fronteira HTTP e o
payload recebido pelo cliente Socket.IO.

O Router escolhe a tela pela URL; Query organiza dados remotos, Axios envia as
requisições e MSW responde na rede. Componentes não importam fixtures. O
laboratório é técnico; as páginas comerciais/conta ainda não executam ações.

Veja `ARCHITECTURE.md` para decisões e trade-offs, `docs/REQUIREMENTS.md` para o
mapa dos requisitos e `docs/STAGE-1.md` para os resultados da preparação.
