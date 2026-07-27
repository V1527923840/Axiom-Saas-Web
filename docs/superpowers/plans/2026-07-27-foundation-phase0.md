# Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the cross-cutting foundation (one response envelope, OpenAPI codegen pipeline, slim `lib/api.ts`, Cypress scaffolding, docs) on both `Axiom-Saas-Server` and `Axiom-Saas-Web`. Phases 1–4 (per-module migrations) get their own plans.

**Architecture:** Server adds a global `ResponseEnvelopeInterceptor` + `PaginationQueryDto` base class; web generates types from server's Swagger output via `openapi-typescript`, replaces its hand-rolled `lib/api.ts`, and adds Cypress + `data-testid`. Both repos adopt the shared `feature/vX.Y.Z` branch model.

**Tech Stack:**
- Server: NestJS 11, TypeScript 5.9, TypeORM 0.3, Mongoose 9, class-validator
- Web: Vite 7.3, React 19.2, TypeScript 5.9, Zod 4.3, Cypress (new)
- New deps (web): `openapi-typescript@^7.x`, `cypress@^13.x`
- New deps (server): none (uses `@nestjs/swagger` already in repo)

## Global Constraints

These come from the spec at `docs/integration-standards.md` (canonical: `docs/superpowers/specs/2026-07-27-integration-standards-design.md`). Every task's requirements implicitly include this section.

- **Response envelope:** every successful response is `{ data: T, meta?: { total, page, pageSize }, message?: string }`. Status codes carry success/failure; the body never wraps in `{ success: ... }`.
- **Server pagination cap:** `pageSize ≤ 100`, defaults to `page=1, pageSize=10`. No per-controller cap.
- **Server filter DTOs:** every list controller takes a typed `<Feature>QueryDto extends PaginationQueryDto`. No raw `@Query()` parameter sprawl.
- **Server response wrapping:** controllers do not wrap responses — the interceptor handles it. No `{ success, data }` returns.
- **Web API access:** one canonical pattern. Default is `src/features/<f>/services/<f>-api.ts`; cross-cutting (`auth`, `content`, `menus`, `roles`) at `src/services/`.
- **Web mapper convention:** every feature has `src/features/<f>/mappers/api-to-domain.ts` with pure DTO→domain functions. Hooks call the service, not `lib/api.ts` directly.
- **Web token injection:** automatic from `localStorage.auth_token` via `lib/api.ts`. Callers do not pass tokens.
- **Web `data-testid`:** every interactive element findable by Cypress tests gets `data-testid="..."`.
- **Web `api.d.ts`:** committed to git. Generated from server's `docs/swagger.json`. CI runs `npm run api:check` to enforce freshness.
- **Git model (both repos):** `main ← feature/vX.Y.Z ← commits`. PR to `main` only after user acceptance testing. Version number shared across both repos.
- **Commit format:** `type(scope): description`. `type` ∈ `{feat, fix, refactor, docs, chore, test, perf}`. Subject ≤72 chars, imperative mood, body explains why.
- **Cross-repo contract changes:** a server commit that changes the contract is followed in the same cycle by a web commit that regenerates `api.d.ts` and updates affected mappers. Both land under the same `feature/vX.Y.Z` branch but on different repos.
- **Out of scope (Phase 0):** schema changes, state library swaps, UI library swaps, build tooling swaps, monorepo conversion, real-time layer, observability.

## Working Directory Conventions

Both repos in this plan live under `/Users/liangfeifan/work/Axiom/`. In every shell step:

```bash
# Server
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server

# Web
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
```

The server is built and run with `npm`. The web uses `pnpm`. Don't mix.

---

## Branch Setup (start here, before any code task)

**Why:** Phase 0 lives on `feature/v1.0.0` on both repos. We open that branch first so every commit below lands there, not on `main`.

### Step 1: Open `feature/v1.0.0` on both repos

```bash
# Server
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
git checkout -b feature/v1.0.0

# Web
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
git checkout -b feature/v1.0.0
```

Expected: both repos now on branch `feature/v1.0.0`, working tree clean.

---

# Part A — Server

## Task 1: Add `PaginationQueryDto` base class

**Files:**
- Create: `src/common/dto/pagination-query.dto.ts`

**Interfaces:**
- Consumes: nothing (leaf)
- Produces: `class PaginationQueryDto { page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC' }` — validators applied.

- [ ] **Step 1: Create the file**

