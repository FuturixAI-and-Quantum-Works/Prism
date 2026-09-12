export const ids = {
  user: "user-0001",
  workspace: "workspace-0001",
  project: "project-0001",
  document: "document-0001",
  versionCurrent: "version-0002",
  versionPrevious: "version-0001",
  comment: "comment-0001",
  review: "review-0001",
  compliance: "compliance-0001",
  complianceRule: "compliance-rule-0001",
  complianceQuestion: "compliance-question-0001",
  connection: "connection-0001",
  model: "model-0001",
  template: "template-0001",
  templateSecondary: "template-0002",
  workflow: "workflow-0001",
  sourceIndexed: "source-0001",
  sourceFailed: "source-0002",
};

export const fixedNow = "2026-01-15T12:00:00.000Z";

const capabilities = {
  input: { text: true, image: false, pdf: true },
  output: { text: true, structured: true, toolCalls: true },
  contextWindowTokens: 128_000,
  maxOutputTokens: 8_192,
};

interface MockTabularCell {
  id: string;
  reviewId: string;
  documentId: string;
  columnIndex: number;
  content: {
    summary?: string;
    flag?: "green" | "grey" | "yellow" | "red";
    reasoning?: string;
  } | null;
  status: "pending" | "generating" | "done" | "error";
  createdAt: string;
  updatedAt: string;
}

interface MockProfile {
  displayName: string;
  country: string | null;
  jurisdiction: string | null;
  organization: string | null;
  professionalRole: string | null;
  role: string;
  onboardingCompleted: boolean;
}

interface MockVersion {
  id: string;
  version_number: number;
  source: string;
  created_at: string;
  display_name: string | null;
}

