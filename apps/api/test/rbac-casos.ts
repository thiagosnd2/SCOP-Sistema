type Metodo = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export interface Caso { perfil: string; metodo: Metodo; rota: string; corpo?: unknown; esperado: number }

/** Matriz de permissões exercitada nos testes (":obra" = obra de demonstração). */
export const rbacCasos: Caso[] = [
  { perfil: "controle", metodo: "GET", rota: "/obras/:obra", esperado: 200 },
  { perfil: "controle", metodo: "PATCH", rota: "/obras/:obra", corpo: { nome: "Alterada" }, esperado: 403 },
  { perfil: "controle", metodo: "GET", rota: "/auditoria", esperado: 200 },
  { perfil: "engenharia", metodo: "GET", rota: "/auditoria", esperado: 403 },
  { perfil: "contratada", metodo: "PATCH", rota: "/obras/:obra", corpo: { nome: "Alterada" }, esperado: 403 },
  { perfil: "contratada", metodo: "PUT", rota: "/obras/:obra/checklist/etp", corpo: { comprovado: false }, esperado: 403 },
  { perfil: "gestor", metodo: "DELETE", rota: "/obras/:obra", esperado: 403 },
  { perfil: "gestor", metodo: "PUT", rota: "/obras/:obra/checklist/inexistente", corpo: { comprovado: true }, esperado: 404 },
  { perfil: "gestor", metodo: "POST", rota: "/usuarios", corpo: { nome: "Novo", email: "novo@scop.local", senha: "senha-longa-123", perfil: "fiscal" }, esperado: 403 },
  { perfil: "admin", metodo: "POST", rota: "/usuarios", corpo: { nome: "Novo Fiscal", email: "novo@scop.local", senha: "senha-longa-123", perfil: "fiscal" }, esperado: 201 },
  { perfil: "admin", metodo: "POST", rota: "/usuarios", corpo: { nome: "Novo Fiscal", email: "novo@scop.local", senha: "senha-longa-123", perfil: "fiscal" }, esperado: 409 },
];
