# SCOP — Sistema de Controle de Obras Públicas

Sistema para a engenharia do órgão controlar obras públicas de qualquer porte — da fase de planejamento ao recebimento definitivo — em conformidade com a legislação federal, estadual e municipal e com as exigências dos órgãos de fiscalização (Tribunal de Contas, CREA/CAU, órgão ambiental, concedente).

> Versão atual: **protótipo v0.1** — aplicação web em arquivo único (`index.html`), sem dependências de build.

## Módulos

| Módulo | O que faz |
|---|---|
| **Painel** | Carteira de obras, valor atualizado, medido, alertas críticos, distribuição por porte |
| **Cadastro da obra** | Identificação, objeto, tipo, fonte de recursos, modalidade, regime de execução (art. 46), contrato, garantia, responsáveis e ARTs/RRTs |
| **Classificação por porte** | Pequeno, médio, grande e grande vulto, com as exigências derivadas |
| **Conformidade legal** | Checklist com cerca de 40 exigências em 5 fases, cada uma com base legal e campo de comprovação |
| **Medições** | Boletins com % físico acumulado, valor, atesto do fiscal, curva físico × financeiro × previsto |
| **Aditivos** | Acréscimos, supressões, prorrogações e reajustes, com controle dos limites do art. 125 |
| **Diário de obra** | Registro diário de clima, efetivo, serviços e ocorrências do fiscal (art. 117, § 1º) |
| **Alertas** | Prazos, PNCP, garantia, pagamento antecipado, obra paralisada, pendências legais |
| **Base legal** | Normas usadas pelas regras |

As regras estão descritas em [`docs/regras-de-negocio.md`](docs/regras-de-negocio.md).

## Como executar

Abra o `index.html` no navegador. Fora do ambiente Claude os dados ficam no `localStorage` do navegador (modo local). Na versão publicada como artefato, os dados ficam num banco compartilhado.

Também é possível publicar com **GitHub Pages** (Settings → Pages → branch `main`, pasta `/`).

## Parâmetros legais vigentes (2026)

Atualizados pelo **Decreto nº 12.807/2025** (IPCA-E, art. 182 da Lei 14.133/2021), em vigor desde 01/01/2026:

- Dispensa para obras e serviços de engenharia (art. 75, I): **R$ 130.984,20**
- Grande vulto (art. 6º, XXII): **R$ 261.968.421,04**

Ficam na constante `PARAM` do `index.html` e devem ser revistos todo mês de janeiro.

## Roadmap

- [ ] Backend e banco (API + PostgreSQL) com autenticação e perfis: gestor, fiscal, engenharia, contratada, controle interno
- [ ] Cronograma físico-financeiro por etapas e curva S contratada (no lugar do previsto linear)
- [ ] Planilha orçamentária e medição por item (SINAPI/SICRO), com memória de cálculo
- [ ] Anexos: ARTs, termos, boletins, fotos georreferenciadas do diário
- [ ] Calendário de feriados no cálculo de dias úteis (PNCP)
- [ ] Integração com PNCP e Transferegov; exportação para remessas ao TCE-ES (CidadES)
- [ ] Integração com o Sistema de Contratos Inteligentes (saldo, sanções, apostilamentos)
- [ ] Relatórios: termo de recebimento, relatório de fiscalização, aviso de obra paralisada

## Aviso

As regras são apoio à gestão e não substituem a análise jurídica nem a redação vigente das normas e dos regulamentos de cada ente.
