/**
 * Testes de integração contra PostgreSQL real (banco scop_teste por padrão).
 * O banco é recriado do zero: migrações + seed de demonstração.
 */
import { execSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rbacCasos } from "./rbac-casos.js";

let app: FastifyInstance;
const tokens: Record<string, string> = {};
let obraId = "";

async function chamar(perfil: string | null, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", url: string, body?: unknown) {
  const r = await app.inject({ method, url, payload: body as object, headers: perfil ? { authorization: `Bearer ${tokens[perfil]}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : null };
}
const codigos = async (perfil = "gestor") => (await chamar(perfil, "GET", `/obras/${obraId}`)).body.alertas.map((a: { codigo: string }) => a.codigo);

beforeAll(async () => {
  const url = process.env.DATABASE_URL!;
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await c.end();
  execSync("npx tsx src/db/migrar.ts && npx tsx scripts/seed.ts", { cwd: new URL("..", import.meta.url).pathname, env: process.env, stdio: "pipe" });

  const { criarApp } = await import("../src/app.js");
  app = await criarApp({ JWT_SECRET: process.env.JWT_SECRET!, CORS_ORIGIN: "http://localhost:5173" });
  for (const p of ["admin", "gestor", "engenharia", "fiscal", "contratada", "controle"]) {
    const r = await chamar(null, "POST", "/auth/login", { email: `${p}@scop.local`, senha: "scop-demo-2026" });
    expect(r.status).toBe(200);
    tokens[p] = r.body.token;
  }
  obraId = (await chamar("gestor", "GET", "/obras")).body[0].id;
});

afterAll(async () => {
  await app?.close();
  const { pool } = await import("../src/db/index.js");
  await pool.end();
});

describe("autenticação", () => {
  it("rejeita senha errada e requisição sem token", async () => {
    expect((await chamar(null, "POST", "/auth/login", { email: "gestor@scop.local", senha: "errada" })).status).toBe(401);
    expect((await chamar(null, "GET", "/obras")).status).toBe(401);
  });
  it("devolve perfil e permissões", async () => {
    const r = await chamar("fiscal", "GET", "/auth/eu");
    expect(r.body.perfil).toBe("fiscal");
    expect(r.body.permissoes).toContain("medicao:atestar");
  });
});

describe("obra de demonstração", () => {
  it("lista com porte, financeiro e contagem de alertas", async () => {
    const r = await chamar("gestor", "GET", "/obras");
    expect(r.body).toHaveLength(1);
    expect(r.body[0].porte.chave).toBe("medio");
    expect(r.body[0].financeiro.valorAtualizado).toBe(2_627_400);
    expect(r.body[0].contagem.critico).toBeGreaterThan(0);
  });
  it("aponta ART de fiscalização ausente e garantia vencendo", async () => {
    const c = await codigos();
    expect(c).toContain("art_fiscalizacao_ausente");
    expect(c).toContain("garantia_vencendo");
  });
  it("resolver a ART remove o alerta", async () => {
    expect((await chamar("engenharia", "PATCH", `/obras/${obraId}`, { artFiscalizacao: "ES2026999" })).status).toBe(200);
    expect((await chamar("gestor", "PUT", `/obras/${obraId}/checklist/art_fiscalizacao`, { comprovado: true, documento: "ART ES2026999" })).status).toBe(200);
    expect(await codigos()).not.toContain("art_fiscalizacao_ausente");
  });
});

describe("medições", () => {
  let medicaoId = "";
  it("contratada envia medição; % físico não pode regredir", async () => {
    const bad = await chamar("contratada", "POST", `/obras/${obraId}/medicoes`, { inicio: "2026-10-01", fim: "2026-10-31", fisicoAcumulado: 10, valor: 1000 });
    expect(bad.status).toBe(400);
    const ok = await chamar("contratada", "POST", `/obras/${obraId}/medicoes`, { inicio: "2026-10-01", fim: "2026-10-31", fisicoAcumulado: 30, valor: 190_000 });
    expect(ok.status).toBe(201);
    expect(ok.body.numero).toBe(4);
    expect(ok.body.status).toBe("enviada");
    medicaoId = ok.body.id;
  });
  it("só o fiscal designado atesta; glosa exige motivo", async () => {
    expect((await chamar("contratada", "POST", `/obras/${obraId}/medicoes/${medicaoId}/atesto`, { decisao: "atestar" })).status).toBe(403);
    expect((await chamar("fiscal", "POST", `/obras/${obraId}/medicoes/${medicaoId}/atesto`, { decisao: "glosar" })).status).toBe(400);
    const r = await chamar("fiscal", "POST", `/obras/${obraId}/medicoes/${medicaoId}/atesto`, { decisao: "atestar" });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("atestada");
    expect((await chamar("fiscal", "POST", `/obras/${obraId}/medicoes/${medicaoId}/atesto`, { decisao: "atestar" })).status).toBe(409);
  });
});

describe("aditivos — art. 125", () => {
  it("exige justificativa e bloqueia perfil sem permissão", async () => {
    expect((await chamar("gestor", "POST", `/obras/${obraId}/aditivos`, { tipo: "acrescimo", valor: 1000, data: "2026-11-01", parecerJuridico: true, justificativa: "curta" })).status).toBe(400);
    expect((await chamar("engenharia", "POST", `/obras/${obraId}/aditivos`, { tipo: "acrescimo", valor: 1000, data: "2026-11-01", parecerJuridico: true, justificativa: "Justificativa técnica completa." })).status).toBe(403);
  });
  it("acréscimos acima de 25% geram alerta crítico", async () => {
    const r = await chamar("gestor", "POST", `/obras/${obraId}/aditivos`, { tipo: "acrescimo", numero: "2º TA", valor: 300_000, data: "2026-11-10", parecerJuridico: true, justificativa: "Ampliação da rede de drenagem pluvial." });
    expect(r.status).toBe(201);
    expect(await codigos()).toContain("acrescimo_acima_limite");
  });
});

describe("escopo e perfis", () => {
  it.each(rbacCasos)("$perfil $metodo $rota → $esperado", async ({ perfil, metodo, rota, corpo, esperado }) => {
    const r = await chamar(perfil, metodo, rota.replace(":obra", obraId), corpo);
    expect(r.status).toBe(esperado);
  });
  it("fiscal não designado não registra diário em outra obra", async () => {
    const nova = await chamar("gestor", "POST", "/obras", { nome: "Pavimentação Rua A", tipo: "pavimentacao", status: "execucao", valorContratado: 900_000 });
    expect(nova.status).toBe(201);
    expect((await chamar("fiscal", "POST", `/obras/${nova.body.id}/diario`, { data: "2026-11-01", servicos: "teste" })).status).toBe(403);
    expect((await chamar("fiscal", "POST", `/obras/${obraId}/diario`, { data: "2026-11-01", servicos: "Concretagem da laje" })).status).toBe(201);
    expect((await chamar("contratada", "GET", `/obras/${nova.body.id}`)).status).toBe(404);
  });
  it("identificador inválido devolve 400", async () => {
    expect((await chamar("gestor", "GET", "/obras/abc")).status).toBe(400);
  });
});

describe("auditoria", () => {
  it("registra as ações e é imutável", async () => {
    const r = await chamar("controle", "GET", `/auditoria?entidade=medicao`);
    expect(r.status).toBe(200);
    expect(r.body.map((a: { acao: string }) => a.acao)).toEqual(expect.arrayContaining(["criar", "atestar"]));
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    await expect(c.query("DELETE FROM auditoria")).rejects.toThrow(/não pode ser alterada/);
    await c.end();
  });
});
