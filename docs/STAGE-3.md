# Etapa 3 — catálogo, detalhe e primeira integração do carrinho

Estado em 08/11/2026, na branch `feat/etapa-1-foundation`, sem commit, push ou deploy. O README original, o lockfile e as versões das dependências foram preservados. Esta etapa usa o build de demonstração com MSW; não há backend real.

## Fluxo implementado

- A home lista 21 NFTs de demonstração em páginas de nove. Busca, categorias, coleções, redes, preço mínimo/máximo, ordenação e página são combináveis e ficam na URL. Voltar, avançar, refresh e acesso direto restauram os controles. Alterar filtro reinicia a página; uma página acima do total é corrigida na URL.
- A consulta da lista passa por TanStack Query, Axios com `AbortSignal`, MSW e validação Zod da resposta. Estados de carregamento, zero resultados, erro e retry são visíveis. Uma resposta antiga não substitui a busca mais recente.
- `/nfts/$nftId` consulta a API, mostra galeria, metadados, edição, estoque e quantidade. O ID ausente recebe HTTP 404 do mock e tela própria. A edição sem estoque fica desabilitada. Quantidades fora do limite impedem o envio.
- A adição faz `POST /api/cart/items`; a interface só mostra sucesso após a resposta. O handler confere novamente NFT, edição, quantidade e estoque acumulado. O resumo em `/carrinho` e o contador vêm de `GET /api/cart` e persistem após refresh no mesmo navegador.
- Valores em ETH são convertidos para inteiros `bigint` em wei nas comparações e somas. A URL preserva preços como strings, inclusive `0.000000000000000001`; nenhuma operação monetária usa ponto flutuante.

## Contratos e fronteiras

| Endpoint               | Resultado                                                | Falhas relevantes                                                                               |
| ---------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `GET /api/nfts`        | Lista, total, página, total de páginas e facetas globais | 400 para parâmetros inválidos; cenários de 503, rede, latência e JSON inválido                  |
| `GET /api/nfts/:id`    | Detalhe, edições e relacionados                          | 404 para NFT inexistente                                                                        |
| `GET /api/cart`        | Carrinho do visitante, linhas, subtotal e versão         | 400 para identificação ausente/inválida; 503 de armazenamento                                   |
| `POST /api/cart/items` | Carrinho atualizado após validação                       | 400 JSON; 404 NFT; 409 estoque; 422 edição, quantidade ou campo forjado; 503 no cenário de erro |

O cliente identifica a visita com UUID no cabeçalho `X-Visitor-Id`; o mock armazena o carrinho em `localStorage` por UUID. Essa identidade **não é autenticação nem controle de acesso de produção**. O mock não reserva estoque, não sincroniza alterações concorrentes entre abas e não integra pagamentos. A UI não importa fixtures ou handlers; `src/mocks/` concentra dados e regras da simulação. Query mantém o carrinho por chave do visitante; a mutation atualiza o cache com a resposta confirmada, sem sucesso otimista.

Os cenários `?mock=retry` e `?mock=cart-error` complementam os anteriores. `retry` devolve duas falhas 503 antes de recuperar na tentativa manual; `cart-error` rejeita o POST sem alterar o carrinho. O spike Socket.IO da Etapa 2 continua no laboratório, sem evento comercial nesta etapa.

## Referência visual e decisões

A referência oficial é a cópia do Figma, frames **detalhe desktop `10:244`** e **detalhe mobile `15:5536`**, com contextos, capturas e assets em `C:\Projetos\junglegaming\design-oficial\frames\02` e `frames\11`. A home usa os frames desktop/mobile `frames\01` e `frames\10`; o tema Kurio, Roboto Mono e os quatro retratos já adotados na Etapa 2 foram mantidos. Apenas quatro SVGs adicionais do detalhe mobile entraram em `public/assets`, identificados em `docs/evidence/design-assets.json`.

Comparação mensurável com o detalhe desktop a 1440 px: galeria em `(120,129)` com `573×448`, imagem principal em `(248,131)` com `444×444` e painel direito começando em `(725,129)` com largura `595`, como no frame. No mobile a 390 px, a galeria mede `390×506`, a imagem começa em `(28,66)` e o painel sobrepõe a galeria em `y=392`; a barra fixa de compra mede 164 px. As capturas reproduzíveis estão nos resultados Playwright `test-results/.../detalhe.png` para 390, 768 e 1440 px.

As diferenças funcionais são intencionais: o CTA diz “Adicionar ao carrinho” porque o checkout ainda não existe; seleção de edição, estoque, validação, contador e mensagens ocupam mais altura que o frame estático. Os quatro controles da galeria usam a mesma imagem quando o mock dispõe de um único asset para o NFT. O layout tablet de coluna única e o resumo mínimo do carrinho são adaptações; não se afirma fidelidade visual integral nem baseline pixel a pixel.

## Verificação e próxima fatia

Antes das mudanças, `npm run check`, `npm run build` e os 21 E2E da Etapa 2 passaram. Após a implementação, `npm run check` e `npm run build` passaram; os **54 E2E** passaram em execução isolada nos três tamanhos. A primeira tentativa em paralelo com o build teve três falhas de abertura inicial mobile; a repetição isolada, sem trocar os arquivos servidos durante o teste, passou integralmente. `docs/evidence/stage-3-checks.json` guarda os resultados e a limitação do aviso de bundle acima de 500 kB.

Pendente para a próxima fatia: editar/remover linhas do carrinho, cotação/cupom, revalidação de preço antes de confirmar compra e fluxos de conta. A implementação para revisão técnica termina aqui; checkout, autenticação, favoritos autenticados e eventos de negócio ficam para etapas posteriores.
