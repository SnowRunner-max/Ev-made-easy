# Repository Guidelines

## Project Structure & Module Organization

This repository is a client-side React + Vite app for EV charging rate comparisons. Main code lives in `src/`:

- `src/components/` UI components with co-located tests such as `PlanSelector.test.jsx`
- `src/engine/` pure rate and cost logic with `.test.js` coverage
- `src/hooks/` reusable hooks, including location and time helpers
- `src/data/` rate plans, territory lookups, service-area registries, and vehicle data
- `src/utils/` shared utilities such as Pacific Time helpers

Reference materials live in `data-sources/`, especially `data-sources/pge_source/`, `data-sources/sce_source/`, and the other provider source folders, plus `design_system/`. Build output goes to `dist/`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite dev server
- `npm run build` creates a production bundle in `dist/`
- `npm run preview` serves the production build locally
- `npm test` runs Vitest in watch mode
- `npm run test:ci` runs tests once for CI or pre-PR checks
- `npm run lint` runs ESLint on `src/`

Use `npm run test:ci && npm run lint && npm run build` before opening a PR.

## Coding Style & Naming Conventions

Follow the existing React style: functional components, hooks, ES modules, and concise pure helpers. Use PascalCase for components (`RateDisplay.jsx`), camelCase for hooks and utilities (`useCurrentRate.js`, `pacificTime.js`), and co-locate tests beside the file they cover. Match the formatting style of the file you edit.

Styling is primarily Tailwind utility classes plus shared tokens in `src/index.css`. Prefer existing CSS variables and avoid introducing one-off colors. Linting is enforced with `eslint.config.js`.

## Testing Guidelines

Vitest and React Testing Library are the standard tools. Test behavior, not implementation details. Name tests `*.test.js` for engine/utilities and `*.test.jsx` for React components. Mock time with `vi.setSystemTime()` when validating rate windows or countdown behavior.

When changing rate logic, add boundary tests for seasons, weekends, holidays, and Pacific Time transitions.

## Commit & Pull Request Guidelines

Recent history favors short, imperative commits, often with prefixes like `feat:`, `refactor:`, and `docs:`. Keep that pattern where possible, for example: `feat: add SCE provider selector`.

PRs should include a brief summary, note any affected plans/providers, link the related issue if one exists, and attach screenshots for visible UI changes. If rate data changes, cite the source workbook or tariff used.

## Rate Data Notes

Treat files in `data-sources/pge_source/` and `data-sources/sce_source/` as the source of truth. If you update `src/data/ratePlans.json` or `src/data/sceRatePlans.json`, verify every changed value against those source documents before merging.

## Large Source Files

Bulky authoritative inputs are repo-managed with Git LFS rather than ordinary Git blobs. This includes tariff PDFs, source workbooks, and pinned territory GeoJSON snapshots declared in `.gitattributes`.

When investigating rates or territory inputs, inspect `data-sources/source-catalog.json`, `data-sources/territory/source-manifest.json`, and the related README files first. Open raw binaries or large GeoJSON only when the task specifically requires source verification or regeneration. Do not treat large source directories as routine context to bulk-read or index.
