import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const stableKeySchema = z.string().regex(/^[a-z][a-z0-9-]*$/);
const fieldIdSchema = z.string().regex(/^[a-z][A-Za-z0-9]*$/);
const relativeJsonPathSchema = z.string().regex(/^[a-z0-9-/]+\.json$/);
const htmlFileSchema = z.string().regex(/^[a-z0-9-]+\.html$/);

const templateFieldShape = {
  id: fieldIdSchema,
  label: z.string().trim().min(1),
  placeholder: z.string(),
};

export const templateFieldSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...templateFieldShape,
      type: z.literal("select"),
      required: z.boolean(),
      options: z.array(z.string().min(1)).min(1),
    })
    .strict(),
  z
    .object({
      ...templateFieldShape,
      type: z.enum(["text", "textarea", "date", "number"]),
      required: z.boolean(),
    })
    .strict(),
]);

export const templateDefinitionSchema = z
  .object({
    id: stableKeySchema,
    name: z.string().trim().min(1),
    category: z.string().trim().min(1),
    description: z.string(),
    fields: z.array(templateFieldSchema).min(1),
    bodyFile: htmlFileSchema,
  })
  .strict()
  .superRefine((template, context) => {
    const fieldIds = new Set<string>();
    for (const field of template.fields) {
      if (fieldIds.has(field.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate field ${field.id} in template ${template.id}`,
          path: ["fields"],
        });
      }
      fieldIds.add(field.id);
    }
  });

const neutralScopeSchema = z
  .object({
    kind: z.literal("neutral"),
    governingLawOptions: z.array(z.string().min(1)).min(1),
  })
  .strict();

const jurisdictionSpecificScopeSchema = z
  .object({
    kind: z.literal("jurisdiction-specific"),
    jurisdiction: z.string().trim().min(1),
  })
  .strict();

export const templatePackSchema = z
  .object({
    schemaVersion: z.literal(1),
    key: stableKeySchema,
    label: z.string().trim().min(1),
    jurisdictionScope: z.discriminatedUnion("kind", [
      neutralScopeSchema,
      jurisdictionSpecificScopeSchema,
    ]),
    templates: z.array(templateDefinitionSchema),
  })
  .strict();

export const templatePackManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    neutralPacks: z.array(relativeJsonPathSchema),
    jurisdictionSpecificPacks: z.array(relativeJsonPathSchema),
  })
  .strict();

const htmlBodySchema = z
  .string()
  .trim()
  .min(1)
  .refine((body) => body.includes("<") && body.includes(">"), "Template body must contain HTML");

export type TemplateField = z.infer<typeof templateFieldSchema>;
export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>;
export type TemplatePack = z.infer<typeof templatePackSchema>;

export interface TemplateConfig extends Omit<TemplateDefinition, "bodyFile"> {
  templateContent: string;
}

export interface LoadedTemplateSeedPacks {
  packs: readonly TemplatePack[];
  templates: readonly TemplateConfig[];
}

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/seed-packs/templates/v1",
);

function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function assertUniqueTemplateIds(templates: readonly TemplateConfig[]): void {
  const ids = new Set<string>();
  for (const template of templates) {
    if (ids.has(template.id)) {
      throw new Error(`Duplicate template stable key: ${template.id}`);
    }
    ids.add(template.id);
  }
}

export function loadTemplateSeedPacks(rootDirectory = defaultRoot): LoadedTemplateSeedPacks {
  const manifest = templatePackManifestSchema.parse(
    readJson(path.join(rootDirectory, "manifest.json")),
  );
  const packEntries = [
    ...manifest.neutralPacks.map((relativePath) => ({
      expectedKind: "neutral" as const,
      relativePath,
    })),
    ...manifest.jurisdictionSpecificPacks.map((relativePath) => ({
      expectedKind: "jurisdiction-specific" as const,
      relativePath,
    })),
  ];
  const packs = packEntries.map(({ expectedKind, relativePath }) => {
    const packPath = path.join(rootDirectory, relativePath);
    const pack = templatePackSchema.parse(readJson(packPath));
    if (pack.jurisdictionScope.kind !== expectedKind) {
      throw new Error(
        `Template pack ${pack.key} is listed as ${expectedKind} but declares ${pack.jurisdictionScope.kind}`,
      );
    }
    return { directory: path.dirname(packPath), pack };
  });
  const templates = packs.flatMap(({ directory, pack }) =>
    pack.templates.map(({ bodyFile, ...template }) => ({
      ...template,
      templateContent: htmlBodySchema.parse(readFileSync(path.join(directory, bodyFile), "utf8")),
    })),
  );

  assertUniqueTemplateIds(templates);
  return {
    packs: packs.map(({ pack }) => pack),
    templates,
  };
}
