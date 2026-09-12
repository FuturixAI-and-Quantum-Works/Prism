const MIN_SECRET_BYTES = 32;
const WEAK_SECRET_PATTERN = /change[-_ ]?me|development|example|password|replace|secret|test/i;

export function requireStrongSecret(name: string, value: string | undefined): string {
  const secret = value?.trim();
  const distinctCharacters = secret ? new Set(secret).size : 0;

  if (
    !secret ||
    Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES ||
    distinctCharacters < 8 ||
    WEAK_SECRET_PATTERN.test(secret)
  ) {
    throw new Error(`${name} must be a unique random secret of at least ${MIN_SECRET_BYTES} bytes`);
  }

  return secret;
}
