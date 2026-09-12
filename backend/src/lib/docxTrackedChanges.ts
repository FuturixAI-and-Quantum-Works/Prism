import {
  buildRun,
  elementChildren,
  elementName,
  findBody,
  flattenParagraph,
  makeElement,
  maxTrackedId,
  saveTrackedDocument,
  setElementChildren,
  withTrackedDocument,
  type FlattenedParagraph,
  type XNode,
} from "./docxTrackedChangesXml.js";

export interface EditInput {
  find: string;
  replace: string;
  context_before: string;
  context_after: string;
  reason?: string;
}

export interface AppliedChange {
  id: string;
  delId?: string;
  insId?: string;
  deletedText: string;
  insertedText: string;
  contextBefore: string;
  contextAfter: string;
  reason?: string;
}

export interface EditError {
  index: number;
  reason: string;
}

export interface ApplyTrackedEditsResult {
  bytes: Buffer;
  changes: AppliedChange[];
  errors: EditError[];
}

interface PlannedChange {
  deleteStart: number;
  deleteEnd: number;
  deletedText: string;
  insertedText: string;
  contextBefore: string;
  contextAfter: string;
  reason?: string;
  delWId?: string;
  insWId?: string;
}

function collapseDiff(
  find: string,
  replace: string,
): { deleted: string; inserted: string; leadingEq: number } {
  let leading = 0;
  const minLen = Math.min(find.length, replace.length);
  while (leading < minLen && find[leading] === replace[leading]) leading++;
  let trailing = 0;
  while (
    trailing < minLen - leading &&
    find[find.length - 1 - trailing] === replace[replace.length - 1 - trailing]
  ) {
    trailing++;
  }
  const deleted = find.slice(leading, find.length - trailing);
  const inserted = replace.slice(leading, replace.length - trailing);
  return { deleted, inserted, leadingEq: leading };
}

