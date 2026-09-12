import type { Server } from "node:http";

export function createHttpDrain(server: Server, timeoutMs: number): () => Promise<void> {
  let drainPromise: Promise<void> | undefined;
  return () => {
    drainPromise ??= new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.closeAllConnections();
        resolve();
      }, timeoutMs);
      timeout.unref();

      server.close((error) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      });
      server.closeIdleConnections();
    });
    return drainPromise;
  };
}
