import { LIMITES, PARAMETROS_PADRAO, type ParametrosLegais } from "./parametros.js";
import { diasEntre, somarDias } from "./datas.js";
import type { AditivoDados, DataISO, MedicaoDados, ObraDados, Status } from "./tipos.js";

/* ---------------- Fase ---------------- */

export const INDICE_FASE: Record<Status, number> = {
  planejamento: 0,
  licitacao: 1,
  contratada: 2,
  execucao: 3,
  paralisada: 3,
  recebimento_provisorio: 4,
  concluida: 5,
};

export const NOME_FASE = ["Planejamento", "Licitação", "Contratação", "Execução", "Recebimento"] as const;

export function isContratacaoDireta(o: Pick<ObraDados, "modalidade">): boolean {
  return o.modalidade === "dispensa" || o.modalidade === "inexigibilidade";
}

/* ---------------- Porte ---------------- */

export type ChavePorte = "pequeno" | "medio" | "grande" | "grande_vulto";

export interface Porte {
  chave: ChavePorte;
  nome: string;
  criterio: string;
}

export function valorReferencia(o: Pick<ObraDados, "valorContratado" | "valorEstimado">): number {
  return Number(o.valorContratado) || Number(o.valorEstimado) || 0;
}

export function classificarPorte(
  o: Pick<ObraDados, "valorContratado" | "valorEstimado">,
  p: ParametrosLegais = PARAMETROS_PADRAO,
): Porte {
  const v = valorReferencia(o);
  if (v >= p.grandeVulto) return { chave: "grande_vulto", nome: "Grande vulto", criterio: `≥ ${p.grandeVulto} (art. 6º, XXII)` };
  if (v > p.faixaMedioGrande) return { chave: "grande", nome: "Grande porte", criterio: `> ${p.faixaMedioGrande} (parâmetro interno)` };
  if (v > p.dispensaObras) return { chave: "medio", nome: "Médio porte", criterio: `> ${p.dispensaObras} e ≤ ${p.faixaMedioGrande}` };
  return { chave: "pequeno", nome: "Pequeno porte", criterio: `≤ ${p.dispensaObras} (art. 75, I)` };
}

/* ---------------- Financeiro ---------------- */

export interface ResumoFinanceiro {
  valorInicial: number;
  acrescimos: number;
  supressoes: number;
  reajustes: number;
  valorAtualizado: number;
  medido: number;
  saldo: number;
  percentualFinanceiro: number;
  percentualFisico: number;
  percentualAcrescimos: number;
  percentualSupressoes: number;
  limiteAcrescimos: number;
  margemAcrescimos: number;
  medicoesOrdenadas: MedicaoDados[];
}

const soma = (xs: number[]) => xs.reduce((s, x) => s + (Number(x) || 0), 0);

export function resumoFinanceiro(
  o: Pick<ObraDados, "valorContratado" | "valorEstimado" | "tipo">,
  medicoes: MedicaoDados[],
  aditivos: AditivoDados[],
): ResumoFinanceiro {
  const valorInicial = valorReferencia(o);
  const acrescimos = soma(aditivos.filter((a) => a.tipo === "acrescimo").map((a) => a.valor));
  const supressoes = soma(aditivos.filter((a) => a.tipo === "supressao").map((a) => a.valor));
  const reajustes = soma(aditivos.filter((a) => a.tipo === "reajuste").map((a) => a.valor));
  const valorAtualizado = valorInicial + acrescimos - supressoes + reajustes;
  const medicoesOrdenadas = [...medicoes].sort((a, b) => a.fim.localeCompare(b.fim) || a.numero - b.numero);
  const medido = soma(medicoesOrdenadas.map((m) => m.valor));
  const ultima = medicoesOrdenadas[medicoesOrdenadas.length - 1];
  const limiteAcrescimos = o.tipo === "reforma_edificio" ? LIMITES.acrescimoReforma : LIMITES.acrescimoPadrao;
  const pct = (x: number, base: number) => (base > 0 ? (x / base) * 100 : 0);
  return {
    valorInicial,
    acrescimos,
    supressoes,
    reajustes,
    valorAtualizado,
    medido,
    saldo: valorAtualizado - medido,
    percentualFinanceiro: pct(medido, valorAtualizado),
    percentualFisico: ultima ? Number(ultima.fisicoAcumulado) || 0 : 0,
    percentualAcrescimos: pct(acrescimos, valorInicial),
    percentualSupressoes: pct(supressoes, valorInicial),
    limiteAcrescimos,
    margemAcrescimos: Math.max(0, (valorInicial * limiteAcrescimos) / 100 - acrescimos),
    medicoesOrdenadas,
  };
}

/* ---------------- Prazo ---------------- */

export interface ResumoPrazo {
  inicio: DataISO | null;
  prazoTotal: number;
  diasAditados: number;
  termino: DataISO | null;
  diasRestantes: number | null;
  /** Percentual previsto pela linha reta entre OS e término. Provisório até o cronograma por etapas. */
  percentualPrevisto: number | null;
}

export function resumoPrazo(o: Pick<ObraDados, "dataOrdemServico" | "prazoDias">, aditivos: AditivoDados[], hoje: DataISO): ResumoPrazo {
  const diasAditados = soma(aditivos.filter((a) => a.tipo === "prazo").map((a) => a.dias));
  const prazoTotal = (Number(o.prazoDias) || 0) + diasAditados;
  const inicio = o.dataOrdemServico ?? null;
  if (!inicio || !prazoTotal) return { inicio, prazoTotal, diasAditados, termino: null, diasRestantes: null, percentualPrevisto: null };
  const termino = somarDias(inicio, prazoTotal);
  const decorrido = Math.max(0, Math.min(prazoTotal, diasEntre(inicio, hoje)));
  return { inicio, prazoTotal, diasAditados, termino, diasRestantes: diasEntre(hoje, termino), percentualPrevisto: (decorrido / prazoTotal) * 100 };
}
