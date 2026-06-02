---
name: Vite stale module cache after codegen
description: After every codegen run, Vite HMR fails to find old generated API client files until the workflow is restarted.
---

## The rule

After running `pnpm --filter @workspace/api-spec run codegen`, always restart the `artifacts/sped-app: web` workflow before checking browser console logs or considering the frontend healthy.

**Why:** Orval's `clean: true` deletes and re-creates generated files. Vite has a pre-transform cache of the old file paths. HMR pushes the update but Vite's internal resolver still tries to load the deleted/renamed path, producing "Failed to load url /@fs/…/generated/api.ts" errors. A full workflow restart clears Vite's module graph and cache.

**How to apply:** Any time codegen runs (after OpenAPI spec changes), sequence: (1) run codegen, (2) restart api-server if routes changed, (3) restart sped-app web workflow — all in parallel if api-server and codegen are independent.
