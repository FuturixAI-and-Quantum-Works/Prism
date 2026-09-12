import { and, desc, eq, inArray } from "drizzle-orm";
import { db, documentEdits, documents, documentVersions } from "../../../db/index.js";
import { applyTrackedEdits, type EditInput } from "../../../lib/docxTrackedChanges.js";
import { buildDownloadUrl } from "../../../lib/downloadTokens.js";
import { generatedDocKey, uploadFile } from "../../../lib/storage.js";
import { withDocxPackage } from "../../content/documentContent.js";
import { queueDocumentVersionIndex } from "../../retrieval/retrieval.indexing.js";
import { loadCurrentVersionBytes } from "./documentContent.js";
import type { EditAnnotation } from "./runtimeTypes.js";

export type GeneratedDocxSection = {
  heading?: string;
  content?: string;
  level?: number;
  pageBreak?: boolean;
  table?: { headers: string[]; rows: string[][] };
};

type GeneratedDocxResult =
  | {
      filename: string;
      download_url: string;
      document_id: string;
      version_id: string;
      version_number: number;
      storage_path: string;
      message: string;
    }
  | { error: string };

export async function generateDocx(
  title: string,
  sections: GeneratedDocxSection[],
  userId: string,
  options?: { landscape?: boolean; projectId?: string | null },
): Promise<GeneratedDocxResult> {
  try {
    const {
      AlignmentType,
      BorderStyle,
      Document,
      HeadingLevel,
      LevelFormat,
      LevelSuffix,
      Packer,
      PageBreak,
      PageOrientation,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      WidthType,
    } = await import("docx");

    const font = "Times New Roman";
    const size = 22;
    type DocChild = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
    const children: DocChild[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title.toUpperCase(),
            color: "000000",
            font,
            size,
            bold: true,
          }),
        ],
      }),
    ];
    const cellBorder = {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    };
    const headingLevels = [
      HeadingLevel.HEADING_1,
      HeadingLevel.HEADING_2,
      HeadingLevel.HEADING_3,
      HeadingLevel.HEADING_4,
    ];
    const numberingReference = "legal-clause-numbering";
    const legalNumbering = (level: number) => ({
      reference: numberingReference,
      level: Math.max(0, Math.min(level, 4)),
    });
    const legalNumberingLevels = [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: AlignmentType.START,
        suffix: LevelSuffix.TAB,
        isLegalNumberingStyle: true,
        style: {
          paragraph: { indent: { left: 720, hanging: 720 } },
          run: { bold: true, color: "000000", font, size },
        },
      },
      {
        level: 1,
        format: LevelFormat.DECIMAL,
        text: "%1.%2",
        alignment: AlignmentType.START,
        suffix: LevelSuffix.TAB,
        isLegalNumberingStyle: true,
        style: {
          paragraph: { indent: { left: 720, hanging: 720 } },
          run: { color: "000000", font, size },
        },
      },
      {
        level: 2,
        format: LevelFormat.LOWER_LETTER,
        text: "(%3)",
        alignment: AlignmentType.START,
        suffix: LevelSuffix.TAB,
        style: {
          paragraph: { indent: { left: 1440, hanging: 720 } },
          run: { color: "000000", font, size },
        },
      },
      {
        level: 3,
        format: LevelFormat.LOWER_ROMAN,
        text: "(%4)",
        alignment: AlignmentType.START,
        suffix: LevelSuffix.TAB,
        style: {
          paragraph: { indent: { left: 1440, hanging: 720 } },
          run: { color: "000000", font, size },
        },
      },
      {
        level: 4,
        format: LevelFormat.UPPER_LETTER,
        text: "(%5)",
        alignment: AlignmentType.START,
        suffix: LevelSuffix.TAB,
        style: {
          paragraph: { indent: { left: 2520, hanging: 720 } },
          run: { color: "000000", font, size },
        },
      },
    ];
    const normalizeTable = (
      table: GeneratedDocxSection["table"],
    ): { headers: string[]; rows: string[][] } | null => {
      if (!table) return null;
      const headers = table.headers.map((header) => header.trim()).filter(Boolean);
      if (headers.length === 0) return null;
      const rows = table.rows.map((row) => headers.map((_, index) => row[index] ?? ""));
      return { headers, rows };
    };
    const stripManualNumbering = (
      value: string,
    ): { text: string; levelFromPrefix: number | null } => {
      const match = value.trim().match(/^(\d+(?:\.\d+)*)(?:[.)])?\s+(.+)$/);
      if (!match) return { text: value.trim(), levelFromPrefix: null };
      return {
        text: match[2].trim(),
        levelFromPrefix: match[1].split(".").length - 1,
      };
    };
    const parseManualListMarker = (value: string): { text: string; levelOffset: number | null } => {
      const trimmed = value.trim();
      const match = trimmed.match(/^(\(([a-z]+)\)|([a-z]+)[.)])\s+(.+)$/i);
      if (!match) return { text: trimmed, levelOffset: null };
      const marker = (match[2] ?? match[3] ?? "").toLowerCase();
      const isRoman =
        marker === "i" ||
        (marker.length > 1 &&
          /^(?:m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3}))$/i.test(marker));
      return { text: match[4].trim(), levelOffset: isRoman ? 3 : 2 };
    };
    const normalizeHeadingText = (value: string) =>
      value
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toLowerCase();
    const isTitleLikeFirstHeading = (heading: string, sectionIndex: number) => {
      if (sectionIndex !== 0) return false;
      const normalized = normalizeHeadingText(heading);
      const titleNormalized = normalizeHeadingText(title);
      if (!normalized || !titleNormalized) return false;
      if (normalized === titleNormalized) return true;
      return (
        titleNormalized.includes(normalized) &&
        /\b(agreement|contract|deed|terms|policy|notice|nda|disclosure)\b/.test(normalized)
      );
    };
    const isUnnumberedHeading = (heading: string, sectionIndex: number) => {
      const normalized = normalizeHeadingText(heading);
      if (!normalized) return true;
      if (normalized === "signatures" || normalized === "signature") return true;
      if (isTitleLikeFirstHeading(heading, sectionIndex)) return true;
      return (
        sectionIndex === 0 &&
        /^(agreement|contract|mutual non disclosure agreement|non disclosure agreement|employment agreement|service level agreement)$/.test(
          normalized,
        )
      );
    };
    const isSignatureLine = (value: string) => /^(?:by|name|title|date):\s*/i.test(value.trim());
    const looksLikeSignatureBlock = (value: string) => {
      const lines = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.length > 0 && lines.filter(isSignatureLine).length >= 2;
    };
    let currentClauseLevel: number | null = null;

    for (const [sectionIndex, section] of sections.entries()) {
      if (section.pageBreak) children.push(new Paragraph({ children: [new PageBreak()] }));
      if (section.heading) {
        const stripped = stripManualNumbering(section.heading);
        const isUnnumbered = isUnnumberedHeading(stripped.text, sectionIndex);
        const skipHeading = isTitleLikeFirstHeading(stripped.text, sectionIndex);
        const level = Math.min(stripped.levelFromPrefix ?? (section.level ?? 1) - 1, 3);
        currentClauseLevel = isUnnumbered || skipHeading ? null : level;
        const headingText =
          level === 0 && !isUnnumbered ? stripped.text.toUpperCase() : stripped.text;
        if (!skipHeading) {
          children.push(
            new Paragraph({
              heading: headingLevels[level],
              numbering: isUnnumbered ? undefined : legalNumbering(level),
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: headingText,
                  color: "000000",
                  font,
                  size,
                  bold: true,
                }),
              ],
            }),
          );
        }
      }
      const normalizedTable = normalizeTable(section.table);
      if (normalizedTable) {
        const rows: InstanceType<typeof TableRow>[] = [
          new TableRow({
            tableHeader: true,
            children: normalizedTable.headers.map(
              (header) =>
                new TableCell({
                  borders: cellBorder,
                  shading: { fill: "F2F2F2" },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: header, bold: true, font, size })],
                      alignment: AlignmentType.LEFT,
                    }),
                  ],
                }),
            ),
          }),
        ];
        for (const row of normalizedTable.rows) {
          rows.push(
            new TableRow({
              children: row.map(
                (cell) =>
                  new TableCell({
                    borders: cellBorder,
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: cell, font, size })],
                      }),
                    ],
                  }),
              ),
            }),
          );
        }
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        );
        children.push(new Paragraph({ text: "" }));
      }
      if (section.content) {
        let numberedBodyParagraphs = 0;
        const contentIsSignatureBlock =
          section.heading && normalizeHeadingText(section.heading).includes("signature")
            ? true
            : looksLikeSignatureBlock(section.content);
        const inferBodyParagraphLevel = (
          bulletMatch: RegExpMatchArray | null,
          manualLevelOffset: number | null,
          numericLevelFromPrefix: number | null,
        ): number | undefined => {
          if (currentClauseLevel === null || contentIsSignatureBlock) return undefined;
          if (bulletMatch) return currentClauseLevel + 2;
          if (manualLevelOffset !== null) return currentClauseLevel + manualLevelOffset;
          if (numericLevelFromPrefix !== null) return numericLevelFromPrefix;
          if (numberedBodyParagraphs === 0) return currentClauseLevel + 1;
          return currentClauseLevel + 2;
        };
        for (const line of section.content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
          const rawText = bulletMatch ? bulletMatch[1].trim() : trimmed;
          const manualList = parseManualListMarker(rawText);
          const numeric = stripManualNumbering(rawText);
          const text = bulletMatch
            ? rawText
            : manualList.levelOffset !== null
              ? manualList.text
              : numeric.text;
          const inferredLevel = inferBodyParagraphLevel(
            bulletMatch,
            manualList.levelOffset,
            numeric.levelFromPrefix,
          );
          if (currentClauseLevel !== null) numberedBodyParagraphs += 1;
          children.push(
            new Paragraph({
              numbering: inferredLevel === undefined ? undefined : legalNumbering(inferredLevel),
              spacing: { after: 120 },
              children: [new TextRun({ text, font, size })],
            }),
          );
        }
      }
    }

    const pageSetup = options?.landscape
      ? { page: { size: { orientation: PageOrientation.LANDSCAPE } } }
      : {};
    const document = new Document({
      numbering: { config: [{ reference: numberingReference, levels: legalNumberingLevels }] },
      sections: [{ properties: pageSetup, children }],
    });
    const buffer = await Packer.toBuffer(document);
    const missingPart = await withDocxPackage({ bytes: buffer }, (docx) => {
      for (const requiredPath of [
        "[Content_Types].xml",
        "word/document.xml",
        "word/_rels/document.xml.rels",
      ]) {
        if (!docx.has(requiredPath)) return requiredPath;
      }
      return null;
    });
    if (missingPart) {
      return { error: `Generated DOCX is missing required package part: ${missingPart}` };
    }
    const generatedId = crypto.randomUUID().replace(/-/g, "");
    const safeTitle =
      title
        .replace(/[^a-zA-Z0-9 -]/g, "")
        .trim()
        .slice(0, 64) || "document";
    const filename = `${safeTitle}.docx`;
    const key = generatedDocKey(userId, generatedId, filename);
    await uploadFile(
      key,
      Uint8Array.from(buffer).buffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    const downloadUrl = buildDownloadUrl(key, filename);

    let documentId: string;
    try {
      const [documentRow] = await db
        .insert(documents)
        .values({
          projectId: options?.projectId ?? null,
          userId,
          filename,
          fileType: "docx",
          sizeBytes: buffer.byteLength,
          status: "ready",
        })
        .returning({ id: documents.id });
      if (!documentRow) throw new Error("No row returned");
      documentId = documentRow.id;
    } catch (error) {
      return {
        error: `Failed to record generated document: ${error instanceof Error ? error.message : "unknown"}`,
      };
    }

    let versionId: string;
    try {
      const [versionRow] = await db
        .insert(documentVersions)
        .values({
          documentId,
          storagePath: key,
          source: "generated",
          versionNumber: 1,
          displayName: filename,
        })
        .returning({ id: documentVersions.id });
      if (!versionRow) throw new Error("No row returned");
      versionId = versionRow.id;
    } catch (error) {
      return {
        error: `Failed to record generated document version: ${error instanceof Error ? error.message : "unknown"}`,
      };
    }
    await db
      .update(documents)
      .set({ currentVersionId: versionId })
      .where(eq(documents.id, documentId));
    return {
      filename,
      download_url: downloadUrl,
      document_id: documentId,
      version_id: versionId,
      version_number: 1,
      storage_path: key,
      message: `Document '${filename}' has been generated successfully.`,
    };
  } catch (error) {
    return { error: String(error) };
  }
}

