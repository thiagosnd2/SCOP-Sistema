import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { definirSessao, obterSessao } from "./api";
import { Alertas } from "./paginas/Alertas";
import { Login } from "./paginas/Login";
import { NovaObra } from "./paginas/NovaObra";
import { ObraPagina } from "./paginas/Obra";
import { Painel } from "./paginas/Painel";
import "./styles.css";

const NOME_PERFIL: Record<string, string> = {
  admin: "Administrador", gestor: "Gestor do contrato", engenharia: "Engenharia", fiscal: "Fiscal", contratada: "Contratada", controle_interno: "Controle interno",
};

function Layout() {
  const s = obterSessao();
  if (!s) return <Navigate to="/login" replace />;
  return (
    <div className="app">
      <aside>
        <div className="logo">SCOP<small>Controle de Obras Públicas</small></div>
        <NavLink to="/" end>Painel</NavLink>
        <NavLink to="/alertas">Alertas</NavLink>
        <div className="usuario">
          {s.usuario.nome}
          <br />
          {NOME_PERFIL[s.usuario.perfil] ?? s.usuario.perfil}
          <br />
          <button className="btn sm" style={{ marginTop: 8 }} onClick={() => { definirSessao(null); location.assign("/login"); }}>Sair</button>
        </div>
      </aside>
      <main><Outlet /></main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Painel />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/obras/nova" element={<NovaObra />} />
          <Route path="/obras/:id" element={<ObraPagina />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