interface MockComment {
  id: string;
  document_id: string;
  version_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  parent_comment_id: string | null;
  body: string;
  anchor_text: string | null;
  anchor_start: number;
  anchor_end: number;
  metadata: unknown;
  resolved: boolean;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MockConnectionModel {
  id: string;
  providerModelId: string;
  displayName: string;
  capabilities: unknown;
  tasks: string[];
}

interface MockConnection {
  id: string;
  provider: string;
  name: string;
  source: "server" | "user";
  baseUrl: string | null;
  enabled: boolean;
  hasCredential: true;
  models: MockConnectionModel[];
}

interface MockModel extends MockConnectionModel {
  provider: string;
  connectionId: string;
  connectionName: string;
  connectionSource: "server" | "user";
}

export function createBaselineState() {
  const user = {
    id: ids.user,
    name: "Alex Morgan",
    email: "alex@example.test",
    emailVerified: true,
    image: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
  };
  const profile: MockProfile = {
    displayName: "Alex Morgan",
    country: "United States",
    jurisdiction: "United States",
    organization: "Prism Legal",
    professionalRole: "lawyer",
    role: "admin",
    onboardingCompleted: true,
  };
  const workspace = {
    id: ids.workspace,
    owner_id: ids.user,
    owner_name: "Alex Morgan",
    name: "Acme Legal Workspace",
    description: "Commercial agreements for Acme.",
    storage_used_bytes: 2048,
    storage_quota_bytes: 1_000_000,
    role: "owner" as const,
    file_count: 1,
    collaborators: [],
    created_at: fixedNow,
    updated_at: fixedNow,
  };
  const project = {
    id: ids.project,
    name: "Acme Legal Project",
    cm_number: "ACME-001",
    user_id: ids.user,
    is_owner: false,
    role: "editor" as const,
    document_count: 1,
    chat_count: 0,
    review_count: 0,
    folders: [],
    collaborators: [],
    created_at: fixedNow,
    updated_at: fixedNow,
  };
  const projectDetail = {
    id: ids.project,
    userId: ids.user,
    name: project.name,
    cmNumber: project.cm_number,
    is_owner: project.is_owner,
    role: project.role,
    folders: [],
    createdAt: fixedNow,
    updatedAt: fixedNow,
  };
  const document = {
    id: ids.document,
    project_id: null,
    workspace_id: ids.workspace,
    user_id: ids.user,
    folder_id: null,
    filename: "Master Services Agreement.docx",
    file_type: "docx",
    size_bytes: 4096,
    page_count: 4,
    status: "ready",
    lifecycle_status: "DRAFT",
    current_version_id: ids.versionCurrent,
    latest_version_number: 2,
    active_version_number: 2,
    is_primary: true,
    created_at: fixedNow,
    updated_at: fixedNow,
  };
  const versions: { current_version_id: string; versions: MockVersion[] } = {
    current_version_id: ids.versionCurrent,
    versions: [
      {
        id: ids.versionCurrent,
        version_number: 2,
        source: "user_edit",
        created_at: fixedNow,
        display_name: "Negotiated draft",
      },
      {
        id: ids.versionPrevious,
        version_number: 1,
        source: "user_upload",
        created_at: "2026-01-14T12:00:00.000Z",
        display_name: "Original draft",
      },
    ],
  };
  const comments: MockComment[] = [
    {
      id: ids.comment,
      document_id: ids.document,
      version_id: ids.versionCurrent,
      user_id: ids.user,
      user_email: user.email,
      user_name: user.name,
      parent_comment_id: null,
      body: "Confirm the renewal notice period.",
      anchor_text: "renewal notice",
      anchor_start: 20,
      anchor_end: 34,
      metadata: null,
      resolved: false,
      resolved_by_user_id: null,
      resolved_at: null,
      created_at: fixedNow,
      updated_at: fixedNow,
    },
  ];
  const tabularCells: MockTabularCell[] = [
    {
      id: "cell-0001",
      reviewId: ids.review,
      documentId: ids.document,
      columnIndex: 0,
      content: {
        summary: "Termination requires thirty days notice.",
        flag: "yellow",
        reasoning: "The notice period is shorter than the preferred standard.",
      },
      status: "done",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  ];
  const tabular = {
    review: {
      id: ids.review,
      userId: ids.user,
      projectId: null,
      workflowId: null,
      title: "Contract risk review",
      columnsConfig: [
        {
          id: "risk-column",
          index: 0,
          name: "Termination Risk",
          prompt: "Summarize termination risk.",
          format: "text",
          width: 250,
        },
      ],
      document_count: 1,
      createdAt: fixedNow,
      updatedAt: fixedNow,
      allow_edit: true,
      is_owner: true,
      shared_by_name: null,
    },
    documents: [
      {
        id: ids.document,
        filename: document.filename,
        fileType: "docx",
        createdAt: fixedNow,
        has_pdf_rendition: true,
      },
    ],
    cells: tabularCells,
  };
  const compliance = {
    review: {
      id: ids.compliance,
      userId: ids.user,
      projectId: null,
      workspaceId: ids.workspace,
      primaryDocumentId: ids.document,
      title: "MSA compliance review",
      status: "completed" as "pending" | "running" | "completed" | "failed",
      complianceScore: 84,
      results: {
        criticalIssues: 1,
        pendingItems: 0,
        resolvedIssues: 3,
        compliance_score: 84,
        critical_issues: 1,
        partial_issues: 0,
        compliant_rules: 3,
        total_rules: 4,
        total_questions: 1,
      },
      aiInsights: ["The limitation of liability clause needs review."],
      ragCollectionName: null,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
    supportingDocs: [],
    rules: [
      {
        id: ids.complianceRule,
        reviewId: ids.compliance,
        content: "Liability must be capped at twelve months of fees.",
        status: "non_compliant" as const,
        result: {
          summary: "The agreement contains an uncapped indemnity.",
          reasoning: "The indemnity is excluded from the contractual cap.",
          citations: [],
        },
        sortOrder: 0,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    ],
    questions: [
      {
        id: ids.complianceQuestion,
        reviewId: ids.compliance,
        content: "Is customer data encrypted?",
        status: "compliant" as const,
        result: {
          answer: "Yes.",
          reasoning: "The security schedule requires encryption.",
          citations: [],
        },
        sortOrder: 0,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    ],
    primaryDocument: {
      id: ids.document,
      filename: document.filename,
      fileType: "docx",
    },
  };
  const connection: MockConnection = {
    id: ids.connection,
    provider: "openai",
    name: "Prism OpenAI",
    source: "server",
    baseUrl: null,
    enabled: true,
    hasCredential: true,
    models: [],
  };
  const model: MockModel = {
    id: ids.model,
    provider: "openai",
    providerModelId: "gpt-5.2",
    displayName: "GPT 5.2",
    capabilities,
    tasks: ["main", "title", "tabular"],
    connectionId: ids.connection,
    connectionName: connection.name,
    connectionSource: "server",
  };
  const templates = [
    {
      id: ids.template,
      userId: null,
      name: "Mutual NDA",
      category: "NDA",
      description: "A balanced mutual confidentiality agreement.",
      contentHtml:
        "<h1>Mutual Non-Disclosure Agreement</h1><p>This agreement is between {{company_name}} and Prism Legal.</p>",
      fields: [
        {
          id: "company_name",
          label: "Company name",
          type: "text" as const,
          required: true,
          placeholder: "Enter company name",
          section: "Parties",
        },
      ],
      sourceFilename: null,
      sourceStoragePath: null,
      sourceMimeType: null,
      sourceChecksum: null,
      sourceMetadata: null,
      isCreatedByUser: false,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
    {
      id: ids.templateSecondary,
      userId: null,
      name: "Consulting Agreement",
      category: "Consulting",
      description: "Independent contractor terms and deliverables.",
      contentHtml: "<h1>Consulting Agreement</h1><p>Services and payment terms.</p>",
      fields: [],
      sourceFilename: null,
      sourceStoragePath: null,
      sourceMimeType: null,
      sourceChecksum: null,
      sourceMetadata: null,
      isCreatedByUser: false,
      createdAt: "2026-01-14T12:00:00.000Z",
      updatedAt: "2026-01-14T12:00:00.000Z",
    },
  ];
  const workflows = [
    {
      id: ids.workflow,
      userId: ids.user,
      title: "Commercial Contract Rulebook",
      type: "tabular" as const,
      promptMd: "Review commercial contracts against approved fallback positions.",
      columnsConfig: [
        {
          id: "liability-cap",
          index: 0,
          name: "Liability cap",
          prompt: "Is liability capped at twelve months of fees?",
          format: "yes_no",
          width: 260,
          question: "Is liability capped at twelve months of fees?",
          category: "Risk",
          severity: "error",
          rationale: "Uncapped liability exceeds policy.",
        },
      ],
      practice: "Commercial",
      isSystem: false,
      createdAt: fixedNow,
      updatedAt: fixedNow,
      allow_edit: true,
      is_owner: true,
      shared_by_name: null,
    },
  ];
  const sources = [
    {
      id: ids.sourceIndexed,
      collection_id: "collection-0001",
      collection_name: "workspace_acme",
      collection_display_name: "Acme Legal Workspace",
      scope_type: "workspace" as const,
      scope_id: ids.workspace,
      source_type: "document" as const,
      source_id: ids.document,
      version_id: ids.versionCurrent,
      project_id: null,
      workspace_id: ids.workspace,
      filename: "Master Services Agreement.docx",
      mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      storage_path: "documents/master-services-agreement.docx",
      status: "indexed" as "indexed" | "pending" | "failed" | "skipped_unsupported",
      last_error: null,
      last_error_code: null,
      last_error_category: null,
      last_error_details: null,
      retryable: false,
      retry_after_seconds: null,
      indexed_at: fixedNow,
      updated_at: fixedNow,
      created_at: fixedNow,
    },
    {
      id: ids.sourceFailed,
      collection_id: "collection-0001",
      collection_name: "workspace_acme",
      collection_display_name: "Acme Legal Workspace",
      scope_type: "workspace" as const,
      scope_id: ids.workspace,
      source_type: "drive_file" as const,
      source_id: "drive-file-0001",
      version_id: "drive-version-0001",
      project_id: null,
      workspace_id: ids.workspace,
      filename: "Vendor Security Addendum.pdf",
      mime_type: "application/pdf",
      storage_path: "drive/vendor-security-addendum.pdf",
      status: "failed" as "indexed" | "pending" | "failed" | "skipped_unsupported",
      last_error: "Embedding provider timed out.",
      last_error_code: "provider_timeout",
      last_error_category: "provider",
      last_error_details: null,
      retryable: true,
      retry_after_seconds: 30,
      indexed_at: null,
      updated_at: fixedNow,
      created_at: fixedNow,
    },
  ];
  const aiPreferences: Record<string, { connectionId: string; modelId: string }> = {
    main: { connectionId: ids.connection, modelId: ids.model },
    title: { connectionId: ids.connection, modelId: ids.model },
    tabular: { connectionId: ids.connection, modelId: ids.model },
  };

  return {
    auth: "authenticated" as "authenticated" | "onboarding" | "signed-out",
    user,
    profile,
    workspace,
    project,
    projectDetail,
    document,
    documentHtml:
      "<h1>Master Services Agreement</h1><p>The initial term is twelve months.</p><p>Either party may terminate with thirty days notice.</p>",
    previousDocumentHtml:
      "<h1>Master Services Agreement</h1><p>The initial term is twelve months.</p>",
    versions,
    comments,
    approval: {
      request: {
        role_label: "Legal approver",
        approver_name: "Taylor Reviewer",
        status: "pending" as "pending" | "approved" | "rejected" | "cancelled",
      },
      items: [
        {
          id: "approval-item-0001",
          title: "Liability cap update",
          reason: "The cap changed from fees paid to two times fees paid.",
        },
      ],
    },
    invitation: {
      resource_type: "project" as const,
      resource_id: ids.project,
      resource_name: project.name,
      role: "editor" as const,
      status: "pending" as "pending" | "accepted" | "revoked" | "expired",
    },
    tabular,
    compliance,
    aiConnections: [connection],
    aiModels: [model],
    templates,
    workflows,
    sources,
    sourcesHealth: {
      ok: false,
      status: "degraded",
      api_status: "operational",
      error: null,
      rag_api_url: "https://rag.example.test",
      failed_sources: 1,
      retryable_failures: 1,
      skipped_sources: 0,
    },
    aiPreferences,
    streamMode: {
      tabular: "complete" as "complete" | "interrupt",
      compliance: "complete" as "complete" | "interrupt",
    },
  };
}

export type MockState = ReturnType<typeof createBaselineState>;
