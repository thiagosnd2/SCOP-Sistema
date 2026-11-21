import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ErroApi } from "../api";
import { NOME_FONTE, NOME_MODALIDADE, NOME_REGIME, NOME_TIPO } from "../rotulos";

const opcoes = (m: Record<string, string>) => Object.entries(m).map(([k, v]) => <option key={k} value={k}>{v}</option>);

export function NovaObra() {
  const nav = useNavigate();
  const [erro, setErro] = useState("");

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const n = (v: string) => (v ? Number(v.replace(/\./g, "").replace(",", ".")) : null);
    try {
      const o = await api<{ id: string }>("POST", "/obras", {
        nome: f.nome, objeto: f.objeto || null, municipio: f.municipio || null, uf: f.uf || null,
        tipo: f.tipo, regime: f.regime, modalidade: f.modalidade, fonte: f.fonte, licenca: f.licenca,
        valorEstimado: n(f.valorEstimado), processo: f.processo || null,
      });
      nav(`/obras/${o.id}`);
    } catch (err) {
      const d = err instanceof ErroApi && err.detalhes ? ": " + err.detalhes.map((x) => `${x.campo} — ${x.mensagem}`).join("; ") : "";
      setErro((err as Error).message + d);
    }
  }

  return (
    <>
      <h1>Nova obra</h1>
      <p className="sub">Comece pelo planejamento; os dados do contrato entram na aba “Dados do contrato” da obra.</p>
      {erro && <div className="erro">{erro}</div>}
      <form className="card form" onSubmit={salvar}>
        <label className="full">Nome da obra *<input name="nome" required minLength={3} /></label>
        <label className="full">Objeto<textarea name="objeto" /></label>
        <label>Município<input name="municipio" /></label>
        <label>UF<input name="uf" maxLength={2} /></label>
        <label>Processo<input name="processo" /></label>
        <label>Tipo<select name="tipo">{opcoes(NOME_TIPO)}</select></label>
        <label>Regime de execução (art. 46)<select name="regime">{opcoes(NOME_REGIME)}</select></label>
        <label>Modalidade<select name="modalidade">{opcoes(NOME_MODALIDADE)}</select></label>
        <label>Fonte de recursos<select name="fonte">{opcoes(NOME_FONTE)}</select></label>
        <label>Licenciamento ambiental<select name="licenca"><option value="verificar">A verificar</option><option value="exigivel">Exigível</option><option value="dispensada">Dispensado (documentado)</option></select></label>
        <label>Valor estimado (R$)<input name="valorEstimado" inputMode="decimal" /></label>
        <div className="full"><button className="btn pri">Cadastrar obra</button></div>
      </form>
    </>
  );
}
