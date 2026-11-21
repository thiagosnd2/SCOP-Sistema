/**
 * Perfis e permissões do SCOP.
 *
 * Duas camadas:
 *  1. Matriz perfil × ação (o que o perfil pode fazer em geral).
 *  2. Escopo da obra: mesmo órgão; a contratada só vê obras da sua empresa;
 *     o fiscal só altera obras em que está designado (art. 117).
 */
export type Perfil = "admin" | "gestor" | "engenharia" | "fiscal" | "contratada" | "controle_interno";

export type Acao =
  | "obra:ler"
  | "obra:criar"
  | "obra:editar"
  | "obra:excluir"
  | "checklist:editar"
  | "medicao:criar"
  | "medicao:atestar"
  | "aditivo:criar"
  | "diario:criar"
  | "designacao:editar"
  | "usuario:gerir"
  | "auditoria:ler";

const TODAS: Acao[] = [
  "obra:ler", "obra:criar", "obra:editar", "obra:excluir", "checklist:editar", "medicao:criar",
  "medicao:atestar", "aditivo:criar", "diario:criar", "designacao:editar", "usuario:gerir", "auditoria:ler",
];

export const MATRIZ: Record<Perfil, ReadonlySet<Acao>> = {
  admin: new Set(TODAS),
  gestor: new Set<Acao>(["obra:ler", "obra:criar", "obra:editar", "checklist:editar", "aditivo:criar", "diario:criar", "designacao:editar", "auditoria:ler"]),
  engenharia: new Set<Acao>(["obra:ler", "obra:criar", "obra:editar", "checklist:editar", "medicao:criar", "diario:criar"]),
  fiscal: new Set<Acao>(["obra:ler", "checklist:editar", "medicao:criar", "medicao:atestar", "diario:criar"]),
  contratada: new Set<Acao>(["obra:ler", "medicao:criar", "diario:criar"]),
  controle_interno: new Set<Acao>(["obra:ler", "auditoria:ler"]),
};

export interface UsuarioToken {
  id: string;
  orgaoId: string;
  perfil: Perfil;
  empresaId: string | null;
  nome: string;
}

export interface EscopoObra {
  orgaoId: string;
  empresaId: string | null;
  /** Ids dos usuários com designação vigente na obra. */
  designados: string[];
}

export function pode(u: UsuarioToken, acao: Acao): boolean {
  return MATRIZ[u.perfil]?.has(acao) ?? false;
}

export function podeNaObra(u: UsuarioToken, acao: Acao, obra: EscopoObra): boolean {
  if (!pode(u, acao)) return false;
  if (obra.orgaoId !== u.orgaoId) return false;
  if (u.perfil === "contratada") return !!u.empresaId && obra.empresaId === u.empresaId;
  if (u.perfil === "fiscal" && acao !== "obra:ler") return obra.designados.includes(u.id);
  return true;
}
