# Brasa do Jorge KDS

Este projeto entrega um painel de cozinha para a Brasa do Jorge, com foco em pedidos ativos, tempo de espera e transição clara de status em tempo real. A aplicação foi construída em React Native + TypeScript e consome o mock já disponibilizado na pasta `mock`, sem criar um backend paralelo.

## Visão geral da solução

O KDS foi pensado para o ambiente real da cozinha:

- fila de pedidos por ordem de chegada
- indicadores visíveis de tempo de espera e atrasos
- filtros por etapa do pedido
- fluxo de alterações de status com regras centralizadas
- conexão em tempo real via SSE
- reconexão automática com preservação do último estado conhecido
- interface de toque grande, legível e adequada a tablet em modo paisagem

A tela principal monta um dashboard de cozinha com contadores, conexão em tempo real e cards de pedidos com informações relevantes para a produção.

## Decisão de arquitetura

Escolhi React Native + TypeScript por duas razões principais:

1. o desafio é pensado para uma experiência de tablet de cozinha, com foco em UI e velocidade de iteração;
2. a stack permite manter boa qualidade de tipos e testes, sem abrir mão da entrega funcional em um ambiente móvel real.

A solução foi organizada em camadas bem definidas:

- `src/types/order.ts`: modelos do domínio
- `src/constants/orderLifecycle.ts`: regras de transição entre etapas
- `src/services/ordersApi.ts`: cliente REST para listar e atualizar pedidos
- `src/store/ordersReducer.ts`: estado normalizado e deduplicado
- `src/store/ordersStream.ts`: integração com SSE e retry
- `src/components/OrderCard.tsx`: card do pedido e ações de cozinha
- `src/screens/KdsScreen.tsx`: dashboard do painel
- `src/hooks/useOrdersKds.ts`: orquestração entre carga inicial e stream

## Requisitos atendidos

- tempo real com SSE e reconexão automática
- deduplicação de eventos para não duplicar pedidos
- fila ativa e filtros por etapa
- status de pedido com transições explícitas e centralizadas
- tela em modo paisagem com leitura rápida da fila
- feedback visual para pedidos críticos e atrasados
- fallback com erro e retry sem quebrar a tela
- testes focados em regras de negócio e UI central

## Como rodar

### 1) Instalar dependências

```bash
npm install
```

### 2) Subir o mock do backend

```bash
npm run mock
```

O mock vai subir em `http://localhost:4000`.

Se você estiver usando um emulador Android, o app precisa apontar para `http://10.0.2.2:4000`.

Se você estiver usando um dispositivo físico, a rota mais segura é:

```bash
adb reverse tcp:4000 tcp:4000
```

e então o app pode continuar consumindo `http://localhost:4000` do dispositivo.

### 3) Rodar o app no Android

Em um terminal separado:

```bash
npm start
```

E em outro:

```bash
npx react-native run-android
```

> Observação: o projeto foi pensado para Android/tablet, que é o contexto principal do desafio. O comportamento também fica aceitável em telas menores, mas o cenário principal é a cozinha em modo paisagem.

## Premissas e recortes

A premissa adotada foi resolver a dor principal da cozinha:

- saber o que chegar primeiro
- identificar pedidos atrasados
- priorizar produção por fila e tempo de espera
- evitar confusão de informação em uma bancada caótica

O que ficou fora do escopo para manter a entrega focada:

- painel administrativo completo
- associação de pagamentos ou fechamento financeiro
- integrações de delivery externo
- gestão de estoque e produção por item em tempo real
- autenticação e multiusuário

Esses itens poderiam entrar em uma V2, mas não são necessários para validar a proposta do KDS no contexto do desafio.

## Fluxo de uso do painel

1. A aplicação carrega os pedidos ativos do mock REST.
2. O stream SSE entra em operação e mantém a cabine em atualização em tempo real.
3. Cada pedido pode avançar de etapa com uma ação de cozinha.
4. O card mostra informações críticas: canal, mesa, itens, observações e tempo de espera.
5. Se a conexão cair, o app mostra o estado de reconexão e preserva os dados já carregados.

## Uso de IA

Usei IA como parceira de produtividade e revisão, principalmente para:

- acelerar a estrutura inicial do projeto em React Native
- sugerir padrões de estado e separação de responsabilidades
- gerar e ajustar testes de regra de negócio
- refinar a UX de um painel de cozinha para manter foco na leitura rápida

Onde a IA errou ou ficou incompleta, eu corrigi manualmente:

- ajustes finos em regras de transição de status
- validação de tipos e compatibilidade com React Native/Jest
- revisão de lógica de reconexão e deduplicação de eventos
- refinamento visual para deixar o painel mais legível em ambiente real

O código que foi entregue foi revisado e entendido antes de ser mantido. Entender o porquê da solução foi decisão minha, não apenas geração automática.

## Testes

A suíte de testes cobre as regras relevantes do domínio e o componente central de pedido:

```bash
npm test -- --runInBand
```

Os testes verificam:

- transições válidas e inválidas de status
- deduplicação de eventos e estado idempotente
- renderização e comportamento do card de pedido em diferentes estágios

## Trade-offs e caminhos futuros

### O que foi priorizado

- confiabilidade da cozinha em vez de complexidade administrativa
- informações essenciais em primeira tela
- ciclo de vida do pedido explícito e previsível
- robustez em perda de conexão, que é comum em rede de cozinha

### O que ficou como melhoria de V2

- agrupamento por área de produção (`CHAPA`, `FRITADEIRA`, `MONTAGEM`)
- prioridade por canal e urgência do pedido
- telas de histórico e produtividade por turno
- notificações de eventos e analítica operacional

## Estrutura importante do projeto

```text
BrasaDoJorgeKds/
├── App.tsx
├── src/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── screens/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── utils/
├── mock/
│   └── README.md
├── package.json
├── jest.config.js
├── tsconfig.json
└── README.md
```

## Conclusão

A solução entrega um KDS funcional, estável e explicável, focado no problema real do Seu Jorge: reduzir ruído, priorizar pedidos corretamente e manter a cozinha sincronizada mesmo quando a rede falha. O objetivo foi criar uma entrega sólida e defensável em entrevista, sem transformar o projeto em um back-end novo ou em um produto de escopo exagerado.
