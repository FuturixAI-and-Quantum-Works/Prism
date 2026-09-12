import { describe, expect, it } from "vitest";
import { parseDocumentCitationAnnotations } from "../../src/modules/ai/citations/citations.js";
import { parseTabularCitationAnnotations } from "../../src/modules/tabular/tabular.chat.js";

describe("document citation annotations", () => {
  it("resolves known documents and keeps unknown documents explicit", () => {
    const parsed = parseDocumentCitationAnnotations(
      [
        "Answer",
        "<CITATIONS>",
        JSON.stringify([
          { ref: 1, doc_id: "doc-1", page: 2, quote: "Known" },
          { ref: 2, doc_id: "doc-404", page: "4-6", quote: "Unknown" },
        ]),
        "</CITATIONS>",
      ].join(""),
      {
        "doc-1": {
          document_id: "document-1",
          filename: "Agreement.pdf",
          version_id: "version-1",
          version_number: 3,
        },
      },
    );

    expect(parsed).toMatchObject({
      status: "valid",
      citations: [
        {
          type: "citation_data",
          resolution: "resolved",
          ref: 1,
          doc_id: "doc-1",
          document_id: "document-1",
          filename: "Agreement.pdf",
          version_id: "version-1",
          version_number: 3,
        },
        {
          type: "citation_data",
          resolution: "unresolved",
          reason: "unknown_document",
          ref: 2,
          doc_id: "doc-404",
          document_id: null,
          filename: null,
          version_id: null,
          version_number: null,
        },
      ],
    });
  });
});

describe("tabular citation annotations", () => {
  const store = {
    columns: [{ index: 0, name: "Renewal" }],
    documents: [{ id: "document-1", filename: "Agreement.pdf" }],
  };

  it.each([
    {
      name: "row",
      citation: { ref: 1, col_index: 0, row_index: 9, quote: "Clause" },
      missing: ["row"],
      colName: "Renewal",
      docName: null,
    },
    {
      name: "column",
      citation: { ref: 1, col_index: 9, row_index: 0, quote: "Clause" },
      missing: ["column"],
      colName: null,
      docName: "Agreement.pdf",
    },
    {
      name: "both coordinates",
      citation: { ref: 1, col_index: 9, row_index: 9, quote: "Clause" },
      missing: ["column", "row"],
      colName: null,
      docName: null,
    },
  ])("does not invent labels for an out-of-range $name", (testCase) => {
    const parsed = parseTabularCitationAnnotations(
      `<CITATIONS>${JSON.stringify([testCase.citation])}</CITATIONS>`,
      store,
    );

    expect(parsed).toMatchObject({
      status: "valid",
      citations: [
        {
          ...testCase.citation,
          type: "tabular_citation",
          resolution: "unresolved",
          missing: testCase.missing,
          col_name: testCase.colName,
          doc_name: testCase.docName,
        },
      ],
    });
    expect(JSON.stringify(parsed)).not.toMatch(/"(?:Row|Col) \d+"/);
  });

  it("rejects a mixed array when one tabular citation is invalid", () => {
    const text = `<CITATIONS>${JSON.stringify([
      { ref: 1, col_index: 0, row_index: 0, quote: "Clause" },
      { ref: 0, col_index: -1, row_index: 0, quote: " " },
    ])}</CITATIONS>`;

    expect(parseTabularCitationAnnotations(text, store)).toMatchObject({
      status: "invalid",
      reason: "invalid_schema",
      visibleText: text,
    });
  });
});
