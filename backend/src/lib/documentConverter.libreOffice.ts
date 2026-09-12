import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeDocxZipPaths } from "../modules/content/documentContent.js";
import {
  abortError,
  ConversionLimitError,
  type ConversionAdapter,
} from "./documentConverter.internal.js";
import type {
  DocumentConverterConfig,
  DocumentConverterDependencies,
  LibreOfficeRunInput,
} from "./documentConverter.types.js";

function collectProcessError(child: ChildProcess): () => string {
  const chunks: Buffer[] = [];
  let length = 0;
  child.stderr?.on("data", (value: Buffer | string) => {
    if (length >= 65_536) return;
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    chunks.push(chunk.subarray(0, 65_536 - length));
    length += chunk.byteLength;
  });
  return () => Buffer.concat(chunks).toString("utf8").trim();
}

async function runOwnedProcess(
  executable: string,
  args: readonly string[],
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) throw abortError(signal);

  const child = spawn(executable, args, {
    detached: process.platform !== "win32",
    shell: false,
    stdio: ["ignore", "ignore", "pipe"],
  });
  const processError = collectProcessError(child);
  let killTimer: NodeJS.Timeout | undefined;
  const sendSignal = (processSignal: NodeJS.Signals) => {
    if (process.platform !== "win32" && child.pid) {
      try {
        process.kill(-child.pid, processSignal);
        return;
      } catch {
        child.kill(processSignal);
        return;
      }
    }
    child.kill(processSignal);
  };
  const terminate = () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    sendSignal("SIGTERM");
    killTimer = setTimeout(() => sendSignal("SIGKILL"), 1_000);
    killTimer.unref();
  };
  signal.addEventListener("abort", terminate, { once: true });

  try {
    await new Promise<void>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code, terminationSignal) => {
        if (signal.aborted) {
          reject(abortError(signal));
        } else if (code === 0) {
          resolve();
        } else {
          const detail = processError();
          reject(
            new Error(
              `LibreOffice exited with ${terminationSignal ?? `code ${String(code)}`}${
                detail ? `: ${detail}` : ""
              }`,
            ),
          );
        }
      });
    });
  } finally {
    signal.removeEventListener("abort", terminate);
    if (killTimer) clearTimeout(killTimer);
  }
}

export async function runLibreOffice(input: LibreOfficeRunInput): Promise<void> {
  await runOwnedProcess(
    input.executable,
    [
      "--headless",
      `-env:UserInstallation=${pathToFileURL(input.profileDirectory).href}`,
      "--convert-to",
      "pdf",
      "--outdir",
      input.outputDirectory,
      input.inputPath,
    ],
    input.signal,
  );
}

export async function probeLibreOffice(executable: string, signal: AbortSignal): Promise<void> {
  await runOwnedProcess(executable, ["--version"], signal);
}

async function readBoundedOutput(path: string, maxOutputBytes: number): Promise<Buffer> {
  const outputStat = await stat(path);
  if (!outputStat.isFile()) throw new Error("Document conversion output is not a regular file");
  if (outputStat.size > maxOutputBytes) {
    throw new ConversionLimitError("output", outputStat.size, maxOutputBytes);
  }
  const output = await readFile(path);
  if (output.byteLength > maxOutputBytes) {
    throw new ConversionLimitError("output", output.byteLength, maxOutputBytes);
  }
  return output;
}

export function createLibreOfficeAdapter(
  config: DocumentConverterConfig,
  dependencies: DocumentConverterDependencies,
): ConversionAdapter {
  return {
    kind: "libreoffice",
    conversions: ["doc-to-pdf", "docx-to-pdf"],
    async convert(request, signal) {
      if (request.kind === "html-to-pdf") {
        throw new Error(`LibreOffice cannot handle ${request.kind}`);
      }
      const directory = await mkdtemp(
        join(dependencies.temporaryRoot ?? tmpdir(), "prism-libreoffice-"),
      );
      const extension = request.kind === "doc-to-pdf" ? ".doc" : ".docx";
      const inputPath = join(directory, `input${extension}`);
      const outputDirectory = join(directory, "output");
      const profileDirectory = join(directory, "profile");
      const outputPath = join(outputDirectory, "input.pdf");
      try {
        await Promise.all([
          mkdir(outputDirectory, { recursive: true }),
          mkdir(profileDirectory, { recursive: true }),
        ]);
        const content =
          request.kind === "docx-to-pdf"
            ? await normalizeDocxZipPaths(request.content, { signal })
            : request.content;
        if (content.byteLength > config.maxInputBytes) {
          throw new ConversionLimitError("input", content.byteLength, config.maxInputBytes);
        }
        await writeFile(inputPath, content);
        if (signal.aborted) throw abortError(signal);
        await dependencies.runLibreOffice({
          executable: config.libreOfficePath,
          inputPath,
          outputDirectory,
          profileDirectory,
          signal,
        });
        if (signal.aborted) throw abortError(signal);
        return await readBoundedOutput(outputPath, config.maxOutputBytes);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    async health(signal) {
      await dependencies.probeLibreOffice?.(config.libreOfficePath, signal);
    },
  };
}
