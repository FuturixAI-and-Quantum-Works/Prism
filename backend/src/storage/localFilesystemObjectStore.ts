import { constants } from "node:fs";
import { copyFile, lstat, mkdir, open, readFile, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeDownloadFilename } from "./contentDisposition.js";
import { signLocalRead } from "./localSignedRead.js";
import {
  InvalidObjectKeyError,
  ObjectNotFoundError,
  ObjectStoreClosedError,
  ObjectStoreOperationError,
  parseObjectRef,
  type ObjectStore,
  type ObjectStoreCopy,
  type ObjectStoreHealth,
  type ObjectStorePut,
  type ObjectRef,
  type ObjectStoreSignRead,
} from "./types.js";

export type LocalFilesystemObjectStoreOptions = Readonly<{
  directory: string;
  publicApiUrl: string;
  signingSecret: string;
}>;

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes.buffer;
}

export class LocalFilesystemObjectStore implements ObjectStore {
  readonly root: string;
  private closed = false;

  constructor(private readonly options: LocalFilesystemObjectStoreOptions) {
    this.root = path.resolve(options.directory);
  }

  private assertOpen(): void {
    if (this.closed) throw new ObjectStoreClosedError();
  }

  private objectPath(ref: ObjectRef): string {
    const resolved = path.resolve(this.root, ...ref.split("/"));
    if (!resolved.startsWith(`${this.root}${path.sep}`)) throw new InvalidObjectKeyError(ref);
    return resolved;
  }

  private async ensureRoot(): Promise<string> {
    await mkdir(this.root, { recursive: true });
    return realpath(this.root);
  }

  private async ensureSafeParent(ref: ObjectRef, objectPath: string): Promise<void> {
    const realRoot = await this.ensureRoot();
    const relativeParent = path.relative(this.root, path.dirname(objectPath));
    let current = this.root;

    for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
      current = path.join(current, segment);
      try {
        const stats = await lstat(current);
        if (stats.isSymbolicLink() || !stats.isDirectory()) {
          throw new InvalidObjectKeyError(ref);
        }
      } catch (error) {
        if (error instanceof InvalidObjectKeyError) throw error;
        if (!this.isMissing(error)) throw error;
        try {
          await mkdir(current);
        } catch (mkdirError) {
          if (
            typeof mkdirError !== "object" ||
            mkdirError === null ||
            !("code" in mkdirError) ||
            mkdirError.code !== "EEXIST"
          ) {
            throw mkdirError;
          }
          const stats = await lstat(current);
          if (stats.isSymbolicLink() || !stats.isDirectory()) {
            throw new InvalidObjectKeyError(ref);
          }
        }
      }
    }