```typescript
// src/common/dto/pagination-query.dto.ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server && npx tsc --noEmit -p tsconfig.json`
Expected: exit code 0, no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
git add src/common/dto/pagination-query.dto.ts
git commit -m "feat(common): add PaginationQueryDto base class"
```

---

## Task 2: Migrate `TransformResponseInterceptor` to nest pagination under `meta`

**Why this task:** The server already has a global `TransformResponseInterceptor` (at `src/utils/interceptors/transform-response.interceptor.ts`) that produces the existing `{ data, total, page, pageSize }` envelope. The new spec nests pagination under `meta` instead. We MIGRATE the existing interceptor — do not create a parallel `ResponseEnvelopeInterceptor`.

**Files:**
- Modify: `src/utils/interceptors/transform-response.interceptor.ts`
- Modify: `src/main.ts` (rename the registration only if it still says `TransformResponseInterceptor` — should stay)

**Interfaces:**
- Consumes: controller return values (paginated `{ data, total, page, limit }`, plain value, or already-enveloped `{ data, message }`)
- Produces: a normalized `{ data, meta?: { total, page, pageSize }, message? }` object

- [ ] **Step 1: Read the current interceptor**

Run: `cat /Users/liangfeifan/work/Axiom/Axiom-Saas-Server/src/utils/interceptors/transform-response.interceptor.ts`

- [ ] **Step 2: Replace its contents**

Replace the entire file with:

```typescript
// src/utils/interceptors/transform-response.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EnvelopeResponse<T> {
  data: T;
  meta?: { total: number; page: number; pageSize: number };
  message?: string;
}

interface PaginatedPayload<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface AlreadyEnvelopedPayload {
  data: unknown;
  message?: string;
  [key: string]: unknown;
}

function isPaginated(value: unknown): value is PaginatedPayload<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.data) &&
    typeof v.total === 'number' &&
    typeof v.page === 'number' &&
    typeof v.limit === 'number'
  );
}

function isAlreadyEnveloped(value: unknown): value is AlreadyEnvelopedPayload {
  if (typeof value !== 'object' || value === null) return false;
  return 'data' in (value as Record<string, unknown>);
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, EnvelopeResponse<T>>
{
  intercept(
    _: ExecutionContext,
    next: CallHandler,
  ): Observable<EnvelopeResponse<T>> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload === null || payload === undefined) {
          return { data: payload as T };
        }
        if (isPaginated(payload)) {
          return {
            data: payload.data as T,
            meta: {
              total: payload.total,
              page: payload.page,
              pageSize: payload.limit,
            },
          };
        }
        if (isAlreadyEnveloped(payload)) {
          // Pass through { data, message } shapes (controllers that explicitly return message).
          return {
            data: payload.data as T,
            message: payload.message,
          };
        }
        return { data: payload as T };
      }),
    );
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server && npx tsc --noEmit -p tsconfig.json`
Expected: exit code 0, no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
git add src/utils/interceptors/transform-response.interceptor.ts
git commit -m "refactor(envelope): nest pagination under meta

Migrates the existing TransformResponseInterceptor from top-level
{ data, total, page, pageSize } to the spec's { data, meta?: {...} }
envelope. This is a breaking change for the web client — web's
lib/api.ts is being updated in lockstep under feature/v1.0.0."
```

---

## Task 3: Add Swagger JSON export

**Why this task:** The global `TransformResponseInterceptor` is already registered in `main.ts` (Task 2 migrated it). The Swagger document is already created via `SwaggerModule.createDocument(app, options)`. The only addition is writing that document to `docs/swagger.json` so the web repo can read it for codegen.

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: the existing `document` from `SwaggerModule.createDocument(app, options)`
- Produces: `docs/swagger.json` exists on disk after server boot; the spec is committed in git

- [ ] **Step 1: Read current `main.ts`**

Run: `cat /Users/liangfeifan/work/Axiom/Axiom-Saas-Server/src/main.ts`

Confirm `TransformResponseInterceptor` is registered globally and `SwaggerModule.createDocument` runs.

- [ ] **Step 2: Add ESM imports for `fs` and `path`**

At the top of `main.ts`, alongside the existing imports, add:

```typescript
import * as fs from 'fs';
import * as path from 'path';
```

(Use ESM imports — `main.ts` is TypeScript with `module: commonjs` in `tsconfig.json`, but the runtime is Node.js and `import * as fs from 'fs'` is the idiomatic style. Do NOT use `require('fs')` inline.)

- [ ] **Step 3: Capture the document into a variable and write to disk**

Find the line `const document = SwaggerModule.createDocument(app, options);`. After the existing `SwaggerModule.setup('docs', app, document);` call, add:

```typescript
  // Export the raw OpenAPI spec to disk on bootstrap for client-side codegen.
  const outDir = path.resolve(process.cwd(), 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'swagger.json'),
    JSON.stringify(document, null, 2),
  );
```

- [ ] **Step 4: Verify the app still boots and the envelope shape is correct**

Run:
```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
timeout 20 npm run start:dev &
SERVER_PID=$!
sleep 10
echo "=== /api/v1/users ==="
curl -s http://localhost:3000/api/v1/users | head -c 600
echo
echo "=== /api/docs-json status ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/docs-json
echo
kill $SERVER_PID 2>/dev/null || true
wait 2>/dev/null || true
```

Expected:
- `/api/v1/users` returns `{ "data": [...], "meta": { "total": ..., "page": 1, "pageSize": ... } }` — note `meta` (not top-level `total/page/pageSize`)
- `/api/docs-json` returns `200`

