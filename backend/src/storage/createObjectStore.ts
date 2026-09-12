import type { AppConfig } from "../config.js";
import { DisabledObjectStore } from "./disabledObjectStore.js";
import { LocalFilesystemObjectStore } from "./localFilesystemObjectStore.js";
import { S3ObjectStore } from "./s3ObjectStore.js";
import type { ObjectStore } from "./types.js";

export type CreateObjectStoreDependencies = Readonly<{
  signingSecret: string;
}>;

export function createObjectStore(
  config: AppConfig["storage"],
  dependencies: CreateObjectStoreDependencies,
): ObjectStore {
  switch (config.kind) {
    case "disabled":
      return new DisabledObjectStore();
    case "local":
      return new LocalFilesystemObjectStore({
        directory: config.directory,
        publicApiUrl: config.publicApiUrl,
        signingSecret: dependencies.signingSecret,
      });
    case "s3":
      return new S3ObjectStore(config);
    default: {
      const exhaustive: never = config;
      return exhaustive;
    }
  }
}