function reconstructParagraph(
  paraChildren: XNode[],
  flat: FlattenedParagraph,
  plan: PlannedChange[],
  now: string,
  author: string,
): XNode[] {
  if (plan.length === 0) return paraChildren;

  let firstRunIdx = flat.runs.length;
  let lastRunIdx = -1;
  for (const p of plan) {
    for (let pos = p.deleteStart; pos < p.deleteEnd; pos++) {
      const r = flat.charRun[pos];
      if (r < firstRunIdx) firstRunIdx = r;
      if (r > lastRunIdx) lastRunIdx = r;
    }
    if (p.deleteStart === p.deleteEnd && p.deleteStart < flat.paraText.length) {
      const r = flat.charRun[p.deleteStart];
      if (r < firstRunIdx) firstRunIdx = r;
      if (r > lastRunIdx) lastRunIdx = r;
    } else if (p.deleteStart === p.deleteEnd && p.deleteStart > 0) {
      const r = flat.charRun[p.deleteStart - 1];
      if (r < firstRunIdx) firstRunIdx = r;
      if (r > lastRunIdx) lastRunIdx = r;
    }
  }
  if (firstRunIdx > lastRunIdx) {
    return paraChildren;
  }

  const startChildIdx = flat.runs[firstRunIdx].childIndex;
  const endChildIdx = flat.runs[lastRunIdx].childIndex;

  const firstRun = flat.runs[firstRunIdx];
  const lastRun = flat.runs[lastRunIdx];
  const spanStart = firstRun.textNodes.length > 0 ? firstRun.textNodes[0].paraStart : 0;
  const spanEnd =
    lastRun.textNodes.length > 0
      ? lastRun.textNodes[lastRun.textNodes.length - 1].paraEnd
      : spanStart;

  const newRunGroup: XNode[] = [];

  const rPrForPos = (pos: number): XNode | null => {
    if (pos < 0) pos = 0;
    if (pos >= flat.paraText.length) pos = flat.paraText.length - 1;
    if (pos < 0) return firstRun.rPr;
    return flat.runs[flat.charRun[pos]].rPr;
  };

  const emitNormal = (a: number, b: number) => {
    if (a >= b) return;
    let i = a;
    while (i < b) {
      const runIdx = flat.charRun[i];
      const tnIdx = flat.charTextNode[i];
      let j = i + 1;
      while (j < b && flat.charRun[j] === runIdx && flat.charTextNode[j] === tnIdx) {
        j++;
      }
      const slot = flat.runs[runIdx];
      const rPr = slot.rPr;
      const slice = flat.paraText.slice(i, j);
      newRunGroup.push(buildRun(rPr, slice, "w:t"));
      i = j;
    }
  };

  const emitDel = (a: number, b: number, wId: string) => {
    if (a >= b) return;
    const inner: XNode[] = [];
    let i = a;
    while (i < b) {
      const runIdx = flat.charRun[i];
      const tnIdx = flat.charTextNode[i];
      let j = i + 1;
      while (j < b && flat.charRun[j] === runIdx && flat.charTextNode[j] === tnIdx) {
        j++;
      }
      const slot = flat.runs[runIdx];
      const slice = flat.paraText.slice(i, j);
      inner.push(buildRun(slot.rPr, slice, "w:delText"));
      i = j;
    }
    newRunGroup.push(
      makeElement("w:del", inner, {
        "w:id": wId,
        "w:author": author,
        "w:date": now,
      }),
    );
  };

  const emitIns = (pos: number, text: string, wId: string) => {
    if (!text) return;
    const rPr = rPrForPos(pos === spanEnd ? pos - 1 : pos);
    const run = buildRun(rPr, text, "w:t");
    newRunGroup.push(
      makeElement("w:ins", [run], {
        "w:id": wId,
        "w:author": author,
        "w:date": now,
      }),
    );
  };

  let cursor = spanStart;
  for (const p of plan) {
    emitNormal(cursor, p.deleteStart);
    if (p.insertedText) emitIns(p.deleteStart, p.insertedText, p.insWId!);
    if (p.deleteEnd > p.deleteStart) emitDel(p.deleteStart, p.deleteEnd, p.delWId!);
    cursor = p.deleteEnd;
  }
  emitNormal(cursor, spanEnd);

  const acceptedViewReplacementIndexes = new Set<number>();
  for (let r = firstRunIdx; r <= lastRunIdx; r++) {
    acceptedViewReplacementIndexes.add(flat.runs[r].childIndex);
  }
  for (let i = startChildIdx; i <= endChildIdx; i++) {
    if (elementName(paraChildren[i]) === "w:del") acceptedViewReplacementIndexes.add(i);
  }
  const firstDroppedIdx = startChildIdx;
  const out: XNode[] = [];
  for (let i = 0; i < paraChildren.length; i++) {
    if (i === firstDroppedIdx) {
      for (const n of newRunGroup) out.push(n);
    }
    if (acceptedViewReplacementIndexes.has(i)) continue;
    out.push(paraChildren[i]);
  }
  return out;
}

interface ParagraphRef {
  paraNode: XNode;
  paraChildren: XNode[];
  flat: FlattenedParagraph;
}

function normalizeCharactersPreservingLength(s: string): string {
  return s
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, " ");
}

interface Normalized {
  norm: string;
  origIdx: number[];
}

function normalizeWs(input: string): Normalized {
  const s = normalizeCharactersPreservingLength(input);
  const norm: string[] = [];
  const origIdx: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      if (!prevSpace) {
        norm.push(" ");
        origIdx.push(i);
        prevSpace = true;
      }
    } else {
      norm.push(ch);
      origIdx.push(i);
      prevSpace = false;
    }
  }
  return { norm: norm.join(""), origIdx };
}