- [ ] **Step 5: Verify `swagger.json` was written**

Run: `ls -la /Users/liangfeifan/work/Axiom/Axiom-Saas-Server/docs/swagger.json`
Expected: file exists, size > 10 KB.

- [ ] **Step 6: Add `.gitignore` entry (only ignore local caches; keep `swagger.json` tracked)**

Open `docs/.gitignore` if it exists, or create it with:

```
# keep swagger.json tracked; ignore local caches only
*.cache
```

(We deliberately do **not** add `docs/swagger.json` to `.gitignore`. The web repo's CI reads this file.)

- [ ] **Step 7: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
git add src/main.ts docs/swagger.json docs/.gitignore
git commit -m "feat(main): export OpenAPI spec to docs/swagger.json

Document is already created via SwaggerModule.createDocument. Now
writes it to docs/swagger.json on bootstrap so the web repo's
codegen pipeline can read it. swagger.json is committed (not
gitignored) so web's CI can run api:check without a live server."
```

---

## Task 4: Migrate every list controller to typed query DTOs

**Files:**
- Modify: every controller that has a list endpoint with raw `@Query()` params
- The current candidates (from spec exploration): `users.controller.ts`, `plans.controller.ts`, `bills/flows.controller.ts` (if exists), `bills/consumptions.controller.ts` (if exists), `roles.controller.ts`, `menus.controller.ts`, and any other module with `@Get()` + `@Query()`.

**Interfaces:**
- Consumes: `PaginationQueryDto` from Task 1, per-feature filter DTOs (we'll create them inline)
- Produces: every list endpoint accepts a typed DTO; controllers no longer set pagination cap manually

- [ ] **Step 1: Inventory list controllers**

Run:
```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
grep -rln "@Query" src/ --include="*.controller.ts"
```

Expected: a list of controller files. Each one needs a `<Feature>QueryDto` (either new or existing).

- [ ] **Step 2: For each controller, create or extend `<Feature>QueryDto`**

Example for `users`:

```typescript
// src/users/dto/query-user.dto.ts
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IsOptional, IsString } from 'class-validator';

export class QueryUserDto extends PaginationQueryDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsString() search?: string;
}
```

If a `query-<feature>.dto.ts` already exists, edit it to extend `PaginationQueryDto` and remove the inline `page`, `limit`, `sortBy`, `sortOrder` properties (now inherited).

Repeat this for each controller in the inventory list.

- [ ] **Step 3: For each controller, refactor the list endpoint signature**

Before:
```typescript
@Get()
async findAll(
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  @Query('role') role?: string,
  // ... more raw @Query params
) {
  let limitNum = limit ?? 10;
  if (limitNum > 50) limitNum = 50;
  // ...
}
```

After:
```typescript
@Get()
async findAll(@Query() query: QueryUserDto) {
  const page = query.page ?? 1;
  const limit = query.pageSize ?? 10;
  // The 50/100 cap is enforced by the DTO; no manual clamp here.
  // ...
}
```

Repeat for every list endpoint in the inventory list.

- [ ] **Step 4: Remove controller-side response wrapping**

In every controller, look for any code like:

```typescript
return { success: true, data: ..., message: '...' };
```

Replace with:

```typescript
return ...; // bare return value; the interceptor wraps it
```

The interceptor handles all envelope concerns. If a controller truly needs `message`, return `{ data: ..., message: '...' }` directly — the interceptor's `isAlreadyEnveloped` branch passes it through.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server && npx tsc --noEmit -p tsconfig.json`
Expected: exit code 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
git add src/
git commit -m "refactor(controllers): migrate list endpoints to typed query DTOs

