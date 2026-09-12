import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema/index.js";
import { DrizzleChatRepository } from "../../src/modules/chat/chat.repository.js";

describe("DrizzleChatRepository", () => {
  let pglite: PGlite;
  let repository: DrizzleChatRepository;

  beforeEach(async () => {
    pglite = new PGlite();
    await pglite.exec(`
      CREATE TABLE chat_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        project_id uuid,
        workspace_id uuid,
        title varchar(500),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE chats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid,
        user_id uuid NOT NULL,
        project_id uuid,
        workspace_id uuid,
        title varchar(500),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id uuid NOT NULL,
        role varchar(50) NOT NULL,
        content text,
        files jsonb,
        workflow jsonb,
        annotations jsonb,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    repository = new DrizzleChatRepository(drizzle(pglite, { schema }));
  });

  afterEach(async () => {
    await pglite.close();
  });

  it("creates, loads, updates, and appends turns through the repository", async () => {
    const chat = await repository.createChat({
      userId: "00000000-0000-4000-8000-000000000001",
      sessionId: null,
      projectId: null,
      workspaceId: null,
    });
    expect(chat).toMatchObject({
      title: null,
      userId: "00000000-0000-4000-8000-000000000001",
      projectId: null,
      workspaceId: null,
    });
    if (!chat) throw new Error("Expected chat");

    await repository.saveMessage({
      chatId: chat.id,
      role: "user",
      content: "Hello",
    });
    await repository.setTitle(chat.id, "Greeting");

    await expect(repository.findChat(chat.id)).resolves.toMatchObject({
      id: chat.id,
      title: "Greeting",
    });
    await expect(repository.listHydratedMessages(chat.id)).resolves.toEqual([
      expect.objectContaining({
        chatId: chat.id,
        role: "user",
        content: "Hello",
      }),
    ]);
  });
});
