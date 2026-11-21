# Regras de negócio — SCOP

> Implementação: [`packages/regras`](../packages/regras/src) (funções puras, testadas). Este documento descreve o comportamento esperado.

## 1. Situação da obra e fases

| Situação | Índice de fase |
|---|---|
| Planejamento | 0 |
| Licitação / contratação direta | 1 |
| Contratada (pré-OS) | 2 |
| Em execução / Paralisada | 3 |
| Recebimento provisório | 4 |
| Concluída | 5 |

Um item do checklist está **atrasado** quando a fase da obra é maior que a fase do item e ele não foi comprovado. Item obrigatório atrasado gera alerta crítico.

## 2. Porte

Base de cálculo: valor contratado ou, se ausente, valor estimado.

| Porte | Faixa | Fundamento |
|---|---|---|
| Pequeno | ≤ R$ 130.984,20 | Lei 14.133, art. 75, I (Dec. 12.807/2025) |
| Médio | até R$ 5.000.000,00 | parâmetro interno, ajustável |
| Grande | > R$ 5.000.000,00 | parâmetro interno, ajustável |
| Grande vulto | ≥ R$ 261.968.421,04 | Lei 14.133, art. 6º, XXII |

## 3. Financeiro

- Valor atualizado = inicial + acréscimos − supressões + reajustes
- % acréscimos e % supressões são calculados **separadamente** sobre o valor inicial (sem compensação)
- Limite de acréscimos: 50% para reforma de edifício ou equipamento; 25% nos demais casos (art. 125). Supressões: 25%
- Reajustes e repactuações (apostilamento) não entram no limite

## 4. Prazo

- Término previsto = data da OS + prazo inicial + dias de prorrogação
- % previsto = dias decorridos ÷ prazo total (linear, provisório até a entrada do cronograma por etapas)

## 5. Alertas

| Regra | Nível | Fundamento |
|---|---|---|
| Sem gestor ou fiscal (fase ≥ contratada) | Crítico | art. 117 |
| Sem ART/RRT de execução ou de fiscalização | Crítico | Lei 6.496/1977 |
| Contrato não publicado no PNCP: 20 dias úteis (licitação) / 10 (direta) após a assinatura | Atenção → Crítico | art. 94 |
| Prazo de execução ≤ 30 dias / expirado | Atenção / Crítico | arts. 107, 111, 155 |
| Físico abaixo do previsto em mais de 10 / 20 p.p. | Atenção / Crítico | cronograma |
| Sem medição há mais de 35 dias | Atenção | contrato |
| Diário sem registro há mais de 7 dias | Atenção | art. 117, § 1º |
| % financeiro > % físico + 5 p.p. | Crítico | art. 145 |
| Acréscimos > 80% do limite / acima do limite | Atenção / Crítico | art. 125 |
| Supressões > 25% | Crítico | arts. 124–125 |
| Medido > valor atualizado | Crítico | art. 145 |
| Paralisada há mais de 30 dias: aviso público em site e placa | Crítico | art. 115, § 6º |
| Garantia vence em ≤ 30 dias / vencida | Atenção / Crítico | arts. 96–98 |
| Grande vulto sem programa de integridade (6 meses da assinatura) | Atenção / Crítico | art. 25, § 4º |
| Recebimento provisório pendente | Atenção | art. 140, I, a |

## 6. Aplicabilidade condicional do checklist

- Matriz de riscos: grande vulto, contratação integrada ou semi-integrada (art. 22, § 3º)
- Licenças ambientais (LP, LI, LO): exceto quando o licenciamento for marcado como dispensado
- Integridade: grande vulto
- Transferegov e CIPI: transferência federal
- Prestação de contas: transferência federal ou estadual
- Habite-se: edificação ou reforma de edifício
- Homologação: não se aplica à contratação direta
- Tribunal de Contas: quando UF = ES, TCE-ES / CidadES (IN TCE-ES nº 68/2020)
