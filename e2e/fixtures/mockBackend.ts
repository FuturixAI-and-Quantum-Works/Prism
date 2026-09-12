import type { BrowserContext, Request, Route } from "@playwright/test";
import { createBaselineState, fixedNow, ids, type MockState } from "./data";

export interface RecordedRequest {
  method: string;
  origin: string;
  path: string;
  query: Record<string, string>;
  body: string | null;
}

function createDeferred() {
  const { promise, resolve } = Promise.withResolvers<void>();
  return { promise, resolve };
}

function normalizePath(url: URL) {
  return url.pathname.startsWith("/api/") ? url.pathname.slice(4) : url.pathname;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(request: Request): Record<string, unknown> {
  try {
    const value: unknown = request.postDataJSON();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function sse(events: Array<{ id?: number; event: Record<string, unknown> }>) {
  return events
    .map(
      ({ id, event }) =>
        `${id === undefined ? "" : `id: ${id}\n`}data: ${JSON.stringify(event)}\n\n`,
    )
    .join("");
}

export class MockBackend {
  readonly state: MockState;
  readonly calls: RecordedRequest[] = [];
  readonly unhandled: string[] = [];
  readonly networkFailures: string[] = [];

  private tabularGate = createDeferred();
  private complianceGate = createDeferred();
  private readonly tabularRunId = "tabular-run-reconnect";
  private tabularReconnectAfter = 3;
  private complianceRunId = "compliance-run-reconnect";
  private complianceReconnectAfter = 7;

  constructor() {
    this.state = createBaselineState();
  }

  setSignedOut() {
    this.state.auth = "signed-out";
  }

  setOnboarding() {
    this.state.auth = "onboarding";
    this.state.profile.onboardingCompleted = false;
    this.state.profile.country = null;
    this.state.profile.jurisdiction = null;
    this.state.profile.organization = null;
    this.state.profile.professionalRole = null;
  }

  prepareTabularReconnect(after = 3) {
    const cell = this.state.tabular.cells[0];
    cell.status = "generating";
    cell.content = null;
    this.tabularGate = createDeferred();
    this.tabularReconnectAfter = after;
    this.state.streamMode.tabular = "interrupt";
    return {
      key: `prism_durable_run:tabular-generate:${ids.review}`,
      value: { kind: "reconnecting", runId: this.tabularRunId, after },
    };
  }

  prepareComplianceReconnect(after = 7) {
    this.state.compliance.review.status = "running";
    this.state.streamMode.compliance = "complete";
    this.complianceRunId = "compliance-run-reconnect";
    this.complianceReconnectAfter = after;
    return {
      key: `prism_durable_run:compliance:${ids.compliance}`,
      value: { kind: "reconnecting", runId: this.complianceRunId, after },
    };
  }

  interruptNextComplianceRun() {
    this.complianceGate = createDeferred();
    this.complianceRunId = "compliance-run-cancel";
    this.complianceReconnectAfter = 1;
    this.state.streamMode.compliance = "interrupt";
  }

  wasCalled(method: string, path: string) {
    return this.calls.some((call) => call.method === method && call.path === path);
  }

  matchingCalls(method: string, path: string) {
    return this.calls.filter((call) => call.method === method && call.path === path);
  }

  async install(context: BrowserContext) {
    const handle = (route: Route) => this.handle(route);
    context.on("requestfailed", (request) => {
      if (request.failure()?.errorText === "net::ERR_ABORTED") return;
      this.networkFailures.push(
        `${request.method()} ${request.url()}: ${request.failure()?.errorText || "unknown failure"}`,
      );
    });
    await context.route(/^https?:\/\/(?:localhost|127\.0\.0\.1):3001\/.*/, handle);
    await context.route("**/api/**", handle);
  }

  private corsHeaders(request: Request) {
    const headers = request.headers();
    return {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": headers["access-control-request-headers"] || "content-type",
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-origin": headers.origin || "http://127.0.0.1:4173",
      "access-control-expose-headers": "X-Compliance-Run-Id, X-Tabular-Run-Id",
    };
  }

  private async json(route: Route, body: unknown, status = 200) {
    await route.fulfill({
      status,
      headers: {
        ...this.corsHeaders(route.request()),
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  private async empty(route: Route, status = 204) {
    await route.fulfill({
      status,
      headers: this.corsHeaders(route.request()),
      body: "",
    });
  }

  private async eventStream(
    route: Route,
    events: Array<{ id?: number; event: Record<string, unknown> }>,
    headers: Record<string, string>,
  ) {
    await route.fulfill({
      status: 200,
      headers: {
        ...this.corsHeaders(route.request()),
        ...headers,
        "cache-control": "no-cache",
        "content-type": "text/event-stream",
      },
      body: sse(events),
    });
  }

  private async handle(route: Route) {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = normalizePath(url);

    this.calls.push({
      method,
      origin: url.origin,
      path,
      query: Object.fromEntries(url.searchParams),
      body: request.postData(),
    });

    if (method === "OPTIONS") {
      await this.empty(route);
      return;
    }

    if (method === "GET" && path === "/auth/get-session") {
      if (this.state.auth === "signed-out") {
        await this.json(route, null);
        return;
      }
      await this.json(route, {
        session: {
          id: "session-0001",
          token: "browser-test-session",
          userId: ids.user,
          expiresAt: "2027-01-15T12:00:00.000Z",
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
        user: this.state.user,
      });
      return;
    }

    if (method === "POST" && path === "/auth/email-otp/send-verification-otp") {
      await this.json(route, { success: true });
      return;
    }

    if (method === "POST" && path === "/auth/sign-in/email-otp") {
      this.setOnboarding();
      await this.json(route, {
        token: "browser-test-session",
        user: this.state.user,
      });
      return;
    }

    if (method === "POST" && path === "/auth/sign-out") {
      this.setSignedOut();
      await this.json(route, { success: true });
      return;
    }

    if (method === "GET" && path === "/user/profile") {
      await this.json(route, this.state.profile);
      return;
    }

    if (method === "PUT" && path === "/user/onboarding") {
      const body = readJson(request);
      this.state.profile.displayName = String(body.fullName || this.state.profile.displayName);
      this.state.profile.country = String(body.country || "");
      this.state.profile.jurisdiction = String(body.jurisdiction || "");
      this.state.profile.organization = String(body.organization || "");
      this.state.profile.professionalRole =
        typeof body.professionalRole === "string" ? body.professionalRole : null;
      this.state.profile.onboardingCompleted = true;
      this.state.auth = "authenticated";
      await this.json(route, this.state.profile);
      return;
    }

    if (method === "GET" && path === "/notifications/count") {
      await this.json(route, { unread_count: 0 });
      return;
    }

    if (method === "GET" && path === "/notifications") {
      await this.json(route, { notifications: [] });
      return;
    }

    if (method === "GET" && path === "/chat") {
      await this.json(route, []);
      return;
    }

    if (method === "GET" && path === "/chat/chat-document-0001") {
      await this.json(route, {
        chat: {
          id: "chat-document-0001",
          title: "Termination clause review",
          userId: ids.user,
          projectId: null,
          workspaceId: null,
          sessionId: null,
          createdAt: fixedNow,
          updatedAt: fixedNow,
        },
        messages: [],
      });
      return;
    }

    if (method === "GET" && path === "/attention-items") {
      await this.json(route, []);
      return;
    }

    if (method === "GET" && path === "/documents") {
      await this.json(route, [this.state.document]);
      return;
    }

    if (method === "GET" && path === "/compliance-review") {
      await this.json(route, [this.state.compliance.review]);
      return;
    }

    if (method === "GET" && path === "/drive/workspaces") {
      await this.json(route, [this.state.workspace]);
      return;
    }

    if (method === "GET" && path === `/drive/workspaces/${ids.workspace}`) {
      await this.json(route, this.state.workspace);
      return;
    }

    if (method === "GET" && path === `/drive/workspaces/${ids.workspace}/activity`) {
      await this.json(route, []);
      return;
    }

    if (method === "GET" && path === `/drive/workspaces/${ids.workspace}/chat/chats`) {
      await this.json(route, []);
      return;
    }

    if (method === "GET" && path === "/drive/files") {
      await this.json(route, { files: [], total: 0, limit: 50, offset: 0, has_more: false });
      return;
    }

    if (method === "GET" && path === "/projects") {
      await this.json(route, [this.state.project]);
      return;
    }

    if (method === "GET" && path === `/projects/${ids.project}`) {
      await this.json(route, this.state.projectDetail);
      return;
    }

    if (method === "GET" && path === "/workflows") {
      const type = url.searchParams.get("type");
      await this.json(
        route,
        type
          ? this.state.workflows.filter((workflow) => workflow.type === type)
          : this.state.workflows,
      );
      return;
    }

    if (method === "GET" && path === "/templates") {
      const type = url.searchParams.get("type");
      const templates = this.state.templates.filter((template) => {
        if (!type || type === "all") return true;
        return type === "user" ? template.userId !== null : template.userId === null;
      });
      await this.json(route, templates);
      return;
    }

    if (method === "GET" && path === `/templates/${ids.template}`) {
      await this.json(route, this.state.templates[0]);
      return;
    }

    if (method === "GET" && path === "/sources") {
      await this.json(route, { sources: this.state.sources });
      return;
    }

    if (method === "GET" && path === "/sources/health") {
      await this.json(route, this.state.sourcesHealth);
      return;
    }

    if (method === "POST" && path === `/sources/${ids.sourceFailed}/retry`) {
      const source = this.state.sources.find(({ id }) => id === ids.sourceFailed);
      if (source) {
        source.status = "pending";
        source.last_error = null;
        source.last_error_code = null;
        source.last_error_category = null;
        source.retryable = false;
        source.retry_after_seconds = null;
      }
      this.state.sourcesHealth.failed_sources = 0;
      this.state.sourcesHealth.retryable_failures = 0;
      this.state.sourcesHealth.status = "healthy";
      this.state.sourcesHealth.ok = true;
      await this.json(route, source);
      return;
    }

    if (method === "POST" && path === "/sources/backfill") {
      await this.json(route, { queued: 2, documents: 1, drive_files: 1 });
      return;
    }

    if (method === "POST" && path === "/sources/retry-all-failed") {
      await this.json(route, { total_failed: 1, retried: 1, errors: 0 });
      return;
    }

    if (method === "GET" && path === "/status") {
      await this.json(route, {
        status: "operational",
        message: "All Systems Operational",
        lastUpdated: fixedNow,
        services: [
          {
            name: "api",
            displayName: "Prism API",
            status: "operational",
            responseTimeMs: 42,
          },
        ],
      });
      return;
    }

    if (method === "GET" && path === "/status/history") {
      await this.json(route, {
        services: [
          {
            name: "api",
            displayName: "Prism API",
            uptimePercentage: 100,
            history: [
              { date: "2026-01-13", status: "operational" },
              { date: "2026-01-14", status: "operational" },
              { date: "2026-01-15", status: "operational" },
            ],
          },
        ],
      });
      return;
    }

    if (method === "GET" && path === "/approvals/public/approval-token") {
      await this.json(route, this.state.approval);
      return;
    }

    if (method === "POST" && path === "/approvals/public/approval-token/decision") {
      const body = readJson(request);
      this.state.approval.request.status =
        body.status === "rejected" || body.status === "approved" ? body.status : "pending";
      await this.json(route, this.state.approval.request);
      return;
    }

    if (method === "GET" && path === "/invitations/share-token") {
      await this.json(route, this.state.invitation);
      return;
    }

    if (method === "POST" && path === "/invitations/share-token/accept") {
      this.state.invitation.status = "accepted";
      await this.json(route, { ok: true, ...this.state.invitation });
      return;
    }

    if (method === "GET" && path === "/user/ai/connections") {
      await this.json(route, this.state.aiConnections);
      return;
    }

    if (method === "GET" && path === "/user/ai/models") {
      await this.json(route, this.state.aiModels);
      return;
    }

    if (method === "GET" && path === "/user/ai/preferences") {
      await this.json(route, this.state.aiPreferences);
      return;
    }

    if (method === "POST" && path === "/user/ai/connections") {
      const body = readJson(request);
      const connectionId = "connection-custom";
      const provider = typeof body.provider === "string" ? body.provider : "";
      const connectionName = typeof body.name === "string" ? body.name : "";
      const inputModels = Array.isArray(body.models) ? body.models.filter(isRecord) : [];
      const models = inputModels.map((model, index) => ({
        id: `model-custom-${index + 1}`,
        providerModelId: String(model.providerModelId || ""),
        displayName: String(model.displayName || ""),
        capabilities: model.capabilities,
        tasks: Array.isArray(model.tasks)
          ? model.tasks.filter((task): task is string => typeof task === "string")
          : [],
      }));
      this.state.aiConnections.push({
        id: connectionId,
        provider,
        name: connectionName,
        source: "user",
        baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : null,
        enabled: body.enabled !== false,
        hasCredential: true,
        models,
      });
      for (const model of models) {
        this.state.aiModels.push({
          ...model,
          provider,
          connectionId,
          connectionName,
          connectionSource: "user",
        });
      }
      await this.empty(route, 201);
      return;
    }

    if (method === "POST" && /^\/user\/ai\/connections\/[^/]+\/test$/.test(path)) {
      await this.empty(route);
      return;
    }

    if (method === "PUT" && /^\/user\/ai\/preferences\/(main|title|tabular)$/.test(path)) {
      const task = path.split("/").at(-1);
      if (task) {
        const body = readJson(request);
        this.state.aiPreferences[task] = {
          connectionId: String(body.connectionId || ""),
          modelId: String(body.modelId || ""),
        };
      }
      await this.json(route, this.state.aiPreferences);
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}`) {
      await this.json(route, this.state.document);
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/session-context`) {
      await this.json(route, {
        document_id: ids.document,
        document_state: "DRAFT",
        document_role: "DRAFTER",
        role_badge: "OWNER_ADMIN",
        product_role: "owner",
        access_source: "owner",
        is_owner: true,
        is_workspace_admin: true,
        is_owner_admin: true,
        allowed_actions: [
          "edit_document",
          "add_comment",
          "resolve_comment",
          "fill_placeholders",
          "send_approval",
        ],
        visible_tabs: ["prism", "insights", "comments", "audit"],
      });
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/html`) {
      await this.json(route, {
        html:
          url.searchParams.get("version_id") === ids.versionPrevious
            ? this.state.previousDocumentHtml
            : this.state.documentHtml,
        messages: [],
      });
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/versions`) {
      await this.json(route, this.state.versions);
      return;
    }

    if (method === "POST" && path === `/documents/${ids.document}/versions/from-html`) {
      const body = readJson(request);
      const versionNumber = this.state.versions.versions.length + 1;
      const version = {
        id: `version-${String(versionNumber).padStart(4, "0")}`,
        version_number: versionNumber,
        source: "user_edit" as const,
        created_at: fixedNow,
        display_name: typeof body.display_name === "string" ? body.display_name : null,
      };
      if (typeof body.html === "string") this.state.documentHtml = body.html;
      this.state.versions.current_version_id = version.id;
      this.state.versions.versions.unshift(version);
      this.state.document.current_version_id = version.id;
      this.state.document.latest_version_number = versionNumber;
      await this.json(route, version, 201);
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/comments`) {
      await this.json(route, this.state.comments);
      return;
    }

    if (method === "POST" && path === `/documents/${ids.document}/comments`) {
      const body = readJson(request);
      const comment = {
        ...this.state.comments[0],
        id: `comment-${String(this.state.comments.length + 1).padStart(4, "0")}`,
        body: String(body.body || ""),
        anchor_text: typeof body.anchor_text === "string" ? body.anchor_text : null,
        created_at: fixedNow,
        updated_at: fixedNow,
      };
      this.state.comments.push(comment);
      await this.json(route, comment, 201);
      return;
    }

    const commentMatch = path.match(new RegExp(`^/documents/${ids.document}/comments/([^/]+)$`));
    if (method === "PATCH" && commentMatch) {
      const body = readJson(request);
      const comment = this.state.comments.find((item) => item.id === commentMatch[1]);
      if (comment && typeof body.resolved === "boolean") {
        comment.resolved = body.resolved;
        comment.resolved_by_user_id = body.resolved ? ids.user : null;
        comment.resolved_at = body.resolved ? fixedNow : null;
      }
      await this.json(route, comment);
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/activity`) {
      await this.json(route, []);
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/shares`) {
      await this.json(route, { shares: [], pending_invitations: [] });
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/chat-messages`) {
      await this.json(route, []);
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/edits`) {
      await this.json(route, []);
      return;
    }

    if (method === "GET" && path === `/documents/${ids.document}/context-files`) {
      await this.json(route, []);
      return;
    }

    if (method === "POST" && path === "/chat") {
      await this.eventStream(
        route,
        [
          { id: 1, event: { type: "chat_id", chatId: "chat-document-0001" } },
          {
            id: 2,
            event: {
              type: "tool_call_start",
              tool_call_id: "tool-clauses-0001",
              tool: "extract_clauses",
              input: { document_id: ids.document },
              status: "running",
            },
          },
          {
            id: 3,
            event: {
              type: "tool_result",
              tool_call_id: "tool-clauses-0001",
              tool: "extract_clauses",
              output: {
                ok: true,
                doc_id: ids.document,
                filename: this.state.document.filename,
                clauses: [
                  {
                    type: "termination",
                    title: "Termination for convenience",
                    content: "Either party may terminate with thirty days notice.",
                    location: "Section 8.2",
                    keyTerms: ["30 days", "notice"],
                  },
                ],
              },
              status: "complete",
            },
          },
          {
            id: 4,
            event: { type: "text_delta", text: "I found one termination clause." },
          },
          { id: 5, event: { type: "done" } },
        ],
        {},
      );
      return;
    }

    if (method === "GET" && path === `/tabular-review/${ids.review}`) {
      await this.json(route, this.state.tabular);
      return;
    }

    if (method === "GET" && path === "/tabular-review") {
      await this.json(route, [this.state.tabular.review]);
      return;
    }

    if (path === `/tabular-review/${ids.review}/generate` && method === "POST") {
      if (this.state.streamMode.tabular === "interrupt") {
        await this.eventStream(
          route,
          [
            {
              id: 1,
              event: {
                type: "cell_start",
                document_id: ids.document,
                column_index: 0,
              },
            },
          ],
          { "X-Tabular-Run-Id": this.tabularRunId },
        );
        return;
      }
      await this.completeTabularStream(route, 1);
      return;
    }

    if (path === `/tabular-review/${ids.review}/generate` && method === "GET") {
      if (this.state.streamMode.tabular === "interrupt") {
        if (
          url.searchParams.get("run_id") !== this.tabularRunId ||
          url.searchParams.get("after") !== String(this.tabularReconnectAfter)
        ) {
          await this.json(route, { detail: "Unknown tabular run cursor" }, 409);
          return;
        }
        await this.tabularGate.promise;
        try {
          await this.eventStream(route, [], { "X-Tabular-Run-Id": this.tabularRunId });
        } catch {
          return;
        }
        return;
      }
      await this.completeTabularStream(route, Number(url.searchParams.get("after") || 0) + 1);
      return;
    }

    if (path === `/tabular-review/${ids.review}/generate` && method === "DELETE") {
      if (
        this.state.streamMode.tabular === "interrupt" &&
        url.searchParams.get("run_id") !== this.tabularRunId
      ) {
        await this.json(route, { detail: "Unknown tabular run" }, 409);
        return;
      }
      const cell = this.state.tabular.cells[0];
      cell.status = "pending";
      cell.content = null;
      this.tabularGate.resolve();
      this.state.streamMode.tabular = "complete";
      await this.empty(route);
      return;
    }

    if (method === "GET" && path === `/compliance-review/for-document/${ids.document}`) {
      await this.json(route, this.state.compliance);
      return;
    }

    const complianceRuleMatch = path.match(
      new RegExp(`^/compliance-review/${ids.compliance}/rules/([^/]+)$`),
    );
    if (method === "PATCH" && complianceRuleMatch) {
      const rule = this.state.compliance.rules.find((item) => item.id === complianceRuleMatch[1]);
      await this.json(route, rule);
      return;
    }

    const complianceQuestionMatch = path.match(
      new RegExp(`^/compliance-review/${ids.compliance}/questions/([^/]+)$`),
    );
    if (method === "PATCH" && complianceQuestionMatch) {
      const question = this.state.compliance.questions.find(
        (item) => item.id === complianceQuestionMatch[1],
      );
      await this.json(route, question);
      return;
    }

    if (path === `/compliance-review/${ids.compliance}/run` && method === "POST") {
      if (this.state.streamMode.compliance === "interrupt") {
        await this.eventStream(
          route,
          [
            {
              id: 1,
              event: { type: "rule_start", rule_id: ids.complianceRule },
            },
          ],
          { "X-Compliance-Run-Id": this.complianceRunId },
        );
        return;
      }
      await this.completeComplianceStream(route, 1);
      return;
    }

    if (path === `/compliance-review/${ids.compliance}/run` && method === "GET") {
      const requestedRunId = url.searchParams.get("run_id");
      if (requestedRunId && requestedRunId !== this.complianceRunId) {
        await this.json(route, { detail: "Compliance run not found" }, 404);
        return;
      }
      if (this.state.streamMode.compliance === "interrupt") {
        if (url.searchParams.get("after") !== String(this.complianceReconnectAfter)) {
          await this.json(route, { detail: "Unknown compliance run cursor" }, 400);
          return;
        }
        await this.complianceGate.promise;
        try {
          await this.eventStream(route, [], {
            "X-Compliance-Run-Id": this.complianceRunId,
          });
        } catch {
          return;
        }
        return;
      }
      await this.completeComplianceStream(route, Number(url.searchParams.get("after") || 0) + 1);
      return;
    }

    if (path === `/compliance-review/${ids.compliance}/run` && method === "DELETE") {
      const requestedRunId = url.searchParams.get("run_id");
      if (requestedRunId && requestedRunId !== this.complianceRunId) {
        await this.json(route, { detail: "Compliance run not found" }, 404);
        return;
      }
      this.complianceGate.resolve();
      this.state.streamMode.compliance = "complete";
      this.state.compliance.review.status = "pending";
      await this.empty(route);
      return;
    }

    this.unhandled.push(`${method} ${url.pathname}${url.search}`);
    await this.json(route, { detail: `Unhandled browser-test request: ${method} ${path}` }, 501);
  }

  private async completeTabularStream(route: Route, firstId: number) {
    const cell = this.state.tabular.cells[0];
    cell.status = "done";
    cell.content = {
      summary: "Renewal is automatic unless notice is provided.",
      flag: "yellow",
      reasoning: "The agreement requires thirty days notice.",
    };
    await this.eventStream(
      route,
      [
        {
          id: firstId,
          event: {
            type: "cell_update",
            document_id: ids.document,
            column_index: 0,
            status: "done",
            content: {
              summary: "Renewal is automatic unless notice is provided.",
              flag: "yellow",
              reasoning: "The agreement requires thirty days notice.",
            },
          },
        },
        { id: firstId + 1, event: { type: "done" } },
      ],
      { "X-Tabular-Run-Id": this.tabularRunId },
    );
  }

  private async completeComplianceStream(route: Route, firstId: number) {
    this.state.compliance.review.status = "completed";
    this.state.compliance.review.complianceScore = 91;
    this.state.compliance.review.results = {
      ...this.state.compliance.review.results,
      criticalIssues: 1,
      pendingItems: 0,
      resolvedIssues: 4,
      compliance_score: 91,
      critical_issues: 1,
    };
    const rule = this.state.compliance.rules[0];
    if (rule) {
      rule.status = "non_compliant";
      rule.result = {
        summary: "The uncapped indemnity requires remediation.",
        reasoning: "The liability carve-out exceeds policy.",
        citations: [],
      };
    }
    await this.eventStream(
      route,
      [
        {
          id: firstId,
          event: {
            type: "rule_result",
            rule_id: ids.complianceRule,
            status: "non_compliant",
            result: {
              summary: "The uncapped indemnity requires remediation.",
              reasoning: "The liability carve-out exceeds policy.",
              citations: [],
            },
          },
        },
        {
          id: firstId + 1,
          event: {
            type: "summary",
            compliance_score: 91,
            critical_issues: 1,
            pending_items: 0,
            resolved_issues: 4,
          },
        },
        { event: { type: "done" } },
      ],
      { "X-Compliance-Run-Id": this.complianceRunId },
    );
  }
}
