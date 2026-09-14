[All features](../README.md) · [Prism](../../README.md)

# Collaborative review and approvals

Keep feedback, revisions, and approval decisions alongside the document they concern. Prism supports shared review with version-associated comments, clear document states, and an activity history your team can revisit.

## What you can do

- Add comments associated with a document version and selected text, keeping feedback connected to the relevant clause.
- Resolve comments when an issue is addressed and reopen them when further discussion is needed.
- Accept or reject supported suggested edits through review cards before deciding which changes to keep.
- Send a draft for approval, finalize it through approval, or return it to draft with a rejection reason and optional page, section, or text reference.
- Inspect document activity showing who took an action, when it happened, and available edit details.

## Example: take a draft through internal review

A team preparing a services agreement can discuss a liability clause, revise the language, and record its internal approval without separating the discussion from the draft.

1. Give the intended reviewers appropriate document access. Available actions depend on each person's role and the document's state.
2. Select the clause that needs attention and add a comment. Review suggested edits where available, then resolve comments once the issues are addressed.
3. Save the revised draft and select **Send for approval**. The pending-approval state restricts editing while the document awaits a decision.
4. An authorized approver chooses **Approve** to finalize the document, or **Reject** with a reason to return it to draft. A rejection can identify a page, section, or passage and creates a comment for follow-up.

Use the activity history to review recorded actions and the comments to understand outstanding feedback before the next revision.

## Requirements and boundaries

Comments and internal approval decisions do not require an AI provider. AI-generated suggestions require AI configuration. Email notifications, including eligible participant mentions, require configured mail delivery and a running backend worker.

Collaboration is asynchronous; these features do not provide live simultaneous editing. Approval records an internal decision, not an electronic signature. Activity history records application events and should not be presented as a certified compliance archive.

## Continue exploring

- [Document editing and version history](../document-editor/README.md) for preparing and saving drafts.
- [Shared legal workspaces](../workspaces/README.md) for organizing documents and access.
- [AI-powered drafting and document assistance](../ai-drafting/README.md) for generating and refining draft language.
- [Deployment operations](../../docs/deployment.md) for worker and mail configuration.
