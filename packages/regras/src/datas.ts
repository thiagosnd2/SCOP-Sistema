import type { DataISO } from "./tipos.js";

const DIA = 86_400_000;

/** Converte "AAAA-MM-DD" em número de dias desde a época (UTC), evitando problemas de fuso. */
export function diaNum(d: DataISO): number {
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, dd) / DIA);
}

export function deDiaNum(n: number): DataISO {
  return new Date(n * DIA).toISOString().slice(0, 10);
}

export function somarDias(d: DataISO, n: number): DataISO {
  return deDiaNum(diaNum(d) + n);
}

export function diasEntre(a: DataISO, b: DataISO): number {
  return diaNum(b) - diaNum(a);
}

export function somarMeses(d: DataISO, meses: number): DataISO {
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(dd, ultimo));
  return alvo.toISOString().slice(0, 10);
}

/**
 * Soma dias úteis (segunda a sexta). Feriados informados são pulados.
 * Sem lista de feriados, o resultado é uma estimativa conservadora.
 */
export function somarDiasUteis(d: DataISO, n: number, feriados: ReadonlySet<DataISO> = new Set()): DataISO {
  let x = diaNum(d);
  let contados = 0;
  while (contados < n) {
    x += 1;
    const dataX = deDiaNum(x);
    const semana = new Date(x * DIA).getUTCDay();
    if (semana !== 0 && semana !== 6 && !feriados.has(dataX)) contados += 1;
  }
  return deDiaNum(x);
}

export function hojeISO(): DataISO {
  const t = new Date();
  const local = new Date(t.getTime() - t.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatarData(d: DataISO | null | undefined): string {
  if (!d) return "—";
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
}
