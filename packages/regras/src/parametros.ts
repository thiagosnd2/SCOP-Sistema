/**
 * Parâmetros monetários da Lei 14.133/2021, atualizados anualmente pelo IPCA-E (art. 182).
 * Revisar todo mês de janeiro, quando sai o novo decreto.
 */
export interface ParametrosLegais {
  ano: number;
  decreto: string;
  /** Art. 75, I — dispensa para obras e serviços de engenharia. */
  dispensaObras: number;
  /** Art. 6º, XXII — obras, serviços e fornecimentos de grande vulto. */
  grandeVulto: number;
  /** Corte interno (não legal) entre médio e grande porte. Ajustável por órgão. */
  faixaMedioGrande: number;
}

export const PARAMETROS_2026: ParametrosLegais = {
  ano: 2026,
  decreto: "Decreto nº 12.807/2025",
  dispensaObras: 130_984.2,
  grandeVulto: 261_968_421.04,
  faixaMedioGrande: 5_000_000,
};

export const PARAMETROS_PADRAO = PARAMETROS_2026;

/** Limites do art. 125 e tolerâncias usadas nos alertas. */
export const LIMITES = {
  acrescimoPadrao: 25,
  acrescimoReforma: 50,
  supressao: 25,
  /** Fração do limite de acréscimos a partir da qual o alerta de atenção dispara. */
  avisoAcrescimo: 0.8,
  atrasoFisicoAtencao: 10,
  atrasoFisicoCritico: 20,
  /** Pontos percentuais de folga entre financeiro e físico antes do alerta de pagamento antecipado. */
  folgaFinanceiroFisico: 5,
  diasSemMedicao: 35,
  diasSemDiario: 7,
  diasAvisoPrazo: 30,
  diasAvisoGarantia: 30,
  diasParalisacaoAviso: 30,
  /** Art. 94: prazos de publicação no PNCP, em dias úteis. */
  pncpLicitacao: 20,
  pncpContratacaoDireta: 10,
  /** Art. 25, § 4º: programa de integridade em até 6 meses. */
  mesesIntegridade: 6,
} as const;