All list controllers now take a typed <Feature>QueryDto extending
PaginationQueryDto. Pagination cap centralized to 100 in the DTO;
controllers no longer clamp manually. Response wrapping removed —
the global ResponseEnvelopeInterceptor handles envelope concerns."
```

---

## Task 5: Add contract test

**Files:**
- Create: `test/contract/contract.spec.ts`

**Interfaces:**
- Consumes: server boot, `/api/docs-json` endpoint
- Produces: a passing test that fails if the OpenAPI document is missing, invalid JSON, or missing key schemas (`User`, `Plan`, `Role`, `Menu`, `PaymentFlow`, `Consumption`)

- [ ] **Step 1: Create the directory and file**

```typescript
// test/contract/contract.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('OpenAPI contract', () => {
  let app: INestApplication;
  let spec: Record<string, unknown>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer()).get('/api/docs-json');
    spec = response.body as Record<string, unknown>;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a valid OpenAPI document', () => {
    expect(spec).toBeDefined();
    expect(typeof spec.openapi).toBe('string');
    expect(spec.openapi).toMatch(/^3\./);
  });

  it('declares all critical domain schemas', () => {
    const schemas = (spec.components as { schemas: Record<string, unknown> })
      ?.schemas;
    expect(schemas).toBeDefined();
    for (const name of ['User', 'Plan', 'Role', 'Menu', 'PaymentFlow', 'Consumption']) {
      expect(schemas[name]).toBeDefined();
    }
  });

  it('exposes versioned paths under /api/v1', () => {
    const paths = spec.paths as Record<string, unknown>;
    expect(paths).toBeDefined();
    const v1Paths = Object.keys(paths).filter((p) => p.startsWith('/api/v1'));
    expect(v1Paths.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server && npm test -- test/contract/contract.spec.ts`
Expected: 3 passing tests. If any fail, check that `AppModule` boots in the test environment (likely needs the same env-setup as the existing `test/` files — look at how `app.e2e-spec.ts` is set up and mirror its bootstrap).

- [ ] **Step 3: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
git add test/contract/contract.spec.ts
git commit -m "test(contract): assert OpenAPI document exposes required schemas"
```

---

## Task 6: Server-side docs and PR template

**Files:**
- Create: `docs/integration.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: the master spec at `docs/integration-standards.md`
- Produces: per-repo docs that point to the spec and document the cross-repo workflow

- [ ] **Step 1: Write `docs/integration.md`**

```markdown
# Cross-Repo Integration

This repo (`Axiom-Saas-Server`) and `Axiom-Saas-Web` share an API contract and a release version.

## Version model

Both repos maintain a `feature/vX.Y.Z` branch in lockstep. The version number is shared — server v1.0.0 and web v1.0.0 always ship together.

```
server main
  └─ feature/v1.0.0   ← server commits land here

web main
  └─ feature/v1.0.0   ← web commits land here

After user acceptance testing: both PR to their respective main, both tagged v1.0.0.
```

## Contract source

Server's Swagger spec is the single source of truth. Generated at:

- `docs/swagger.json` (this repo, committed)
- `GET /api/docs-json` (live, while server runs)

The web repo regenerates its `src/types/api.d.ts` from this file on every contract change.

## Cross-repo coordination rule

When a server PR changes the contract:

1. PR title and description include `BREAKING CHANGE:` footer if applicable.
2. PR description links the corresponding web PR number (or PR URL).
3. Both PRs land under the same `feature/vX.Y.Z` branch on their respective repos.
4. CI does not gate one repo on the other — each runs independently. Coordination is by PR description.

## References

- Master spec: `docs/integration-standards.md`
- Conventions: `CLAUDE.md`
```

- [ ] **Step 2: Write `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## Version target
<!-- Which feature/vX.Y.Z branch? Both repos if applicable -->

## What's in this PR
<!-- Bullet list of commits / changes since last version -->

## Cross-repo coordination
<!-- Server contract changes? Web PR # to consume? -->

## Testing done
<!-- Manual / automated / user acceptance -->

## Rollback plan
<!-- How to revert if needed -->
```

- [ ] **Step 3: Write `CONTRIBUTING.md`**

```markdown
# Contributing

## Branch model

`main` is always deployable. New work happens on `feature/vX.Y.Z` branches. PR to `main` only after user acceptance testing.

## Commit messages

Conventional Commits. `type(scope): description`. Subject ≤72 chars, imperative mood.

```
feat(users): add subscription fields
fix(bills/flows): correct pagination meta
refactor(envelope): remove controller-side wrapping
```

## Cross-repo coordination

This repo's contract is consumed by `Axiom-Saas-Web`. See `docs/integration.md`.

## Local checks

```bash
npm run lint
npm test
npm run build
```

## Reference

- Architecture: `CLAUDE.md`
- Cross-repo spec: `docs/integration-standards.md`
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
git add docs/integration.md .github/PULL_REQUEST_TEMPLATE.md CONTRIBUTING.md
git commit -m "docs: add cross-repo integration guide, PR template, contributing guide"
```

---

# Part B — Web

## Task 7: Install `openapi-typescript` and generate initial `api.d.ts`

**Files:**
- Modify: `package.json`
- Create: `src/types/api.d.ts` (auto-generated; we commit the first cut)

**Interfaces:**
- Consumes: server's `docs/swagger.json` (must exist after Task 3)
- Produces: `src/types/api.d.ts` with full typed paths, components, operations

- [ ] **Step 1: Install `openapi-typescript`**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web && pnpm add -D openapi-typescript@^7`

Expected: package.json updated, `node_modules/openapi-typescript/` populated.

- [ ] **Step 2: Add scripts to `package.json`**

Open `package.json` and add to `scripts`:

```json
{
  "api:generate": "openapi-typescript ../Axiom-Saas-Server/docs/swagger.json -o src/types/api.d.ts",
  "api:check": "openapi-typescript ../Axiom-Saas-Server/docs/swagger.json -o src/types/api.d.ts --check"
}
```

If a `prebuild` or `predev` script exists, leave it alone — these are independent.

- [ ] **Step 3: Generate the initial `api.d.ts`**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web && npm run api:generate`
Expected: file written to `src/types/api.d.ts`. Output ends with "Wrote .../src/types/api.d.ts".

- [ ] **Step 4: Verify the file looks right**

Run: `head -20 /Users/liangfeifan/work/Axiom/Axiom-Saas-Web/src/types/api.d.ts`
Expected: contains `export interface paths`, `export interface components`, `export interface operations`.

- [ ] **Step 5: Verify TypeScript compiles (it shouldn't be imported yet, but check)**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web && pnpm tsc --noEmit -p tsconfig.app.json`
Expected: exit code 0. (The generated file should be picked up via no special import — it's ambient.)

- [ ] **Step 6: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
git add package.json pnpm-lock.yaml src/types/api.d.ts
git commit -m "feat(codegen): install openapi-typescript and generate initial api.d.ts"
```

---

## Task 8: Replace `src/lib/api.ts` with thin type-safe wrapper

**Files:**
- Modify: `src/lib/api.ts`

**Interfaces:**
- Consumes: `paths` and `components` from `src/types/api.d.ts`
- Produces: a small API client (≈80 lines) with one envelope parse, auto-token injection, typed error handling. No `WrappedResponse`. No `unwrapResponse`. No `as any` for envelope handling.

- [ ] **Step 1: Write the new `lib/api.ts`**

Replace the entire contents of `src/lib/api.ts` with:

```typescript
// src/lib/api.ts
import type { components } from "@/types/api"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"

export type ApiResponse<T> = {
  data: T
  meta?: components["schemas"]["PaginationMetaDto"]
}

export class ApiRequestError extends Error {
  statusCode: number
  code: string
  constructor(message: string, statusCode: number, code = "API_ERROR") {
    super(message)
    this.name = "ApiRequestError"
    this.statusCode = statusCode
    this.code = code
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

interface RequestOptions {
  token?: string
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

function getAuthToken(explicitToken?: string): string | undefined {
  if (explicitToken) return explicitToken
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token") || undefined
  }
  return undefined
}

function buildQueryString(
  params?: Record<string, string | number | boolean | undefined>,
): string {
  if (!params) return ""
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

async function request<T>(
  endpoint: string,
  options: RequestInit & RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { token, params, body, ...fetchOptions } = options
  const authToken = token || getAuthToken()

  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const url = `${API_BASE_URL}${endpoint}${buildQueryString(params)}`

  let response: Response
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiRequestError("Network error", 0, "NETWORK_ERROR")
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    let errorCode = "API_ERROR"
    if (response.headers.get("content-type")?.includes("application/json")) {
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
        errorCode = errorData.code || errorCode
      } catch {
        /* fall through */
      }
    }
    if (response.status === 401) {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_refresh_token")
      window.location.href = "/auth/sign-in"
      throw new UnauthorizedError(errorMessage)
    }
    throw new ApiRequestError(errorMessage, response.status, errorCode)
  }

  if (response.status === 204) {
    return {} as ApiResponse<T>
  }

  const json = await response.json()
  // Single envelope: { data, meta?, message? }. No auto-unwrap needed.
  return json as ApiResponse<T>
}

export async function get<T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "GET", ...options })
}

export async function post<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "POST", body: data, ...options })
}

