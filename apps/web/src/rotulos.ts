export const NOME_STATUS: Record<string, string> = {
  planejamento: "Planejamento",
  licitacao: "Licitação / contratação direta",
  contratada: "Contratada (pré-OS)",
  execucao: "Em execução",
  paralisada: "Paralisada",
  recebimento_provisorio: "Recebimento provisório",
  concluida: "Concluída",
};

export const NOME_TIPO: Record<string, string> = {
  edificacao: "Edificação (construção nova)",
  reforma_edificio: "Reforma de edifício ou equipamento",
  pavimentacao: "Pavimentação / vias",
  saneamento: "Saneamento (água/esgoto)",
  drenagem: "Drenagem / contenção",
  ponte: "Ponte / viaduto / OAE",
  iluminacao: "Iluminação / elétrica",
  outro: "Outro serviço de engenharia",
};

export const NOME_REGIME: Record<string, string> = {
  unitario: "Empreitada por preço unitário",
  global: "Empreitada por preço global",
  integral: "Empreitada integral",
  tarefa: "Contratação por tarefa",
  integrada: "Contratação integrada",
  semi_integrada: "Contratação semi-integrada",
  fornecimento: "Fornecimento e prestação de serviço associado",
};

export const NOME_MODALIDADE: Record<string, string> = {
  concorrencia: "Concorrência",
  pregao: "Pregão (serviço comum de engenharia)",
  dialogo: "Diálogo competitivo",
  dispensa: "Dispensa de licitação",
  inexigibilidade: "Inexigibilidade",
  registro_precos: "Registro de preços",
};

export const NOME_FONTE: Record<string, string> = {
  proprio: "Recursos próprios",
  convenio_federal: "Transferência federal",
  convenio_estadual: "Transferência estadual",
  financiamento: "Operação de crédito",
};

export const NOME_ADITIVO: Record<string, string> = {
  acrescimo: "Acréscimo de valor",
  supressao: "Supressão de valor",
  prazo: "Prorrogação de prazo",
  reajuste: "Reajuste / repactuação",
};

export const CorPorte: Record<string, string> = { pequeno: "t-ok", medio: "t-info", grande: "t-warn", grande_vulto: "t-crit" };
export const FASES = ["Planejamento", "Licitação", "Contratação", "Execução", "Recebimento"];
