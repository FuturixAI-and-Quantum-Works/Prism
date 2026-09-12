import type { ChatIntent } from "./chat.types.js";

export function detectChatIntent(userMessage: string | null | undefined): ChatIntent {
  const text = (userMessage ?? "").trim();
  const lower = text.toLowerCase();

  if (/^[^:=\n]{2,80}\s*[:=]\s*\S/.test(text)) {
    return { type: "fill_template_field" };
  }

  if (
    /\b(create|make|start|open|setup|set\s+up|new)\b/.test(lower) &&
    /\b(project|matter|case\s+folder|workspace)\b/.test(lower)
  ) {
    return { type: "project_workspace" };
  }

  if (
    /\b(edit|revise|modify|update|change|replace|delete|insert|redline|mark\s+up|tracked\s+change)\b/.test(
      lower,
    ) &&
    /\b(document|agreement|contract|clause|section|paragraph|schedule|exhibit|term|wording|draft)\b/.test(
      lower,
    )
  ) {
    return { type: "document_edit" };
  }

  if (
    /\b(draft|generate|create|prepare|write|produce|make)\b/.test(lower) &&
    /\b(document|agreement|contract|nda|notice|letter|policy|resolution|template|deed|lease|sow|statement\s+of\s+work)\b/.test(
      lower,
    )
  ) {
    return { type: "generate_document" };
  }

  if (
    /\b(search|find|look\s+up|source|sources|indexed|rag|across|all\s+(documents|files|contracts)|what\s+do|which\s+(documents|files)|where\s+(does|do))\b/.test(
      lower,
    )
  ) {
    return { type: "search_question" };
  }

  return { type: "general_chat" };
}
