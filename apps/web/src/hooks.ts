import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Carrega um recurso da API; `recarregar` refaz a chamada após uma alteração. */
export function useApi<T>(rota: string | null) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string>("");
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (!rota) return;
    let vivo = true;
    api<T>("GET", rota)
      .then((d) => vivo && (setDados(d), setErro("")))
      .catch((e: Error) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [rota, versao]);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { dados, erro, recarregar };
}
