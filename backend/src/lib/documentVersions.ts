import { eq, inArray } from "drizzle-orm";
import { db, documents, documentVersions } from "../db/index.js";

interface DocRow {
  id: string;
  [k: string]: unknown;
}

interface VersionPathRow extends DocRow {
  storage_path?: string | null;
  pdf_storage_path?: string | null;
  current_version_id?: string | null;
  active_version_number?: number | null;
}

export interface ActiveVersion {
  id: string;
  storage_path: string;
  pdf_storage_path: string | null;
  version_number: number | null;
  display_name: string | null;
  source: string | null;
}

export async function loadActiveVersion(
  documentId: string,
  versionId?: string | null,
): Promise<ActiveVersion | null> {
  const [doc] = await db
    .select({ currentVersionId: documents.currentVersionId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  const targetVersionId =
    (typeof versionId === "string" && versionId) || doc?.currentVersionId || null;
  if (!targetVersionId) return null;

  const [v] = await db
    .select({
      id: documentVersions.id,
      documentId: documentVersions.documentId,
      storagePath: documentVersions.storagePath,
      pdfStoragePath: documentVersions.pdfStoragePath,
      versionNumber: documentVersions.versionNumber,
      displayName: documentVersions.displayName,
      source: documentVersions.source,
    })
    .from(documentVersions)
    .where(eq(documentVersions.id, targetVersionId))
    .limit(1);

  if (!v || v.documentId !== documentId || !v.storagePath) return null;

  return {
    id: v.id,
    storage_path: v.storagePath,
    pdf_storage_path: v.pdfStoragePath ?? null,
    version_number: v.versionNumber ?? null,
    display_name: v.displayName ?? null,
    source: v.source ?? null,
  };
}

export async function attachActiveVersionPaths<T extends VersionPathRow>(docs: T[]): Promise<T[]> {
  if (docs.length === 0) return docs;

  const versionIds = docs
    .map((d) => d.current_version_id)
    .filter((id): id is string => typeof id === "string");

  if (versionIds.length === 0) {
    for (const d of docs) {
      d.storage_path = null;
      d.pdf_storage_path = null;
    }
    return docs;
  }

  const rows = await db
    .select({
      id: documentVersions.id,
      storagePath: documentVersions.storagePath,
      pdfStoragePath: documentVersions.pdfStoragePath,
      versionNumber: documentVersions.versionNumber,
    })
    .from(documentVersions)
    .where(inArray(documentVersions.id, versionIds));

  const byId = new Map<
    string,
    {
      storage_path: string | null;
      pdf_storage_path: string | null;
      version_number: number | null;
    }
  >();

  for (const r of rows) {
    byId.set(r.id, {
      storage_path: r.storagePath ?? null,
      pdf_storage_path: r.pdfStoragePath ?? null,
      version_number: r.versionNumber ?? null,
    });
  }

  for (const d of docs) {
    const v = d.current_version_id ? byId.get(d.current_version_id) : null;
    d.storage_path = v?.storage_path ?? null;
    d.pdf_storage_path = v?.pdf_storage_path ?? null;
    d.active_version_number = v?.version_number ?? null;
  }

  return docs;
}
