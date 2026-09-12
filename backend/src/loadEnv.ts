import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

loadDotenv({ path: resolve(backendRoot, "../.env") });
loadDotenv({ path: resolve(backendRoot, ".env"), override: true });
