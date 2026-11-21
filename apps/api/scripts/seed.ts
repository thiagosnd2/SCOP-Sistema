/**
 * Dados de demonstração. NÃO usar em produção.
 * Todos os usuários usam a senha de SEED_SENHA (padrão: "scop-demo-2026").
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool, schema as s } from "../src/db/index.js";

const SENHA = process.env.SEED_SENHA ?? "scop-demo-2026";
const somar = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

async function main() {
  const existe = await db.query.orgaos.findFirst({ where: eq(s.orgaos.cnpj, "00000000000191") });
  if (existe) return console.log("Seed já aplicado — nada a fazer.");

  const hash = await bcrypt.hash(SENHA, 10);
  const [orgao] = await db.insert(s.orgaos).values({ nome: "Prefeitura Municipal de Vila Exemplo", cnpj: "00000000000191", municipio: "Vila Exemplo", uf: "ES" }).returning();
  const [empresa] = await db.insert(s.empresas).values({ cnpj: "11222333000181", razaoSocial: "Construtora Modelo Ltda." }).returning();

  type P = (typeof s.perfilEnum.enumValues)[number];
  const mk = async (nome: string, email: string, perfil: P, extra: Partial<typeof s.usuarios.$inferInsert> = {}) =>
    (await db.insert(s.usuarios).values({ orgaoId: orgao.id, nome, email, perfil, senhaHash: hash, ...extra }).returning())[0];

  await mk("Administrador", "admin@scop.local", "admin");
  const gestor = await mk("Ana Ribeiro", "gestor@scop.local", "gestor");
  await mk("Eng. Júlia Prado", "engenharia@scop.local", "engenharia", { registroProfissional: "CREA-ES 012345/D" });
  const fiscal = await mk("Eng. Carlos Mendes", "fiscal@scop.local", "fiscal", { registroProfissional: "CREA-ES 054321/D" });
  const contratada = await mk("Eng. Paula Souza", "contratada@scop.local", "contratada", { empresaId: empresa.id });
  await mk("Controle Interno", "controle@scop.local", "controle_interno");

  const os = somar(-120);
  const [obra] = await db
    .insert(s.obras)
    .values({
      orgaoId: orgao.id, nome: "UBS Bairro Novo — construção", objeto: "Construção de Unidade Básica de Saúde porte II, com 420 m².",
      municipio: "Vila Exemplo", uf: "ES", tipo: "edificacao", regime: "unitario", modalidade: "concorrencia", fonte: "convenio_federal", licenca: "dispensada",
      status: "execucao", processo: "2026/000123", valorEstimado: "2480000", valorContratado: "2315400", bdi: "24.5", contratoNumero: "045/2026",
      empresaId: empresa.id, dataAssinatura: somar(-132), dataOrdemServico: os, prazoDias: 300,
      garantiaModalidade: "Seguro-garantia", garantiaValor: "115770", garantiaVencimento: somar(20),
      responsavelTecnico: "Eng. Paula Souza", artExecucao: "ES20260012345", artFiscalizacao: null,
    })
    .returning();

  await db.insert(s.designacoes).values([
    { obraId: obra.id, usuarioId: gestor.id, papel: "gestor", portaria: "Portaria SEMOB 12/2026", inicio: os },
    { obraId: obra.id, usuarioId: fiscal.id, papel: "fiscal_tecnico", portaria: "Portaria SEMOB 12/2026", inicio: os },
  ]);
  const ok = ["dfd", "etp", "projeto_basico", "projeto_executivo", "orcamento", "art_projeto", "terreno", "dotacao", "alvara", "acessibilidade", "edital", "parecer_juridico", "pncp_edital", "homologacao", "contrato", "pncp_contrato", "garantia", "designacao", "art_execucao", "ordem_servico", "placa", "transferegov"];
  await db.insert(s.checklistItens).values(ok.map((chave) => ({ obraId: obra.id, chave, comprovado: true, data: os, atualizadoPorId: gestor.id })));
  const meds: [number, number, number][] = [[30, 6, 138_000], [60, 14, 190_500], [90, 22, 181_200]];
  await db.insert(s.medicoes).values(
    meds.map(([dia, fis, val], i) => ({
      obraId: obra.id, numero: i + 1, inicio: somar(-120 + dia - 30), fim: somar(-120 + dia), fisicoAcumulado: String(fis), valor: String(val),
      status: "atestada" as const, atestoEm: somar(-117 + dia), atestoPorId: fiscal.id, criadoPorId: contratada.id,
    })),
  );
  await db.insert(s.aditivos).values({ obraId: obra.id, tipo: "acrescimo", numero: "1º TA", valor: "312000", data: somar(-45), parecerJuridico: true, justificativa: "Contenção de talude não prevista no projeto básico.", criadoPorId: gestor.id });
  await db.insert(s.diario).values({ obraId: obra.id, data: somar(-10), clima: "Bom", efetivo: 18, servicos: "Alvenaria do bloco B e concretagem de vigas.", ocorrencias: "Solicitado reforço de equipe para recuperar cronograma.", autorId: fiscal.id });

  console.log(`Seed aplicado. Usuários admin|gestor|engenharia|fiscal|contratada|controle @scop.local — senha "${SENHA}".`);
}

await main();
await pool.end();
