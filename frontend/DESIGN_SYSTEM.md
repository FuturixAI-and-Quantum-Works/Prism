# Frontend design system reference

Prism uses React, TypeScript, and Vite. This reference identifies the source files that own routing, styling, accessibility, and HTML sanitization. Use the package manifests as the source for dependency versions.

## Source ownership

- [`src/client/main.tsx`](src/client/main.tsx) mounts the React application and imports the global stylesheet.
- [`src/client/App.tsx`](src/client/App.tsx) applies authentication boundaries, lazy loading, and route error handling.
- [`src/client/routeManifest.ts`](src/client/routeManifest.ts) is the route registry.
- [`src/client/appRoutes.ts`](src/client/appRoutes.ts) owns shared dynamic route patterns and URL builders.
- [`src/client/components/`](src/client/components/) contains route entry components, the application shell, and shared components.
- [`src/client/features/`](src/client/features/) contains feature-owned UI, state, models, and API adapters.
- [`src/client/store/`](src/client/store/) contains the Redux store and shared RTK Query APIs.
- [`src/client/hooks/`](src/client/hooks/) contains hooks shared by more than one feature.
- [`src/client/lib/`](src/client/lib/) contains framework-independent client utilities.

## Feature folders

The current feature folders are:

- [`aiSettings`](src/client/features/aiSettings/)
- [`analysis`](src/client/features/analysis/)
- [`assistant`](src/client/features/assistant/)
- [`compliance`](src/client/features/compliance/)
- [`dashboard`](src/client/features/dashboard/)
- [`documentEditor`](src/client/features/documentEditor/)
- [`documents`](src/client/features/documents/)
- [`editor`](src/client/features/editor/)
- [`files`](src/client/features/files/)
- [`navigation`](src/client/features/navigation/)
- [`projects`](src/client/features/projects/)
- [`review`](src/client/features/review/)
- [`rulebook`](src/client/features/rulebook/)
- [`settings`](src/client/features/settings/)
- [`templatePreview`](src/client/features/templatePreview/)
- [`templates`](src/client/features/templates/)
- [`workspaces`](src/client/features/workspaces/)

Keep feature-specific components and state in the matching folder. Route entry components under [`src/client/components/pages/`](src/client/components/pages/) compose those features for the route registry.

## Routing

Each item in `routeDefinitions` has a path, an access level, and a lazy component loader. The supported access levels are `public`, `onboarding`, and `protected`.

`App.tsx` reads `routeDefinitions` and renders each entry inside the matching access boundary. It does not maintain a second route list. Add shared dynamic paths and URL builders to `appRoutes.ts` when callers need to construct those URLs.

[`src/client/routeManifest.test.ts`](src/client/routeManifest.test.ts) checks generated frontend and backend navigation targets against the registry. It also guards removed route aliases.

## Styling

[`src/client/index.css`](src/client/index.css) is the only stylesheet imported by the application entry point. It owns:

- The box-sizing reset and root viewport sizing.
- The existing layout custom properties.
- Shared indicator animation classes.
- Visible global scrollbar styling.
- The uptime-segment focus indicator.
- Reduced-motion behavior.

Most component layout and visual values remain in React `style` props. Components also use class names and local style blocks when they need pseudo-classes, media queries, or shared animation states. The frontend does not have a complete color, spacing, or typography token API.

CSS keyframe names share a global namespace. Global keyframes use a `prism-` prefix. A component that defines a local style block must use a feature-specific keyframe name or an existing shared animation.

Scrollbars remain visible. A feature can adjust scrollbar width and colors for its own scrolling region, but it must not hide every scrollbar.

The `prefers-reduced-motion: reduce` rule removes decorative indicator motion and shortens other animation and transition durations. Interactive meaning must remain available without motion.

Status colors never carry meaning alone. Pair each status color with visible text, an accessible name, or both.

## Shared accessibility code

Use native HTML semantics before adding ARIA.

- [`src/client/components/ui/Button.tsx`](src/client/components/ui/Button.tsx) provides a button with `type="button"` by default. `IconButton` requires an accessible label.
- [`src/client/components/ui/AccessibleDialog.tsx`](src/client/components/ui/AccessibleDialog.tsx) provides modal semantics and delegates keyboard behavior to `useDialogFocus`.
- [`src/client/components/ui/Tabs.tsx`](src/client/components/ui/Tabs.tsx) provides tab roles, selection state, and arrow, Home, and End key navigation.
- [`src/client/hooks/useDialogFocus.ts`](src/client/hooks/useDialogFocus.ts) traps focus, closes the active dialog on Escape, isolates content outside the dialog, and restores focus.
- [`src/client/hooks/useMenuFocus.ts`](src/client/hooks/useMenuFocus.ts) manages menu focus, arrow navigation, Escape, and trigger focus restoration.

Use `role="status"` for non-urgent asynchronous updates and `role="alert"` for errors that require immediate notice. Every icon-only control needs an accessible name. Every pointer interaction needs an equivalent keyboard interaction.

## HTML sanitization

[`src/client/lib/sanitizeHtml.ts`](src/client/lib/sanitizeHtml.ts) exports `sanitizeEditorHtml`. The function applies a DOMPurify allowlist for editor HTML and rejects interactive or executable elements such as forms, controls, embedded objects, style elements, and SVG.

Current sanitization boundaries include:

- [`src/client/features/documentEditor/useDocumentContent.ts`](src/client/features/documentEditor/useDocumentContent.ts)
- [`src/client/features/documentEditor/TemplatePickerDialog.tsx`](src/client/features/documentEditor/TemplatePickerDialog.tsx)
- [`src/client/features/editor/useEditorState.ts`](src/client/features/editor/useEditorState.ts)
- [`src/client/features/templatePreview/templatePreviewModel.ts`](src/client/features/templatePreview/templatePreviewModel.ts)
- [`src/client/features/templates/useTemplateLibrary.ts`](src/client/features/templates/useTemplateLibrary.ts)

HTML from an API or an uploaded document must pass through `sanitizeEditorHtml` before it enters editor or preview state. React text interpolation does not need HTML sanitization.

## Status presentation

[`src/client/components/pages/StatusPage.tsx`](src/client/components/pages/StatusPage.tsx) owns the status labels and colors used by the protected `/status` route. Each uptime segment exposes its date and status as an accessible name. Mouse hover and keyboard focus both reveal the same tooltip.

The status page reports `N/A` when its history has no observations. It does not infer perfect availability from missing data.

## Verification

The focused checks are:

- [`src/client/components/indicatorAccessibility.test.tsx`](src/client/components/indicatorAccessibility.test.tsx) checks global animation, reduced-motion, and scrollbar policy.
- [`src/client/components/pages/StatusPage.test.tsx`](src/client/components/pages/StatusPage.test.tsx) checks status data, uptime names, and keyboard focus.
- [`src/client/components/Layout.accessibility.test.tsx`](src/client/components/Layout.accessibility.test.tsx) checks the mobile navigation dialog.
- [`src/client/components/ui/accessibility.test.tsx`](src/client/components/ui/accessibility.test.tsx) checks shared dialog and tab behavior.
- [`src/client/hooks/useMenuFocus.test.tsx`](src/client/hooks/useMenuFocus.test.tsx) checks shared menu keyboard behavior.
- [`src/client/lib/sanitizeHtml.test.ts`](src/client/lib/sanitizeHtml.test.ts) checks the HTML allowlist.

Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from the repository root before merging frontend changes.
