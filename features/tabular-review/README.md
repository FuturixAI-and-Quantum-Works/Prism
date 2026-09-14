[All features](../README.md) · [Prism](../../README.md)

# Multi-document tabular review

Compare the terms that matter across a set of agreements without building a review table by hand. Prism places documents in rows and extraction questions in columns, making it easier to inspect differences and identify items that need follow-up.

## What you can do

- Start with extraction columns for parties, effective date, term, termination, confidentiality, governing law, indemnification, and limitation of liability.
- Add custom columns with your own extraction prompts and output formats, or reuse checks from a saved rulebook.
- Inspect AI-generated summaries, explanations, and flags for individual document-and-question results.
- Regenerate an individual cell when you want to revisit an extraction, without rerunning the entire table.
- Keep named reviews, manage their document lists, search documents within a review, and follow or cancel a run.

## Example: compare supplier renewal terms

A team reviewing several supplier agreements can use one table to examine effective dates, contract terms, termination rights, and liability provisions.

1. Create a named tabular review and select the documents to include.
2. Add starter columns or choose a rulebook. Add a custom extraction prompt such as “What notice period is required to terminate this agreement?” and select the output format you need.
3. Select **Run**. Results populate as analysis progresses, keeping each answer associated with its document and column.
4. Inspect summaries and flagged results, verify extracted terms against the original agreements, and regenerate individual cells when needed.

Save the review to return to the same document set and questions. For the next set of agreements, a rulebook gives you a reusable starting point for the columns.

## Requirements and boundaries

Generation requires a configured AI provider, suitable model access, and a running backend worker. Document-context and usage limits apply; this is not an unlimited bulk-processing service. PDFs without extractable text require a model that supports direct PDF input.

Review results in Prism; CSV and XLSX export are not currently available. AI extraction can miss or misinterpret terms, so verify important values and conclusions against the source documents.

## Continue exploring

- [Custom review playbooks](../review-playbooks/README.md) for repeatable extraction questions.
- [AI-assisted contract review](../contract-review/README.md) for reviewing an agreement against defined rules.
- [Shared legal workspaces](../workspaces/README.md) for organizing the documents your team reviews.
- [AI provider setup](../../docs/providers.md) and [deployment operations](../../docs/deployment.md) for configuration.
