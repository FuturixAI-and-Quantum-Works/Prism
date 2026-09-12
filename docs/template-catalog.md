# Template packs and licensing

This catalog describes the template material that Prism ships. It is an inventory, not a statement that a document is legally effective.

> Templates are starting material only. They have not been certified for any transaction or jurisdiction. A qualified lawyer must review the selected form, facts, execution requirements, filing requirements, and current law.

## Bundled templates

Prism ships one source-controlled HTML pack. [`backend/data/seed-packs/templates/v1/core-neutral/pack.json`](../backend/data/seed-packs/templates/v1/core-neutral/pack.json) declares these seven templates:

- Mutual NDA Agreement.
- Employment Contract.
- Service Level Agreement.
- Privacy Policy Template.
- Partnership Agreement.
- Commercial Lease.
- Consulting Agreement.

Each form offers a governing-law choice from Delaware, New York, California, Texas, England and Wales, Singapore, and Hong Kong. This choice does not localize the rest of the form or establish compliance with the selected law.

Prism does not bundle DOCX templates. The retired `backend/Templates` and `backend/sampleTemplates` directories must not contain DOCX files.

## Seed the bundled HTML templates

Run the standard template seed:

```sh
npm run seed:templates --workspace @prism/backend
```

The command validates and seeds all seven HTML templates. `npm run seed:validate` includes this validation and does not expect a DOCX directory.

## Import operator-owned DOCX templates

The DOCX importer remains available for templates that you own or have permission to use. Keep these files outside the retired directories and do not commit them unless the repository provenance policy covers them.

1. Confirm that you have the right to use and redistribute each file.
2. Put the files in a dedicated operator directory.
3. Validate the directory before writing database rows.

   ```sh
   npm run seed:docx-templates --workspace @prism/backend -- --dry-run /absolute/path/to/licensed-docx
   ```

4. Seed the validated directory.

   ```sh
   npm run seed:docx-templates --workspace @prism/backend -- /absolute/path/to/licensed-docx
   ```

The command requires the directory argument. It imports every `.docx` file in that directory under the `Operator DOCX Templates` category.

When object storage is enabled, the importer uploads each source package. When object storage is disabled, keep the directory inside the backend working directory so Prism can read the source later. The ignored `backend/operator-docx` directory is available for this local case:

```sh
npm run seed:docx-templates --workspace @prism/backend -- operator-docx
```

## Track a cleared DOCX template

Operator-owned DOCX files do not need to enter Git. If a publisher chooses to track one, add a complete entry to [`docs/template-provenance.json`](template-provenance.json). Each entry requires:

- `path`, the repository-relative DOCX path.
- `source`, the source citation.
- `author`, the named author or rights holder.
- `license`, the applicable license.
- `redistributionGrant`, the evidence that permits redistribution.
- `attribution`, the required attribution text or `None`.

The publication check rejects tracked DOCX files without these fields. It rejects every DOCX file in the retired directories even when provenance metadata exists.

## Legal limits

A pack label helps operators organize content. A jurisdiction label describes the law that the text appears designed around. Neither label checks the facts, parties, capacity, formalities, tax, registration, filing, stamping, local amendments, or later changes in law.

Seeding proves only that Prism can parse and store a template. It is not a legal review.
