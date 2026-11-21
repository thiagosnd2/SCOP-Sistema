import { Link, useNavigate } from "react-router-dom";
import { brl, pct, pode } from "../api";
import { useApi } from "../hooks";
import { CorPorte, NOME_STATUS } from "../rotulos";

export interface ObraLista {
  id: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
  status: string;
  contratada: string | null;
  porte: { chave: string; nome: string };
  financeiro: { valorAtualizado: number; medido: number; percentualFisico: number; percentualFinanceiro: number };
  prazo: { percentualPrevisto: number | null; diasRestantes: number | null };
  contagem: { critico: number; atencao: number };
}

export function Painel() {
  const nav = useNavigate();
  const { dados, erro } = useApi<ObraLista[]>("/obras");
  const L = dados ?? [];
  const total = L.reduce((s, o) => s + o.financeiro.valorAtualizado, 0);
  const medido = L.reduce((s, o) => s + o.financeiro.medido, 0);
  const criticos = L.reduce((s, o) => s + o.contagem.critico, 0);
  return (
    <>
      <div className="row">
        <div>
          <h1>Painel de obras</h1>
          <p className="sub">Carteira do órgão, com alertas legais calculados a cada consulta.</p>
        </div>
        <div className="spacer" />
        {pode("obra:criar") && <Link className="btn pri" to="/obras/nova">+ Nova obra</Link>}
      </div>
      {erro && <div className="erro">{erro}</div>}
      <div className="grid k4">
        <div className="card kpi"><div className="l">Obras</div><div className="v">{L.length}</div><div className="h">{L.filter((o) => o.status === "execucao").length} em execução</div></div>
        <div className="card kpi"><div className="l">Valor atualizado</div><div className="v">{brl(total)}</div></div>
        <div className="card kpi"><div className="l">Medido</div><div className="v">{brl(medido)}</div><div className="h">{total ? pct((medido / total) * 100) : "0%"}</div></div>
        <div className="card kpi"><div className="l">Alertas críticos</div><div className="v" style={{ color: criticos ? "var(--crit)" : "var(--ok)" }}>{criticos}</div></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        {dados && !L.length ? (
          <p className="mini">Nenhuma obra cadastrada.</p>
        ) : (
          <table>
            <thead><tr><th>Obra</th><th>Porte</th><th>Situação</th><th className="num">Valor atualizado</th><th>Físico</th><th>Alertas</th></tr></thead>
            <tbody>
              {L.map((o) => (
                <tr key={o.id} className="click" onClick={() => nav(`/obras/${o.id}`)}>
                  <td><b>{o.nome}</b><div className="mini">{[o.municipio, o.uf].filter(Boolean).join("/")}{o.contratada ? ` · ${o.contratada}` : ""}</div></td>
                  <td><span className={`tag ${CorPorte[o.porte.chave]}`}>{o.porte.nome}</span></td>
                  <td><span className="tag t-mute">{NOME_STATUS[o.status] ?? o.status}</span></td>
                  <td className="num">{brl(o.financeiro.valorAtualizado)}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className="bar"><i style={{ width: `${Math.min(100, o.financeiro.percentualFisico)}%` }} /></div>
                    <div className="mini">{pct(o.financeiro.percentualFisico)}{o.prazo.percentualPrevisto != null ? ` · prev. ${pct(o.prazo.percentualPrevisto)}` : ""}</div>
                  </td>
                  <td>
                    {o.contagem.critico > 0 && <span className="tag t-crit">{o.contagem.critico} crít.</span>}{" "}
                    {o.contagem.atencao > 0 && <span className="tag t-warn">{o.contagem.atencao} at.</span>}
                    {!o.contagem.critico && !o.contagem.atencao && <span className="tag t-ok">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
