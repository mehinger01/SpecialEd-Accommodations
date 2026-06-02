# SPED Accommodation Manager

A prototype for a special education accommodation management platform. Upload IEP, 504, and BIP PDFs to automatically extract accommodation items using rule-based text parsing (no external AI). Review, approve, and manage extracted accommodations per student.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from workflow)
- `pnpm --filter @workspace/sped-app run dev` — run the frontend (port from workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- PDF parsing: `pdf-parse@1.1.1` (rule-based, no AI)
- Frontend: React + Vite + Tailwind + shadcn/ui, TanStack Query

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (students, documents, accommodations, activity_log)
- `artifacts/api-server/src/lib/pdf-parser.ts` — PDF parsing module (isolated from web layer)
- `artifacts/api-server/src/routes/` — Express route handlers (documents, students, accommodations, stats)
- `artifacts/sped-app/src/` — React frontend

## Architecture decisions

- PDF parsing is in its own module (`pdf-parser.ts`) with no Express/web imports — can be unit-tested and replaced independently.
- `pdf-parse@1.1.1` is used (not v2): v2 requires browser canvas APIs (`DOMMatrix`) that crash on Node.js startup; must import from `pdf-parse/lib/pdf-parse.js` to avoid the v1 startup test-file read.
- Documents are uploaded via native FormData (multipart) to the Express API; the generated `useUploadDocument` hook is for JSON — the frontend uses a plain `fetch` for the file upload.
- PDF parsing is triggered asynchronously (`setImmediate`) after the upload response is sent, so the client gets immediate feedback and can poll/refresh.
- Student data is synthetic/anonymized (Student A–F) — no real PII stored.

## Product

- **Dashboard**: Stats overview + recent activity feed
- **Documents**: Upload IEP/504/BIP PDFs, view parse status, filter by status
- **Document detail**: Extracted accommodations grouped by category, raw text preview, per-item review/approve
- **Students**: Directory of students with plan type, grade, case manager, accommodation count
- **Student detail**: All documents and accommodations for one student
- **Accommodations**: Master list of all accommodations filterable by category/review status

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always import pdf-parse from the lib path: `require("pdf-parse/lib/pdf-parse.js")` — importing from `"pdf-parse"` directly reads a test file on startup and crashes the server.
- After each OpenAPI spec change, run codegen before writing routes or frontend code.
- DB push must be re-run whenever schema files in `lib/db/src/schema/` change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
