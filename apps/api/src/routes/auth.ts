import bcrypt from "bcryptjs";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ErroHttp } from "../lib/erros.js";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { MATRIZ, type UsuarioToken } from "../rbac.js";

const Login = z.object({ email: z.string().email(), senha: z.string().min(1) });

export const rotasAuth: FastifyPluginAsync = async (app) => {
  app.post("/login", async (req) => {
    const { email, senha } = Login.parse(req.body);
    const u = await db.query.usuarios.findFirst({ where: eq(schema.usuarios.email, email.toLowerCase()) });
    if (!u || !u.ativo || !(await bcrypt.compare(senha, u.senhaHash))) throw new ErroHttp(401, "E-mail ou senha inválidos.");
    const payload: UsuarioToken = { id: u.id, orgaoId: u.orgaoId, perfil: u.perfil, empresaId: u.empresaId, nome: u.nome };
    return { token: app.jwt.sign(payload), usuario: { ...payload, email: u.email, permissoes: [...MATRIZ[u.perfil]] } };
  });

  app.get("/eu", { onRequest: [app.autenticar] }, async (req) => ({ ...req.user, permissoes: [...MATRIZ[req.user.perfil]] }));
};
