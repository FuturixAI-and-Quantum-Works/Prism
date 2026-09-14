[All features](../README.md) · [Prism](../../README.md)

# Custom review playbooks

Turn your team's review criteria into a reusable checklist instead of recreating them for every agreement. Prism calls these playbooks **rulebooks**: structured checks you can use in AI-assisted contract review and multi-document tabular review.

## What you can do

- Create a rulebook manually or generate a starting checklist with AI using a document type, optional sample document, and extra instructions.
- Define each check's question, extraction prompt, and output format so the review asks for the information you need.
- Record category, severity, and rationale to explain what a check covers and why it matters.
- Add, edit, remove, and reorder checks as your review requirements change.
- Save a rulebook for reuse, import its checks into contract review, or create a tabular review for selected documents.

## Example: standardize supplier reviews

Suppose your team regularly checks supplier agreements for confidentiality, termination notice, and liability terms. A rulebook keeps those questions together and gives each new review the same starting point.

1. Create a **New rulebook** and enter the document type. Build the checklist manually, or provide an optional sample agreement and instructions to generate draft checks with AI.
2. Review each question and its extraction prompt. For example, ask which party may terminate, under what conditions, and with how much notice.
3. Set the output format, category, severity, and rationale where relevant. Remove checks that do not fit your process and put the remaining checks in a useful order.
4. Select **Save rulebook** for later use, or choose target documents and **Save + Create review** to start a tabular review.

You can also import the saved rulebook's checks when setting up an AI-assisted contract review.

## Requirements and boundaries

Manual rulebook creation, editing, and saving do not require AI. AI generation requires a configured provider and model access; running AI-assisted contract or tabular reviews also requires the backend worker.

A rulebook is a reusable checklist, not an automated legal policy or a source of guaranteed compliance. Review AI-generated checks before saving them, and keep your criteria current as your team's requirements change.

## Continue exploring

- [AI-assisted contract review](../contract-review/README.md) for applying checks to a primary agreement and its supporting documents.
- [Multi-document tabular review](../tabular-review/README.md) for applying extraction questions across agreements.
- [AI provider setup](../../docs/providers.md) for enabling AI-generated checklists.
