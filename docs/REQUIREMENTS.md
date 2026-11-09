# Mapa de requisitos do README

Atualização da Etapa 5 (09/11/2026): perfil, avatar simulado, troca de senha,
CRUD de carteiras, favoritos por conta e reset integral foram implementados com
contratos REST/MSW. A verificação está em [STAGE-5.md](STAGE-5.md). CI,
Lighthouse, revisão visual final e publicação continuam pendentes. Os registros
de etapas anteriores abaixo são históricos.

Atualização da Etapa 4 (08/11/2026): carrinho completo, sessão, carteiras
simuladas, cotação, revisão, pedido idempotente, recibo e eventos de negócio
estão implementados via MSW/Socket.IO. As páginas de perfil, edição de carteiras
e favoritos ainda são entradas protegidas sem CRUD; Lighthouse, reset integral
dos mocks e acabamento visual permanecem para a preparação final. Consulte
[STAGE-4.md](STAGE-4.md). As linhas históricas abaixo descrevem o plano original.

Atualização da Etapa 3 (08/11/2026): catálogo combinável na URL, detalhe e primeira
adição/leitura do carrinho foram implementados e testados nos três tamanhos.
Edição/remoção de linhas, autenticação, cotação e checkout continuam pendentes.
Veja [STAGE-3.md](STAGE-3.md) para escopo e evidência. O mapa abaixo preserva os
requisitos completos e o registro da Etapa 2.

Fonte: leitura integral do `README.md`, commit `fea4e7c`. Este mapa não substitui
o enunciado. A matriz conserva a distribuição original por etapas.

Atualização de 08/11/2026: Etapa 2 implementa tema/assets, componentes, layouts,
Router/404, Query/Axios/Zod, REST MSW em dev/build e spike Socket.IO. Busca de
previews por nome está na URL. Fluxos comerciais, sessão/isolamento e eventos de
negócio continuam pendentes. Consulte [STAGE-2.md](STAGE-2.md) para a evidência
executada e a separação do trabalho futuro.

## Critérios eliminatórios

1. Toda a stack obrigatória deve participar efetivamente da entrega.
2. Fluxos principais precisam funcionar com APIs simuladas, além da aparência.
3. Compra só é confirmada após resposta efetiva da simulação.
4. Dados privados não podem vazar entre usuários.
5. Eventos não podem ser simulados diretamente pela UI/cache.
6. É obrigatório entregar testes E2E executáveis dos fluxos.

A base atual não atende ainda ao desafio completo. Além do smoke, há E2E de
infraestrutura REST/Socket.IO e navegação; não há E2E de compra ou autenticação.

## Matriz de implementação e evidências futuras

