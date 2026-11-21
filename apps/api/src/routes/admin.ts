import {
  avaliarAlertas,
  CHECKLIST,
  FONTES,
  hojeISO,
  LICENCA,
  LIMITES,
  MODALIDADES,
  NOME_FASE,
  PARAMETROS_PADRAO,
  REGIMES,
  STATUS,
  TIPOS_ADITIVO,
  TIPOS_OBRA,
} from "@scop/regras";
import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { auditar } from "../lib/auditoria.js";
import { ErroHttp } from "../lib/erros.js";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { contextoRegras } from "../lib/mapper.js";
import { MATRIZ, pode, type UsuarioToken } from "../rbac.js";

const UsuarioNovo = z.object({
  nome: z.string().trim().min(3),
  email: z.string().email().toLowerCase(),
  senha: z.string().min(10, "Senha com no mínimo 10 caracteres"),
  perfil: z.enum(["admin", "gestor", "engenharia", "fiscal", "contratada", "controle_interno"]),
  empresaId: z.string().uuid().nullable().optional(),
  registroProfissional: z.string().trim().max(40).nullable().optional(),
});
const EmpresaNova = z.object({ cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "CNPJ inválido"), razaoSocial: z.string().trim().min(3) });

function exigir(u: UsuarioToken, acao: Parameters<typeof pode>[1]) {
  if (!pode(u, acao)) throw new ErroHttp(403, "Seu perfil não tem permissão para esta ação.");
}

export const rotasAdmin: FastifyPluginAsync = async (app) => {
  /** Catálogos para o frontend: enums, checklist, parâmetros legais. Público. */
  app.get("/referencias", async () => ({
    parametros: PARAMETROS_PADRAO,
    limites: LIMITES,
    fases: NOME_FASE,
    enums: { status: STATUS, tipos: TIPOS_OBRA, regimes: REGIMES, modalidades: MODALIDADES, fontes: FONTES, licenca: LICENCA, tiposAditivo: TIPOS_ADITIVO },
    checklist: CHECKLIST.map((i) => ({ chave: i.chave, fase: i.fase, titulo: i.titulo, obrigatorio: !!i.obrigatorio, fundamento: typeof i.fundamento === "string" ? i.fundamento : "varia conforme a UF" })),
    perfis: Object.fromEntries(Object.entries(MATRIZ).map(([p, s]) => [p, [...s]])),
  }));

  app.register(async (priv) => {
    priv.addHook("onRequest", app.autenticar);

    /** Alertas consolidados da carteira visível ao usuário. */
    priv.get("/alertas", async (req) => {
      const u = req.user;
      exigir(u, "obra:ler");
      const hoje = hojeISO();
      const { obras } = schema;
      const filtro = u.perfil === "contratada" ? and(eq(obras.orgaoId, u.orgaoId), eq(obras.empresaId, u.empresaId ?? "00000000-0000-0000-0000-000000000000")) : eq(obras.orgaoId, u.orgaoId);
      const lista = await db.query.obras.findMany({
        where: filtro,
        with: { designacoes: true, checklist: true, medicoes: true, aditivos: true, diario: { columns: { data: true } } },
      });
      return lista
        .flatMap((o) => avaliarAlertas(contextoRegras(o, hoje), { hoje }).map((a) => ({ ...a, obraId: o.id, obraNome: o.nome })))
        .sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "critico" ? -1 : 1));
    });

    priv.get("/usuarios", async (req) => {
      const u = req.user;
      if (!pode(u, "usuario:gerir") && !pode(u, "designacao:editar")) throw new ErroHttp(403, "Sem permissão.");
      return db.query.usuarios.findMany({
        where: eq(schema.usuarios.orgaoId, u.orgaoId),
        columns: { id: true, nome: true, email: true, perfil: true, ativo: true, empresaId: true, registroProfissional: true },
        orderBy: (t, { asc }) => [asc(t.nome)],
      });
    });

    priv.post("/usuarios", async (req, rep) => {
      const u = req.user;
      exigir(u, "usuario:gerir");
      const d = UsuarioNovo.parse(req.body);
      if (d.perfil === "contratada" && !d.empresaId) throw new ErroHttp(400, "Usuário da contratada precisa estar vinculado a uma empresa.");
      const t = schema.usuarios;
      const [novo] = await db
        .insert(t)
        .values({ orgaoId: u.orgaoId, nome: d.nome, email: d.email, perfil: d.perfil, empresaId: d.empresaId ?? null, registroProfissional: d.registroProfissional ?? null, senhaHash: await bcrypt.hash(d.senha, 10) })
        .returning({ id: t.id, nome: t.nome, email: t.email, perfil: t.perfil, empresaId: t.empresaId });
      await auditar(u, "usuario", novo.id, "criar", { nome: d.nome, email: d.email, perfil: d.perfil });
      return rep.status(201).send(novo);
    });

    priv.get("/empresas", async (req) => {
      exigir(req.user, "obra:ler");
      return db.query.empresas.findMany({ orderBy: (t, { asc }) => [asc(t.razaoSocial)] });
    });

    priv.post("/empresas", async (req, rep) => {
      const u = req.user;
      exigir(u, "obra:criar");
      const d = EmpresaNova.parse(req.body);
      const [e] = await db.insert(schema.empresas).values({ cnpj: d.cnpj.replace(/\D/g, ""), razaoSocial: d.razaoSocial }).returning();
      await auditar(u, "empresa", e.id, "criar", d);
      return rep.status(201).send(e);
    });

    priv.get("/auditoria", async (req) => {
      const u = req.user;
      exigir(u, "auditoria:ler");
      const q = z.object({ entidade: z.string().optional(), entidadeId: z.string().optional(), limite: z.coerce.number().int().min(1).max(500).default(100) }).parse(req.query);
      const t = schema.auditoria;
      return db
        .select()
        .from(t)
        .where(and(eq(t.orgaoId, u.orgaoId), q.entidade ? eq(t.entidade, q.entidade) : undefined, q.entidadeId ? eq(t.entidadeId, q.entidadeId) : undefined))
        .orderBy(desc(t.criadoEm))
        .limit(q.limite);
    });
  });
};
