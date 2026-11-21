import {
  avaliarAlertas,
  CHAVES_CHECKLIST,
  CHECKLIST,
  aplicaItem,
  classificarPorte,
  exigenciasPorPorte,
  fundamentoItem,
  FONTES,
  hojeISO,
  LICENCA,
  MODALIDADES,
  REGIMES,
  resumoFinanceiro,
  resumoPrazo,
  situacaoChecklist,
  STATUS,
  TIPOS_ADITIVO,
  TIPOS_OBRA,
} from "@scop/regras";
import { and, asc, desc, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { auditar } from "../lib/auditoria.js";
import { ErroHttp } from "../lib/erros.js";
import { db, schema } from "../db/index.js";
import { contaNoFinanceiro, contextoRegras, dec, designacoesVigentes, serializarAditivo, serializarMedicao, serializarObra, type ObraCompleta } from "../lib/mapper.js";
import { pode, podeNaObra, type Acao, type UsuarioToken } from "../rbac.js";

/* ---------------- Validação ---------------- */

const dataStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD");
const dataOpc = dataStr.nullable().optional();
const dinheiro = z.number().nonnegative().max(1e13);
const texto = z.string().trim().max(2000);

const ObraBase = z.object({
  nome: z.string().trim().min(3).max(300),
  objeto: texto.nullable().optional(),
  municipio: z.string().trim().max(120).nullable().optional(),
  uf: z.string().trim().length(2).toUpperCase().nullable().optional(),
  esfera: z.enum(["municipal", "estadual", "federal"]).optional(),
  tipo: z.enum(TIPOS_OBRA),
  regime: z.enum(REGIMES).optional(),
  modalidade: z.enum(MODALIDADES).optional(),
  fonte: z.enum(FONTES).optional(),
  licenca: z.enum(LICENCA).optional(),
  status: z.enum(STATUS).optional(),
  processo: z.string().trim().max(60).nullable().optional(),
  valorEstimado: dinheiro.nullable().optional(),
  valorContratado: dinheiro.nullable().optional(),
  bdi: z.number().min(0).max(100).nullable().optional(),
  contratoNumero: z.string().trim().max(60).nullable().optional(),
  empresaId: z.string().nullable().optional(),
  dataAssinatura: dataOpc,
  dataOrdemServico: dataOpc,
  prazoDias: z.number().int().positive().max(36500).nullable().optional(),
  garantiaModalidade: z.string().trim().max(60).nullable().optional(),
  garantiaValor: dinheiro.nullable().optional(),
  garantiaVencimento: dataOpc,
  dataParalisacao: dataOpc,
  motivoParalisacao: texto.nullable().optional(),
  responsavelTecnico: z.string().trim().max(200).nullable().optional(),
  artExecucao: z.string().trim().max(60).nullable().optional(),
  artFiscalizacao: z.string().trim().max(60).nullable().optional(),
});
const ObraCriar = ObraBase;
const ObraEditar = ObraBase.partial();

/** Converte o corpo validado para colunas do banco (numeric → string). */
function paraBanco<T extends Partial<z.infer<typeof ObraBase>>>(d: T) {
  const { valorEstimado, valorContratado, bdi, garantiaValor, ...resto } = d;
  return {
    ...resto,
    ...(valorEstimado !== undefined && { valorEstimado: dec(valorEstimado) }),
    ...(valorContratado !== undefined && { valorContratado: dec(valorContratado) }),
    ...(bdi !== undefined && { bdi: dec(bdi) }),
    ...(garantiaValor !== undefined && { garantiaValor: dec(garantiaValor) }),
  };
}
const Id = z.object({ id: z.string().uuid("Identificador inválido") });

const ChecklistPut = z.object({
  comprovado: z.boolean(),
  documento: z.string().trim().max(200).nullable().optional(),
  observacao: texto.nullable().optional(),
  data: dataOpc,
});
const MedicaoNova = z.object({
  inicio: dataStr,
  fim: dataStr,
  fisicoAcumulado: z.number().min(0).max(100),
  valor: dinheiro,
  observacao: texto.nullable().optional(),
  rascunho: z.boolean().optional(),
});
const Atesto = z.object({ decisao: z.enum(["atestar", "glosar"]), observacao: texto.nullable().optional(), data: dataOpc });
const AditivoNovo = z
  .object({
    tipo: z.enum(TIPOS_ADITIVO),
    numero: z.string().trim().max(40).nullable().optional(),
    valor: dinheiro.default(0),
    dias: z.number().int().min(0).max(36500).default(0),
    data: dataStr,
    parecerJuridico: z.boolean(),
    justificativa: z.string().trim().min(10, "Justificativa técnica obrigatória"),
  })
  .refine((a) => (a.tipo === "prazo" ? a.dias > 0 : a.valor > 0), { message: "Informe os dias (prazo) ou o valor (demais tipos)." });
const DiarioNovo = z.object({
  data: dataStr,
  clima: z.string().trim().max(60).nullable().optional(),
  efetivo: z.number().int().min(0).max(10000).nullable().optional(),
  servicos: texto.nullable().optional(),
  ocorrencias: texto.nullable().optional(),
});
const DesignacaoNova = z.object({
  usuarioId: z.string().uuid(),
  papel: z.enum(["gestor", "fiscal_tecnico", "fiscal_administrativo", "fiscal_setorial"]),
  portaria: z.string().trim().max(120).nullable().optional(),
  inicio: dataStr,
  fim: dataOpc,
});

/* ---------------- Carregamento e escopo ---------------- */

const { obras, medicoes, aditivos, diario, designacoes, checklistItens, usuarios } = schema;
const buscarObra = (id: string) =>
  db.query.obras.findFirst({
    where: eq(obras.id, id),
    with: {
      designacoes: { with: { usuario: { columns: { id: true, nome: true, perfil: true, registroProfissional: true } } } },
      checklist: true,
      medicoes: { orderBy: [asc(medicoes.numero)] },
      aditivos: { orderBy: [asc(aditivos.data)] },
      diario: { orderBy: [desc(diario.data)] },
      empresa: true,
    },
  });

async function carregar(params: unknown, u: UsuarioToken, acao: Acao) {
  const { id } = Id.parse(params);
  const o = await buscarObra(id);
  if (!o || o.orgaoId !== u.orgaoId) throw new ErroHttp(404, "Obra não encontrada.");
  const escopo = { orgaoId: o.orgaoId, empresaId: o.empresaId, designados: designacoesVigentes(o, hojeISO()).map((d) => d.usuarioId) };
  if (!podeNaObra(u, "obra:ler", escopo)) throw new ErroHttp(404, "Obra não encontrada.");
  if (!podeNaObra(u, acao, escopo)) throw new ErroHttp(403, "Seu perfil não tem permissão para esta ação nesta obra.");
  return o;
}

function exigir(u: UsuarioToken, acao: Acao) {
  if (!pode(u, acao)) throw new ErroHttp(403, "Seu perfil não tem permissão para esta ação.");
}

function resumo(o: ObraCompleta) {
  const hoje = hojeISO();
  const ctx = contextoRegras(o, hoje);
  const alertas = avaliarAlertas(ctx, { hoje });
  const fin = resumoFinanceiro(ctx.obra, ctx.medicoes, ctx.aditivos);
  const { medicoesOrdenadas: _m, ...financeiro } = fin;
  return {
    porte: classificarPorte(ctx.obra),
    financeiro,
    prazo: resumoPrazo(ctx.obra, ctx.aditivos, hoje),
    conformidade: (({ atrasados, ...r }) => ({ ...r, atrasados: atrasados.map((i) => i.chave) }))(situacaoChecklist(ctx)),
    alertas,
    contagem: { critico: alertas.filter((a) => a.nivel === "critico").length, atencao: alertas.filter((a) => a.nivel === "atencao").length },
    ctx,
  };
}

/* ---------------- Rotas ---------------- */

export const rotasObras: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", app.autenticar);

  app.get("/", async (req) => {
    const u = req.user;
    exigir(u, "obra:ler");
    const filtro = u.perfil === "contratada" ? and(eq(obras.orgaoId, u.orgaoId), eq(obras.empresaId, u.empresaId ?? "00000000-0000-0000-0000-000000000000")) : eq(obras.orgaoId, u.orgaoId);
    const lista = await db.query.obras.findMany({
      where: filtro,
      with: {
        designacoes: true,
        checklist: true,
        medicoes: { orderBy: [asc(medicoes.numero)] },
        aditivos: true,
        diario: { columns: { data: true } },
        empresa: { columns: { razaoSocial: true } },
      },
      orderBy: [desc(obras.atualizadoEm)],
    });
    return lista.map((o) => {
      const r = resumo(o);
      return { id: o.id, nome: o.nome, municipio: o.municipio, uf: o.uf, tipo: o.tipo, status: o.status, contratada: o.empresa?.razaoSocial ?? null, porte: r.porte, financeiro: r.financeiro, prazo: r.prazo, contagem: r.contagem };
    });
  });

  app.post("/", async (req, rep) => {
    const u = req.user;
    exigir(u, "obra:criar");
    const d = ObraCriar.parse(req.body);
    const [o] = await db.insert(obras).values({ ...paraBanco(d), orgaoId: u.orgaoId }).returning();
    await auditar(u, "obra", o.id, "criar", d);
    return rep.status(201).send(serializarObra(o));
  });

  app.get("/:id", async (req) => {
    const o = await carregar(req.params, req.user, "obra:ler");
    const r = resumo(o);
    const { designacoes: ds, checklist: ck, medicoes: ms, aditivos: as, diario: di, empresa, ...dados } = o;
    return {
      obra: serializarObra(dados),
      contratada: empresa,
      designacoes: ds,
      checklist: CHECKLIST.map((i) => {
        const reg = ck.find((c) => c.chave === i.chave);
        return {
          chave: i.chave, fase: i.fase, titulo: i.titulo, fundamento: fundamentoItem(i, r.ctx.obra), obrigatorio: !!i.obrigatorio,
          aplicavel: aplicaItem(i, r.ctx.obra), comprovado: !!reg?.comprovado, data: reg?.data ?? null, documento: reg?.documento ?? null, observacao: reg?.observacao ?? null,
        };
      }),
      medicoes: ms.map(serializarMedicao),
      aditivos: as.map(serializarAditivo),
      diario: di,
      porte: r.porte,
      financeiro: r.financeiro,
      prazo: r.prazo,
      conformidade: r.conformidade,
      alertas: r.alertas,
      exigencias: exigenciasPorPorte(r.ctx.obra),
    };
  });

  app.patch("/:id", async (req) => {
    const u = req.user;
    const antes = await carregar(req.params, u, "obra:editar");
    const d = ObraEditar.parse(req.body);
    if (d.status === "paralisada" && !d.dataParalisacao && !antes.dataParalisacao) d.dataParalisacao = hojeISO();
    const [o] = await db.update(obras).set(paraBanco(d)).where(eq(obras.id, antes.id)).returning();
    await auditar(u, "obra", o.id, "editar", d);
    return serializarObra(o);
  });

  app.delete("/:id", async (req, rep) => {
    const u = req.user;
    const o = await carregar(req.params, u, "obra:excluir");
    await db.delete(obras).where(eq(obras.id, o.id));
    await auditar(u, "obra", o.id, "excluir", { nome: o.nome });
    return rep.status(204).send();
  });

  /* Checklist */
  app.put("/:id/checklist/:chave", async (req) => {
    const { chave } = req.params as { chave: string };
    if (!CHAVES_CHECKLIST.has(chave)) throw new ErroHttp(404, "Item de checklist inexistente.");
    const u = req.user;
    const o = await carregar(req.params, u, "checklist:editar");
    const d = ChecklistPut.parse(req.body);
    const valores = { comprovado: d.comprovado, data: d.comprovado ? (d.data ?? hojeISO()) : null, documento: d.documento ?? null, observacao: d.observacao ?? null, atualizadoPorId: u.id };
    const [item] = await db
      .insert(checklistItens)
      .values({ obraId: o.id, chave, ...valores })
      .onConflictDoUpdate({ target: [checklistItens.obraId, checklistItens.chave], set: valores })
      .returning();
    await auditar(u, "checklist", item.id, d.comprovado ? "comprovar" : "desmarcar", { obraId: o.id, chave, ...d });
    return item;
  });

  /* Medições */
  app.post("/:id/medicoes", async (req, rep) => {
    const u = req.user;
    const o = await carregar(req.params, u, "medicao:criar");
    const d = MedicaoNova.parse(req.body);
    if (d.fim < d.inicio) throw new ErroHttp(400, "Fim do período anterior ao início.");
    const validas = o.medicoes.filter(contaNoFinanceiro);
    const ultimoFisico = validas.length ? Math.max(...validas.map((m) => Number(m.fisicoAcumulado))) : 0;
    if (d.fisicoAcumulado < ultimoFisico) throw new ErroHttp(400, `% físico acumulado não pode ser menor que o da última medição (${ultimoFisico}%).`);
    const numero = o.medicoes.reduce((mx, m) => Math.max(mx, m.numero), 0) + 1;
    const [m] = await db
      .insert(medicoes)
      .values({ obraId: o.id, numero, inicio: d.inicio, fim: d.fim, fisicoAcumulado: String(d.fisicoAcumulado), valor: String(d.valor), observacao: d.observacao ?? null, status: d.rascunho ? "rascunho" : "enviada", criadoPorId: u.id })
      .returning();
    await auditar(u, "medicao", m.id, "criar", { obraId: o.id, ...d });
    const ctx = contextoRegras(o, hojeISO());
    const atualizado = resumoFinanceiro(ctx.obra, ctx.medicoes, ctx.aditivos).valorAtualizado;
    const acumulado = d.valor + validas.reduce((s, x) => s + Number(x.valor), 0);
    const aviso = atualizado > 0 && acumulado > atualizado ? "Atenção: o acumulado medido ultrapassa o valor atualizado do contrato." : null;
    return rep.status(201).send({ ...serializarMedicao(m), aviso });
  });

  app.post("/:id/medicoes/:mid/atesto", async (req) => {
    const { mid } = req.params as { mid: string };
    const u = req.user;
    const o = await carregar(req.params, u, "medicao:atestar");
    const m = o.medicoes.find((x) => x.id === mid);
    if (!m) throw new ErroHttp(404, "Medição não encontrada.");
    if (m.status !== "enviada") throw new ErroHttp(409, `Medição está "${m.status}"; só medições enviadas podem ser atestadas ou glosadas.`);
    const d = Atesto.parse(req.body);
    if (d.decisao === "glosar" && !d.observacao) throw new ErroHttp(400, "Informe o motivo da glosa.");
    const [r] = await db
      .update(medicoes)
      .set({ status: d.decisao === "atestar" ? "atestada" : "glosada", atestoEm: d.data ?? hojeISO(), atestoPorId: u.id, observacao: d.observacao ?? m.observacao })
      .where(eq(medicoes.id, mid))
      .returning();
    await auditar(u, "medicao", mid, d.decisao, { obraId: o.id, observacao: d.observacao });
    return serializarMedicao(r);
  });

  /* Aditivos */
  app.post("/:id/aditivos", async (req, rep) => {
    const u = req.user;
    const o = await carregar(req.params, u, "aditivo:criar");
    const d = AditivoNovo.parse(req.body);
    const [a] = await db.insert(aditivos).values({ ...d, valor: String(d.valor), obraId: o.id, criadoPorId: u.id }).returning();
    await auditar(u, "aditivo", a.id, "criar", { obraId: o.id, ...d });
    return rep.status(201).send(serializarAditivo(a));
  });

  /* Diário */
  app.post("/:id/diario", async (req, rep) => {
    const u = req.user;
    const o = await carregar(req.params, u, "diario:criar");
    const d = DiarioNovo.parse(req.body);
    if (d.data > hojeISO()) throw new ErroHttp(400, "Não é permitido registrar o diário com data futura.");
    const [r] = await db.insert(diario).values({ ...d, obraId: o.id, autorId: u.id }).returning();
    await auditar(u, "diario", r.id, "criar", { obraId: o.id, ...d });
    return rep.status(201).send(r);
  });

  /* Designações (art. 117) */
  app.post("/:id/designacoes", async (req, rep) => {
    const u = req.user;
    const o = await carregar(req.params, u, "designacao:editar");
    const d = DesignacaoNova.parse(req.body);
    const alvo = await db.query.usuarios.findFirst({ where: eq(usuarios.id, d.usuarioId) });
    if (!alvo || alvo.orgaoId !== u.orgaoId || alvo.perfil === "contratada") throw new ErroHttp(400, "Usuário inválido para designação (deve ser servidor do órgão).");
    const [r] = await db.insert(designacoes).values({ obraId: o.id, usuarioId: d.usuarioId, papel: d.papel, portaria: d.portaria ?? null, inicio: d.inicio, fim: d.fim ?? null }).returning();
    await auditar(u, "designacao", r.id, "criar", { obraId: o.id, ...d });
    return rep.status(201).send(r);
  });

  app.post("/:id/designacoes/:did/encerrar", async (req) => {
    const { did } = req.params as { did: string };
    const u = req.user;
    const o = await carregar(req.params, u, "designacao:editar");
    if (!o.designacoes.some((x) => x.id === did)) throw new ErroHttp(404, "Designação não encontrada.");
    const [r] = await db.update(designacoes).set({ fim: hojeISO() }).where(eq(designacoes.id, did)).returning();
    await auditar(u, "designacao", did, "encerrar", { obraId: o.id });
    return r;
  });
};