export async function runEditDocument(params: {
  documentId: string;
  userId: string;
  edits: EditInput[];
  signal?: AbortSignal;
  reuseVersion?: {
    versionId: string;
    versionNumber: number;
    storagePath: string;
  };
}): Promise<
  | {
      ok: true;
      version_id: string;
      version_number: number;
      storage_path: string;
      download_url: string;
      annotations: EditAnnotation[];
      errors: { index: number; reason: string }[];
    }
  | { ok: false; error: string }
> {
  const { documentId, userId, edits, reuseVersion, signal } = params;
  const [document] = await db
    .select({ id: documents.id, filename: documents.filename })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!document) return { ok: false, error: "Document not found." };
  const current = await loadCurrentVersionBytes(documentId, signal);
  if (!current) return { ok: false, error: "Could not load document bytes." };
  const {
    bytes: editedBytes,
    changes,
    errors,
  } = await applyTrackedEdits(current.bytes, edits, {
    author: "Luna",
    signal,
  });
  if (changes.length === 0) {
    return {
      ok: false,
      error:
        errors[0]?.reason ??
        "No edits could be applied. Refine context_before/context_after and retry.",
    };
  }
  const bytes = Uint8Array.from(editedBytes).buffer;
  let versionRowId: string;
  let storagePath: string;
  let nextVersionNumber: number;

  if (reuseVersion) {
    storagePath = reuseVersion.storagePath;
    versionRowId = reuseVersion.versionId;
    nextVersionNumber = reuseVersion.versionNumber;
    await uploadFile(
      storagePath,
      bytes,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  } else {
    const generatedVersionId = crypto.randomUUID().replace(/-/g, "");
    storagePath = `documents/${userId}/${documentId}/edits/${generatedVersionId}.docx`;
    await uploadFile(
      storagePath,
      bytes,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    const [maxRow] = await db
      .select({ versionNumber: documentVersions.versionNumber })
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.documentId, documentId),
          inArray(documentVersions.source, ["upload", "user_upload", "assistant_edit"]),
        ),
      )
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1);
    nextVersionNumber = (maxRow?.versionNumber ?? 1) + 1;
    const [previous] = await db
      .select({
        displayName: documentVersions.displayName,
        createdAt: documentVersions.createdAt,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.createdAt))
      .limit(1);
    const [version] = await db
      .insert(documentVersions)
      .values({
        documentId,
        storagePath,
        source: "assistant_edit",
        versionNumber: nextVersionNumber,
        displayName: previous?.displayName ?? document.filename ?? null,
      })
      .returning({ id: documentVersions.id });
    if (!version) return { ok: false, error: "Failed to record document version." };
    versionRowId = version.id;
  }

  let insertedEdits: {
    id: string;
    changeId: string;
    delWId: string | null;
    insWId: string | null;
    deletedText: string | null;
    insertedText: string | null;
    contextBefore: string | null;
    contextAfter: string | null;
    reason: string | null;
  }[];
  try {
    insertedEdits = await db
      .insert(documentEdits)
      .values(
        changes.map((change) => ({
          documentId,
          versionId: versionRowId,
          changeId: change.id,
          delWId: change.delId ?? null,
          insWId: change.insId ?? null,
          deletedText: change.deletedText,
          insertedText: change.insertedText,
          contextBefore: change.contextBefore ?? "",
          contextAfter: change.contextAfter ?? "",
          reason: change.reason ?? null,
          status: "pending" as const,
        })),
      )
      .returning({
        id: documentEdits.id,
        changeId: documentEdits.changeId,
        delWId: documentEdits.delWId,
        insWId: documentEdits.insWId,
        deletedText: documentEdits.deletedText,
        insertedText: documentEdits.insertedText,
        contextBefore: documentEdits.contextBefore,
        contextAfter: documentEdits.contextAfter,
        reason: documentEdits.reason,
      });
  } catch {
    return { ok: false, error: "Failed to record edits." };
  }
  await db
    .update(documents)
    .set({ currentVersionId: versionRowId })
    .where(eq(documents.id, documentId));
  const annotations: EditAnnotation[] = insertedEdits.map((row) => {
    const source = changes.find((change) => change.id === row.changeId);
    return {
      kind: "edit",
      edit_id: row.id,
      document_id: documentId,
      version_id: versionRowId,
      version_number: nextVersionNumber,
      change_id: row.changeId,
      del_w_id: source?.delId,
      ins_w_id: source?.insId,
      deleted_text: row.deletedText ?? "",
      inserted_text: row.insertedText ?? "",
      context_before: row.contextBefore ?? "",
      context_after: row.contextAfter ?? "",
      reason: row.reason ?? source?.reason,
      status: "pending",
    };
  });
  const downloadUrl = buildDownloadUrl(storagePath, document.filename);
  await queueDocumentVersionIndex(documentId, versionRowId, userId);
  return {
    ok: true,
    version_id: versionRowId,
    version_number: nextVersionNumber,
    storage_path: storagePath,
    download_url: downloadUrl,
    annotations,
    errors,
  };
}
