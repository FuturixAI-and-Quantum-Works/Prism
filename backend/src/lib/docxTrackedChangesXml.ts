import { XMLBuilder, XMLParser } from "fast-xml-parser";
import {
  assertDocumentContentActive,
  DocumentContentError,
  type DocxPackage,
  withDocxPackage,
} from "../modules/content/documentContent.js";

export type XNode = Record<string, unknown>;

export type RunSlot = Readonly<{
  childIndex: number;
  rPr: XNode | null;
  textNodes: readonly Readonly<{
    paraStart: number;
    paraEnd: number;
  }>[];
}>;

export type FlattenedParagraph = Readonly<{
  paraText: string;
  charRun: Int32Array;
  charTextNode: Int32Array;
  runs: readonly RunSlot[];
}>;

const attributeKey = ":@";
const textKey = "#text";

function isXNode(value: unknown): value is XNode {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function elementName(node: unknown): string | null {
  if (!isXNode(node)) return null;
  for (const key of Object.keys(node)) {
    if (key !== attributeKey && key !== textKey) return key;
  }
  return null;
}

function isTextNode(node: unknown): node is { [textKey]: string } {
  return Boolean(node && typeof node === "object" && textKey in node && elementName(node) === null);
}

export function elementChildren(node: unknown): XNode[] {
  const name = elementName(node);
  if (!name || !isXNode(node)) return [];
  const value = node[name];
  return Array.isArray(value) ? value.filter(isXNode) : [];
}

export function setElementChildren(node: XNode, children: XNode[]): void {
  const name = elementName(node);
  if (name) node[name] = children;
}

export function elementAttributes(node: unknown): Record<string, string> {
  if (!isXNode(node)) return {};
  const attributes = node[attributeKey];
  return isXNode(attributes)
    ? Object.fromEntries(
        Object.entries(attributes).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      )
    : {};
}

export function makeElement(
  name: string,
  children: XNode[] = [],
  attributes?: Record<string, string>,
): XNode {
  const element: XNode = { [name]: children };
  if (attributes) {
    element[attributeKey] = Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [`@_${key}`, value]),
    );
  }
  return element;
}

function makeText(value: string): XNode {
  return { [textKey]: value };
}

function textContent(element: XNode): string {
  return elementChildren(element)
    .filter(isTextNode)
    .map((node) => node[textKey])
    .join("");
}

export function buildRun(
  runProperties: XNode | null,
  text: string,
  tagName: "w:t" | "w:delText",
): XNode {
  const children: XNode[] = [];
  if (runProperties) children.push(structuredClone(runProperties));
  for (const [index, segment] of text.split("\n").entries()) {
    if (index > 0) children.push(makeElement("w:br"));
    if (segment) {
      children.push(makeElement(tagName, [makeText(segment)], { "xml:space": "preserve" }));
    }
  }
  return makeElement("w:r", children);
}

export function flattenParagraph(children: XNode[]): FlattenedParagraph {
  const runs: RunSlot[] = [];
  let paraText = "";
  const charRun: number[] = [];
  const charTextNode: number[] = [];

  const processRun = (run: XNode, childIndex: number) => {
    let runProperties: XNode | null = null;
    const textNodes: {
      paraStart: number;
      paraEnd: number;
    }[] = [];
    for (const child of elementChildren(run)) {
      const name = elementName(child);
      if (name === "w:rPr") {
        runProperties = child;
      } else if (name === "w:t") {
        const text = textContent(child);
        const start = paraText.length;
        textNodes.push({
          paraStart: start,
          paraEnd: start + text.length,
        });
        const runIndex = runs.length;
        const textNodeIndex = textNodes.length - 1;
        paraText += text;
        for (let index = 0; index < text.length; index += 1) {
          charRun.push(runIndex);
          charTextNode.push(textNodeIndex);
        }
      }
    }
    runs.push({ childIndex, rPr: runProperties, textNodes });
  };

  for (const [childIndex, child] of children.entries()) {
    const name = elementName(child);
    if (name === "w:r") {
      processRun(child, childIndex);
    } else if (name === "w:ins") {
      for (const inner of elementChildren(child)) {
        if (elementName(inner) === "w:r") processRun(inner, childIndex);
      }
    }
  }

  return {
    paraText,
    charRun: Int32Array.from(charRun),
    charTextNode: Int32Array.from(charTextNode),
    runs,
  };
}

