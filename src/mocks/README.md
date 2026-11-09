# Camada de simulação

Na Etapa 2, configurar MSW na inicialização antes de montar o React, habilitado por
configuração tanto em desenvolvimento quanto no build de demonstração.

Estrutura prevista: `handlers/`, `fixtures/`, `scenarios/`, `db/` e `realtime/`.
REST e eventos devem compartilhar a mesma base persistida e versionada. O reset
deve restaurar todo o cenário conhecido, incluindo sessões e idempotência.

Na Etapa 6, validar `@mswjs/socket.io-binding` com `socket.io-client` usando
WebSocket. Documentar as limitações: não substituir Socket.IO por callbacks ou
setters, nem introduzir um backend privado necessário para executar a entrega.

Atualização de 08/11: MSW está ativo antes da montagem, em dev e build demo.
`handlers.ts` intercepta os GETs de previews e health; `fixtures.ts` é a fonte da
seleção; `scenarios.ts` lê o cenário pela URL. `socket.ts` intercepta WebSocket
com binding Socket.IO. Não há banco/persistência de negócio nesta base de leitura.
O spike de transporte previsto para Etapa 6 foi antecipado e verificado. A
persistência e os eventos comerciais acima seguem planejamento futuro. Contratos,
limites e execução atual em `docs/STAGE-2.md`.
