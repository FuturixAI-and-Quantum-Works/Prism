[All features](../README.md) · [Prism](../../README.md)

# Document editing and version history

Develop a draft in the browser, save clear checkpoints, and export a copy for the next stage of legal work. Prism keeps editing and saved-version history alongside the document's review context.

## What you can do

- **Edit rich-text documents.** Structure a draft with headings, lists, links, highlights, alignment, and resizable tables.
- **Save numbered versions.** Use Save to persist your changes as a new document version. The version-history sidebar lists saved versions and identifies the current version.
- **Export Word or PDF.** Generate a DOCX or PDF from the current editor content for sharing outside Prism or further work in another application.
- **Move into review.** Open the document's comments and approval workflow when the draft is ready for another participant. Editing availability follows your access permissions and the document's state.

Version history gives the team a record of saved checkpoints. It is separate from Luna's tracked DOCX edit suggestions: a saved version captures document content, while a suggested edit can be accepted or rejected through the review controls.

## Example: revise and hand off a draft

1. Open a document created from a [template](../contract-templates/README.md) or with [Luna](../ai-drafting/README.md).
2. Update the scope of work, format the section headings, and adjust the payment table.
3. Select **Save** and wait for the saved confirmation. Check the new entry in the version-history sidebar.
4. Open **More document actions** and choose **Export as Word DOCX** or **Export as PDF**. Inspect the downloaded file before distributing it.
5. Continue with [collaborative review and approvals](../review-and-approvals/README.md) when the saved draft is ready.

Saving before export keeps a corresponding checkpoint in Prism. Exporting a file is not a substitute for saving your edits.

## Requirements and limits

Use Save deliberately; the editor does not provide continuous autosave. Version history is a list of saved versions, not a promise of automatic rollback or real-time co-editing.

DOCX export is generated from editor HTML, so complex Word layouts may change during editing or export. Check page layout, tables, and numbering in the exported document rather than assuming a lossless Word round trip.

PDF export from the editor requires Chromium on the backend. Conversion of DOC or DOCX files to PDF requires LibreOffice. The deployment must also have working document storage. See [deployment and conversion requirements](../../docs/deployment.md).

## Continue the workflow

- [AI-powered drafting and document assistance](../ai-drafting/README.md)
- [Collaborative review and approvals](../review-and-approvals/README.md)
- [Shared legal workspaces](../workspaces/README.md)
