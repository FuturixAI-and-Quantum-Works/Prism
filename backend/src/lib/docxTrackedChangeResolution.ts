import {
  elementAttributes,
  elementChildren,
  elementName,
  saveTrackedDocument,
  setElementChildren,
  withTrackedDocument,
  type XNode,
} from "./docxTrackedChangesXml.js";

function restoreDeletedText(node: XNode): XNode {
  const name = elementName(node);
  if (name === "w:r") {
    setElementChildren(node, elementChildren(node).map(restoreDeletedText));
    return node;
  }
  if (name === "w:delText") {
    return {
      "w:t": elementChildren(node),
      ...(":@" in node ? { ":@": node[":@"] } : {}),
    };
  }
  return node;
}

function resolveInTree(
  tree: XNode[],
  changeIds: readonly string[],
  mode: "accept" | "reject",
): boolean {
  const ids = new Set(changeIds);
  let found = false;
  const rewrite = (children: XNode[]): XNode[] => {
    const result: XNode[] = [];
    for (const node of children) {
      const name = elementName(node);
      if (!name) {
        result.push(node);
        continue;
      }
      const nested = elementChildren(node);
      if (nested.length > 0) setElementChildren(node, rewrite(nested));
      if (name === "w:ins" || name === "w:del") {
        const id = elementAttributes(node)["@_w:id"] ?? "";
        if (ids.has(id)) {
          found = true;
          if ((name === "w:ins" && mode === "accept") || (name === "w:del" && mode === "reject")) {
            const restored =
              name === "w:del"
                ? elementChildren(node).map(restoreDeletedText)
                : elementChildren(node);
            result.push(...restored);
          }
          continue;
        }
      }
      result.push(node);
    }
    return result;
  };
  for (const top of tree) {
    if (elementName(top) === "w:document") {
      setElementChildren(top, rewrite(elementChildren(top)));
    }
  }
  return found;
}

export async function resolveTrackedChange(
  bytes: Buffer,
  changeIds: readonly string[],
  mode: "accept" | "reject",
  options?: Readonly<{ signal?: AbortSignal }>,
): Promise<{ bytes: Buffer; found: boolean }> {
  return withTrackedDocument(bytes, options?.signal, async (document) => {
    const found = resolveInTree(document.tree, changeIds, mode);
    return {
      bytes: await saveTrackedDocument(document, options?.signal),
      found,
    };
  });
}