    const realParent = await realpath(path.dirname(objectPath));
    if (realParent !== realRoot && !realParent.startsWith(`${realRoot}${path.sep}`)) {
      throw new InvalidObjectKeyError(ref);
    }
  }

  private async assertSafeExistingParent(ref: ObjectRef, objectPath: string): Promise<void> {
    const realRoot = await realpath(this.root);
    const relativeParent = path.relative(this.root, path.dirname(objectPath));
    let current = this.root;
    for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
      current = path.join(current, segment);
      const stats = await lstat(current);
      if (stats.isSymbolicLink() || !stats.isDirectory()) throw new InvalidObjectKeyError(ref);
    }
    const realParent = await realpath(path.dirname(objectPath));
    if (realParent !== realRoot && !realParent.startsWith(`${realRoot}${path.sep}`)) {
      throw new InvalidObjectKeyError(ref);
    }
  }

  private nodeErrorCode(error: unknown): string | undefined {
    if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
    return typeof error.code === "string" ? error.code : undefined;
  }

  private isMissing(error: unknown): boolean {
    return this.nodeErrorCode(error) === "ENOENT";
  }

  private isUnsupportedDirectorySync(error: unknown): boolean {
    const code = this.nodeErrorCode(error);
    return (
      code === "EPERM" ||
      code === "EACCES" ||
      code === "EINVAL" ||
      code === "EBADF" ||
      code === "ENOTSUP" ||
      code === "ENOSYS" ||
      code === "EISDIR"
    );
  }

  private async syncDirectory(directory: string): Promise<void> {
    try {
      const handle = await open(directory, constants.O_RDONLY);
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (this.isUnsupportedDirectorySync(error)) return;
      throw error;
    }
  }

  private async replaceAtomically(
    ref: ObjectRef,
    writeTemporary: (temporaryPath: string) => Promise<void>,
  ): Promise<void> {
    const destination = this.objectPath(ref);
    let temporaryPath: string | undefined;
    try {
      await this.ensureSafeParent(ref, destination);
      temporaryPath = path.join(
        path.dirname(destination),
        `.${path.basename(destination)}.${randomUUID()}.tmp`,
      );
      await writeTemporary(temporaryPath);
      await rename(temporaryPath, destination);
      temporaryPath = undefined;
      await this.syncDirectory(path.dirname(destination));
    } finally {
      if (temporaryPath) await rm(temporaryPath, { force: true });
    }
  }

  async put(input: ObjectStorePut): Promise<void> {
    this.assertOpen();
    try {
      await this.replaceAtomically(input.ref, async (temporaryPath) => {
        const file = await open(
          temporaryPath,
          constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
          0o600,
        );
        try {
          await file.writeFile(Buffer.from(input.content));
          await file.sync();
        } finally {
          await file.close();
        }
      });
    } catch (error) {
      if (error instanceof InvalidObjectKeyError) throw error;
      throw new ObjectStoreOperationError("put", `Failed to put object: ${input.ref}`, {
        cause: error,
      });
    }
  }

  async get(ref: ObjectRef): Promise<ArrayBuffer> {
    this.assertOpen();
    const source = this.objectPath(ref);
    try {
      await this.assertSafeExistingParent(ref, source);
      const stats = await lstat(source);
      if (stats.isSymbolicLink() || !stats.isFile()) throw new ObjectNotFoundError(ref);
      return toArrayBuffer(await readFile(source));
    } catch (error) {
      if (error instanceof InvalidObjectKeyError || error instanceof ObjectNotFoundError)
        throw error;
      if (this.isMissing(error)) throw new ObjectNotFoundError(ref, { cause: error });
      throw new ObjectStoreOperationError("get", `Failed to get object: ${ref}`, { cause: error });
    }
  }

  async delete(ref: ObjectRef): Promise<void> {
    this.assertOpen();
    const target = this.objectPath(ref);
    try {
      await this.assertSafeExistingParent(ref, target);
      const stats = await lstat(target);
      if (!stats.isSymbolicLink() && !stats.isFile()) {
        throw new ObjectStoreOperationError("delete", `Object is not a regular file: ${ref}`);
      }
      await rm(target);
      await this.syncDirectory(path.dirname(target));
    } catch (error) {
      if (error instanceof InvalidObjectKeyError || error instanceof ObjectStoreOperationError) {
        throw error;
      }
      if (this.isMissing(error)) return;
      throw new ObjectStoreOperationError("delete", `Failed to delete object: ${ref}`, {
        cause: error,
      });
    }
  }

  async copy(input: ObjectStoreCopy): Promise<void> {
    this.assertOpen();
    const source = this.objectPath(input.sourceRef);
    try {
      await this.assertSafeExistingParent(input.sourceRef, source);
      const stats = await lstat(source);
      if (stats.isSymbolicLink() || !stats.isFile()) {
        throw new ObjectNotFoundError(input.sourceRef);
      }
      await this.replaceAtomically(input.destinationRef, async (temporaryPath) => {
        await copyFile(source, temporaryPath, constants.COPYFILE_EXCL);
        const file = await open(temporaryPath, constants.O_RDWR);
        try {
          await file.sync();
        } finally {
          await file.close();
        }
      });
    } catch (error) {
      if (error instanceof ObjectNotFoundError || error instanceof InvalidObjectKeyError)
        throw error;
      if (this.isMissing(error)) {
        throw new ObjectNotFoundError(input.sourceRef, { cause: error });
      }
      throw new ObjectStoreOperationError(
        "copy",
        `Failed to copy object: ${input.sourceRef} to ${input.destinationRef}`,
        { cause: error },
      );
    }
  }

  async signRead(input: ObjectStoreSignRead): Promise<string> {
    this.assertOpen();
    const filename = normalizeDownloadFilename(
      input.downloadFilename ?? path.posix.basename(input.ref),
    );
    const token = signLocalRead({
      ref: input.ref,
      ttl: input.ttl,
      filename,
      disposition: input.disposition ?? "attachment",
      secret: this.options.signingSecret,
    });
    return new URL(`/download/local/${token}`, this.options.publicApiUrl).toString();
  }

  async health(): Promise<ObjectStoreHealth> {
    this.assertOpen();
    const probeRef = parseObjectRef(`.health/${randomUUID()}`);
    try {
      const expected = new TextEncoder().encode("ok").buffer;
      await this.put({ ref: probeRef, content: expected, contentType: "application/octet-stream" });
      const actual = await this.get(probeRef);
      if (Buffer.compare(Buffer.from(actual), Buffer.from(expected)) !== 0) {
        throw new Error("Object storage health probe read mismatched bytes");
      }
      await this.delete(probeRef);
      return { kind: "healthy" };
    } catch {
      await this.delete(probeRef).catch(() => undefined);
      return {
        kind: "unhealthy",
        reason: "unavailable",
        error: new ObjectStoreOperationError("health", "Local object storage is unavailable"),
      };
    }
  }

  close(): void {
    this.closed = true;
  }
}
