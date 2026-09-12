import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentGovernanceRepository } from "../../src/modules/documents/documents.governance.repository.js";
import { DocumentGovernanceService } from "../../src/modules/documents/documents.governance.service.js";
import { parseCreateComment } from "../../src/modules/documents/documents.governance.validators.js";
import { DocumentPlaceholdersRepository } from "../../src/modules/documents/documents.placeholders.repository.js";
import {
  detectPlaceholderOccurrences,
  DocumentPlaceholdersService,
} from "../../src/modules/documents/documents.placeholders.service.js";
import { parsePlaceholderValues } from "../../src/modules/documents/documents.placeholders.validators.js";

const permissions = vi.hoisted(() => ({
  assertDocumentActionAllowed: vi.fn(),
}));

vi.mock("../../src/modules/documents/documents.permissions.service.js", async (load) => {
  const actual =
    await load<typeof import("../../src/modules/documents/documents.permissions.service.js")>();
  return { ...actual, assertDocumentActionAllowed: permissions.assertDocumentActionAllowed };
});

const actor = {
  userId: "00000000-0000-4000-8000-000000000001",
  userEmail: "reader@example.com",
};

describe("document governance and placeholder boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissions.assertDocumentActionAllowed.mockResolvedValue(undefined);
  });

  it("keeps malformed comment details behind authorization", async () => {
    const repository = new DocumentGovernanceRepository();
    const findDocument = vi.spyOn(repository, "findDocument");
    permissions.assertDocumentActionAllowed.mockRejectedValue(
      Object.assign(new Error("Access denied"), { statusCode: 403 }),
    );

    await expect(
      new DocumentGovernanceService(repository).createComment(
        actor,
        "00000000-0000-4000-8000-000000000002",
        parseCreateComment({ body: "" }),
      ),
    ).rejects.toMatchObject({ statusCode: 403, message: "Access denied" });
    expect(findDocument).not.toHaveBeenCalled();
  });

  it("authorizes placeholder reads before loading document data", async () => {
    const repository = new DocumentPlaceholdersRepository();
    const findDocument = vi.spyOn(repository, "findDocument");
    permissions.assertDocumentActionAllowed.mockRejectedValue(
      Object.assign(new Error("Access denied"), { statusCode: 403 }),
    );

    await expect(
      new DocumentPlaceholdersService(repository).get(
        actor,
        "00000000-0000-4000-8000-000000000002",
      ),
    ).rejects.toMatchObject({ statusCode: 403, message: "Access denied" });
    expect(findDocument).not.toHaveBeenCalled();
  });

  it("keeps malformed placeholder values behind authorization", async () => {
    const repository = new DocumentPlaceholdersRepository();
    const findDocument = vi.spyOn(repository, "findDocument");
    permissions.assertDocumentActionAllowed.mockRejectedValue(
      Object.assign(new Error("Access denied"), { statusCode: 403 }),
    );

    await expect(
      new DocumentPlaceholdersService(repository).save(
        actor,
        "00000000-0000-4000-8000-000000000002",
        parsePlaceholderValues({ values: null }),
      ),
    ).rejects.toMatchObject({ statusCode: 403, message: "Access denied" });
    expect(findDocument).not.toHaveBeenCalled();
  });

  it("preserves placeholder detection order and party scoping", () => {
    const occurrences = detectPlaceholderOccurrences(
      "Party A Name: [Name]\nParty B Name: [Name]\nEffective date: [Date]\n{{leaseTerm}}",
    );
    expect(occurrences.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "partyAName", label: "Party A Name" },
      { key: "partyBName", label: "Party B Name" },
      { key: "effectiveDate", label: "Effective Date" },
      { key: "leaseTerm", label: "Lease Term" },
    ]);
  });

  it("normalizes values and ignores invalid field keys", () => {
    expect(
      parsePlaceholderValues({
        values: {
          validKey: "  value  ",
          "invalid-key": "ignored",
          anotherKey: 42,
        },
      }),
    ).toEqual({
      valid: true,
      value: { validKey: "value", anotherKey: "42" },
    });
  });
});
