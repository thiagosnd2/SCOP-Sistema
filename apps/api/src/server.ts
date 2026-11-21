import { criarApp } from "./app.js";
import { lerEnv } from "./env.js";

const env = lerEnv();
const app = await criarApp(env, { logger: true });
await app.listen({ port: env.PORT, host: "0.0.0.0" });