export function findBody(tree: XNode[]): XNode[] | null {
  for (const top of tree) {
    if (elementName(top) !== "w:document") continue;
    for (const child of elementChildren(top)) {
      if (elementName(child) === "w:body") return elementChildren(child);
    }
  }
  return null;
}

export function maxTrackedId(tree: XNode[]): number {
  let max = 0;
  const visit = (node: XNode) => {
    const name = elementName(node);
    if (name === "w:ins" || name === "w:del") {
      const raw = elementAttributes(node)["@_w:id"];
      const value = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
      if (Number.isFinite(value)) max = Math.max(max, value);
    }
    for (const child of elementChildren(node)) visit(child);
  };
  for (const top of tree) visit(top);
  return max;
}

function parseDocumentXml(documentXml: string): XNode[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    trimValues: false,
    parseAttributeValue: false,
    processEntities: true,
  });
  const parsed: unknown = parser.parse(documentXml);
  if (!Array.isArray(parsed) || !parsed.every(isXNode)) {
    throw new DocumentContentError("malformed-input", "DOCX document XML is invalid");
  }
  return parsed;
}

export type TrackedDocument = Readonly<{
  docx: DocxPackage;
  tree: XNode[];
}>;

export async function withTrackedDocument<T>(
  bytes: Buffer,
  signal: AbortSignal | undefined,
  use: (document: TrackedDocument) => T | Promise<T>,
): Promise<T> {
  return withDocxPackage({ bytes, signal }, async (docx) =>
    use({
      docx,
      tree: parseDocumentXml(await docx.readXml(docx.documentPath)),
    }),
  );
}

export async function saveTrackedDocument(
  document: TrackedDocument,
  signal?: AbortSignal,
): Promise<Buffer> {
  assertDocumentContentActive(signal);
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    suppressEmptyNode: false,
    processEntities: true,
  });
  const xml = builder.build(document.tree);
  document.docx.writeXml(
    document.docx.documentPath,
    xml.startsWith("<?xml")
      ? xml
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`,
  );
  const bytes = await document.docx.toBuffer();
  assertDocumentContentActive(signal);
  return bytes;
}

export function bodyText(tree: XNode[]): string {
  const body = findBody(tree);
  if (!body) return "";
  const lines: string[] = [];
  const collect = (nodes: XNode[]) => {
    for (const node of nodes) {
      const name = elementName(node);
      if (name === "w:p") {
        lines.push(flattenParagraph(elementChildren(node)).paraText);
      } else if (
        name === "w:tbl" ||
        name === "w:tr" ||
        name === "w:tc" ||
        name === "w:sdt" ||
        name === "w:sdtContent"
      ) {
        collect(elementChildren(node));
      }
    }
  };
  collect(body);
  return lines.join("\n");
}

export async function extractDocxBodyText(
  bytes: Buffer,
  options?: Readonly<{ signal?: AbortSignal }>,
): Promise<string> {
  return withTrackedDocument(bytes, options?.signal, (document) => bodyText(document.tree));
}

export async function extractTrackedChangeIds(
  bytes: Buffer,
  options?: Readonly<{ signal?: AbortSignal }>,
): Promise<readonly Readonly<{ kind: "ins" | "del"; w_id: string }>[]> {
  return withTrackedDocument(bytes, options?.signal, ({ tree }) => {
    const changes: { kind: "ins" | "del"; w_id: string }[] = [];
    const visit = (node: XNode) => {
      const name = elementName(node);
      if (name === "w:ins" || name === "w:del") {
        const id = elementAttributes(node)["@_w:id"];
        if (id !== undefined) {
          changes.push({ kind: name === "w:ins" ? "ins" : "del", w_id: id });
        }
      }
      for (const child of elementChildren(node)) visit(child);
    };
    for (const top of tree) visit(top);
    return changes;
  });
}
