import { db, projects, workspaces } from "../../../db/index.js";
import type { ToolExecutionContext, ToolExecutorResult } from "./types.js";

export async function executeCreateProject(
  context: ToolExecutionContext,
  input: { name: string; matter_type?: string },
): Promise<ToolExecutorResult> {
  const name = input.name.trim();
  const matterType = input.matter_type?.trim() ?? "";
  if (!name) {
    return { output: { ok: false, error: "Project name is required." }, status: "error" };
  }
  try {
    const [project] = await db
      .insert(projects)
      .values({
        userId: context.user.id,
        name,
        cmNumber: matterType || null,
      })
      .returning();
    const output = {
      ok: true,
      project_id: project.id,
      name: project.name,
      message: `Created project "${project.name}".`,
    };
    context.write({
      type: "project_created",
      project_id: project.id,
      name: project.name,
    });
    return { output };
  } catch (error) {
    return {
      output: {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create project.",
      },
      status: "error",
    };
  }
}

export async function executeCreateWorkspace(
  context: ToolExecutionContext,
  input: { name: string; description?: string },
): Promise<ToolExecutorResult> {
  const name = input.name.trim();
  const description = input.description?.trim() ?? "";
  if (!name) {
    return { output: { ok: false, error: "Workspace name is required." }, status: "error" };
  }
  try {
    const [workspace] = await db
      .insert(workspaces)
      .values({
        ownerId: context.user.id,
        name,
        description: description || null,
      })
      .returning();
    const output = {
      ok: true,
      workspace_id: workspace.id,
      name: workspace.name,
      path: `/workspaces/${encodeURIComponent(workspace.id)}`,
      message: `Created workspace "${workspace.name}".`,
    };
    context.write({
      type: "workspace_created",
      workspace_id: workspace.id,
      name: workspace.name,
    });
    return { output };
  } catch (error) {
    return {
      output: {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create workspace.",
      },
      status: "error",
    };
  }
}
