# Lighthouse local — build de demonstração

Em 09/11/2026, foram feitas três medições por rota/perfil, com Lighthouse 13.6.0 e Playwright Chromium 158, no Windows, Node 24.20.0 e npm 11.16.0. O `npm run build` usa `.env.demo` e mantém MSW, imagens, fontes e Socket.IO. O Vite preview serviu `http://127.0.0.1:4173`; os perfis mobile usaram a emulação padrão do Lighthouse, e os desktop usaram `--preset=desktop`. Chrome headless foi iniciado a cada medição. Os 24 arquivos `.report.html` e `.report.json` são os relatórios brutos. [summary.json](summary.json) contém as medianas calculadas por [lighthouse-summary.mjs](../../../scripts/lighthouse-summary.mjs).

| Rota e perfil   | Performance | Acessibilidade | Boas práticas | SEO | LCP mediano | CLS mediano | TBT mediano |
| --------------- | ----------: | -------------: | ------------: | --: | ----------: | ----------: | ----------: |
| Home mobile     |          92 |             96 |            96 |  92 |     3121 ms |       0,002 |      146 ms |
| Home desktop    |          99 |             95 |            96 |  92 |      968 ms |       0,004 |        0 ms |
| Detalhe mobile  |          93 |            100 |            96 |  92 |     3030 ms |       0,078 |       80 ms |
| Detalhe desktop |         100 |             97 |            96 |  92 |      797 ms |       0,001 |        0 ms |

As quatro medianas locais cumprem as metas de 90/95/95/90. Antes dos ajustes, o detalhe desktop marcou 88 por deslocamento do rodapé durante o carregamento; a altura reservada pelo skeleton reduziu o CLS para cerca de 0,001. A home mobile teve mediana inicial de 89; antecipar o fundo do hero no HTML elevou a mediana para 92. O chunk principal ainda ultrapassa 500 kB, mas não impediu as metas locais. **Esses números não substituem a medição da URL pública**, que depende da publicação.

Para reproduzir, depois de `npm ci`, rode `npm run build` e `npm run preview` em um terminal. Em outro terminal PowerShell:

```powershell
$env:CHROME_PATH = (node -e "console.log(require('playwright').chromium.executablePath())")
npx --yes lighthouse@13.6.0 http://127.0.0.1:4173/ --quiet --chrome-flags='--headless=new' --output=json --output=html --output-path=docs/evidence/lighthouse/home-mobile-1
npx --yes lighthouse@13.6.0 http://127.0.0.1:4173/nfts/emerald-042 --quiet --chrome-flags='--headless=new' --preset=desktop --output=json --output=html --output-path=docs/evidence/lighthouse/detail-desktop-1
```

Repita cada combinação três vezes, mudando o sufixo `-1`, `-2`, `-3`, e execute `node scripts/lighthouse-summary.mjs`. O script exige os 12 relatórios JSON e falha se algum contiver erro de execução. Para outras máquinas, as pontuações podem variar por CPU, navegador e hospedagem.
