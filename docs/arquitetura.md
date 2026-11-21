# Arquitetura — SCOP v1

## Visão geral

```
┌────────────────┐   HTTPS/JSON   ┌──────────────────────┐   SQL   ┌──────────────┐
│  apps/web      │ ─────────────▶ │  apps/api            │ ──────▶ │ PostgreSQL 16│
│  React + Vite  │   JWT Bearer   │  Fastify + Drizzle   │         │              │
└───────┬────────┘                └──────────┬───────────┘         └──────────────┘
        │                                    │
        └──────────── packages/regras ───────┘
             (porte, financeiro, prazo, checklist legal, alertas — TypeScript puro)
```

| Pasta | Conteúdo |
|---|---|
| `packages/regras` | Regras de negócio sem dependências: classificação por porte, art. 125, prazos, dias úteis, checklist legal e alertas. Funções puras com testes unitários. Usado pela API e pelo frontend. |
| `apps/api` | API REST (Fastify 5), autenticação JWT, perfis e escopo, validação com Zod, persistência com Drizzle ORM e trilha de auditoria. |
| `apps/web` | Frontend React: login, painel, alertas, obra (resumo, conformidade, medições, aditivos, diário, dados). |
| `prototipo/` | Protótipo v0.1 num arquivo só (referência de UX). |

### Por que Drizzle (e não Prisma)

Drizzle não depende de binários nativos baixados na instalação. Isso facilita instalar em servidores de prefeitura com rede restrita, e as migrações ficam como **SQL puro versionado** (`apps/api/drizzle/`), legíveis por DBA e auditoria.

## Perfis e permissões

| Ação | admin | gestor | engenharia | fiscal | contratada | controle interno |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Ver obras | ✓ | ✓ | ✓ | ✓ | só as suas | ✓ |
| Cadastrar / editar obra | ✓ | ✓ | ✓ | | | |
| Excluir obra | ✓ | | | | | |
| Checklist de conformidade | ✓ | ✓ | ✓ | designado | | |
| Enviar medição | ✓ | | ✓ | designado | só as suas | |
| Atestar / glosar medição | ✓ | | | designado | | |
| Termo aditivo | ✓ | ✓ | | | | |
| Diário de obra | ✓ | ✓ | ✓ | designado | só as suas | |
| Designar gestor e fiscais | ✓ | ✓ | | | | |
| Gerir usuários | ✓ | | | | | |
| Trilha de auditoria | ✓ | ✓ | | | | ✓ |

Regras de escopo (`apps/api/src/rbac.ts`):
- Todo acesso é restrito ao órgão do usuário. A obra de outro órgão responde 404.
- **Contratada** só vê e só age nas obras da sua empresa.
- **Fiscal** lê todas as obras do órgão, mas só altera aquelas em que tem designação vigente (art. 117).

## Fluxo da medição

```
contratada/engenharia ──envia──▶ [enviada] ──fiscal designado──▶ [atestada]
                                     │                         └─▶ [glosada] (motivo obrigatório)
                                     └── rascunho não conta no financeiro
```

Só medições **enviadas** e **atestadas** entram no cálculo financeiro e nos alertas. O % físico acumulado não pode regredir.

## Auditoria

Toda escrita registra `usuário · entidade · ação · dados · data/hora` em `auditoria`. Um trigger no PostgreSQL (`0001_auditoria_imutavel.sql`) impede `UPDATE` e `DELETE` nessa tabela.

## API — principais rotas

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Autentica e devolve o token (8 h) |
| GET | `/auth/eu` | Usuário e permissões |
| GET | `/referencias` | Enums, checklist, parâmetros legais (público) |
| GET/POST | `/obras` | Lista com resumo e contagem de alertas / cadastra |
| GET/PATCH/DELETE | `/obras/:id` | Detalhe completo com alertas e exigências / edita / exclui |
| PUT | `/obras/:id/checklist/:chave` | Comprova ou desmarca uma exigência |
| POST | `/obras/:id/medicoes` | Envia medição |
| POST | `/obras/:id/medicoes/:mid/atesto` | `{decisao: "atestar" \| "glosar"}` |
| POST | `/obras/:id/aditivos` | Registra termo aditivo ou apostilamento |
| POST | `/obras/:id/diario` | Registro no diário de obra |
| POST | `/obras/:id/designacoes` | Designa gestor/fiscal; `/:did/encerrar` encerra |
| GET | `/alertas` | Alertas consolidados da carteira |
| GET/POST | `/usuarios`, `/empresas` | Cadastros |
| GET | `/auditoria` | Trilha (filtros `entidade`, `entidadeId`) |

## Decisões em aberto

- **Feriados** para dias úteis do PNCP: a função aceita uma lista, mas falta a tabela de feriados nacionais, estaduais e municipais.
- **Cronograma por etapas** para substituir o previsto linear.
- **Anexos** (S3 compatível ou disco local do órgão) para ARTs, termos e fotos.
- **Multi-órgão / consórcios**: o modelo já separa por `orgao_id`.
