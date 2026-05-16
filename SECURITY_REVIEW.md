# Security Review – EV Made Easy

Date: 2026-05-16
Reviewer: Codex agent
Scope: Client application runtime (`src/`), build/test tooling (`package.json`), and data pipeline scripts (`scripts/`).

## Executive Summary

- **Overall risk: Moderate** for a public client-only app.
- **Immediate blocker resolved:** dependency advisory in `postcss` (XSS in CSS stringify) by forcing patched versions via npm `overrides`.
- **No direct high-risk sinks found** in app runtime code (no `dangerouslySetInnerHTML`, `eval`, auth/session/token storage, or cookie handling).
- **Primary residual risks** are supply-chain, large bundled JS size, and future regression paths if untrusted data is later rendered as markup.

## What Was Reviewed

1. Dependency metadata and lockfile outcomes.
2. Security-sensitive coding patterns in app and scripts.
3. Exploitability paths from user input through rendering and calculations.
4. Build output characteristics affecting client-side attack surface.

## Findings

### 1) Dependency vulnerability (resolved)

- `npm audit` reported a **moderate** advisory for `postcss` (`GHSA-qx2v-qp2m-jg93`) inherited via Vite’s dependency tree.
- This can become exploitable if untrusted CSS strings are processed and emitted into HTML/CSS contexts with insufficient escaping.
- **Mitigation applied:** added npm override to require `postcss` `^8.5.10`.

Status: **Resolved in this branch**.

### 2) DOM XSS surface in current app state (low)

- Manual pattern review did **not** find risky rendering sinks:
  - no `dangerouslySetInnerHTML`
  - no `innerHTML` assignments
  - no `eval`/`new Function`
- Current UI appears to render data as plain React text/props, which benefits from auto-escaping.

Status: **Low risk currently**, but guardrails recommended.

### 3) Input handling & abuse resistance (low/moderate)

- Location inputs and ZIP/city lookups are local computations (zipcodes package + static territory data), not remote queries.
- Risk of injection is currently low, but malformed/high-frequency input can still trigger excessive client compute.
- Existing debouncing helps, but no explicit rate limit or input length caps are visible at system boundary.

Status: **Low-to-moderate operational risk** (availability/UX more than confidentiality/integrity).

### 4) Supply-chain and build integrity (moderate)

- Application is heavily dependent on npm ecosystem and data-generation scripts.
- A compromised transitive package or accidental drift in source catalogs can impact both runtime output and generated territory artifacts.

Status: **Moderate ongoing risk**; needs process controls.

### 5) Large client bundle (moderate)

- Production build warning shows very large JS bundle (~4.96 MB minified).
- Bigger bundles increase parsing surface and make dependency review harder; they also lengthen user exposure windows during updates.

Status: **Moderate hardening opportunity**, not a direct vulnerability.

## Exploit Path Assessment

### Path A: Script injection via user input in UI
- **Current feasibility:** Low.
- **Why:** React escapes text, and no unsafe HTML sinks were found.
- **Regression trigger:** Introducing `dangerouslySetInnerHTML` (or third-party markdown/html renderers) without sanitization.

### Path B: CSS/Style injection through toolchain
- **Current feasibility:** Mitigated.
- **Why:** `postcss` advisory patched via override.
- **Regression trigger:** Removing override or downgrading/locking vulnerable versions.

### Path C: Supply-chain package compromise
- **Current feasibility:** Always possible in npm ecosystems.
- **Why:** many transitive dependencies and scriptable build process.
- **Impact:** build-time code execution and potentially malicious client assets.

### Path D: Data poisoning in source catalogs/pipeline inputs
- **Current feasibility:** Moderate if maintainers ingest untrusted source artifacts.
- **Impact:** incorrect territory mappings or malformed runtime JSON.
- **Current mitigations:** source validation scripts and tests are present.

## Recommended Actions (Priority Order)

1. Keep `npm audit` in CI as a required check and fail on moderate+ for runtime deps.
2. Add a defensive lint rule/policy forbidding `dangerouslySetInnerHTML` unless explicitly approved.
3. Add a minimal CSP for deployment (e.g., default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self').
4. Add subresource integrity / immutable asset caching strategy at hosting layer.
5. Reduce bundle size by code-splitting heavy views and re-checking dependency footprint.
6. Pin Node/npm versions in CI and consider lockfile integrity enforcement (`npm ci` only in CI).
7. Add periodic dependency update cadence (weekly/biweekly) with automated PRs.

## Verification Commands Run

- `npm audit --omit=dev --json`
- `npm audit --json`
- `npm ls postcss`
- `npm outdated --json`
- `rg -n "dangerouslySetInnerHTML|innerHTML|eval\(|new Function|localStorage|sessionStorage|document\.cookie|postMessage|target=\"_blank\"|fetch\(|axios|window\.location|URLSearchParams|setTimeout\(|crypto|Math\.random|zipcodes|vite" src scripts`
- `npm run test:ci`
- `npm run lint`
- `npm run build`

