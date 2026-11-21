const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export interface Sessao {
  token: string;
  usuario: { id: string; nome: string; email: string; perfil: string; permissoes: string[] };
}

let sessao: Sessao | null = (() => {
  try {
    const s = sessionStorage.getItem("scop.sessao");
    return s ? (JSON.parse(s) as Sessao) : null;
  } catch {
    return null;
  }
})();

export const obterSessao = () => sessao;
export const pode = (acao: string) => !!sessao?.usuario.permissoes.includes(acao);

export function definirSessao(s: Sessao | null) {
  sessao = s;
  try {
    if (s) sessionStorage.setItem("scop.sessao", JSON.stringify(s));
    else sessionStorage.removeItem("scop.sessao");
  } catch {
    /* sem armazenamento: sessão só em memória */
  }
}

export class ErroApi extends Error {
  constructor(public status: number, message: string, public detalhes?: { campo: string; mensagem: string }[]) {
    super(message);
  }
}

export async function api<T = unknown>(metodo: string, rota: string, corpo?: unknown): Promise<T> {
  const r = await fetch(BASE + rota, {
    method: metodo,
    headers: { ...(corpo !== undefined && { "content-type": "application/json" }), ...(sessao && { authorization: `Bearer ${sessao.token}` }) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  if (r.status === 401 && sessao) {
    definirSessao(null);
    location.assign("/login");
  }
  const dados = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new ErroApi(r.status, dados?.erro ?? `Erro ${r.status}`, dados?.detalhes);
  return dados as T;
}

export const brl = (v: number | null | undefined) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (v: number | null | undefined) => `${(Math.round((Number(v) || 0) * 10) / 10).toLocaleString("pt-BR")}%`;
