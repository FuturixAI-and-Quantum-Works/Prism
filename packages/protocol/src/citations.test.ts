import { describe, expect, it } from "vitest";
import { parseDocumentCitationBlock } from "./citations";

function citationBlock(payload: string): string {
  return `Before<CITATIONS>${payload}</CITATIONS>After`;
}

describe("document citation blocks", () => {
  it("distinguishes absent, incomplete, invalid, and valid blocks", () => {
    expect(parseDocumentCitationBlock("Before")).toEqual({
      status: "absent",
      visibleText: "Before",
    });

    const incomplete = "Before<CITATIONS>[";
    expect(parseDocumentCitationBlock(incomplete)).toMatchObject({
      status: "incomplete",
      visibleText: incomplete,
    });

    const malformed = citationBlock("[{");
    expect(parseDocumentCitationBlock(malformed)).toMatchObject({
      status: "invalid",
      reason: "invalid_json",
      visibleText: malformed,
    });

    const valid = citationBlock('[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}]');
    expect(parseDocumentCitationBlock(valid)).toMatchObject({
      status: "valid",
      visibleText: "BeforeAfter",
      citations: [{ ref: 1, doc_id: "doc-1", page: 2, quote: "Clause" }],
    });
  });

  it("rejects the whole array when any member is invalid", () => {
    const text = citationBlock(
      '[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"},{"ref":2,"doc_id":"doc-2","page":0,"quote":"Bad"}]',
    );

    expect(parseDocumentCitationBlock(text)).toMatchObject({
      status: "invalid",
      reason: "invalid_schema",
      visibleText: text,
    });
  });

  it.each([
    ["zero ref", { ref: 0 }],
    ["unsafe ref", { ref: Number.MAX_SAFE_INTEGER + 1 }],
    ["blank document id", { doc_id: " " }],
    ["blank quote", { quote: " " }],
  ])("rejects an invalid %s", (_name, override) => {
    const text = citationBlock(
      JSON.stringify([
        {
          ref: 1,
          doc_id: "doc-1",
          page: 2,
          quote: "Clause",
          ...override,
        },
      ]),
    );

    expect(parseDocumentCitationBlock(text)).toMatchObject({
      status: "invalid",
      reason: "invalid_schema",
      visibleText: text,
    });
  });

  it("accepts positive safe integer pages and ascending positive ranges", () => {
    const text = citationBlock(
      '[{"ref":1,"doc_id":"doc-1","page":9007199254740991,"quote":"Integer"},{"ref":2,"doc_id":"doc-2","page":" 4 - 7 ","quote":"Range"}]',
    );

    expect(parseDocumentCitationBlock(text)).toMatchObject({
      status: "valid",
      citations: [
        {
          ref: 1,
          doc_id: "doc-1",
          page: Number.MAX_SAFE_INTEGER,
          quote: "Integer",
        },
        { ref: 2, doc_id: "doc-2", page: "4-7", quote: "Range" },
      ],
    });
  });

  it.each(["0", "-1", "1.5", '"3"', '"page 3"', '"3-2"', '"0-2"', "1e400", "null"])(
    "rejects invalid page %s without a fallback",
    (page) => {
      const text = citationBlock(`[{"ref":1,"doc_id":"doc-1","page":${page},"quote":"Clause"}]`);

      expect(parseDocumentCitationBlock(text)).toMatchObject({
        status: "invalid",
        visibleText: text,
      });
    },
  );

  it("rejects aliases without canonical fields and non-array payloads", () => {
    const aliasOnly = citationBlock('[{"marker":"[1]","doc_id":"doc-1","page":2,"text":"Clause"}]');
    const objectPayload = citationBlock('{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}');

    expect(parseDocumentCitationBlock(aliasOnly)).toMatchObject({
      status: "invalid",
      visibleText: aliasOnly,
    });
    expect(parseDocumentCitationBlock(objectPayload)).toMatchObject({
      status: "invalid",
      visibleText: objectPayload,
    });
  });

  it("keeps multiple citation blocks visible", () => {
    const block = '<CITATIONS>[{"ref":1,"doc_id":"doc-1","page":2,"quote":"Clause"}]</CITATIONS>';
    const text = `Before${block}Between${block}After`;

    expect(parseDocumentCitationBlock(text)).toMatchObject({
      status: "invalid",
      reason: "multiple_blocks",
      visibleText: text,
    });
  });
});
