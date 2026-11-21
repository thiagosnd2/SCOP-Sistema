# SCOP — Sistema de Controle de Obras Públicas

Sistema para a engenharia do órgão controlar obras públicas de qualquer porte, do planejamento ao recebimento definitivo, em conformidade com a legislação federal, estadual e municipal e com as exigências dos órgãos de fiscalização (Tribunal de Contas, CREA/CAU, órgão ambiental, concedente).

> **v1.0.0-alpha** — monorepo com API, frontend e pacote de regras. O protótipo v0.1 continua em [`prototipo/`](prototipo/index.html).

## Estrutura

```
packages/regras   regras de negócio (TypeScript puro, testado)
apps/api          API REST — Fastify, Drizzle ORM, PostgreSQL, JWT
apps/web          frontend — React + Vite
docs/             arquitetura e regras de negócio
prototipo/        protótipo v0.1 (arquivo único)
```

A arquitetura, os perfis e as rotas estão em [`docs/arquitetura.md`](docs/arquitetura.md); cada regra e alerta, com o artigo de lei, em [`docs/regras-de-negocio.md`](docs/regras-de-negocio.md).

## Como rodar

Requisitos: Node.js 20+ e Docker (ou um PostgreSQL 16).

```bash
cp .env.example .env            # ajuste JWT_SECRET
docker compose up -d db         # PostgreSQL em localhost:5432
npm install
npm run build -w @scop/regras
npm run db:migrate              # aplica as migrações SQL
npm run db:seed                 # dados de demonstração (opcional)
npm run dev:api                 # http://localhost:3333
npm run dev:web                 # http://localhost:5173
```

A API lê as variáveis de `apps/api/.env` ou do ambiente. Para desenvolvimento local: `export $(cat .env | xargs)` antes dos comandos.

Usuários de demonstração (seed), todos com a senha `scop-demo-2026`:
`admin@`, `gestor@`, `engenharia@`, `fiscal@`, `contratada@` e `controle@scop.local`.

## Testes

```bash
npm run test -w @scop/regras    # 17 testes unitários das regras
npm run test -w @scop/api       # 23 testes de integração (precisa de PostgreSQL; banco scop_teste)
```

O CI (GitHub Actions) roda typecheck, os dois conjuntos de testes e o build a cada push e pull request.

## O que a v1 já faz

- **Porte** pelo Decreto nº 12.807/2025 (dispensa de obras R$ 130.984,20; grande vulto R$ 261.968.421,04) e as exigências derivadas.
- **Checklist legal** com cerca de 40 exigências em 5 fases, condicionadas a porte, regime, fonte de recursos e licenciamento.
- **Medições** com fluxo enviada → atestada/glosada pelo fiscal designado.
- **Aditivos** com controle dos limites do art. 125 (25% / 50% em reforma).
- **Diário de obra** e **designações** de gestor e fiscais (art. 117).
- **Alertas**: PNCP (art. 94), prazo, atraso físico, pagamento antecipado (art. 145), obra paralisada (art. 115, § 6º), garantia, integridade (art. 25, § 4º), pendências do checklist.
- **Perfis**: admin, gestor, engenharia, fiscal, contratada, controle interno, com escopo por órgão, empresa e designação.
- **Auditoria** imutável de todas as escritas.

## Roadmap

- [x] Backend, banco, autenticação e perfis
- [ ] Cronograma físico-financeiro por etapas e curva S contratada
- [ ] Planilha orçamentária e medição por item (SINAPI/SICRO) com memória de cálculo
- [ ] Anexos: ARTs, termos, boletins, fotos georreferenciadas
- [ ] Tabela de feriados para os prazos em dias úteis
- [ ] Integrações: PNCP, Transferegov; exportação para o TCE-ES (CidadES)
- [ ] Integração com o Sistema de Contratos Inteligentes
- [ ] Documentos: termo de recebimento, relatório de fiscalização, aviso de obra paralisada

## Parâmetros legais

Os valores monetários da Lei 14.133/2021 mudam todo ano pelo IPCA-E (art. 182). Ficam em `packages/regras/src/parametros.ts` e devem ser revistos em janeiro.

## Aviso

As regras apoiam a gestão e não substituem a análise jurídica nem a redação vigente das normas e dos regulamentos de cada ente.
