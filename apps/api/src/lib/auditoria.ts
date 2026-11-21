import { db, schema } from "../db/index.js";
import type { UsuarioToken } from "../rbac.js";

export async function auditar(u: UsuarioToken, entidade: string, entidadeId: string, acao: string, dados?: unknown) {
  await db.insert(schema.auditoria).values({
    orgaoId: u.orgaoId,
    usuarioId: u.id,
    entidade,
    entidadeId,
    acao,
    dados: dados === undefined ? null : JSON.parse(JSON.stringify(dados)),
  });
}
