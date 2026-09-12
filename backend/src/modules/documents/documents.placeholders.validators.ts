type ValidationError = Error & { statusCode: number };

export type DeferredPlaceholderValues =
  | Readonly<{ valid: true; value: Record<string, string> }>
  | Readonly<{ valid: false; message: string }>;

function validationError(message: string): ValidationError {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function parsePlaceholderValues(body: unknown): DeferredPlaceholderValues {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, message: "values object is required" };
  }
  const raw = Reflect.get(body, "values");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, message: "values object is required" };
  }
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,119}$/.test(key)) continue;
    values[key] = String(value ?? "")
      .trim()
      .slice(0, 10000);
  }
  return { valid: true, value: values };
}

export function requirePlaceholderConfirmation(body: unknown): void {
  const confirmation =
    body && typeof body === "object" && !Array.isArray(body) ? Reflect.get(body, "confirm") : null;
  if (confirmation !== "Confirm and fill") {
    throw validationError("Confirm and fill is required before applying placeholders");
  }
}

export function parseEditStatus(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function requirePlaceholderValues(
  values: DeferredPlaceholderValues,
): Record<string, string> {
  if (!values.valid) throw validationError(values.message);
  return values.value;
}
