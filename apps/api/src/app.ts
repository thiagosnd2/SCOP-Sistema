import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { Env } from "./env.js";
import { ErroHttp } from "./lib/erros.js";
import type { UsuarioToken } from "./rbac.js";
import { rotasAdmin } from "./routes/admin.js";
import { rotasAuth } from "./routes/auth.js";
import { rotasObras } from "./routes/obras.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: UsuarioToken;
    user: UsuarioToken;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    autenticar: (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
  }
}

export async function criarApp(env: Pick<Env, "JWT_SECRET" | "CORS_ORIGIN">, opcoes: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opcoes.logger ?? false });

  await app.register(cors, { origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()) });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: "8h" } });

  app.decorate("autenticar", async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new ErroHttp(401, "Sessão inválida ou expirada.");
    }
  });

  app.setErrorHandler((err, req, rep) => {
    if (err instanceof ZodError) {
      return rep.status(400).send({ erro: "Dados inválidos.", detalhes: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })) });
    }
    if (err instanceof ErroHttp) return rep.status(err.status).send({ erro: err.message });
    const pgCode = (err as { code?: string }).code;
    if (pgCode === "23505") return rep.status(409).send({ erro: "Registro duplicado." });
    if (pgCode === "23503") return rep.status(400).send({ erro: "Referência inexistente." });
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) return rep.status(status).send({ erro: (err as Error).message });
    req.log.error(err);
    return rep.status(500).send({ erro: "Erro interno." });
  });

  app.get("/saude", async () => ({ ok: true }));
  await app.register(rotasAuth, { prefix: "/auth" });
  await app.register(rotasObras, { prefix: "/obras" });
  await app.register(rotasAdmin);

  return app;
}
