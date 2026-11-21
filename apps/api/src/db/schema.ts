/**
 * SCOP — modelo de dados v1 (PostgreSQL, Drizzle ORM).
 * Valores dos enums iguais aos de @scop/regras. Datas de calendário em `date` (string "AAAA-MM-DD").
 */
import { FONTES, LICENCA, MODALIDADES, REGIMES, STATUS, TIPOS_ADITIVO, TIPOS_OBRA } from "@scop/regras";
import { relations } from "drizzle-orm";
import { boolean, char, date, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const perfilEnum = pgEnum("perfil", ["admin", "gestor", "engenharia", "fiscal", "contratada", "controle_interno"]);
export const esferaEnum = pgEnum("esfera", ["municipal", "estadual", "federal"]);
export const tipoObraEnum = pgEnum("tipo_obra", TIPOS_OBRA);
export const regimeEnum = pgEnum("regime", REGIMES);
export const modalidadeEnum = pgEnum("modalidade", MODALIDADES);
export const fonteEnum = pgEnum("fonte", FONTES);
export const licencaEnum = pgEnum("licenca", LICENCA);
export const statusObraEnum = pgEnum("status_obra", STATUS);
export const papelEnum = pgEnum("papel_designacao", ["gestor", "fiscal_tecnico", "fiscal_administrativo", "fiscal_setorial"]);
export const statusMedicaoEnum = pgEnum("status_medicao", ["rascunho", "enviada", "atestada", "glosada"]);
export const tipoAditivoEnum = pgEnum("tipo_aditivo", TIPOS_ADITIVO);

const id = () => uuid("id").primaryKey().defaultRandom();
const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const dinheiro = (nome: string) => numeric(nome, { precision: 15, scale: 2 });

export const orgaos = pgTable("orgaos", {
  id: id(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj").unique(),
  municipio: text("municipio"),
  uf: char("uf", { length: 2 }),
  criadoEm: criadoEm(),
});

export const empresas = pgTable("empresas", {
  id: id(),
  cnpj: text("cnpj").notNull().unique(),
  razaoSocial: text("razao_social").notNull(),
});

export const usuarios = pgTable("usuarios", {
  id: id(),
  orgaoId: uuid("orgao_id").notNull().references(() => orgaos.id),
  empresaId: uuid("empresa_id").references(() => empresas.id),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  perfil: perfilEnum("perfil").notNull(),
  registroProfissional: text("registro_profissional"),
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: criadoEm(),
});

export const obras = pgTable(
  "obras",
  {
    id: id(),
    orgaoId: uuid("orgao_id").notNull().references(() => orgaos.id),
    nome: text("nome").notNull(),
    objeto: text("objeto"),
    municipio: text("municipio"),
    uf: char("uf", { length: 2 }),
    esfera: esferaEnum("esfera").notNull().default("municipal"),
    tipo: tipoObraEnum("tipo").notNull(),
    regime: regimeEnum("regime").notNull().default("unitario"),
    modalidade: modalidadeEnum("modalidade").notNull().default("concorrencia"),
    fonte: fonteEnum("fonte").notNull().default("proprio"),
    licenca: licencaEnum("licenca").notNull().default("verificar"),
    status: statusObraEnum("status").notNull().default("planejamento"),
    processo: text("processo"),
    valorEstimado: dinheiro("valor_estimado"),
    valorContratado: dinheiro("valor_contratado"),
    bdi: numeric("bdi", { precision: 5, scale: 2 }),
    contratoNumero: text("contrato_numero"),
    empresaId: uuid("empresa_id").references(() => empresas.id),
    dataAssinatura: date("data_assinatura"),
    dataOrdemServico: date("data_ordem_servico"),
    prazoDias: integer("prazo_dias"),
    garantiaModalidade: text("garantia_modalidade"),
    garantiaValor: dinheiro("garantia_valor"),
    garantiaVencimento: date("garantia_vencimento"),
    dataParalisacao: date("data_paralisacao"),
    motivoParalisacao: text("motivo_paralisacao"),
    responsavelTecnico: text("responsavel_tecnico"),
    artExecucao: text("art_execucao"),
    artFiscalizacao: text("art_fiscalizacao"),
    criadoEm: criadoEm(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("obras_orgao_status_idx").on(t.orgaoId, t.status)],
);

/** Designação formal de gestor e fiscais — Lei 14.133/2021, art. 117. */
export const designacoes = pgTable(
  "designacoes",
  {
    id: id(),
    obraId: uuid("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
    papel: papelEnum("papel").notNull(),
    portaria: text("portaria"),
    inicio: date("inicio").notNull(),
    fim: date("fim"),
  },
  (t) => [uniqueIndex("designacoes_unq").on(t.obraId, t.usuarioId, t.papel)],
);

export const checklistItens = pgTable(
  "checklist_itens",
  {
    id: id(),
    obraId: uuid("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    chave: text("chave").notNull(),
    comprovado: boolean("comprovado").notNull().default(false),
    data: date("data"),
    documento: text("documento"),
    observacao: text("observacao"),
    atualizadoPorId: uuid("atualizado_por_id").references(() => usuarios.id),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("checklist_obra_chave_unq").on(t.obraId, t.chave)],
);

export const medicoes = pgTable(
  "medicoes",
  {
    id: id(),
    obraId: uuid("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    numero: integer("numero").notNull(),
    inicio: date("inicio").notNull(),
    fim: date("fim").notNull(),
    fisicoAcumulado: numeric("fisico_acumulado", { precision: 5, scale: 2 }).notNull(),
    valor: dinheiro("valor").notNull(),
    status: statusMedicaoEnum("status").notNull().default("enviada"),
    atestoEm: date("atesto_em"),
    atestoPorId: uuid("atesto_por_id").references(() => usuarios.id),
    observacao: text("observacao"),
    criadoPorId: uuid("criado_por_id").notNull().references(() => usuarios.id),
    criadoEm: criadoEm(),
  },
  (t) => [uniqueIndex("medicoes_obra_numero_unq").on(t.obraId, t.numero)],
);

export const aditivos = pgTable("aditivos", {
  id: id(),
  obraId: uuid("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
  tipo: tipoAditivoEnum("tipo").notNull(),
  numero: text("numero"),
  valor: dinheiro("valor").notNull().default("0"),
  dias: integer("dias").notNull().default(0),
  data: date("data").notNull(),
  parecerJuridico: boolean("parecer_juridico").notNull().default(false),
  justificativa: text("justificativa").notNull(),
  criadoPorId: uuid("criado_por_id").notNull().references(() => usuarios.id),
  criadoEm: criadoEm(),
});

export const diario = pgTable(
  "diario_registros",
  {
    id: id(),
    obraId: uuid("obra_id").notNull().references(() => obras.id, { onDelete: "cascade" }),
    data: date("data").notNull(),
    clima: text("clima"),
    efetivo: integer("efetivo"),
    servicos: text("servicos"),
    ocorrencias: text("ocorrencias"),
    autorId: uuid("autor_id").notNull().references(() => usuarios.id),
    criadoEm: criadoEm(),
  },
  (t) => [index("diario_obra_data_idx").on(t.obraId, t.data)],
);

/** Trilha de auditoria — quem fez o quê e quando. Somente inserção. */
export const auditoria = pgTable(
  "auditoria",
  {
    id: id(),
    orgaoId: uuid("orgao_id").notNull(),
    usuarioId: uuid("usuario_id"),
    entidade: text("entidade").notNull(),
    entidadeId: text("entidade_id").notNull(),
    acao: text("acao").notNull(),
    dados: jsonb("dados"),
    criadoEm: criadoEm(),
  },
  (t) => [index("auditoria_entidade_idx").on(t.orgaoId, t.entidade, t.entidadeId)],
);

/* ---------- Relações (para db.query) ---------- */

export const obrasRel = relations(obras, ({ many, one }) => ({
  designacoes: many(designacoes),
  checklist: many(checklistItens),
  medicoes: many(medicoes),
  aditivos: many(aditivos),
  diario: many(diario),
  empresa: one(empresas, { fields: [obras.empresaId], references: [empresas.id] }),
}));
export const designacoesRel = relations(designacoes, ({ one }) => ({
  obra: one(obras, { fields: [designacoes.obraId], references: [obras.id] }),
  usuario: one(usuarios, { fields: [designacoes.usuarioId], references: [usuarios.id] }),
}));
export const checklistRel = relations(checklistItens, ({ one }) => ({ obra: one(obras, { fields: [checklistItens.obraId], references: [obras.id] }) }));
export const medicoesRel = relations(medicoes, ({ one }) => ({ obra: one(obras, { fields: [medicoes.obraId], references: [obras.id] }) }));
export const aditivosRel = relations(aditivos, ({ one }) => ({ obra: one(obras, { fields: [aditivos.obraId], references: [obras.id] }) }));
export const diarioRel = relations(diario, ({ one }) => ({ obra: one(obras, { fields: [diario.obraId], references: [obras.id] }) }));

export type Obra = typeof obras.$inferSelect;
export type Designacao = typeof designacoes.$inferSelect;
export type ChecklistItem = typeof checklistItens.$inferSelect;
export type Medicao = typeof medicoes.$inferSelect;
export type Aditivo = typeof aditivos.$inferSelect;
export type DiarioRegistro = typeof diario.$inferSelect;
