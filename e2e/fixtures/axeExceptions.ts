import type { AxeException } from "./test";

const concurrentAccessibilityWork =
  "The existing visual token is owned by the current fake-UI/accessibility workstream.";

export const expandedSidebarAxeExceptions = [
  {
    ruleId: "color-contrast",
    html: />(?:Workspace|Intelligence)<\/span>$/,
    reason: concurrentAccessibilityWork,
  },
] satisfies readonly AxeException[];

export const templatePreviewAxeExceptions = [
  {
    ruleId: "color-contrast",
    html: />(?:Template Preview|MB|kk|SB|Workspace)<\/span>$/,
    reason: concurrentAccessibilityWork,
  },
] satisfies readonly AxeException[];

export const assistantAxeExceptions = [
  {
    ruleId: "color-contrast",
    html: />12:00 PM<\/span>$/,
    reason: concurrentAccessibilityWork,
  },
] satisfies readonly AxeException[];

export const documentListAxeExceptions = [
  {
    ruleId: "color-contrast",
    html: /role="tab" aria-controls="documents-results" aria-selected="false"/,
    reason: concurrentAccessibilityWork,
  },
] satisfies readonly AxeException[];

export const rulebookAxeExceptions = [
  {
    ruleId: "color-contrast",
    html: />(?:1 checks|No documents selected)<\/div>$/,
    reason: concurrentAccessibilityWork,
  },
  {
    ruleId: "color-contrast",
    html: /role="tab".*aria-selected="false"/,
    reason: concurrentAccessibilityWork,
  },
  {
    ruleId: "color-contrast",
    html: /aria-label="Remove Liability cap"/,
    reason: concurrentAccessibilityWork,
  },
] satisfies readonly AxeException[];

export const sourcesAxeExceptions = [
  {
    ruleId: "color-contrast",
    html: />Indexed documents and workspace files available to chat retrieval\.<\/p>$/,
    reason: concurrentAccessibilityWork,
  },
  {
    ruleId: "color-contrast",
    html: />(?:Indexed|Pending|Failed|Skipped|RAG Health)<\/div>$/,
    reason: concurrentAccessibilityWork,
  },
  {
    ruleId: "color-contrast",
    html: /^<span>(?:Source|Scope|Type|Status|Updated)<\/span>$/,
    reason: concurrentAccessibilityWork,
  },
] satisfies readonly AxeException[];
