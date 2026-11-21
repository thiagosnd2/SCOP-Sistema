import { classificarPorte, INDICE_FASE, isContratacaoDireta, resumoFinanceiro, resumoPrazo } from "./calculos.js";
import { situacaoChecklist } from "./checklist.js";
import { diasEntre, formatarData, somarDiasUteis, somarMeses } from "./datas.js";
import { LIMITES } from "./parametros.js";
import type { Alerta, ContextoObra, DataISO, NivelAlerta } from "./tipos.js";

const fmtPct = (v: number) => `${(Math.round(v * 10) / 10).toLocaleString("pt-BR")}%`;

export interface OpcoesAlertas {
  hoje: DataISO;
  feriados?: ReadonlySet<DataISO>;
}

/** Avalia todas as regras de alerta de uma obra. Função pura: mesma entrada, mesma saída. */
export function avaliarAlertas(ctx: ContextoObra, opcoes: OpcoesAlertas): Alerta[] {
  const { obra: o, aditivos, diario, checklist } = ctx;
  const { hoje, feriados } = opcoes;
  const fase = INDICE_FASE[o.status];
  const fin = resumoFinanceiro(o, ctx.medicoes, aditivos);
  const prazo = resumoPrazo(o, aditivos, hoje);
  const porte = classificarPorte(o);
  const out: Alerta[] = [];
  const add = (codigo: string, nivel: NivelAlerta, mensagem: string, fundamento: string) => out.push({ codigo, nivel, mensagem, fundamento });

  // Responsáveis e publicidade — a partir da contratação
  if (fase >= 2) {
    if (!o.temGestor || !o.temFiscal) add("designacao_ausente", "critico", "Gestor e/ou fiscal do contrato não designados.", "Lei 14.133/2021, art. 117");
    if (!o.artExecucao) add("art_execucao_ausente", "critico", "ART/RRT de execução da contratada não informada.", "Lei 6.496/1977");
    if (!o.artFiscalizacao) add("art_fiscalizacao_ausente", "critico", "ART/RRT de fiscalização não informada.", "Lei 6.496/1977");
    if (!checklist["pncp_contrato"] && o.dataAssinatura) {
      const prazoDu = isContratacaoDireta(o) ? LIMITES.pncpContratacaoDireta : LIMITES.pncpLicitacao;
      const limite = somarDiasUteis(o.dataAssinatura, prazoDu, feriados);
      if (hoje > limite) add("pncp_vencido", "critico", `Contrato sem publicação no PNCP — prazo venceu em ${formatarData(limite)}. Sem publicação o contrato não tem eficácia.`, "Lei 14.133/2021, art. 94");
      else add("pncp_pendente", "atencao", `Publicar o contrato no PNCP até ${formatarData(limite)}.`, "Lei 14.133/2021, art. 94");
    }
  }

  // Execução
  if (o.status === "execucao") {
    if (!o.dataOrdemServico) add("os_ausente", "atencao", "Obra em execução sem data de ordem de serviço.", "Contrato");
    if (prazo.termino && prazo.diasRestantes !== null) {
      if (prazo.diasRestantes < 0)
        add("prazo_expirado", "critico", `Prazo de execução expirado em ${formatarData(prazo.termino)} (${-prazo.diasRestantes} dias). Formalizar prorrogação justificada ou apurar mora da contratada.`, "Lei 14.133/2021, arts. 107, 111 e 155");
      else if (prazo.diasRestantes <= LIMITES.diasAvisoPrazo)
        add("prazo_proximo", "atencao", `Prazo de execução termina em ${prazo.diasRestantes} dias (${formatarData(prazo.termino)}).`, "Lei 14.133/2021, art. 111");
    }
    if (prazo.percentualPrevisto !== null && fin.medicoesOrdenadas.length) {
      const atraso = prazo.percentualPrevisto - fin.percentualFisico;
      const msg = `${fmtPct(fin.percentualFisico)} executado contra ${fmtPct(prazo.percentualPrevisto)} previsto (linear).`;
      if (atraso > LIMITES.atrasoFisicoCritico) add("atraso_fisico", "critico", `Atraso físico relevante: ${msg}`, "Cronograma físico-financeiro");
      else if (atraso > LIMITES.atrasoFisicoAtencao) add("atraso_fisico", "atencao", `Atraso físico: ${msg}`, "Cronograma físico-financeiro");
    }
    const ultimaMedicao = fin.medicoesOrdenadas.at(-1)?.fim ?? o.dataOrdemServico;
    if (ultimaMedicao) {
      const d = diasEntre(ultimaMedicao, hoje);
      if (d > LIMITES.diasSemMedicao) add("medicao_atrasada", "atencao", `Sem medição há ${d} dias.`, "Contrato — periodicidade de medição");
    }
    const ultimoDiario = [...diario].sort().at(-1) ?? o.dataOrdemServico;
    if (ultimoDiario) {
      const d = diasEntre(ultimoDiario, hoje);
      if (d > LIMITES.diasSemDiario) add("diario_atrasado", "atencao", `Diário de obra sem registro há ${d} dias.`, "Lei 14.133/2021, art. 117, § 1º");
    }
  }

  // Financeiro
  if (fin.medicoesOrdenadas.length && fin.percentualFinanceiro > fin.percentualFisico + LIMITES.folgaFinanceiroFisico)
    add("pagamento_antecipado", "critico", `Financeiro (${fmtPct(fin.percentualFinanceiro)}) à frente do físico (${fmtPct(fin.percentualFisico)}): risco de pagamento antecipado.`, "Lei 14.133/2021, art. 145");
  if (fin.valorAtualizado > 0 && fin.medido > fin.valorAtualizado)
    add("medido_acima_contrato", "critico", "Valor medido supera o valor atualizado do contrato.", "Lei 14.133/2021, art. 145");

  // Aditivos — art. 125
  if (fin.percentualAcrescimos > fin.limiteAcrescimos)
    add("acrescimo_acima_limite", "critico", `Acréscimos somam ${fmtPct(fin.percentualAcrescimos)} do valor inicial — acima do limite de ${fin.limiteAcrescimos}%.`, "Lei 14.133/2021, art. 125");
  else if (fin.percentualAcrescimos > fin.limiteAcrescimos * LIMITES.avisoAcrescimo)
    add("acrescimo_proximo_limite", "atencao", `Acréscimos em ${fmtPct(fin.percentualAcrescimos)} do valor inicial (limite ${fin.limiteAcrescimos}%).`, "Lei 14.133/2021, art. 125");
  if (fin.percentualSupressoes > LIMITES.supressao)
    add("supressao_acima_limite", "critico", `Supressões somam ${fmtPct(fin.percentualSupressoes)} — acima de 25% do valor inicial. Verificar fundamento e concordância da contratada.`, "Lei 14.133/2021, arts. 124 e 125");
  if (aditivos.some((a) => !a.parecerJuridico))
    add("aditivo_sem_parecer", "atencao", "Há termo aditivo registrado sem parecer jurídico.", "Lei 14.133/2021, art. 53, § 4º");

  // Paralisação — art. 115, § 6º
  if (o.status === "paralisada") {
    if (!o.dataParalisacao) add("paralisacao_sem_data", "atencao", "Obra paralisada sem data de paralisação registrada.", "Lei 14.133/2021, art. 115, § 6º");
    else {
      const d = diasEntre(o.dataParalisacao, hoje);
      if (d > LIMITES.diasParalisacaoAviso)
        add("aviso_obra_paralisada", "critico", `Paralisada há ${d} dias: divulgar aviso de obra paralisada (site oficial e placa no local) com motivo, responsável e data prevista de reinício.`, "Lei 14.133/2021, art. 115, § 6º");
    }
  }

  // Garantia
  if (o.garantiaVencimento && fase >= 2 && fase < 5) {
    const r = diasEntre(hoje, o.garantiaVencimento);
    if (r < 0) add("garantia_vencida", "critico", `Garantia contratual vencida em ${formatarData(o.garantiaVencimento)}.`, "Lei 14.133/2021, arts. 96 a 98");
    else if (r <= LIMITES.diasAvisoGarantia) add("garantia_vencendo", "atencao", `Garantia contratual vence em ${r} dias.`, "Lei 14.133/2021, arts. 96 a 98");
  }

  // Integridade — grande vulto
  if (porte.chave === "grande_vulto" && fase >= 2 && !checklist["integridade"] && o.dataAssinatura) {
    const limite = somarMeses(o.dataAssinatura, LIMITES.mesesIntegridade);
    add("integridade", hoje > limite ? "critico" : "atencao", `Programa de integridade da contratada: prazo até ${formatarData(limite)}.`, "Lei 14.133/2021, art. 25, § 4º");
  }

  // Checklist
  const atrasadosObrig = situacaoChecklist(ctx).atrasados.filter((i) => i.obrigatorio);
  if (atrasadosObrig.length) {
    const nomes = atrasadosObrig.slice(0, 3).map((i) => i.titulo).join("; ");
    add("checklist_pendente", "critico", `${atrasadosObrig.length} exigência(s) obrigatória(s) de fases anteriores sem comprovação: ${nomes}${atrasadosObrig.length > 3 ? "…" : ""}`, "Checklist de conformidade");
  }

  if (o.status === "recebimento_provisorio" && !checklist["recebimento_provisorio"])
    add("recebimento_provisorio", "atencao", "Lavrar termo de recebimento provisório em até 15 dias da comunicação da contratada.", "Lei 14.133/2021, art. 140, I, a");

  const ordem: Record<NivelAlerta, number> = { critico: 0, atencao: 1, info: 2 };
  return out.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

/** Exigências aplicáveis pelo porte e pelas características da obra (texto orientativo). */
export function exigenciasPorPorte(o: ContextoObra["obra"]): { texto: string; fundamento: string }[] {
  const porte = classificarPorte(o).chave;
  const L: { texto: string; fundamento: string }[] = [];
  if (porte === "pequeno") L.push({ texto: "Pode ser contratada por dispensa, vedado o fracionamento: some objetos de mesma natureza no exercício.", fundamento: "art. 75, I e § 1º" });
  L.push({ texto: "Projeto básico/executivo e orçamento com referência SINAPI/SICRO, independentemente do porte.", fundamento: "art. 23, § 2º; art. 46" });
  L.push({ texto: "Gestor e fiscal formalmente designados; registro das ocorrências em diário.", fundamento: "art. 117" });
  if (porte !== "pequeno") L.push({ texto: "Garantia de até 5% do valor (até 10% se houver alta complexidade técnica e riscos justificados).", fundamento: "arts. 96 a 98" });
  if (porte === "grande_vulto") {
    L.push({ texto: "Matriz de riscos obrigatória.", fundamento: "art. 22, § 3º" });
    L.push({ texto: "Possível exigência de seguro-garantia com cláusula de retomada (até 30%).", fundamento: "art. 99" });
    L.push({ texto: "Programa de integridade da contratada em até 6 meses da assinatura.", fundamento: "art. 25, § 4º" });
  }
  if (o.regime === "integrada" || o.regime === "semi_integrada") L.push({ texto: "Anteprojeto e matriz de riscos obrigatórios.", fundamento: "art. 22, § 3º; art. 46" });
  L.push(
    o.tipo === "reforma_edificio"
      ? { texto: "Limite de acréscimos de 50% (reforma de edifício ou equipamento); supressões até 25%.", fundamento: "art. 125" }
      : { texto: "Limite de acréscimos e supressões unilaterais de 25% do valor inicial atualizado.", fundamento: "art. 125" },
  );
  if (o.fonte === "convenio_federal") L.push({ texto: "Recurso federal: Transferegov, CIPI e Decreto 7.983/2013 no orçamento.", fundamento: "Dec. 11.531/2023; Dec. 10.496/2020" });
  return L;
}
