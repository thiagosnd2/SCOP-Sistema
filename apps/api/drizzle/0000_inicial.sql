CREATE TYPE "public"."esfera" AS ENUM('municipal', 'estadual', 'federal');--> statement-breakpoint
CREATE TYPE "public"."fonte" AS ENUM('proprio', 'convenio_federal', 'convenio_estadual', 'financiamento');--> statement-breakpoint
CREATE TYPE "public"."licenca" AS ENUM('verificar', 'exigivel', 'dispensada');--> statement-breakpoint
CREATE TYPE "public"."modalidade" AS ENUM('concorrencia', 'pregao', 'dialogo', 'dispensa', 'inexigibilidade', 'registro_precos');--> statement-breakpoint
CREATE TYPE "public"."papel_designacao" AS ENUM('gestor', 'fiscal_tecnico', 'fiscal_administrativo', 'fiscal_setorial');--> statement-breakpoint
CREATE TYPE "public"."perfil" AS ENUM('admin', 'gestor', 'engenharia', 'fiscal', 'contratada', 'controle_interno');--> statement-breakpoint
CREATE TYPE "public"."regime" AS ENUM('unitario', 'global', 'integral', 'tarefa', 'integrada', 'semi_integrada', 'fornecimento');--> statement-breakpoint
CREATE TYPE "public"."status_medicao" AS ENUM('rascunho', 'enviada', 'atestada', 'glosada');--> statement-breakpoint
CREATE TYPE "public"."status_obra" AS ENUM('planejamento', 'licitacao', 'contratada', 'execucao', 'paralisada', 'recebimento_provisorio', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."tipo_aditivo" AS ENUM('acrescimo', 'supressao', 'prazo', 'reajuste');--> statement-breakpoint
CREATE TYPE "public"."tipo_obra" AS ENUM('edificacao', 'reforma_edificio', 'pavimentacao', 'saneamento', 'drenagem', 'ponte', 'iluminacao', 'outro');--> statement-breakpoint
CREATE TABLE "aditivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"tipo" "tipo_aditivo" NOT NULL,
	"numero" text,
	"valor" numeric(15, 2) DEFAULT '0' NOT NULL,
	"dias" integer DEFAULT 0 NOT NULL,
	"data" date NOT NULL,
	"parecer_juridico" boolean DEFAULT false NOT NULL,
	"justificativa" text NOT NULL,
	"criado_por_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orgao_id" uuid NOT NULL,
	"usuario_id" uuid,
	"entidade" text NOT NULL,
	"entidade_id" text NOT NULL,
	"acao" text NOT NULL,
	"dados" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"chave" text NOT NULL,
	"comprovado" boolean DEFAULT false NOT NULL,
	"data" date,
	"documento" text,
	"observacao" text,
	"atualizado_por_id" uuid,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"papel" "papel_designacao" NOT NULL,
	"portaria" text,
	"inicio" date NOT NULL,
	"fim" date
);
--> statement-breakpoint
CREATE TABLE "diario_registros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"data" date NOT NULL,
	"clima" text,
	"efetivo" integer,
	"servicos" text,
	"ocorrencias" text,
	"autor_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" text NOT NULL,
	"razao_social" text NOT NULL,
	CONSTRAINT "empresas_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "medicoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"fisico_acumulado" numeric(5, 2) NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"status" "status_medicao" DEFAULT 'enviada' NOT NULL,
	"atesto_em" date,
	"atesto_por_id" uuid,
	"observacao" text,
	"criado_por_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orgao_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"objeto" text,
	"municipio" text,
	"uf" char(2),
	"esfera" "esfera" DEFAULT 'municipal' NOT NULL,
	"tipo" "tipo_obra" NOT NULL,
	"regime" "regime" DEFAULT 'unitario' NOT NULL,
	"modalidade" "modalidade" DEFAULT 'concorrencia' NOT NULL,
	"fonte" "fonte" DEFAULT 'proprio' NOT NULL,
	"licenca" "licenca" DEFAULT 'verificar' NOT NULL,
	"status" "status_obra" DEFAULT 'planejamento' NOT NULL,
	"processo" text,
	"valor_estimado" numeric(15, 2),
	"valor_contratado" numeric(15, 2),
	"bdi" numeric(5, 2),
	"contrato_numero" text,
	"empresa_id" uuid,
	"data_assinatura" date,
	"data_ordem_servico" date,
	"prazo_dias" integer,
	"garantia_modalidade" text,
	"garantia_valor" numeric(15, 2),
	"garantia_vencimento" date,
	"data_paralisacao" date,
	"motivo_paralisacao" text,
	"responsavel_tecnico" text,
	"art_execucao" text,
	"art_fiscalizacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgaos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text,
	"municipio" text,
	"uf" char(2),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orgaos_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orgao_id" uuid NOT NULL,
	"empresa_id" uuid,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"perfil" "perfil" NOT NULL,
	"registro_profissional" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "aditivos" ADD CONSTRAINT "aditivos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aditivos" ADD CONSTRAINT "aditivos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_itens" ADD CONSTRAINT "checklist_itens_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_itens" ADD CONSTRAINT "checklist_itens_atualizado_por_id_usuarios_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designacoes" ADD CONSTRAINT "designacoes_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designacoes" ADD CONSTRAINT "designacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diario_registros" ADD CONSTRAINT "diario_registros_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diario_registros" ADD CONSTRAINT "diario_registros_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicoes" ADD CONSTRAINT "medicoes_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicoes" ADD CONSTRAINT "medicoes_atesto_por_id_usuarios_id_fk" FOREIGN KEY ("atesto_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicoes" ADD CONSTRAINT "medicoes_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_orgao_id_orgaos_id_fk" FOREIGN KEY ("orgao_id") REFERENCES "public"."orgaos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_orgao_id_orgaos_id_fk" FOREIGN KEY ("orgao_id") REFERENCES "public"."orgaos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_entidade_idx" ON "auditoria" USING btree ("orgao_id","entidade","entidade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_obra_chave_unq" ON "checklist_itens" USING btree ("obra_id","chave");--> statement-breakpoint
CREATE UNIQUE INDEX "designacoes_unq" ON "designacoes" USING btree ("obra_id","usuario_id","papel");--> statement-breakpoint
CREATE INDEX "diario_obra_data_idx" ON "diario_registros" USING btree ("obra_id","data");--> statement-breakpoint
CREATE UNIQUE INDEX "medicoes_obra_numero_unq" ON "medicoes" USING btree ("obra_id","numero");--> statement-breakpoint
CREATE INDEX "obras_orgao_status_idx" ON "obras" USING btree ("orgao_id","status");