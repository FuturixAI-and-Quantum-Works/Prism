import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Prism Backend API",
      version: "1.0.0",
      description:
        "API documentation for the Prism backend. This API provides endpoints for document management, AI chat, project collaboration, tabular reviews, workflows, and user management.",
    },
    servers: [
      {
        url: "http://localhost:8003",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
          description: "Better Auth database session cookie",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            detail: {
              type: "string",
              description: "Error message",
            },
          },
        },
        Chat: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", nullable: true },
            user_id: { type: "string", format: "uuid" },
            project_id: { type: "string", format: "uuid", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        ChatMessage: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            chat_id: { type: "string", format: "uuid" },
            role: { type: "string", enum: ["user", "assistant"] },
            content: { type: "string", nullable: true },
            annotations: { type: "array", items: { type: "object" }, nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Document: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            filename: { type: "string" },
            file_type: {
              type: "string",
              enum: [
                "pdf",
                "docx",
                "doc",
                "txt",
                "rtf",
                "odt",
                "jpg",
                "jpeg",
                "png",
                "webp",
                "bmp",
              ],
            },
            size_bytes: { type: "integer" },
            page_count: { type: "integer", nullable: true },
            status: { type: "string", enum: ["processing", "ready", "error"] },
            user_id: { type: "string", format: "uuid" },
            project_id: { type: "string", format: "uuid", nullable: true },
            folder_id: { type: "string", format: "uuid", nullable: true },
            current_version_id: { type: "string", format: "uuid", nullable: true },
            storage_path: { type: "string", nullable: true },
            pdf_storage_path: { type: "string", nullable: true },
            latest_version_number: { type: "integer", nullable: true },
            active_version_number: { type: "integer", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        DocumentCreateRequest: {
          type: "object",
          properties: {
            name: { type: "string", description: "Display name for the document" },
            filename: { type: "string", description: "Filename for the blank DOCX document" },
            content_html: {
              type: "string",
              description: "Optional HTML body to convert into the initial DOCX content",
            },
            project_id: { type: "string", format: "uuid", nullable: true },
            folder_id: { type: "string", format: "uuid", nullable: true },
          },
        },
        DocumentUploadRequest: {
          type: "object",
          required: ["file"],
          properties: {
            file: {
              type: "string",
              format: "binary",
              description:
                "PDF, DOCX, DOC, TXT, RTF, ODT, or image file (JPG, JPEG, PNG, WEBP, BMP)",
            },
            project_id: { type: "string", format: "uuid", nullable: true },
            folder_id: { type: "string", format: "uuid", nullable: true },
          },
        },
        DocumentUpdateRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "New display name; the current extension is preserved when none is supplied",
            },
            filename: { type: "string", description: "New filename" },
            project_id: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "Set to a project ID to link the document, or null to unlink it",
            },
            folder_id: {
              type: "string",
              format: "uuid",
              nullable: true,
              description: "Set to a folder ID, or null to move to project root",
            },
          },
        },
        DocumentListResponse: {
          type: "array",
          items: { $ref: "#/components/schemas/Document" },
        },
        DocumentVersion: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            document_id: { type: "string", format: "uuid" },
            version_number: { type: "integer" },
            display_name: { type: "string", nullable: true },
            source: {
              type: "string",
              enum: ["upload", "user_upload", "user_create", "assistant_edit", "generated"],
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            cm_number: { type: "string", nullable: true },
            user_id: { type: "string", format: "uuid" },
            is_owner: { type: "boolean" },
            document_count: { type: "integer" },
            chat_count: { type: "integer" },
            review_count: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        ProjectFolder: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            project_id: { type: "string", format: "uuid" },
            name: { type: "string" },
            parent_folder_id: { type: "string", format: "uuid", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        DriveFile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            user_id: { type: "string", format: "uuid" },
            folder_id: { type: "string", format: "uuid", nullable: true },
            workspace_id: { type: "string", format: "uuid", nullable: true },
            size_bytes: { type: "string", description: "File size in bytes" },
            mime_type: { type: "string" },
            extension: { type: "string", nullable: true },
            checksum: { type: "string", nullable: true },
            version: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            last_accessed_at: { type: "string", format: "date-time" },
          },
        },
        DriveFolder: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            user_id: { type: "string", format: "uuid" },
            parent_folder_id: { type: "string", format: "uuid", nullable: true },
            workspace_id: { type: "string", format: "uuid", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        DriveWorkspace: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            owner_id: { type: "string", format: "uuid" },
            role: { type: "string", enum: ["owner", "admin", "editor", "viewer"] },
            storage_allocated_bytes: { type: "string" },
            storage_used_bytes: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        TabularReview: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", nullable: true },
            user_id: { type: "string", format: "uuid" },
            project_id: { type: "string", format: "uuid", nullable: true },
            workflow_id: { type: "string", format: "uuid", nullable: true },
            columns_config: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  name: { type: "string" },
                  prompt: { type: "string" },
                  format: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
            document_count: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        TabularCell: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            review_id: { type: "string", format: "uuid" },
            document_id: { type: "string", format: "uuid" },
            column_index: { type: "integer" },
            status: { type: "string", enum: ["pending", "generating", "done", "error"] },
            content: {
              type: "object",
              nullable: true,
              properties: {
                summary: { type: "string" },
                flag: { type: "string", enum: ["green", "grey", "yellow", "red"] },
                reasoning: { type: "string" },
              },
            },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            displayName: { type: "string", nullable: true },
            organisation: { type: "string", nullable: true },
            messageCreditsUsed: { type: "integer" },
            creditsResetDate: { type: "string", format: "date-time" },
            creditsRemaining: { type: "integer" },
            tier: { type: "string" },
            aiProviderConnections: {
              type: "array",
              items: { type: "object" },
            },
          },
        },
        Workflow: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            type: { type: "string", enum: ["assistant", "tabular"] },
            prompt_md: { type: "string", nullable: true },
            columns_config: { type: "array", items: { type: "object" }, nullable: true },
            practice: { type: "string", nullable: true },
            user_id: { type: "string", format: "uuid", nullable: true },
            is_system: { type: "boolean" },
            allow_edit: { type: "boolean" },
            is_owner: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        WorkflowShare: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            workflow_id: { type: "string", format: "uuid" },
            shared_with_email: { type: "string", format: "email" },
            allow_edit: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "Auth", description: "Authentication endpoints (OAuth, Email OTP)" },
      { name: "Chat", description: "AI chat endpoints" },
      {
        name: "Documents",
        description:
          "Independent document, file upload, processing, metadata, version, and edit endpoints",
      },
      {
        name: "Projects",
        description: "Project, matter, folder, people, and project-scoped collaboration endpoints",
      },
      { name: "Project Chat", description: "Project-scoped AI chat endpoints" },
      { name: "Tabular Review", description: "Tabular document review endpoints" },
      { name: "User", description: "User profile and settings endpoints" },
      { name: "Workflows", description: "Workflow template endpoints" },
      { name: "Downloads", description: "File download endpoints" },
      { name: "Drive", description: "Generic file, folder, and workspace endpoints" },
    ],
  },
  apis: ["./src/index.ts", "./src/routes/*.ts", "./src/modules/**/*.routes.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