function findUniqueAnchor(
  hayNorm: string,
  findNorm: string,
  ctxBeforeNorm: string,
  ctxAfterNorm: string,
): { start: number; end: number } | { error: "none" | "ambiguous" } {
  const candidates: number[] = [];

  const checkCtx = (pos: number): boolean => {
    if (ctxBeforeNorm) {
      const start = pos - ctxBeforeNorm.length;
      if (start < 0) return false;
      if (hayNorm.slice(start, pos) !== ctxBeforeNorm) return false;
    }
    if (ctxAfterNorm) {
      const end = pos + findNorm.length;
      if (hayNorm.slice(end, end + ctxAfterNorm.length) !== ctxAfterNorm) return false;
    }
    return true;
  };

  if (findNorm.length === 0) {
    for (let i = 0; i <= hayNorm.length; i++) {
      if (checkCtx(i)) candidates.push(i);
    }
  } else {
    let from = 0;
    while (from <= hayNorm.length - findNorm.length) {
      const idx = hayNorm.indexOf(findNorm, from);
      if (idx < 0) break;
      if (checkCtx(idx)) candidates.push(idx);
      from = idx + 1;
    }
  }

  if (candidates.length === 0) return { error: "none" };
  if (candidates.length > 1) return { error: "ambiguous" };
  return {
    start: candidates[0],
    end: candidates[0] + findNorm.length,
  };
}

function mapNormRangeToOriginal(
  paraNorm: Normalized,
  origLen: number,
  normStart: number,
  normEnd: number,
): { start: number; end: number } {
  const origStart = normStart < paraNorm.origIdx.length ? paraNorm.origIdx[normStart] : origLen;
  const origEnd =
    normEnd === normStart
      ? origStart
      : normEnd - 1 < paraNorm.origIdx.length
        ? paraNorm.origIdx[normEnd - 1] + 1
        : origLen;
  return { start: origStart, end: origEnd };
}

