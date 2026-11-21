import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, definirSessao, type Sessao } from "../api";

export function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const s = await api<Sessao>("POST", "/auth/login", { email, senha });
      definirSessao(s);
      nav("/");
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="login" onSubmit={entrar}>
      <h1>SCOP</h1>
      <p className="sub">Sistema de Controle de Obras Públicas</p>
      {erro && <div className="erro">{erro}</div>}
      <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
      <br />
      <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></label>
      <br />
      <button className="btn pri" style={{ width: "100%" }} disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
