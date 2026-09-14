[All features](../README.md) · [Prism](../../README.md)

# AI-assisted contract review

Review agreements against your own requirements, with AI highlighting potential issues for your team to assess. Bring the contract, supporting documents, and review criteria into one place before deciding what needs to change.

## What you can do

- Review a primary agreement alongside supporting documents that provide relevant context.
- Add custom review rules or import checks from a saved rulebook to apply a consistent review standard.
- Inspect per-rule assessments, risk summaries, and AI insights to identify areas that need closer attention.
- See an overview score calculated from the review's compliant, partially compliant, and non-compliant rule results.
- Follow analysis progress, cancel a run, and return to saved reviews and their rule summaries.

## Example: review a supplier agreement

Suppose your team needs to check a supplier's termination terms, confidentiality obligations, and liability provisions against its purchasing requirements.

1. Open **Compliance Review** and upload the agreement or select a document from a project. Add relevant supporting documents, such as the purchasing requirements.
2. Start a custom review and add your checks, or select an existing rulebook and choose **Import Rules**. Make each check specific enough to evaluate against the document.
3. Select **Run**. Inspect the rule results, overview score, risk summaries, and AI insights as the analysis progresses.
4. Verify potential issues against the agreement. Use the document editor to revise the draft and comments to discuss changes with reviewers.

The result is a structured starting point for review, with the final interpretation and decision remaining with your team.

## Requirements and boundaries

AI review requires a configured AI provider, model access, and a running backend worker. Document-size and model-context limits apply; large inputs may need to be reduced before analysis.

The score reflects the rules you supplied. It is not legal advice, regulatory certification, or a guarantee of compliance. Check findings against the source documents and obtain qualified legal review where needed.

## Continue exploring

- [Custom review playbooks](../review-playbooks/README.md) for reusable review criteria.
- [Document editing and version history](../document-editor/README.md) for making and saving revisions.
- [Collaborative review and approvals](../review-and-approvals/README.md) for discussion and decisions.
- [AI provider setup](../../docs/providers.md) and [deployment operations](../../docs/deployment.md) for configuration.
