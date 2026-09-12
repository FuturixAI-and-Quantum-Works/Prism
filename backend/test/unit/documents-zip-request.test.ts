import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { createDocumentsContentController } from "../../src/modules/documents/documents.content.controller.js";
import { DocumentsService } from "../../src/modules/documents/documents.service.js";
import { documentZipRequestSchema } from "../../src/modules/documents/documents.validators.js";

const firstId = "00000000-0000-4000-8000-000000000001";

describe("documentZipRequestSchema", () => {
  it("defaults to atomic mode and preserves duplicate occurrences", () => {
    expect(
      documentZipRequestSchema.parse({
        document_ids: [firstId, firstId],
      }),
    ).toEqual({
      documentIds: [firstId, firstId],
      mode: "atomic",
    });
  });

  it("strictly rejects malformed, empty, and unknown input", () => {
    expect(() =>
      documentZipRequestSchema.parse({
        document_ids: [firstId, "not-a-uuid"],
        mode: "partial",
      }),
    ).toThrow();
    expect(() => documentZipRequestSchema.parse({ document_ids: [] })).toThrow();
    expect(() =>
      documentZipRequestSchema.parse({
        document_ids: [firstId],
        mode: "atomic",
        ignored: true,
      }),
    ).toThrow();
  });

  it("passes the parsed request to the service and sends only ZIP bytes", async () => {
    const bytes = Buffer.from("zip");
    const downloadZip = vi.fn(async () => ({
      bytes,
      outcomes: [],
      failures: [],
    }));
    const service: DocumentsService = Object.create(DocumentsService.prototype);
    service.downloadZip = downloadZip;
    let resolveSend: (() => void) | undefined;
    const sent = new Promise<void>((resolve) => {
      resolveSend = resolve;
    });
    const response = {
      locals: {
        auth: {
          user: {
            id: "00000000-0000-4000-8000-000000000002",
            email: "owner@example.com",
          },
        },
      },
      setHeader: vi.fn(),
      send: vi.fn(() => {
        resolveSend?.();
      }),
      status: vi.fn(function status() {
        return this;
      }),
      json: vi.fn(),
    } as Response;
    const request = {
      body: { document_ids: [firstId, firstId] },
    } as Request;

    createDocumentsContentController(service).downloadZip(request, response, vi.fn());
    await sent;

    expect(downloadZip).toHaveBeenCalledWith(
      {
        userId: "00000000-0000-4000-8000-000000000002",
        userEmail: "owner@example.com",
      },
      {
        documentIds: [firstId, firstId],
        mode: "atomic",
      },
    );
    expect(response.send).toHaveBeenCalledWith(bytes);
  });
});