export async function put<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "PUT", body: data, ...options })
}

export async function patch<T>(
  endpoint: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "PATCH", body: data, ...options })
}

export async function del<T>(
  endpoint: string,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(endpoint, { method: "DELETE", ...options })
}

export function createCrudApi<T>(
  endpoint: string,
  options: RequestOptions = {},
) {
  return {
    getAll: (params?: Record<string, string | number | boolean | undefined>) =>
      get<T[]>(endpoint, { ...options, params }),
    getOne: (id: string) => get<T>(`${endpoint}/${id}`, options),
    create: (data: unknown) => post<T>(endpoint, data, options),
    update: (id: string, data: unknown) =>
      put<T>(`${endpoint}/${id}`, data, options),
    patch: (id: string, data: unknown) =>
      patch<T>(`${endpoint}/${id}`, data, options),
    delete: (id: string) => del<T>(`${endpoint}/${id}`, options),
  }
}

export { API_BASE_URL }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web && pnpm tsc --noEmit -p tsconfig.app.json`
Expected: exit code 0. Existing call sites (auth, content) keep working because the public API (`get`, `post`, `put`, `patch`, `del`, `createCrudApi`) is unchanged in shape.

- [ ] **Step 3: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
git add src/lib/api.ts
git commit -m "refactor(api): drop auto-unwrap, single envelope, ~80 lines

Server now returns one envelope ({ data, meta?, message? }) via
ResponseEnvelopeInterceptor. Web's lib/api.ts no longer needs to
unwrap { success, data } — that's why this file shrinks from ~300
to ~80 lines. Public API surface unchanged; existing call sites
continue to work."
```

---

