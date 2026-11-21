/** Datas sempre no formato ISO "AAAA-MM-DD" (sem fuso). Valores em reais. */
export type DataISO = string;

export const STATUS = [
  "planejamento",
  "licitacao",
  "contratada",
  "execucao",
  "paralisada",
  "recebimento_provisorio",
  "concluida",
] as const;
export type Status = (typeof STATUS)[number];

export const TIPOS_OBRA = [
  "edificacao",
  "reforma_edificio",
  "pavimentacao",
  "saneamento",
  "drenagem",
  "ponte",
  "iluminacao",
  "outro",
] as const;
export type TipoObra = (typeof TIPOS_OBRA)[number];

/** Regimes de execução — Lei 14.133/2021, art. 46. */
export const REGIMES = ["unitario", "global", "integral", "tarefa", "integrada", "semi_integrada", "fornecimento"] as const;
export type Regime = (typeof REGIMES)[number];

export const MODALIDADES = ["concorrencia", "pregao", "dialogo", "dispensa", "inexigibilidade", "registro_precos"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

export const FONTES = ["proprio", "convenio_federal", "convenio_estadual", "financiamento"] as const;
export type Fonte = (typeof FONTES)[number];

export const LICENCA = ["verificar", "exigivel", "dispensada"] as const;
export type Licenca = (typeof LICENCA)[number];

export const TIPOS_ADITIVO = ["acrescimo", "supressao", "prazo", "reajuste"] as const;
export type TipoAditivo = (typeof TIPOS_ADITIVO)[number];

export interface ObraDados {
  nome: string;
  uf?: string | null;
  tipo: TipoObra;
  regime: Regime;
  modalidade: Modalidade;
  fonte: Fonte;
  licenca: Licenca;
  status: Status;
  valorEstimado?: number | null;
  valorContratado?: number | null;
  dataAssinatura?: DataISO | null;
  dataOrdemServico?: DataISO | null;
  prazoDias?: number | null;
  garantiaVencimento?: DataISO | null;
  dataParalisacao?: DataISO | null;
  artExecucao?: string | null;
  artFiscalizacao?: string | null;
  temGestor: boolean;
  temFiscal: boolean;
}

export interface MedicaoDados {
  numero: number;
  inicio: DataISO;
  fim: DataISO;
  /** Percentual físico ACUMULADO ao fim do período (0–100). */
  fisicoAcumulado: number;
  /** Valor medido NO período. */
  valor: number;
  atestoEm?: DataISO | null;
}

export interface AditivoDados {
  tipo: TipoAditivo;
  valor: number;
  dias: number;
  data: DataISO;
  parecerJuridico: boolean;
}

export interface ContextoObra {
  obra: ObraDados;
  medicoes: MedicaoDados[];
  aditivos: AditivoDados[];
  /** Datas dos registros do diário de obra. */
  diario: DataISO[];
  /** Itens do checklist comprovados, por chave. */
  checklist: Record<string, boolean>;
}

export type NivelAlerta = "critico" | "atencao" | "info";

export interface Alerta {
  codigo: string;
  nivel: NivelAlerta;
  mensagem: string;
  fundamento: string;
}
