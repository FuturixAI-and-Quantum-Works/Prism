import {
  ObjectStoreDisabledError,
  type ObjectStore,
  type ObjectStoreCopy,
  type ObjectStoreHealth,
  type ObjectStorePut,
  type ObjectRef,
  type ObjectStoreSignRead,
} from "./types.js";

export class DisabledObjectStore implements ObjectStore {
  async put(_input: ObjectStorePut): Promise<void> {
    throw new ObjectStoreDisabledError();
  }

  async get(_ref: ObjectRef): Promise<ArrayBuffer> {
    throw new ObjectStoreDisabledError();
  }

  async delete(_ref: ObjectRef): Promise<void> {
    throw new ObjectStoreDisabledError();
  }

  async copy(_input: ObjectStoreCopy): Promise<void> {
    throw new ObjectStoreDisabledError();
  }

  async signRead(_input: ObjectStoreSignRead): Promise<string> {
    throw new ObjectStoreDisabledError();
  }

  async health(): Promise<ObjectStoreHealth> {
    return {
      kind: "unhealthy",
      reason: "disabled",
      error: new ObjectStoreDisabledError(),
    };
  }

  close(): void {}
}