## Task 9: Migrate `src/services/auth.ts` and `src/services/content.ts` to new envelope

**Files:**
- Modify: `src/services/auth.ts`
- Modify: `src/services/content.ts`

**Interfaces:**
- Consumes: new `lib/api.ts` from Task 8, `src/types/api.d.ts` from Task 7
- Produces: services typed against generated components; no more `(response.data as any)` for envelope handling

- [ ] **Step 1: Update `src/services/auth.ts`**

Replace the file with:

```typescript
// src/services/auth.ts
import { get, post } from "@/lib/api"
import type { components } from "@/types/api"

type UserDto = components["schemas"]["User"]
type LoginResponseDto = components["schemas"]["LoginResponse"]

export interface LoginResponse {
  token: string
  refreshToken: string
  tokenExpires: number
  user: UserDto
}

export const authApi = {
  login: (email: string, password: string) =>
    post<LoginResponseDto>("/v1/auth/email/login", { email, password }),

  register: (firstName: string, lastName: string, email: string, password: string) =>
    post<void>("/v1/auth/email/register", { firstName, lastName, email, password }),

  getMe: (token: string) => get<UserDto>("/v1/auth/me", { token }),

  refresh: (refreshToken: string) =>
    post<LoginResponseDto>("/v1/auth/refresh", {}, { token: refreshToken }),

  logout: (token: string) =>
    post<void>("/v1/auth/logout", {}, { token }),
}
```

- [ ] **Step 2: Update `src/services/content.ts`**

Replace the file with:

```typescript
// src/services/content.ts
import { get } from "@/lib/api"
import type { components } from "@/types/api"

type ContentCategoryDto = components["schemas"]["ContentCategory"]
type AudioInterpretationItemDto =
  components["schemas"]["AudioInterpretationItem"]
type PaginatedAudioInterpretationDto =
  components["schemas"]["PaginatedAudioInterpretation"]

export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export const contentApi = {
  getCategories: () =>
    get<ContentCategoryDto[]>("/v1/content/categories"),

  getAudioInterpretation: (page: number, pageSize: number): Promise<ListResponse<AudioInterpretationItemDto>> =>
    get<PaginatedAudioInterpretationDto>(
      `/v1/content/audio-interpretation`,
      { params: { page, pageSize } },
    ).then((response) => ({
      data: Array.isArray(response.data) ? response.data : [],
      total: response.meta?.total ?? 0,
      page: response.meta?.page ?? page,
      pageSize: response.meta?.pageSize ?? pageSize,
    })),
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web && pnpm tsc --noEmit -p tsconfig.app.json`
Expected: exit code 0. If a schema name doesn't match the server's exact name (e.g., server emits `LoginResponseDto` not `LoginResponse`), TypeScript will tell you — adjust the schema names in the `components["schemas"][...]` lookups to match what's in `api.d.ts`.

- [ ] **Step 4: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
git add src/services/auth.ts src/services/content.ts
git commit -m "refactor(services): type auth and content against generated api.d.ts

Drop manual response casts and hand-written envelope handling.
Both services now use components['schemas'][...] from the
generated OpenAPI types. New envelope ({ data, meta? }) means
no more 'response.data.data' defensive reads."
```

---

## Task 10: Install Cypress + base config

**Files:**
- Modify: `package.json`
- Create: `cypress.config.ts`
- Create: `cypress/support/e2e.ts`
- Create: `cypress/support/commands.ts`
- Create: `tsconfig.json` (extend for Cypress types)
- Create: `.gitignore` entries for Cypress artifacts

**Interfaces:**
- Consumes: nothing (foundation)
- Produces: a runnable Cypress setup with a `dataTestId` custom command and a working login command

- [ ] **Step 1: Install Cypress**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web && pnpm add -D cypress@^13 @testing-library/cypress@^10`

- [ ] **Step 2: Create `cypress.config.ts`**

```typescript
// cypress.config.ts
import { defineConfig } from "cypress"

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      return config
    },
  },
})
```

- [ ] **Step 3: Create `cypress/support/e2e.ts`**

```typescript
// cypress/support/e2e.ts
import "./commands"
```

- [ ] **Step 4: Create `cypress/support/commands.ts`**

```typescript
// cypress/support/commands.ts
/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      dataTestId(value: string): Chainable<JQuery<HTMLElement>>
      login(email: string, password: string): Chainable<void>
      logout(): Chainable<void>
    }
  }
}

Cypress.Commands.add("dataTestId", (value: string) =>
  cy.get(`[data-testid="${value}"]`),
)

Cypress.Commands.add(
  "login",
  (email: string, password: string) => {
    cy.visit("/auth/sign-in")
    cy.dataTestId("email-input").type(email)
    cy.dataTestId("password-input").type(password)
    cy.dataTestId("sign-in-button").click()
    cy.url().should("include", "/dashboard")
  },
)

Cypress.Commands.add("logout", () => {
  cy.dataTestId("user-menu").click()
  cy.dataTestId("logout-button").click()
  cy.url().should("include", "/auth/sign-in")
})
```

