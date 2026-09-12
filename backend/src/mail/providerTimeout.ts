export class MailProviderTimeoutError extends Error {}

export function withProviderTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new MailProviderTimeoutError()), timeoutMs);
  });
  return Promise.race([promise, expired]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}
