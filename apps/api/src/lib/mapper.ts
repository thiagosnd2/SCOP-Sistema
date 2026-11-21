import type { ContextoObra, ObraDados } from "@scop/regras";
import type { Aditivo, ChecklistItem, Designacao, DiarioRegistro, Medicao, Obra } from "../db/schema.js";

/** numeric do Postgres chega como string; converte preservando null. */
export const num = (v: string | number | null | undefined): number | null => (v == null ? null : Number(v));
/** number → string para colunas numeric (null preservado; undefined = campo ausente). */
export const dec = (v: number | null | undefined): string | null | undefined => (v === undefined ? undefined : v === null ? null : String(v));

export type ObraCompleta = Obra & {
  designacoes: Designacao[];
  checklist: ChecklistItem[];
  medicoes: Medicao[];
  aditivos: Aditivo[];
  diario: Pick<DiarioRegistro, "data">[];
};

export function designacoesVigentes(o: Pick<ObraCompleta, "designacoes">, hoje: string) {
  return o.designacoes.filter((d) => d.inicio <= hoje && (!d.fim || d.fim >= hoje));
}

/** Medições que contam para o financeiro: enviadas ou atestadas (rascunhos e glosadas ficam fora). */
export const contaNoFinanceiro = (m: Pick<Medicao, "status">) => m.status === "enviada" || m.status === "atestada";

export function obraParaRegras(o: ObraCompleta, hoje: string): ObraDados {
  const vig = designacoesVigentes(o, hoje);
  return {
    nome: o.nome,
    uf: o.uf,
    tipo: o.tipo,
    regime: o.regime,
    modalidade: o.modalidade,
    fonte: o.fonte,
    licenca: o.licenca,
    status: o.status,
    valorEstimado: num(o.valorEstimado),
    valorContratado: num(o.valorContratado),
    dataAssinatura: o.dataAssinatura,
    dataOrdemServico: o.dataOrdemServico,
    prazoDias: o.prazoDias,
    garantiaVencimento: o.garantiaVencimento,
    dataParalisacao: o.dataParalisacao,
    artExecucao: o.artExecucao,
    artFiscalizacao: o.artFiscalizacao,
    temGestor: vig.some((d) => d.papel === "gestor"),
    temFiscal: vig.some((d) => d.papel !== "gestor"),
  };
}

export function contextoRegras(o: ObraCompleta, hoje: string): ContextoObra {
  return {
    obra: obraParaRegras(o, hoje),
    medicoes: o.medicoes.filter(contaNoFinanceiro).map((m) => ({
      numero: m.numero,
      inicio: m.inicio,
      fim: m.fim,
      fisicoAcumulado: Number(m.fisicoAcumulado),
      valor: Number(m.valor),
      atestoEm: m.atestoEm,
    })),
    aditivos: o.aditivos.map((a) => ({ tipo: a.tipo, valor: Number(a.valor), dias: a.dias, data: a.data, parecerJuridico: a.parecerJuridico })),
    diario: o.diario.map((d) => d.data),
    checklist: Object.fromEntries(o.checklist.map((c) => [c.chave, c.comprovado])),
  };
}

export function serializarObra(o: Obra) {
  return { ...o, valorEstimado: num(o.valorEstimado), valorContratado: num(o.valorContratado), bdi: num(o.bdi), garantiaValor: num(o.garantiaValor) };
}
export const serializarMedicao = (m: Medicao) => ({ ...m, fisicoAcumulado: Number(m.fisicoAcumulado), valor: Number(m.valor), contaNoFinanceiro: contaNoFinanceiro(m) });
export const serializarAditivo = (a: Aditivo) => ({ ...a, valor: Number(a.valor) });
