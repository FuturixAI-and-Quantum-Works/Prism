import type { DownloadsRepository, StoredObjectOwner } from "./downloads.repository.js";
import type { DownloadActor } from "./downloads.types.js";
import type { DriveFileAuthorizationPolicy } from "../drive/drive.policy.js";

export type DocumentDownloadAccess = Readonly<{
  canReadDocument: (
    document: Extract<StoredObjectOwner, { kind: "document" }>["document"],
    actor: DownloadActor,
  ) => Promise<boolean>;
}>;

export class DownloadsAuthorizationPolicy {
  constructor(
    private readonly repository: DownloadsRepository,
    private readonly documents: DocumentDownloadAccess,
    private readonly drive: DriveFileAuthorizationPolicy,
  ) {}

  async canRead(storagePath: string, actor: DownloadActor): Promise<boolean> {
    const owner = await this.repository.findOwner(storagePath);
    if (!owner) return false;
    if (owner.kind === "document") {
      return this.documents.canReadDocument(owner.document, actor);
    }
    try {
      await this.drive.file({ userId: actor.userId }, owner.fileId, "read");
      return true;
    } catch {
      return false;
    }
  }
}
