import { describe, expect, it } from "vitest";
import {
  avaliarAlertas,
  classificarPorte,
  resumoFinanceiro,
  resumoPrazo,
  situacaoChecklist,
  somarDiasUteis,
  somarMeses,
  type ContextoObra,
  type ObraDados,
} from "../src/index.js";

const HOJE = "2026-11-20";

function obra(p: Partial<ObraDados> = {}): ObraDados {
  return {
    nome: "Obra teste",
    uf: "ES",
    tipo: "edificacao",
    regime: "unitario",
    modalidade: "concorrencia",
    fonte: "proprio",
    licenca: "dispensada",
    status: "execucao",
    valorContratado: 1_000_000,
    dataAssinatura: "2026-06-01",
    dataOrdemServico: "2026-06-10",
    prazoDias: 300,
    artExecucao: "ES123",
    artFiscalizacao: "ES456",
    temGestor: true,
    temFiscal: true,
    ...p,
  };
}

const TUDO_OK: Record<string, boolean> = Object.fromEntries(
  ["dfd", "etp", "projeto_basico", "projeto_executivo", "orcamento", "art_projeto", "terreno", "dotacao", "edital", "parecer_juridico", "pncp_edital", "homologacao", "contrato", "pncp_contrato", "designacao", "art_execucao", "art_fiscalizacao", "ordem_servico"].map((k) => [k, true]),
);

function ctx(p: Partial<ContextoObra> = {}): ContextoObra {
  return { obra: obra(), medicoes: [], aditivos: [], diario: [HOJE], checklist: TUDO_OK, ...p };
}
const codigos = (c: ContextoObra) => avaliarAlertas(c, { hoje: HOJE }).map((a) => `${a.codigo}:${a.nivel}`);

describe("porte (Decreto 12.807/2025)", () => {
  it("classifica pelas faixas legais", () => {
    expect(classificarPorte({ valorContratado: 130_984.2 }).chave).toBe("pequeno");
    expect(classificarPorte({ valorContratado: 130_984.21 }).chave).toBe("medio");
    expect(classificarPorte({ valorContratado: 5_000_001 }).chave).toBe("grande");
    expect(classificarPorte({ valorContratado: 261_968_421.04 }).chave).toBe("grande_vulto");
  });
  it("usa o valor estimado quando não há contratado", () => {
    expect(classificarPorte({ valorEstimado: 50_000, valorContratado: null }).chave).toBe("pequeno");
  });
});

describe("financeiro e art. 125", () => {
  it("calcula valor atualizado sem compensar acréscimos e supressões", () => {
    const f = resumoFinanceiro(obra(), [], [
      { tipo: "acrescimo", valor: 200_000, dias: 0, data: "2026-08-01", parecerJuridico: true },
      { tipo: "supressao", valor: 100_000, dias: 0, data: "2026-08-01", parecerJuridico: true },
      { tipo: "reajuste", valor: 30_000, dias: 0, data: "2026-08-01", parecerJuridico: true },
    ]);
    expect(f.valorAtualizado).toBe(1_130_000);
    expect(f.percentualAcrescimos).toBe(20);
    expect(f.percentualSupressoes).toBe(10);
    expect(f.margemAcrescimos).toBe(50_000);
  });
  it("aplica 50% para reforma de edifício", () => {
    expect(resumoFinanceiro(obra({ tipo: "reforma_edificio" }), [], []).limiteAcrescimos).toBe(50);
  });
  it("alerta acréscimo acima de 25% e próximo do limite", () => {
    const ad = (v: number) => [{ tipo: "acrescimo" as const, valor: v, dias: 0, data: "2026-08-01", parecerJuridico: true }];
    expect(codigos(ctx({ aditivos: ad(260_000) }))).toContain("acrescimo_acima_limite:critico");
    expect(codigos(ctx({ aditivos: ad(210_000) }))).toContain("acrescimo_proximo_limite:atencao");
    expect(codigos(ctx({ obra: obra({ tipo: "reforma_edificio" }), aditivos: ad(260_000) }))).not.toContain("acrescimo_acima_limite:critico");
  });
});

describe("prazo", () => {
  it("soma prorrogações ao prazo e calcula término", () => {
    const p = resumoPrazo(obra(), [{ tipo: "prazo", valor: 0, dias: 60, data: "2026-09-01", parecerJuridico: true }], HOJE);
    expect(p.prazoTotal).toBe(360);
    expect(p.termino).toBe("2027-06-05");
  });
  it("alerta prazo expirado", () => {
    expect(codigos(ctx({ obra: obra({ dataOrdemServico: "2025-01-01", prazoDias: 100 }) }))).toContain("prazo_expirado:critico");
  });
});

describe("datas", () => {
  it("conta dias úteis pulando fins de semana e feriados", () => {
    expect(somarDiasUteis("2026-11-20", 1)).toBe("2026-11-23"); // sexta → segunda
    expect(somarDiasUteis("2026-11-20", 1, new Set(["2026-11-23"]))).toBe("2026-11-24");
  });
  it("soma meses respeitando o fim do mês", () => {
    expect(somarMeses("2026-08-31", 6)).toBe("2027-02-28");
  });
});

describe("alertas de execução", () => {
  it("financeiro à frente do físico indica pagamento antecipado (art. 145)", () => {
    const c = ctx({ medicoes: [{ numero: 1, inicio: "2026-10-01", fim: "2026-10-31", fisicoAcumulado: 10, valor: 300_000 }] });
    expect(codigos(c)).toContain("pagamento_antecipado:critico");
  });
  it("obra paralisada há mais de 30 dias exige aviso (art. 115, § 6º)", () => {
    expect(codigos(ctx({ obra: obra({ status: "paralisada", dataParalisacao: "2026-09-01" }) }))).toContain("aviso_obra_paralisada:critico");
  });
  it("contrato sem PNCP após 20 dias úteis", () => {
    const { pncp_contrato, ...semPncp } = TUDO_OK;
    expect(codigos(ctx({ checklist: semPncp }))).toContain("pncp_vencido:critico");
  });
  it("sem designação e sem ART geram críticos", () => {
    const r = codigos(ctx({ obra: obra({ temFiscal: false, artFiscalizacao: null }) }));
    expect(r).toContain("designacao_ausente:critico");
    expect(r).toContain("art_fiscalizacao_ausente:critico");
  });
  it("grande vulto exige integridade em 6 meses", () => {
    const r = codigos(ctx({ obra: obra({ valorContratado: 300_000_000, dataAssinatura: "2026-01-10" }) }));
    expect(r).toContain("integridade:critico");
  });
  it("obra regular não gera alertas", () => {
    expect(codigos(ctx({ medicoes: [{ numero: 1, inicio: "2026-10-20", fim: "2026-11-15", fisicoAcumulado: 50, valor: 480_000 }] }))).toEqual([]);
  });
});

describe("checklist", () => {
  it("itens condicionais seguem as características da obra", () => {
    const base = situacaoChecklist({ obra: obra(), checklist: {} }).aplicaveis;
    const federal = situacaoChecklist({ obra: obra({ fonte: "convenio_federal" }), checklist: {} }).aplicaveis;
    expect(federal).toBe(base + 3); // transferegov, cipi, prestação de contas
  });
  it("pendências obrigatórias de fase anterior geram alerta", () => {
    expect(codigos(ctx({ checklist: { ...TUDO_OK, etp: false } }))).toContain("checklist_pendente:critico");
  });
});
