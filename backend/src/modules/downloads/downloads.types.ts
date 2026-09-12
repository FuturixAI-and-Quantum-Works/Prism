export type DownloadActor = Readonly<{
  userId: string;
  email: string;
}>;

export type DownloadDescriptor = Readonly<{
  path: string;
  filename: string;
}>;

export type LocalDownloadDescriptor = DownloadDescriptor &
  Readonly<{
    disposition: "attachment" | "inline";
  }>;

export type DownloadPayload = Readonly<{
  bytes: ArrayBuffer;
  filename: string;
  disposition: "attachment" | "inline";
}>;

export class DownloadNotFoundError extends Error {
  constructor(readonly reason: "invalid-link" | "file-not-found" = "file-not-found") {
    super(reason === "invalid-link" ? "Invalid link" : "File not found");
    this.name = "DownloadNotFoundError";
  }
}