- [ ] **Step 5: Add Cypress `tsconfig`**

Create `cypress/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["cypress", "@testing-library/cypress"]
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 6: Add scripts to `package.json`**

Add to `scripts`:

```json
{
  "test:e2e": "cypress run",
  "test:e2e:open": "cypress open",
  "cypress": "cypress open"
}
```

- [ ] **Step 7: Add `.gitignore` entries**

Open `.gitignore` and add:

```
# Cypress
cypress/videos/
cypress/screenshots/
cypress/downloads/
```

- [ ] **Step 8: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
git add package.json pnpm-lock.yaml cypress.config.ts cypress/ tsconfig.json .gitignore
git commit -m "test(e2e): install Cypress + base config + custom commands

Adds Cypress 13 with custom commands (dataTestId, login, logout).
dataTestId convention is now the standard selector — every
interactive element findable by tests gets data-testid=\"...\".
Cypress types live under cypress/tsconfig.json."
```

---

## Task 11: Add first Cypress E2E — auth sign-in

**Files:**
- Create: `cypress/e2e/auth/sign-in.cy.ts`
- Modify: `src/features/auth/sign-in/page.tsx` (or wherever the sign-in form lives) — add `data-testid` to the form inputs and submit button

**Interfaces:**
- Consumes: `cy.login()` command from Task 10
- Produces: a passing E2E spec that exercises the sign-in flow

- [ ] **Step 1: Find the sign-in page component**

Run:
```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
grep -rln "Sign In\|sign-in\|signIn" src/features/auth --include="*.tsx" | head -5
```

Identify the form component. Open it.

- [ ] **Step 2: Add `data-testid` attributes**

In the email input, password input, and submit button JSX, add `data-testid`. Example:

```tsx
<Input
  data-testid="email-input"
  type="email"
  {...register("email")}
/>
<Input
  data-testid="password-input"
  type="password"
  {...register("password")}
/>
<Button data-testid="sign-in-button" type="submit">
  Sign in
</Button>
```

Adjust attribute names if the existing components use different prop conventions.

- [ ] **Step 3: Write the E2E spec**

```typescript
// cypress/e2e/auth/sign-in.cy.ts
describe("Auth — Sign In", () => {
  it("rejects invalid credentials", () => {
    cy.visit("/auth/sign-in")
    cy.dataTestId("email-input").type("wrong@example.com")
    cy.dataTestId("password-input").type("wrong-password")
    cy.dataTestId("sign-in-button").click()
    cy.dataTestId("error-message").should("be.visible")
    cy.url().should("include", "/auth/sign-in")
  })

  it("accepts valid credentials and lands on dashboard", () => {
    // Assumes server is running with seeded test users.
    cy.login("admin@example.com", "password")
    cy.url().should("include", "/dashboard")
  })
})
```

If the server isn't easily bootable from Cypress, mark the second test as `.skip` with a comment explaining how to run it.

- [ ] **Step 4: Verify the spec runs (smoke check)**

Run: `cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web && pnpm dev &` then `sleep 5 && pnpm cypress run --spec cypress/e2e/auth/sign-in.cy.ts --headless && kill %1`
Expected: at least the "rejects invalid credentials" spec passes. The valid-credentials spec may skip if no server is running — that's OK for Phase 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
git add src/features/auth/ cypress/e2e/auth/sign-in.cy.ts
git commit -m "test(e2e): add first Cypress spec for auth sign-in + data-testid"
```

---

## Task 12: Web-side docs and PR template

**Files:**
- Create: `docs/integration.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `CONTRIBUTING.md`

**Interfaces:**
- Consumes: the master spec
- Produces: per-repo docs pointing to the spec

- [ ] **Step 1: Write `docs/integration.md`**

```markdown
# Cross-Repo Integration

This repo (`Axiom-Saas-Web`) and `Axiom-Saas-Server` share an API contract and a release version.

## Version model

Both repos maintain a `feature/vX.Y.Z` branch in lockstep. The version number is shared — server v1.0.0 and web v1.0.0 always ship together.

```
server main
  └─ feature/v1.0.0   ← server commits land here

web main
  └─ feature/v1.0.0   ← web commits land here

After user acceptance testing: both PR to their respective main, both tagged v1.0.0.
```

## Contract consumer

The web repo does not own the API contract. It consumes server's Swagger:

- Source: `../Axiom-Saas-Server/docs/swagger.json` (committed in server repo)
- Generated: `src/types/api.d.ts` (committed in this repo)
- CI: `npm run api:check` — fails the PR if `api.d.ts` is stale

When server's contract changes:

1. Server PR includes `BREAKING CHANGE:` footer if applicable.
2. Web PR in the same `feature/vX.Y.Z` cycle runs `npm run api:generate` and updates affected mappers/services.
3. Both PRs land in their respective repos before either merges to `main`.

## API access pattern

- Default: each feature owns its service at `src/features/<f>/services/<f>-api.ts`.
- Cross-cutting (auth, content, menus, roles): `src/services/<f>.ts`.
- Hooks call services, not `lib/api.ts` directly.
- Mappers (`src/features/<f>/mappers/api-to-domain.ts`) translate DTO → domain. Pure functions.

## References

- Master spec: `docs/integration-standards.md`
- Conventions: `CLAUDE.md`
```