export async function applyTrackedEdits(
  bytes: Buffer,
  edits: EditInput[],
  opts?: { author?: string; signal?: AbortSignal },
): Promise<ApplyTrackedEditsResult> {
  const author = opts?.author ?? "Luna";
  const now = new Date().toISOString();
  return withTrackedDocument(bytes, opts?.signal, async (document) => {
    const tree = document.tree;

    const bodyChildren = findBody(tree);
    if (!bodyChildren) throw new Error("w:body missing from document.xml");

    const paragraphs: ParagraphRef[] = [];
    const collectParagraphs = (nodes: XNode[]) => {
      for (const n of nodes) {
        const name = elementName(n);
        if (!name) continue;
        if (name === "w:p") {
          const kids = elementChildren(n);
          const flat = flattenParagraph(kids);
          paragraphs.push({
            paraNode: n,
            paraChildren: kids,
            flat,
          });
        } else if (
          name === "w:tbl" ||
          name === "w:tr" ||
          name === "w:tc" ||
          name === "w:sdt" ||
          name === "w:sdtContent"
        ) {
          collectParagraphs(elementChildren(n));
        }
      }
    };
    collectParagraphs(bodyChildren);

    const paraNorms: Normalized[] = paragraphs.map((p) => normalizeWs(p.flat.paraText));

    let nextWId = maxTrackedId(tree) + 1;
    const plansPerParagraph = new Map<number, PlannedChange[]>();
    const appliedChanges: AppliedChange[] = [];
    const errors: EditError[] = [];

    for (let editIdx = 0; editIdx < edits.length; editIdx++) {
      const edit = edits[editIdx];
      const find = edit.find ?? "";
      const replace = edit.replace ?? "";
      const ctxBefore = edit.context_before ?? "";
      const ctxAfter = edit.context_after ?? "";

      if (!find && !replace) {
        errors.push({ index: editIdx, reason: "Empty edit." });
        continue;
      }
      if (!find && !ctxBefore && !ctxAfter) {
        errors.push({
          index: editIdx,
          reason: "Pure insertion requires context_before or context_after.",
        });
        continue;
      }

      const findNorm = normalizeWs(find).norm;
      const ctxBeforeNorm = normalizeWs(ctxBefore).norm;
      const ctxAfterNorm = normalizeWs(ctxAfter).norm;

      type Hit = { paraIdx: number; normStart: number; normEnd: number };

      const tryStrategy = (
        cb: string,
        ca: string,
      ): { kind: "ok"; hits: Hit[] } | { kind: "ambiguous" } => {
        const hits: Hit[] = [];
        let ambiguous = false;
        for (let pi = 0; pi < paragraphs.length; pi++) {
          const r = findUniqueAnchor(paraNorms[pi].norm, findNorm, cb, ca);
          if ("error" in r) {
            if (r.error === "ambiguous") ambiguous = true;
            continue;
          }
          hits.push({ paraIdx: pi, normStart: r.start, normEnd: r.end });
        }
        if (ambiguous || hits.length > 1) return { kind: "ambiguous" };
        return { kind: "ok", hits };
      };

      let selected: Hit | null = null;
      const anchorStrategies = [
        { kind: "both-contexts", before: ctxBeforeNorm, after: ctxAfterNorm },
        { kind: "preceding-context", before: ctxBeforeNorm, after: "" },
        { kind: "following-context", before: "", after: ctxAfterNorm },
        { kind: "find-only", before: "", after: "" },
      ];
      let sawAmbiguous = false;
      for (const strategy of anchorStrategies) {
        const r = tryStrategy(strategy.before, strategy.after);
        if (r.kind === "ambiguous") {
          sawAmbiguous = true;
          continue;
        }
        if (r.hits.length === 1) {
          selected = r.hits[0];
          break;
        }
      }

      if (!selected) {
        errors.push({
          index: editIdx,
          reason: sawAmbiguous
            ? `Ambiguous match for find="${truncate(find, 80)}". Add longer context_before / context_after so the anchor is unique.`
            : `Could not locate find="${truncate(find, 80)}" in the document. Re-read the document and copy context verbatim (including punctuation & whitespace).`,
        });
        continue;
      }

      const hit = selected;
      const paraIdx = hit.paraIdx;
      const paraNorm = paraNorms[paraIdx];
      const origLen = paragraphs[paraIdx].flat.paraText.length;
      const { start: findStart, end: findEnd } = mapNormRangeToOriginal(
        paraNorm,
        origLen,
        hit.normStart,
        hit.normEnd,
      );

      const originalFind = paragraphs[paraIdx].flat.paraText.slice(findStart, findEnd);

      const { deleted, inserted, leadingEq } = collapseDiff(originalFind, replace);
      const minStart = findStart + leadingEq;
      const minEnd = minStart + deleted.length;

      const changeId = `luna-${editIdx}-${Date.now()}`;
      const plan: PlannedChange = {
        deleteStart: minStart,
        deleteEnd: minEnd,
        deletedText: deleted,
        insertedText: inserted,
        contextBefore: edit.context_before ?? "",
        contextAfter: edit.context_after ?? "",
        reason: edit.reason,
        delWId: deleted ? String(nextWId++) : undefined,
        insWId: inserted ? String(nextWId++) : undefined,
      };

      const existing = plansPerParagraph.get(paraIdx) ?? [];
      const overlap = existing.some(
        (p) => !(plan.deleteEnd <= p.deleteStart || plan.deleteStart >= p.deleteEnd),
      );
      if (overlap) {
        errors.push({
          index: editIdx,
          reason: "Overlaps a previous edit in the same paragraph.",
        });
        continue;
      }

      existing.push(plan);
      existing.sort((a, b) => a.deleteStart - b.deleteStart);
      plansPerParagraph.set(paraIdx, existing);

      appliedChanges.push({
        id: changeId,
        delId: plan.delWId,
        insId: plan.insWId,
        deletedText: plan.deletedText,
        insertedText: plan.insertedText,
        contextBefore: plan.contextBefore,
        contextAfter: plan.contextAfter,
        reason: plan.reason,
      });
    }

    for (const [paraIdx, plan] of plansPerParagraph) {
      const p = paragraphs[paraIdx];
      const newKids = reconstructParagraph(p.paraChildren, p.flat, plan, now, author);
      setElementChildren(p.paraNode, newKids);
    }
    return {
      bytes: await saveTrackedDocument(document, opts?.signal),
      changes: appliedChanges,
      errors,
    };
  });
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
