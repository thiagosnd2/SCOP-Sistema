/** Aplica as migrações SQL versionadas em apps/api/drizzle. Uso: npm run db:migrate */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index.js";

const aqui = dirname(fileURLToPath(import.meta.url));
await migrate(db, { migrationsFolder: resolve(aqui, "../../drizzle") });
await pool.end();
console.log("Migrações aplicadas.");
