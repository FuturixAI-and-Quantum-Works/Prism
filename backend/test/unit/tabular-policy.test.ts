import { describe, expect, it } from "vitest";
import {
  getReviewCapabilities,
  TabularAuthorizationPolicy,
} from "../../src/modules/tabular/tabular.policy.js";
import { ownerGrant, stubAccessAuthority } from "./access-test-helpers.js";

describe("tabular authorization policy", () => {
  it("preserves role capabilities", () => {
    expect(getReviewCapabilities("owner").generateCells).toBe(true);
    expect(getReviewCapabilities("editor").regenerateCell).toBe(true);
    expect(getReviewCapabilities("viewer").generateCells).toBe(false);
    expect(getReviewCapabilities("viewer").useOwnChats).toBe(true);
    expect(getReviewCapabilities("viewer").editCells).toBe(false);
  });

  it("requires every review document to remain in scope and authorized", async () => {
    const policy = new TabularAuthorizationPolicy(
      stubAccessAuthority((_actor, resource) =>
        resource.kind !== "document" || resource.id === "document-1" ? ownerGrant : null,
      ),
    );
    const review = {
      id: "review-1",
      userId: "owner-1",
      projectId: "project-1",
      title: null,
      columnsConfig: [],
    };
    await expect(
      policy.allowsReviewDocuments(
        review,
        [
          {
            id: "document-1",
            userId: "owner-1",
            projectId: "project-1",
            filename: "one.pdf",
            fileType: "pdf",
          },
          {
            id: "document-2",
            userId: "owner-1",
            projectId: "project-1",
            filename: "two.pdf",
            fileType: "pdf",
          },
        ],
        { userId: "editor-1", email: "editor@example.com" },
      ),
    ).resolves.toBe(false);
  });

  it("rejects an authorized document moved outside the review project", async () => {
    const policy = new TabularAuthorizationPolicy(stubAccessAuthority());
    await expect(
      policy.allowsReviewDocuments(
        {
          id: "review-1",
          userId: "owner-1",
          projectId: "project-1",
          title: null,
          columnsConfig: [],
        },
        [
          {
            id: "document-1",
            userId: "owner-1",
            projectId: "project-2",
            filename: "one.pdf",
            fileType: "pdf",
          },
        ],
        { userId: "editor-1", email: "editor@example.com" },
      ),
    ).resolves.toBe(false);
  });
});