- [ ] **Step 2: Write `.github/PULL_REQUEST_TEMPLATE.md`**

(Same as server — copy the contents from `docs/integration-standards.md` Section 7.5.)

- [ ] **Step 3: Write `CONTRIBUTING.md`**

```markdown
# Contributing

## Branch model

`main` is always deployable. New work happens on `feature/vX.Y.Z` branches. PR to `main` only after user acceptance testing.

## Commit messages

Conventional Commits. `type(scope): description`. Subject ≤72 chars, imperative mood.

```
feat(codegen): install openapi-typescript
fix(api): drop auto-unwrap from lib/api.ts
test(e2e): add Cypress spec for auth sign-in
```

## Cross-repo coordination

This repo consumes `Axiom-Saas-Server`'s contract. See `docs/integration.md`. After server-side contract changes, regenerate types and update mappers.

## Local checks

```bash
pnpm lint
pnpm tsc --noEmit -p tsconfig.app.json
pnpm api:check
pnpm test
pnpm build
```

## Reference

- Architecture: `CLAUDE.md`
- Cross-repo spec: `docs/integration-standards.md`
```

- [ ] **Step 4: Commit**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
git add docs/integration.md .github/PULL_REQUEST_TEMPLATE.md CONTRIBUTING.md
git commit -m "docs: add cross-repo integration guide, PR template, contributing guide"
```

---

# Part C — Cross-repo verification

## Task 13: Verify both repos are coherent

**Why:** Phase 0 is only "done" when both repos' foundations work together. End-to-end smoke check.

- [ ] **Step 1: Server builds and exports swagger.json**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Server
npm run build
ls docs/swagger.json
```

Expected: build exits 0; `docs/swagger.json` exists.

- [ ] **Step 2: Web regenerates `api.d.ts` from server's swagger**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
npm run api:check
```

Expected: exit code 0 (already-generated file matches server's spec). If it fails with a diff, the spec has drifted — run `npm run api:generate` and commit the new `api.d.ts`.

- [ ] **Step 3: Web lint + type-check + build all pass**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
pnpm lint
pnpm tsc --noEmit -p tsconfig.app.json
pnpm build
```

Expected: all exit 0.

- [ ] **Step 4: Confirm no `as any` regressions**

```bash
cd /Users/liangfeifan/work/Axiom/Axiom-Saas-Web
grep -rn "as any" src/lib/ src/services/ src/features/ | wc -l
```

Expected: small number (Phase 0 only — should be near zero). Phase 1+ plans will reduce this further as modules get typed.

- [ ] **Step 5: Tag the cycle**

Wait for user acceptance testing before tagging. Don't tag prematurely.

---

## Done Criteria for Phase 0

Phase 0 ships when all of the following are true:

- [ ] Server: `ResponseEnvelopeInterceptor` registered; every list controller takes typed DTOs
- [ ] Server: `docs/swagger.json` exists and is committed
- [ ] Server: `test/contract/contract.spec.ts` passes
- [ ] Server: PR template, `CONTRIBUTING.md`, `docs/integration.md` committed
- [ ] Web: `openapi-typescript` installed; `src/types/api.d.ts` committed; `api:check` script present
- [ ] Web: `lib/api.ts` is the new thin wrapper (~80 lines)
- [ ] Web: `src/services/auth.ts` and `src/services/content.ts` use generated types
- [ ] Web: Cypress installed; `cypress.config.ts`, `support/commands.ts`, `cypress/e2e/auth/sign-in.cy.ts` committed
- [ ] Web: PR template, `CONTRIBUTING.md`, `docs/integration.md` committed
- [ ] Both: `feature/v1.0.0` branch exists on both repos; all commits from Phase 0 land there
- [ ] Both: build + lint + type-check + tests pass

User acceptance testing follows. After approval, both repos PR `feature/v1.0.0` → `main` and tag `v1.0.0`.

---

## What Comes Next (Phase 1+)

This plan covers Phase 0 only. Subsequent phases will be separate plans:

- **Phase 1:** users, bills/flows, bills/consumptions (full service/mapper/hook refactor + Cypress specs)
- **Phase 2:** plans, subscriptions, roles, menus
- **Phase 3:** content, categories, etl, parse-tasks, versions
- **Phase 4:** scrape-log, oss-browser, files, auth-social

Each phase plan follows the same template: per-module sub-checklist (Section 9 of the master spec) executed task-by-task under the same `feature/vX.Y.Z` branch (or a new version branch for the next release).