| Origem no README       | Exigência                                                                                           | Etapas | Evidência esperada                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 1–2                    | React/TS, Router, Query, Axios/REST, Socket.IO, Tailwind, shadcn/ui, MSW, Playwright, Lighthouse    | 1–7    | Código integrado, lockfile e execução                                                                            |
| 3: telas               | Início, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil, carteiras               | 3–5    | Navegação e fluxos reais desktop/mobile                                                                          |
| 3: catálogo            | Busca/filtros combinados/ordenação/paginação na URL, reset de página, histórico e refresh           | 3      | Teste URL/API/UI, vazio, falha e respostas fora de ordem                                                         |
| 3: detalhe             | Acesso direto, inexistente, galeria, edição, quantidade, limites e favorito por usuário             | 3–4    | E2E de detalhe e autorização                                                                                     |
| 3: carrinho            | Adição/edição/remoção, disponibilidade por edição, persistência e preservação após login            | 5      | E2E com refresh/login e conflitos                                                                                |
| 3: cotação             | Cupom inválido/expirado/removido, subtotal/desconto/taxa/total pela API                             | 5      | Resumo coerente com contrato, ETH decimal e quantidade inteira                                                   |
| 3: pagamento           | Dados validados, revisão, carteira/rede, conexão/recusa/desconexão simuladas                        | 5      | E2E da revisão e erros                                                                                           |
| 3: pedido              | Revalidar cotação, exigir nova confirmação, idempotência, pendência/recusa e recuperação            | 5–6    | Clique repetido, timeout e reconexão sem duplicação                                                              |
| 3: recibo              | Apenas pedido confirmado, snapshot imutável, transação simulada                                     | 5      | Mudança de catálogo não altera recibo                                                                            |
| 3: carrinho pós-compra | Preservar falhas e remover somente itens/quantidades efetivamente comprados                         | 5      | E2E de sucesso e falhas                                                                                          |
| 3: conta               | Cadastro/login/logout, conflito, retorno ao fluxo, recuperação/expiração de sessão                  | 4      | E2E de refresh, checkout expirado e troca de usuário                                                             |
| 3: dados privados      | Checkout, perfil, carteiras, favoritos e pedidos autenticados; cache/subscriptions isolados         | 4–6    | Dois usuários e tentativa de acesso indevido                                                                     |
| 3: edição da conta     | Perfil/avatar/senha/carteiras principal e secundária, validações API, persistência                  | 4      | E2E com erro e refresh; nenhuma senha em claro                                                                   |
| 4                      | Contratos tipados, loading/vazio/erro/sucesso/background, cancelamento e isolamento                 | 2–6    | Queries parametrizadas e respostas obsoletas descartadas                                                         |
| 4                      | Mutation otimista com rollback, cache/retry/invalidação documentados                                | 4      | Falha de favorito restaura estado                                                                                |
| 5                      | Contratos de sessão/conta, NFTs, favoritos, carrinho, cotação, pedidos, perfil, carteiras           | 2–5    | Documentação e handlers REST; erros 4xx/5xx/transitórios                                                         |
| 5                      | Idempotência por conteúdo: repetição recupera, conteúdo diferente conflita                          | 5      | Teste com mesma chave e cargas iguais/diferentes                                                                 |
| 6                      | MSW na rede, base consistente/persistida, configuração de mocks também no build                     | 2–6    | Mesmo cenário em dev, demo e E2E; reset integral                                                                 |
| 6                      | Fixtures variadas para filtros/páginas, dois usuários e cenários determinísticos                    | 3–6    | Sucesso/vazio, latência/ordem, rede/HTTP, expiração, conflito, cupom, preço/estoque, timeout, confirmação/recusa |
| 6–7                    | Socket.IO real no cliente via integração MSW compatível                                             | 6      | E2E atravessa socket.io-client; transporte/limitações documentados                                               |
| 7                      | nft.updated/order.updated com identidade, versão, deduplicação e ordenação                          | 6      | Eventos velhos/duplicados não regridem estado                                                                    |
| 7                      | Reconexão, reconciliação REST, limpeza de listeners e isolamento da sessão                          | 6      | Pedido pendente recuperado, estados terminais preservados                                                        |
| 7                      | NFT no carrinho muda preço/estoque, informa/atualiza e bloqueia cotação antiga                      | 5–6    | E2E checkout com alteração via socket                                                                            |
| 8                      | Figma, assets/fontes locais e desvios documentados                                                  | 2–7    | Comparação visual; análise bloqueada por acesso nesta etapa                                                      |
| 8                      | Desktop/tablet/mobile: 390, 768, 1440; perfil/carteiras/recibo no mobile                            | 2–7    | Sem perda de conteúdo/overflow; regressão visual                                                                 |
| 8                      | Skeleton com shimmer em catálogo/detalhe/resumo, dimensões estáveis e movimento reduzido            | 3–5    | Cenário lento e prefers-reduced-motion                                                                           |
| 8                      | Teclado, foco visível/gerenciado, semântica, labels/erros, alt, contraste, feedback acessível, zoom | 2–7    | E2E e verificação manual de acessibilidade                                                                       |
| 9                      | Doze grupos E2E exigidos no enunciado, mocks reais e testes isolados                                | 3–7    | Testes Chromium desktop/mobile, relógio/latência/eventos controlados                                             |
| 9                      | Baselines versionadas de início/detalhe/carrinho/pagamento, HTML e traces das falhas                | 7      | Artefatos reproduzíveis e dados estáveis                                                                         |
| 10                     | Lighthouse em início/detalhe, mobile/desktop, três medições por combinação e medianas               | 7      | 12 auditorias, HTML/JSON, LCP/CLS/TBT, versões/ambiente                                                          |
| 10                     | Performance ≥90, acessibilidade ≥95, boas práticas ≥95, SEO ≥90                                     | 7      | Relatórios do build completo e justificativas abaixo das metas                                                   |
| 12                     | Fonte/lockfile/assets/mocks/fixtures/testes/configurações; setup e cenários documentados            | 1–8    | Execução a partir de checkout limpo sem backend privado                                                          |
| 12                     | Repositório próprio e URL pública com mocks/tempo real e refresh de rotas                           | 8      | Validação publicada; depende de autorização para push/deploy                                                     |

## Pontuação

Visual/responsividade 20; fluxos/UX 20; integração/estado 15; tempo real 10;
mocking 10; testes 10; acessibilidade 5; performance 5; arquitetura/documentação 5.

## Fora do escopo

Blockchain, extensões de carteira e pagamentos reais. Páginas editoriais, suporte,
atividade, ofertas e downloads. Ações auxiliares devem ser coerentes, sem simular
sucesso de uma funcionalidade não implementada.
