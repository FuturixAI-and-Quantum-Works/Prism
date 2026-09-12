import type {
  DocumentConversionKind,
  DocumentConversionRequest,
  DocumentConverterAdapterKind,
} from "./documentConverter.types.js";

export type ConverterState = "open" | "closing" | "closed";

export type ConversionAdapter = Readonly<{
  kind: DocumentConverterAdapterKind;
  conversions: readonly DocumentConversionKind[];
  convert: (request: DocumentConversionRequest, signal: AbortSignal) => Promise<Buffer>;
  health: (signal: AbortSignal) => Promise<void>;
  close?: () => Promise<void>;
}>;

export class ConversionLimitError extends Error {
  constructor(kind: "input" | "output", actual: number, limit: number) {
    super(`Conversion ${kind} is ${actual} bytes; limit is ${limit} bytes`);
    this.name = "ConversionLimitError";
  }
}

export class ConversionQueueFullError extends Error {
  constructor(adapter: DocumentConverterAdapterKind, limit: number) {
    super(`${adapter} conversion queue is full; limit is ${limit}`);
    this.name = "ConversionQueueFullError";
  }
}

export class ConverterClosedError extends Error {
  constructor() {
    super("Document converter is closed");
    this.name = "ConverterClosedError";
  }
}

export function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("The operation was aborted", "AbortError");
}

export function inputSize(request: DocumentConversionRequest): number {
  return request.kind === "html-to-pdf"
    ? Buffer.byteLength(request.html, "utf8")
    : request.content.byteLength;
}

export async function abortable<T>(
  operation: Promise<T>,
  signal: AbortSignal,
  dispose: (value: T) => void | Promise<void> = () => undefined,
): Promise<T> {
  if (signal.aborted) {
    void operation.then(dispose, () => undefined);
    throw abortError(signal);
  }

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => {
      void operation.then(dispose, () => undefined);
      reject(abortError(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    return await Promise.race([operation, aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}
