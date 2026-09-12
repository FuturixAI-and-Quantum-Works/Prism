import { describe, expect, it, vi } from "vitest";
import { DocumentActivityService } from "../../src/modules/documents/documents.activity.service.js";

const access = vi.hoisted(() => ({
  decide: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("../../src/modules/access/access.composition.js", () => ({
  accessAuthority: access,
}));

const documentId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

describe("DocumentActivityService", () => {
  it("reports only factual metadata for edit activity", async () => {
    const createdAt = new Date("2026-09-03T00:00:00.000Z");
    const edits = [
      {
        id: "00000000-0000-4000-8000-000000000011",
        deletedText: "{{client_name}}",
        insertedText: "Acme",
        contextBefore: "for ",
        contextAfter: " only",
        reason: "remove risk",
        status: "pending",
      },
      {
        id: "00000000-0000-4000-8000-000000000012",
        deletedText: "x",
        insertedText: "y",
        contextBefore: null,
        contextAfter: null,
        reason: "correct typo",
        status: "accepted",
      },
      {
        id: "00000000-0000-4000-8000-000000000013",
        deletedText: null,
        insertedText: `  ${"detail ".repeat(20)}`,
        contextBefore: "",
        contextAfter: "",
        reason: "improve",
        status: "pending",
      },
      {
        id: "00000000-0000-4000-8000-000000000014",
        deletedText: "risk",
        insertedText: null,
        contextBefore: null,
        contextAfter: null,
        reason: "clarify risk",
        status: "rejected",
      },
    ];
    const rows = [
      ...edits.map((edit) => ({
        id: `activity-${edit.id}`,
        documentId,
        userId,
        userEmail: "owner@example.com",
        userName: "Owner",
        action: "edit_proposed",
        targetType: "edit",
        targetId: edit.id,
        targetName: null,
        details: { source: "test" },
        createdAt,
      })),
      {
        id: "activity-missing-edit",
        documentId,
        userId,
        userEmail: "owner@example.com",
        userName: "Owner",
        action: "edit_proposed",
        targetType: "edit",
        targetId: "00000000-0000-4000-8000-000000000098",
        targetName: null,
        details: null,
        createdAt,
      },
      {
        id: "activity-version",
        documentId,
        userId,
        userEmail: "owner@example.com",
        userName: "Owner",
        action: "version_uploaded",
        targetType: "version",
        targetId: "00000000-0000-4000-8000-000000000099",
        targetName: "contract.docx",
        details: null,
        createdAt,
      },
    ];
    const repository = {
      record: vi.fn(),
      list: vi.fn(async () => rows),
      listEditDetails: vi.fn(async () => edits),
    };

    const result = await new DocumentActivityService(repository).list(
      { userId, userEmail: "owner@example.com" },
      documentId,
    );

    expect(result.map((entry) => entry.change_metadata)).toEqual([
      {
        kind: "replacement",
        inserted_character_count: 4,
        deleted_character_count: 15,
      },
      {
        kind: "replacement",
        inserted_character_count: 1,
        deleted_character_count: 1,
      },
      {
        kind: "addition",
        inserted_character_count: 142,
        deleted_character_count: 0,
      },
      {
        kind: "deletion",
        inserted_character_count: 0,
        deleted_character_count: 4,
      },
      null,
      null,
    ]);
    expect(result[0]?.edit_details).toEqual({
      deleted_text: "{{client_name}}",
      inserted_text: "Acme",
      context_before: "for ",
      context_after: " only",
      reason: "remove risk",
      status: "pending",
    });
    for (const entry of result) {
      expect(entry).not.toHaveProperty("favorability");
      expect(entry).not.toHaveProperty("favorability_explanation");
    }
  });
});
