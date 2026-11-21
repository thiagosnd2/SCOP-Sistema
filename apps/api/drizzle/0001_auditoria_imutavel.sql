-- Trilha de auditoria somente-inserção: impede UPDATE e DELETE.
CREATE OR REPLACE FUNCTION auditoria_imutavel() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'A trilha de auditoria não pode ser alterada nem excluída';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER auditoria_sem_alteracao BEFORE UPDATE OR DELETE ON "auditoria"
  FOR EACH ROW EXECUTE FUNCTION auditoria_imutavel();
