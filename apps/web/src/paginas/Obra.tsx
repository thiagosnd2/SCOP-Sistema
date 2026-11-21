import { formatarData } from "@scop/regras";
import { useState, type FormEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { api, brl, ErroApi, pct, pode } from "../api";
import { useApi } from "../hooks";
import { CorPorte, FASES, NOME_ADITIVO, NOME_MODALIDADE, NOME_REGIME, NOME_STATUS, NOME_TIPO } from "../rotulos";

interface Alerta { codigo: string; nivel: string; mensagem: string; fundamento: string }
interface Detalhe {
  obra: Record<string, string | number | null> & { id: string; nome: string; status: string; tipo: string };
  contratada: { razaoSocial: string } | null;
  designacoes: { id: string; papel: string; portaria: string | null; inicio: string; fim: string | null; usuario: { nome: string } }[];
  checklist: { chave: string; fase: number; titulo: string; fundamento: string; obrigatorio: boolean; aplicavel: boolean; comprovado: boolean; data: string | null; documento: string | null }[];
  medicoes: { id: string; numero: number; inicio: string; fim: string; fisicoAcumulado: number; valor: number; status: string; atestoEm: string | null; observacao: string | null }[];
  aditivos: { id: string; tipo: string; numero: string | null; valor: number; dias: number; data: string; parecerJuridico: boolean; justificativa: string }[];
  diario: { id: string; data: string; clima: string | null; efetivo: number | null; servicos: string | null; ocorrencias: string | null }[];
  porte: { chave: string; nome: string; criterio: string };
  financeiro: { valorInicial: number; acrescimos: number; supressoes: number; valorAtualizado: number; medido: number; saldo: number; percentualFinanceiro: number; percentualFisico: number; percentualAcrescimos: number; percentualSupressoes: number; limiteAcrescimos: number; margemAcrescimos: number };
  prazo: { termino: string | null; diasRestantes: number | null; diasAditados: number; percentualPrevisto: number | null };
  conformidade: { aplicaveis: number; comprovados: number; atrasados: string[] };
  alertas: Alerta[];
  exigencias: { texto: string; fundamento: string }[];
}

const ABAS = [["resumo", "Resumo"], ["conformidade", "Conformidade legal"], ["medicoes", "Medições"], ["aditivos", "Aditivos"], ["diario", "Diário de obra"], ["dados", "Dados do contrato"]] as const;
const numero = (v: FormDataEntryValue | null) => (v ? Number(String(v).replace(/\./g, "").replace(",", ".")) : null);
const COR_MEDICAO: Record<string, string> = { rascunho: "t-mute", enviada: "t-warn", atestada: "t-ok", glosada: "t-crit" };

export function ObraPagina() {
  const { id } = useParams();
  const { dados: d, erro, recarregar } = useApi<Detalhe>(`/obras/${id}`);
  const [aba, setAba] = useState<(typeof ABAS)[number][0]>("resumo");
  const [msg, setMsg] = useState("");

  async function acao(metodo: string, rota: string, corpo?: unknown, form?: HTMLFormElement) {
    setMsg("");
    try {
      const r = await api<{ aviso?: string | null }>(metodo, `/obras/${id}${rota}`, corpo);
      form?.reset();
      if (r?.aviso) setMsg(r.aviso);
      recarregar();
    } catch (err) {
      const det = err instanceof ErroApi && err.detalhes ? " " + err.detalhes.map((x) => `${x.campo}: ${x.mensagem}`).join("; ") : "";
      setMsg((err as Error).message + det);
    }
  }

  if (erro) return <div className="erro">{erro}</div>;
  if (!d) return <p className="mini">Carregando…</p>;
  const o = d.obra;

  return (
    <>
      <div className="row">
        <div>
          <h1>{o.nome}</h1>
          <div className="row">
            <span className={`tag ${CorPorte[d.porte.chave]}`}>{d.porte.nome}</span>
            <span className="tag t-mute">{NOME_STATUS[o.status]}</span>
            <span className="mini">{NOME_TIPO[o.tipo]} · Contrato {o.contratoNumero ?? "—"} · {d.contratada?.razaoSocial ?? "sem contratada"}</span>
          </div>
        </div>
        <div className="spacer" />
        {pode("obra:editar") && (
          <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            Situação
            <select value={o.status} onChange={(e) => acao("PATCH", "", { status: e.target.value })}>
              {Object.entries(NOME_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="tabs">{ABAS.map(([k, t]) => <button key={k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}>{t}</button>)}</div>
      {msg && <div className="erro">{msg}</div>}

      {aba === "resumo" && (
        <>
          <div className="grid k4">
            <Kpi l="Valor atualizado" v={brl(d.financeiro.valorAtualizado)} h={`inicial ${brl(d.financeiro.valorInicial)}`} />
            <Kpi l="Medido" v={pct(d.financeiro.percentualFinanceiro)} h={`${brl(d.financeiro.medido)} · saldo ${brl(d.financeiro.saldo)}`} />
            <Kpi l="Prazo" v={d.prazo.diasRestantes == null ? "—" : `${d.prazo.diasRestantes}d`} h={`término ${formatarData(d.prazo.termino)}${d.prazo.diasAditados ? ` · +${d.prazo.diasAditados}d` : ""}`} />
            <Kpi l="Conformidade" v={`${d.conformidade.comprovados}/${d.conformidade.aplicaveis}`} h={`${d.conformidade.atrasados.length} pendência(s) atrasada(s)`} />
          </div>
          <div className="grid k2" style={{ marginTop: 14 }}>
            <div className="card">
              <h2>Alertas</h2>
              {d.alertas.length ? d.alertas.map((a) => <div key={a.codigo} className={`alerta ${a.nivel}`}><div>{a.mensagem}<div className="f">{a.fundamento}</div></div></div>) : <p className="mini">Sem alertas.</p>}
            </div>
            <div className="card">
              <h2>Exigências — {d.porte.nome}</h2>
              <ul>{d.exigencias.map((x, i) => <li key={i}>{x.texto} <span className="mini">— {x.fundamento}</span></li>)}</ul>
              <h2 style={{ marginTop: 16 }}>Designações (art. 117)</h2>
              {d.designacoes.length ? d.designacoes.map((x) => <div key={x.id} className="mini">{x.papel.replace("_", " ")}: <b>{x.usuario.nome}</b> · {x.portaria ?? "sem portaria"} · desde {formatarData(x.inicio)}{x.fim ? ` até ${formatarData(x.fim)}` : ""}</div>) : <p className="mini">Nenhum gestor ou fiscal designado.</p>}
            </div>
          </div>
        </>
      )}

      {aba === "conformidade" &&
        FASES.map((nome, f) => {
          const itens = d.checklist.filter((i) => i.fase === f);
          return (
            <div className="card" key={f} style={{ marginBottom: 14 }}>
              <h2>{f + 1}. {nome} <span className="tag t-mute">{itens.filter((i) => i.aplicavel && i.comprovado).length}/{itens.filter((i) => i.aplicavel).length}</span></h2>
              {itens.map((i) => (
                <div key={i.chave} className={`ck ${i.aplicavel ? "" : "na"}`}>
                  <input type="checkbox" checked={i.comprovado} disabled={!i.aplicavel || !pode("checklist:editar")} onChange={(e) => acao("PUT", `/checklist/${i.chave}`, { comprovado: e.target.checked, documento: i.documento })} />
                  <div>
                    <div>{i.titulo} {i.obrigatorio && i.aplicavel && <span className="tag t-warn">obrigatório</span>} {d.conformidade.atrasados.includes(i.chave) && <span className="tag t-crit">atrasado</span>}</div>
                    <div className="f">{i.fundamento}{i.documento ? ` · ${i.documento}` : ""}</div>
                  </div>
                  <div className="mini">{formatarData(i.data)}</div>
                </div>
              ))}
            </div>
          );
        })}

      {aba === "medicoes" && (
        <>
          {pode("medicao:criar") && (
            <Formulario titulo="Nova medição" rotulo="Enviar medição" onSubmit={(f, el) => acao("POST", "/medicoes", { inicio: f.get("inicio"), fim: f.get("fim"), fisicoAcumulado: numero(f.get("fisico")), valor: numero(f.get("valor")), observacao: f.get("obs") || null }, el)}>
              <label>Início<input type="date" name="inicio" required /></label>
              <label>Fim<input type="date" name="fim" required /></label>
              <label>% físico acumulado<input name="fisico" inputMode="decimal" required /></label>
              <label>Valor no período (R$)<input name="valor" inputMode="decimal" required /></label>
              <label className="full">Observações<textarea name="obs" /></label>
            </Formulario>
          )}
          <div className="card" style={{ marginTop: 14 }}>
            <h2>Boletins</h2>
            <table>
              <thead><tr><th>Nº</th><th>Período</th><th className="num">% físico</th><th className="num">Valor</th><th>Situação</th><th /></tr></thead>
              <tbody>
                {d.medicoes.map((m) => (
                  <tr key={m.id}>
                    <td>{m.numero}</td>
                    <td>{formatarData(m.inicio)} – {formatarData(m.fim)}{m.observacao && <div className="mini">{m.observacao}</div>}</td>
                    <td className="num">{pct(m.fisicoAcumulado)}</td>
                    <td className="num">{brl(m.valor)}</td>
                    <td><span className={`tag ${COR_MEDICAO[m.status]}`}>{m.status}</span>{m.atestoEm && <div className="mini">{formatarData(m.atestoEm)}</div>}</td>
                    <td>
                      {m.status === "enviada" && pode("medicao:atestar") && (
                        <div className="row">
                          <button className="btn sm" onClick={() => acao("POST", `/medicoes/${m.id}/atesto`, { decisao: "atestar" })}>Atestar</button>
                          <button className="btn sm" onClick={() => { const motivo = window.prompt?.("Motivo da glosa"); if (motivo) acao("POST", `/medicoes/${m.id}/atesto`, { decisao: "glosar", observacao: motivo }); }}>Glosar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === "aditivos" && (
        <>
          <div className="grid k2">
            {pode("aditivo:criar") ? (
              <Formulario titulo="Novo termo" rotulo="Registrar termo" onSubmit={(f, el) => acao("POST", "/aditivos", { tipo: f.get("tipo"), numero: f.get("numero") || null, valor: numero(f.get("valor")) ?? 0, dias: numero(f.get("dias")) ?? 0, data: f.get("data"), parecerJuridico: f.get("parecer") === "sim", justificativa: f.get("just") }, el)}>
                <label>Tipo<select name="tipo">{Object.entries(NOME_ADITIVO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label>Nº do termo<input name="numero" /></label>
                <label>Data<input type="date" name="data" required /></label>
                <label>Valor (R$)<input name="valor" inputMode="decimal" /></label>
                <label>Dias<input name="dias" inputMode="numeric" /></label>
                <label>Parecer jurídico<select name="parecer"><option value="sim">Sim</option><option value="nao">Não</option></select></label>
                <label className="full">Justificativa técnica<textarea name="just" required minLength={10} /></label>
              </Formulario>
            ) : <div />}
            <div className="card">
              <h2>Limites do art. 125</h2>
              <table><tbody>
                <tr><td>Valor inicial</td><td className="num">{brl(d.financeiro.valorInicial)}</td></tr>
                <tr><td>Acréscimos</td><td className="num">{brl(d.financeiro.acrescimos)} <span className={`tag ${d.financeiro.percentualAcrescimos > d.financeiro.limiteAcrescimos ? "t-crit" : "t-ok"}`}>{pct(d.financeiro.percentualAcrescimos)} / {d.financeiro.limiteAcrescimos}%</span></td></tr>
                <tr><td>Supressões</td><td className="num">{brl(d.financeiro.supressoes)} <span className={`tag ${d.financeiro.percentualSupressoes > 25 ? "t-crit" : "t-ok"}`}>{pct(d.financeiro.percentualSupressoes)} / 25%</span></td></tr>
                <tr><td>Margem para acréscimos</td><td className="num">{brl(d.financeiro.margemAcrescimos)}</td></tr>
              </tbody></table>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h2>Histórico</h2>
            <table>
              <thead><tr><th>Data</th><th>Termo</th><th>Tipo</th><th className="num">Valor</th><th className="num">Dias</th><th>Justificativa</th></tr></thead>
              <tbody>{d.aditivos.map((a) => <tr key={a.id}><td>{formatarData(a.data)}</td><td>{a.numero}</td><td>{NOME_ADITIVO[a.tipo]}{!a.parecerJuridico && <> <span className="tag t-crit">sem parecer</span></>}</td><td className="num">{a.valor ? brl(a.valor) : "—"}</td><td className="num">{a.dias || "—"}</td><td>{a.justificativa}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}

      {aba === "diario" && (
        <>
          {pode("diario:criar") && (
            <Formulario titulo="Novo registro" rotulo="Registrar no diário" onSubmit={(f, el) => acao("POST", "/diario", { data: f.get("data"), clima: f.get("clima"), efetivo: numero(f.get("efetivo")), servicos: f.get("servicos") || null, ocorrencias: f.get("ocorr") || null }, el)}>
              <label>Data<input type="date" name="data" required /></label>
              <label>Clima<select name="clima"><option>Bom</option><option>Nublado</option><option>Chuva leve</option><option>Chuva forte (impraticável)</option></select></label>
              <label>Efetivo<input name="efetivo" inputMode="numeric" /></label>
              <label className="full">Serviços executados<textarea name="servicos" /></label>
              <label className="full">Ocorrências / determinações do fiscal<textarea name="ocorr" /></label>
            </Formulario>
          )}
          <div className="card" style={{ marginTop: 14 }}>
            <h2>Registros ({d.diario.length})</h2>
            {d.diario.map((x) => (
              <div key={x.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <b>{formatarData(x.data)}</b> <span className="tag t-mute">{x.clima}</span> <span className="mini">Efetivo: {x.efetivo ?? "—"}</span>
                {x.servicos && <div>{x.servicos}</div>}
                {x.ocorrencias && <div className="mini"><b>Ocorrências:</b> {x.ocorrencias}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {aba === "dados" && (
        <Formulario
          titulo="Dados do contrato"
          rotulo="Salvar"
          desabilitado={!pode("obra:editar")}
          onSubmit={(f) => {
            const t = (k: string) => (f.get(k) ? String(f.get(k)) : null);
            acao("PATCH", "", {
              nome: t("nome"), regime: t("regime"), modalidade: t("modalidade"), processo: t("processo"), contratoNumero: t("contratoNumero"),
              valorEstimado: numero(f.get("valorEstimado")), valorContratado: numero(f.get("valorContratado")),
              dataAssinatura: t("dataAssinatura"), dataOrdemServico: t("dataOrdemServico"), prazoDias: numero(f.get("prazoDias")),
              garantiaModalidade: t("garantiaModalidade"), garantiaValor: numero(f.get("garantiaValor")), garantiaVencimento: t("garantiaVencimento"),
              responsavelTecnico: t("responsavelTecnico"), artExecucao: t("artExecucao"), artFiscalizacao: t("artFiscalizacao"),
            });
          }}
        >
          <label className="full">Nome<input name="nome" defaultValue={o.nome} required /></label>
          <label>Regime<select name="regime" defaultValue={String(o.regime)}>{Object.entries(NOME_REGIME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Modalidade<select name="modalidade" defaultValue={String(o.modalidade)}>{Object.entries(NOME_MODALIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <Campo n="processo" l="Processo" o={o} />
          <Campo n="contratoNumero" l="Nº do contrato" o={o} />
          <Campo n="valorEstimado" l="Valor estimado (R$)" o={o} />
          <Campo n="valorContratado" l="Valor contratado (R$)" o={o} />
          <Campo n="dataAssinatura" l="Assinatura" o={o} tipo="date" />
          <Campo n="dataOrdemServico" l="Ordem de serviço" o={o} tipo="date" />
          <Campo n="prazoDias" l="Prazo (dias)" o={o} />
          <Campo n="garantiaModalidade" l="Garantia — modalidade" o={o} />
          <Campo n="garantiaValor" l="Garantia — valor (R$)" o={o} />
          <Campo n="garantiaVencimento" l="Garantia — vencimento" o={o} tipo="date" />
          <Campo n="responsavelTecnico" l="RT da contratada" o={o} />
          <Campo n="artExecucao" l="ART/RRT de execução" o={o} />
          <Campo n="artFiscalizacao" l="ART/RRT de fiscalização" o={o} />
        </Formulario>
      )}
    </>
  );
}

function Kpi({ l, v, h }: { l: string; v: string; h?: string }) {
  return <div className="card kpi"><div className="l">{l}</div><div className="v">{v}</div>{h && <div className="h">{h}</div>}</div>;
}

function Campo({ n, l, o, tipo = "text" }: { n: string; l: string; o: Record<string, unknown>; tipo?: string }) {
  return <label>{l}<input name={n} type={tipo} defaultValue={o[n] == null ? "" : String(o[n])} /></label>;
}

function Formulario({ titulo, rotulo, onSubmit, children, desabilitado }: { titulo: string; rotulo: string; onSubmit: (f: FormData, el: HTMLFormElement) => void; children: ReactNode; desabilitado?: boolean }) {
  return (
    <form className="card" onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget), e.currentTarget); }}>
      <h2>{titulo}</h2>
      <fieldset disabled={desabilitado} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="form">{children}</div>
        <div style={{ marginTop: 12 }}><button className="btn pri">{rotulo}</button></div>
      </fieldset>
    </form>
  );
}
