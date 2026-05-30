---
name: Orval codegen barrel patch
description: Orval always regenerates lib/api-zod/src/index.ts with both Zod and TypeScript interface re-exports, causing TS2308 duplicate-export errors. A patch script removes the types line after every run.
---

## The rule

After every `orval` invocation, run `lib/api-spec/patch-zod-index.cjs` to strip the `export * from './generated/types'` line from `lib/api-zod/src/index.ts`. This is wired into the `codegen` script in `lib/api-spec/package.json`.

**Why:** Orval's `zod` output target with `schemas` configured generates `lib/api-zod/src/index.ts` that re-exports both `./generated/api` (Zod schema values) and `./generated/types` (TypeScript interfaces). Both export the same names (e.g. `CreateStudentBody`), causing TS2308. Using `export type *` still triggers TS2308 in TypeScript 5 because the type-only re-export is ambiguous with the value-carrying re-export. Removing the types barrel from the index entirely is the clean fix — the Zod schemas already carry inferred types, so the TS interface re-export is redundant.

**How to apply:** Any time you add a new endpoint/schema to `lib/api-spec/openapi.yaml` and run codegen, this patch runs automatically. Do not remove it. The `schemas` block must remain in `orval.config.ts` so Orval still generates the `generated/types` directory (without it, Orval writes a stale reference in index.ts anyway); the patch just prevents the barrel from re-exporting it.
