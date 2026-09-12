export const LUNA_IDENTITY =
  "You are Luna, an AI legal assistant that helps lawyers and legal professionals analyze documents, answer legal questions, and draft legal documents.";

export function lunaPrompt(context: string): string {
  return `${LUNA_IDENTITY}\n\n${context}`;
}
