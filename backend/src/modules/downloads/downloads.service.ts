import type { DownloadsAuthorizationPolicy } from "./downloads.policy.js";
import {
  DownloadNotFoundError,
  type DownloadActor,
  type DownloadDescriptor,
  type DownloadPayload,
  type LocalDownloadDescriptor,
} from "./downloads.types.js";

export type DownloadsGateway = Readonly<{
  verifyDownloadToken: (token: string) => DownloadDescriptor | null;
  verifyLocalToken: (token: string) => LocalDownloadDescriptor | null;
  read: (path: string) => Promise<ArrayBuffer | null>;
}>;

export class DownloadsService {
  constructor(
    private readonly policy: DownloadsAuthorizationPolicy,
    private readonly gateway: DownloadsGateway,
  ) {}

  async getLocal(token: string): Promise<DownloadPayload> {
    const descriptor = this.gateway.verifyLocalToken(token);
    if (!descriptor) throw new DownloadNotFoundError("invalid-link");
    return this.load(descriptor);
  }

  async getAuthorized(token: string, actor: DownloadActor): Promise<DownloadPayload> {
    const descriptor = this.gateway.verifyDownloadToken(token);
    if (!descriptor) throw new DownloadNotFoundError("invalid-link");
    if (!(await this.policy.canRead(descriptor.path, actor))) {
      throw new DownloadNotFoundError();
    }
    return this.load({ ...descriptor, disposition: "attachment" });
  }

  private async load(descriptor: LocalDownloadDescriptor): Promise<DownloadPayload> {
    const bytes = await this.gateway.read(descriptor.path);
    if (!bytes) throw new DownloadNotFoundError();
    return { bytes, filename: descriptor.filename, disposition: descriptor.disposition };
  }
}
