import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function contentForLegacyBranding(root, path, content, historicalSourcePrefix) {
  if (path !== "docs/template-provenance.json") return content;

  let provenance;
  try {
    provenance = JSON.parse(content);
  } catch {
    return content;
  }

  const compactContent = content.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g, (token) =>
    token.startsWith('"') ? token : "",
  );
  if (
    compactContent !== JSON.stringify(provenance) ||
    provenance?.schemaVersion !== 1 ||
    !Array.isArray(provenance.docx)
  ) {
    return content;
  }

  let changed = false;
  const docx = provenance.docx.map((entry) => {
    const basename =
      typeof entry?.path === "string"
        ? entry.path.match(
            /^backend\/data\/seed-packs\/docx\/v1\/futurixai-legal\/([A-Za-z0-9][A-Za-z0-9_-]*\.docx)$/,
          )?.[1]
        : undefined;
    if (
      !basename ||
      !entry.path.endsWith(basename) ||
      entry.source !== `${historicalSourcePrefix}${basename}` ||
      entry.author !== "FuturixAI-and-Quantum-Works" ||
      entry.license !== "AGPL-3.0-only" ||
      entry.redistributionGrant !== "docs/template-license.md" ||
      typeof entry.attribution !== "string" ||
      entry.attribution.trim() === "" ||
      typeof entry.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !existsSync(resolve(root, entry.redistributionGrant))
    ) {
      return entry;
    }

    try {
      const digest = createHash("sha256")
        .update(readFileSync(resolve(root, entry.path)))
        .digest("hex");
      if (digest !== entry.sha256) return entry;
    } catch {
      return entry;
    }

    changed = true;
    return { ...entry, source: `verified-historical-source/${basename}` };
  });

  return changed ? JSON.stringify({ ...provenance, docx }) : content;
}
