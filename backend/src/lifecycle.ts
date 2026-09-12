export type Cleanup = () => void | Promise<void>;

type Registration = Readonly<{
  name: string;
  cleanup: Cleanup;
}>;

type LifecycleState =
  | { kind: "accepting"; registrations: Registration[] }
  | { kind: "shutting-down"; shutdown: Promise<void> }
  | { kind: "closed"; result: Promise<void> };

export type LifecycleRegistry = Readonly<{
  register: (name: string, cleanup: Cleanup) => void;
  shutdown: () => Promise<void>;
}>;

export function createLifecycleRegistry(): LifecycleRegistry {
  let state: LifecycleState = { kind: "accepting", registrations: [] };

  return {
    register(name, cleanup) {
      if (state.kind !== "accepting") {
        throw new Error(`Cannot register ${name} after shutdown has started`);
      }
      state.registrations.push({ name, cleanup });
    },

    shutdown() {
      if (state.kind !== "accepting")
        return state.kind === "closed" ? state.result : state.shutdown;

      const registrations = [...state.registrations].reverse();
      const shutdown = (async () => {
        const failures: Error[] = [];
        for (const registration of registrations) {
          try {
            await registration.cleanup();
          } catch (error) {
            failures.push(
              error instanceof Error
                ? new Error(`${registration.name}: ${error.message}`, { cause: error })
                : new Error(`${registration.name}: ${String(error)}`),
            );
          }
        }
        if (failures.length > 0) {
          throw new AggregateError(failures, "Lifecycle shutdown failed");
        }
      })();
      state = { kind: "shutting-down", shutdown };
      const result = shutdown.finally(() => {
        state = { kind: "closed", result };
      });
      state = { kind: "shutting-down", shutdown: result };
      return result;
    },
  };
}
