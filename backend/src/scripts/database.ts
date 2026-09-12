import { installAppConfig, parseAppConfig, parseDatabaseConfig } from "../config.js";
import { bindDatabase, createDatabase } from "../db/index.js";
import { closeStorage, configureStorage } from "../lib/storage.js";

type Environment = Readonly<Record<string, string | undefined>>;

export async function withScriptDatabase<T>(
  environment: Environment,
  operation: () => Promise<T>,
): Promise<T> {
  const database = createDatabase(parseDatabaseConfig(environment));
  bindDatabase(database);
  try {
    return await operation();
  } finally {
    await database.close();
  }
}

export async function withScriptApplication<T>(
  environment: Environment,
  operation: () => Promise<T>,
): Promise<T> {
  const config = parseAppConfig(environment);
  installAppConfig(config);
  configureStorage(config.storage, config.secrets.downloadSigning);
  const database = createDatabase(config.database);
  bindDatabase(database);
  try {
    return await operation();
  } finally {
    closeStorage();
    await database.close();
  }
}
