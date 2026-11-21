import { Link } from "react-router-dom";
import { useApi } from "../hooks";

interface AlertaCarteira {
  codigo: string;
  nivel: "critico" | "atencao" | "info";
  mensagem: string;
  fundamento: string;
  obraId: string;
  obraNome: string;
}

export function Alertas() {
  const { dados, erro } = useApi<AlertaCarteira[]>("/alertas");
  return (
    <>
      <h1>Alertas</h1>
      <p className="sub">Prazos, valores, aditivos, medições e pendências do checklist legal de todas as obras.</p>
      {erro && <div className="erro">{erro}</div>}
      <div className="card">
        {dados?.length === 0 && <p className="mini">Nenhum alerta.</p>}
        {dados?.map((a, i) => (
          <div key={i} className={`alerta ${a.nivel}`}>
            <div>
              <Link to={`/obras/${a.obraId}`}><b>{a.obraNome}</b></Link>
              <div>{a.mensagem}</div>
              <div className="f">{a.fundamento}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
