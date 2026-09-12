import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getReviewCapabilities,
  type ReviewCapabilities,
  type ReviewAccessRole,
} from "../../src/modules/tabular/tabular.policy.js";

describe("tabular review access policy", () => {
  it("assigns every capability for every role", () => {
    const expected = new Map<ReviewAccessRole, ReviewCapabilities>([
      [
        "owner",
        {
          read: true,
          editReview: true,
          editCells: true,
          generateCells: true,
          regenerateCell: true,
          manageSharing: true,
          assignProject: true,
          deleteReview: true,
          useOwnChats: true,
        },
      ],
      [
        "admin",
        {
          read: true,
          editReview: true,
          editCells: true,
          generateCells: true,
          regenerateCell: true,
          manageSharing: true,
          assignProject: true,
          deleteReview: true,
          useOwnChats: true,
        },
      ],
      [
        "editor",
        {
          read: true,
          editReview: true,
          editCells: true,
          generateCells: true,
          regenerateCell: true,
          manageSharing: false,
          assignProject: false,
          deleteReview: false,
          useOwnChats: true,
        },
      ],
      [
        "viewer",
        {
          read: true,
          editReview: false,
          editCells: false,
          generateCells: false,
          regenerateCell: false,
          manageSharing: false,
          assignProject: false,
          deleteReview: false,
          useOwnChats: true,
        },
      ],
    ]);

    for (const [role, capabilities] of expected) {
      assert.deepEqual(getReviewCapabilities(role), capabilities, role);
    }
  });
});
