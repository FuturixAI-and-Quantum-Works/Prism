import { ObjectNotFoundError, parseObjectRef, type ObjectStore } from "../../storage/types.js";
import { TemplateError } from "./templates.types.js";

export class TemplateStorageCoordinator {
  constructor(private readonly objectStore: ObjectStore) {}

  async get(path: string): Promise<ArrayBuffer> {
    try {
      return await this.objectStore.get(parseObjectRef(path));
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw new TemplateError(404, "Template DOCX source is not available");
      }
      throw error;
    }
  }

  async copyThenCommit<T>(
    copy: Readonly<{ sourcePath: string; destinationPath: string }>,
    commit: () => Promise<T>,
  ): Promise<T> {
    const sourceRef = parseObjectRef(copy.sourcePath);
    const destinationRef = parseObjectRef(copy.destinationPath);
    await this.objectStore.copy({ sourceRef, destinationRef });
    try {
      return await commit();
    } catch (error) {
      try {
        await this.objectStore.delete(destinationRef);
      } catch (compensationError) {
        throw new AggregateError(
          [error, compensationError],
          "Template storage compensation failed; reconciliation is required",
          { cause: compensationError },
        );
      }
      throw error;
    }
  }

  async deleteThenCommit<T>(
    path: string,
    contentType: string,
    commit: () => Promise<T>,
  ): Promise<T> {
    const ref = parseObjectRef(path);
    let content: ArrayBuffer | null = null;
    try {
      content = await this.objectStore.get(ref);
    } catch (error) {
      if (!(error instanceof ObjectNotFoundError)) throw error;
    }
    if (content) await this.objectStore.delete(ref);
    try {
      return await commit();
    } catch (error) {
      if (!content) throw error;
      try {
        await this.objectStore.put({ ref, content, contentType });
      } catch (compensationError) {
        throw new AggregateError(
          [error, compensationError],
          "Template storage compensation failed; reconciliation is required",
          { cause: compensationError },
        );
      }
      throw error;
    }
  }
}
