import { classificarPorte, INDICE_FASE, isContratacaoDireta } from "./calculos.js";
import type { ContextoObra, ObraDados } from "./tipos.js";

export interface ItemChecklist {
  chave: string;
  /** 0 planejamento · 1 licitação · 2 contratação · 3 execução · 4 recebimento */
  fase: 0 | 1 | 2 | 3 | 4;
  titulo: string;
  fundamento: string | ((o: ObraDados) => string);
  obrigatorio?: boolean;
  aplica?: (o: ObraDados) => boolean;
}

const grandeVulto = (o: ObraDados) => classificarPorte(o).chave === "grande_vulto";
const exigeLicenca = (o: ObraDados) => o.licenca !== "dispensada";
const federal = (o: ObraDados) => o.fonte === "convenio_federal";

export const CHECKLIST: readonly ItemChecklist[] = [
  // 0 — Planejamento
  { chave: "dfd", fase: 0, titulo: "Documento de formalização da demanda (DFD)", fundamento: "Lei 14.133/2021, art. 12, VII e art. 72, I" },
  { chave: "etp", fase: 0, titulo: "Estudo Técnico Preliminar (ETP)", fundamento: "Lei 14.133/2021, art. 18, I e § 1º", obrigatorio: true },
  { chave: "projeto_basico", fase: 0, titulo: "Projeto básico (ou anteprojeto, na contratação integrada)", fundamento: "Lei 14.133/2021, art. 6º, XXIV e XXV; art. 46, § 2º", obrigatorio: true },
  { chave: "projeto_executivo", fase: 0, titulo: "Projeto executivo (ou previsão de elaboração pela contratada)", fundamento: "Lei 14.133/2021, art. 46, § 1º", obrigatorio: true },
  { chave: "orcamento", fase: 0, titulo: "Orçamento de referência (SINAPI/SICRO), BDI e encargos sociais detalhados", fundamento: "Lei 14.133/2021, art. 23, § 2º; Decreto 7.983/2013 (recursos federais)", obrigatorio: true },
  { chave: "art_projeto", fase: 0, titulo: "ART/RRT de projeto e de orçamento", fundamento: "Lei 6.496/1977 (CREA); Lei 12.378/2010 (CAU)", obrigatorio: true },
  { chave: "matriz_riscos", fase: 0, titulo: "Matriz de riscos", fundamento: "Lei 14.133/2021, art. 22, § 3º", obrigatorio: true, aplica: (o) => grandeVulto(o) || o.regime === "integrada" || o.regime === "semi_integrada" },
  { chave: "licenca_previa", fase: 0, titulo: "Licença prévia / manifestação ambiental antes do edital", fundamento: "Lei 14.133/2021, art. 115, § 4º; Lei 6.938/1981; Res. CONAMA 237/1997; LC 140/2011", obrigatorio: true, aplica: exigeLicenca },
  { chave: "terreno", fase: 0, titulo: "Titularidade ou posse regular da área; desapropriações resolvidas", fundamento: "Lei 14.133/2021, art. 25, § 5º", obrigatorio: true },
  { chave: "dotacao", fase: 0, titulo: "Dotação orçamentária e adequação fiscal", fundamento: "Lei 14.133/2021, art. 150; LC 101/2000, arts. 16 e 45; Lei 4.320/1964", obrigatorio: true },
  { chave: "alvara", fase: 0, titulo: "Alvará / licença municipal de construção", fundamento: "Código de Obras e Plano Diretor municipais; Lei 10.257/2001" },
  { chave: "acessibilidade", fase: 0, titulo: "Acessibilidade prevista em projeto (NBR 9050)", fundamento: "Lei 13.146/2015; Lei 14.133/2021, art. 45, VI" },
  // 1 — Licitação
  { chave: "edital", fase: 1, titulo: "Edital (ou processo de contratação direta) com critérios de medição e pagamento", fundamento: "Lei 14.133/2021, arts. 25 e 72", obrigatorio: true },
  { chave: "parecer_juridico", fase: 1, titulo: "Parecer jurídico", fundamento: "Lei 14.133/2021, art. 53", obrigatorio: true },
  { chave: "pncp_edital", fase: 1, titulo: "Divulgação no PNCP (edital ou ato de contratação direta)", fundamento: "Lei 14.133/2021, arts. 54, 72 (par. único) e 174", obrigatorio: true },
  { chave: "homologacao", fase: 1, titulo: "Adjudicação e homologação", fundamento: "Lei 14.133/2021, art. 71", aplica: (o) => !isContratacaoDireta(o) },
  // 2 — Contratação
  { chave: "contrato", fase: 2, titulo: "Contrato assinado com as cláusulas obrigatórias", fundamento: "Lei 14.133/2021, art. 92", obrigatorio: true },
  { chave: "pncp_contrato", fase: 2, titulo: "Publicação do contrato no PNCP (condição de eficácia)", fundamento: "Lei 14.133/2021, art. 94", obrigatorio: true },
  { chave: "garantia", fase: 2, titulo: "Garantia contratual apresentada (se exigida no edital)", fundamento: "Lei 14.133/2021, arts. 96 a 99" },
  { chave: "designacao", fase: 2, titulo: "Designação formal do gestor e do(s) fiscal(is)", fundamento: "Lei 14.133/2021, arts. 7º e 117", obrigatorio: true },
  { chave: "art_execucao", fase: 2, titulo: "ART/RRT de execução da contratada", fundamento: "Lei 6.496/1977; Lei 12.378/2010", obrigatorio: true },
  { chave: "art_fiscalizacao", fase: 2, titulo: "ART/RRT de fiscalização", fundamento: "Lei 6.496/1977; Lei 12.378/2010", obrigatorio: true },
  { chave: "ordem_servico", fase: 2, titulo: "Ordem de serviço emitida", fundamento: "Contrato / regulamento do órgão", obrigatorio: true },
  { chave: "cno", fase: 2, titulo: "Inscrição da obra no CNO (Receita Federal)", fundamento: "IN RFB nº 2.061/2021" },
  { chave: "placa", fase: 2, titulo: "Placa da obra no padrão do órgão / concedente", fundamento: "Manual de identidade do órgão ou do concedente" },
  { chave: "integridade", fase: 2, titulo: "Programa de integridade da contratada em até 6 meses", fundamento: "Lei 14.133/2021, art. 25, § 4º", obrigatorio: true, aplica: grandeVulto },
  { chave: "transferegov", fase: 2, titulo: "Registro e acompanhamento no Transferegov", fundamento: "Decreto 11.531/2023", obrigatorio: true, aplica: federal },
  { chave: "cipi", fase: 2, titulo: "Cadastro no CIPI", fundamento: "Decreto 10.496/2020", aplica: federal },
  // 3 — Execução
  { chave: "diario", fase: 3, titulo: "Diário de obra com registro das ocorrências pelo fiscal", fundamento: "Lei 14.133/2021, art. 117, § 1º", obrigatorio: true },
  { chave: "medicoes", fase: 3, titulo: "Medições com memória de cálculo e atesto do fiscal", fundamento: "Lei 14.133/2021, arts. 117 e 145", obrigatorio: true },
  { chave: "controle_tecnologico", fase: 3, titulo: "Ensaios de controle tecnológico (concreto, solo, asfalto)", fundamento: "Normas ABNT aplicáveis" },
  { chave: "seguranca_trabalho", fase: 3, titulo: "Segurança do trabalho no canteiro (PGR)", fundamento: "NR-18 e NR-01 (MTE)" },
  { chave: "licenca_instalacao", fase: 3, titulo: "Licença de instalação vigente", fundamento: "Res. CONAMA 237/1997", obrigatorio: true, aplica: exigeLicenca },
  {
    chave: "tribunal_contas",
    fase: 3,
    titulo: "Remessas ao Tribunal de Contas em dia",
    fundamento: (o) => (o.uf === "ES" ? "TCE-ES — sistema CidadES (IN TCE-ES nº 68/2020)" : "Instruções normativas do Tribunal de Contas do Estado"),
    obrigatorio: true,
  },
  // 4 — Recebimento
  { chave: "recebimento_provisorio", fase: 4, titulo: "Termo de recebimento provisório (até 15 dias da comunicação da contratada)", fundamento: "Lei 14.133/2021, art. 140, I, a", obrigatorio: true },
  { chave: "recebimento_definitivo", fase: 4, titulo: "Termo de recebimento definitivo (servidor ou comissão)", fundamento: "Lei 14.133/2021, art. 140, I, b", obrigatorio: true },
  { chave: "as_built", fase: 4, titulo: "As built, manuais e garantias de equipamentos entregues", fundamento: "Contrato / termo de referência" },
  { chave: "habite_se", fase: 4, titulo: "Habite-se / auto de conclusão", fundamento: "Código de Obras municipal", aplica: (o) => o.tipo === "edificacao" || o.tipo === "reforma_edificio" },
  { chave: "licenca_operacao", fase: 4, titulo: "Licença de operação (quando cabível)", fundamento: "Res. CONAMA 237/1997", aplica: exigeLicenca },
  { chave: "prestacao_contas", fase: 4, titulo: "Prestação de contas da transferência", fundamento: "Termo de convênio; Decreto 11.531/2023 (federal)", obrigatorio: true, aplica: (o) => o.fonte === "convenio_federal" || o.fonte === "convenio_estadual" },
];

export const CHAVES_CHECKLIST = new Set(CHECKLIST.map((i) => i.chave));

export function aplicaItem(item: ItemChecklist, o: ObraDados): boolean {
  return !item.aplica || item.aplica(o);
}

export function fundamentoItem(item: ItemChecklist, o: ObraDados): string {
  return typeof item.fundamento === "function" ? item.fundamento(o) : item.fundamento;
}

export interface SituacaoChecklist {
  aplicaveis: number;
  comprovados: number;
  /** Itens de fases já ultrapassadas sem comprovação. */
  atrasados: ItemChecklist[];
}

export function situacaoChecklist(ctx: Pick<ContextoObra, "obra" | "checklist">): SituacaoChecklist {
  const fase = INDICE_FASE[ctx.obra.status];
  const aplicaveis = CHECKLIST.filter((i) => aplicaItem(i, ctx.obra));
  return {
    aplicaveis: aplicaveis.length,
    comprovados: aplicaveis.filter((i) => ctx.checklist[i.chave]).length,
    atrasados: aplicaveis.filter((i) => i.fase < fase && !ctx.checklist[i.chave]),
  };
}
