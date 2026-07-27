# Axiom Integration Standards — Master Design

**Date:** 2026-07-27
**Scope:** Cross-cutting engineering standards for `Axiom-Saas-Server` (NestJS) and `Axiom-Saas-Web` (Vite + React). Drives the next several versioned releases.
**Status:** Approved for spec doc; pending user review of this written version.
**Owner:** single development agent driving both repos.

---

## 1. Problem statement

Two SaaS repos — backend and frontend — share an API contract but maintain it independently:

- **Server has three coexisting response envelope formats** (`infinityPagination`, plain `{data}`, wrapped `{success, data}`). The choice is per-controller and inconsistent.
- **Web papers over this with `unwrapResponse()` auto-unwrap logic** in `lib/api.ts`, plus per-hook `(response.data as any)` casts and manual DTO-to-domain transformations.
- **No shared types** between server DTOs and web types. They drift independently.
- **Two competing API access patterns** in web: typed services (`src/services/auth.ts`) and ad-hoc hooks (`src/features/<f>/hooks/use-<f>.ts`). Transformations are duplicated across hooks.
- **Git workflows** are similar but inconsistent (different branch names, no PR template, no cross-repo coordination model).

This produces integration bugs at the boundary — endpoints that work in Swagger but break in UI; types that compile but lie; pagination that works in some modules and not others.

The fix is to make the server's DTOs the single source of truth, generate web types from them, and standardize the layers on both sides.

---

## 2. Goals and non-goals

### Goals

1. **One response envelope** on the server, applied globally. No more per-controller format choice.
2. **End-to-end type safety** from server DTOs to web components, via OpenAPI codegen.
3. **One canonical API access pattern** in web (service layer), eliminating the `src/services/` vs `src/features/<f>/hooks/` split.
4. **Pure, testable mappers** between server DTO and web domain model.
5. **Synchronized versioning** across both repos under a shared `feature/vX.Y.Z` branch.
6. **Cypress E2E coverage** for user-facing flows in the SaaS UI.
7. **Engineering principles of 易维护 (maintainable), 可插拔 (pluggable), 可拓展 (extensible)** applied concretely:
   - **Maintainable:** contract is generated, mappers are pure, hooks are slim
   - **Pluggable:** swap server payload format → only mappers change; swap fetch lib → only `lib/api.ts` changes
   - **Extensible:** add a new feature = generate types + write service + write mapper + write hook + write components, following the same recipe

### Non-goals (out of scope)

1. Authentication flow redesign — JWT + Passport + social login stays as-is
2. Database schema changes — no new tables, no column renames, no data migration
3. Hexagonal architecture rework — module/domain/infrastructure split stays
4. State management overhaul — Zustand + Context stay; TanStack Query NOT introduced
5. UI library swap — shadcn/ui + Tailwind + Radix UI stay
6. Build tooling rework — Vite on web, NestJS CLI on server stay
7. Monorepo conversion — two repos stay two repos
8. Internationalization rework — `nestjs-i18n` and any web i18n stay
9. Performance optimization beyond type/code health — no bundle splitting rework, no SSR/SSG
10. Real-time / WebSocket layer — not added
11. Observability / monitoring — no OpenTelemetry, no new logging infra
12. API versioning strategy change — `/api/v1/...` stays
13. Mobile / native app — out of scope
14. Accessibility audit (WCAG) — out of scope

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Axiom-Saas-Server (NestJS)                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Modules (users, bills, plans, ...)                    │       │
│  │   DTOs (class-validator)  ← single source of truth   │       │
│  │   Controllers  ──► ResponseEnvelopeInterceptor       │       │
│  │   Services / Domain / Infrastructure                  │       │
│  └──────────────────────────────────────────────────────┘       │
│              │                                                  │
│              ▼                                                  │
│         Swagger /openapi.json  (build artifact)                 │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼  openapi-typescript (CI step in web)
┌─────────────────────────────────────────────────────────────────┐
│  Axiom-Saas-Web (Vite + React)                                  │
│  src/types/api.d.ts          ← auto-generated, COMMITTED         │
│  src/services/<feature>.ts   ← typed API services (cross-cut)   │
│  src/features/<feature>/                                          │
│    services/<f>-api.ts      ← typed API services (default)     │
│    mappers/api-to-domain.ts ← DTO → domain (pure)              │
│    hooks/use-<feature>.ts   ← React state, calls service        │
│    types/index.ts           ← domain types (UI shape)          │
│    components/                                                  │
│    <sub>/page.tsx                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key boundary:** server DTOs are the contract. Domain types (the `name`, `tier`, `status` shapes the UI actually uses) live only in web. Mappers translate between them at the boundary. If we ever change the wire format, only the mapper changes — components are insulated.

---

## 4. Unified API response envelope

### 4.1 Format

```typescript
{
  data: T,                  // the payload — required
  meta?: {                  // optional, present only for paginated lists
    total: number,
    page: number,           // 1-based (server's native)
    pageSize: number
  },
  message?: string          // optional, human-readable info
}
```

### 4.2 Status code semantics

- `200` — success, body has `data`
- `201` — created, body has `data`
- `204` — no content (used for delete; empty body)
- `4xx` — error, body is `{ statusCode, code, message, details? }`
- `5xx` — error, body is `{ statusCode, code, message }` (no stack trace leak)

### 4.3 Concrete examples

| Endpoint | Response |
|---|---|
| `GET /v1/users?page=1&limit=10` | `{ data: User[], meta: { total, page: 1, pageSize: 10 } }` |
| `GET /v1/users/:id` | `{ data: User }` |
| `POST /v1/users` | `201 { data: User }` |
| `PATCH /v1/users/:id` | `{ data: User }` |
| `DELETE /v1/users/:id` | `204` (empty body) |
| `GET /v1/bills/flows` | `{ data: PaymentFlow[], meta: { total, page, pageSize } }` |

### 4.4 Implementation

A global NestJS interceptor wraps the response. Controllers stop formatting responses themselves.

```typescript
// src/common/interceptors/response-envelope.interceptor.ts
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((payload) => {
      if (payload === null || payload === undefined) return null;
      // Pagination result from infinityPagination has { data, total, page, limit }
      if (isPaginated(payload)) {
        return {
          data: payload.data,
          meta: { total: payload.total, page: payload.page, pageSize: payload.limit },
        };
      }
      // Already-enveloped payloads pass through (covers { data, message } shapes too)
      if (isAlreadyEnveloped(payload)) return payload;
      // Bare values — wrap in { data }
      return { data: payload };
    }));
  }
}
```

Registered globally in `main.ts` via `app.useGlobalInterceptors(new ResponseEnvelopeInterceptor())`.

**Note:** the `message` field is included in `isAlreadyEnveloped` payloads (controllers that emit `{ data, message }` pass through unchanged) and is not added by the interceptor itself — controllers that want a `message` emit it directly.

### 4.5 Backward compatibility

**None.** This is a deliberate breaking change documented in CHANGELOG. The current 3-format inconsistency is itself the bug — any consumer depending on a specific format is already wrong. We treat this as a major version bump (v1.0.0 → v2.0.0 in API terms; coordinated with web).

### 4.6 What gets deleted from web

- `lib/api.ts` `unwrapResponse()` function
- `WrappedResponse` interface
- The `success === true` branch in unwrap logic
- Every `(response.data as any)` cast in hooks that handled envelope mismatch
- `api:check` in CI replaces manual smoke tests

---

## 5. Server changes

### 5.1 New global response interceptor

See Section 4.4.

### 5.2 Pagination DTO convention

Every list endpoint uses a `<Feature>QueryDto` extending a shared base. This eliminates the per-controller `@Query()` parameter sprawl and centralizes the pagination limit cap.

```typescript
// src/common/dto/pagination-query.dto.ts
export class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number = 10;

  @IsOptional() @IsString()
  sortBy?: string;

  @IsOptional() @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

// src/users/dto/query-user.dto.ts
export class QueryUserDto extends PaginationQueryDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsString() search?: string;
}
```

Controller signatures become:

```typescript
@Get()
@HttpCode(HttpStatus.OK)
async findAll(@Query() query: QueryUserDto): Promise<...> { ... }
```

### 5.3 What does NOT change on the server

- Hexagonal architecture (module/domain/infrastructure split, Repository + Mapper pattern)
- Database strategy (dual-DB relational + document via TypeORM / Mongoose)
- Module boundaries and naming
- Migration system (TypeORM migrations, seed mechanism via Hygen)
- Hygen module generator templates (just add filter DTO template)

---

## 6. Web codegen + service layer

### 6.1 Codegen pipeline

```json
// web/package.json (additions)
{
  "scripts": {
    "api:generate": "openapi-typescript ../Axiom-Saas-Server/docs/swagger.json -o src/types/api.d.ts",
    "api:check":   "openapi-typescript ../Axiom-Saas-Server/docs/swagger.json -o src/types/api.d.ts --check"
  },
  "devDependencies": {
    "openapi-typescript": "^7.x"
  }
}
```

The server exports its Swagger spec to `docs/swagger.json` on every build (already supported by `@nestjs/swagger`; we'll add a build script). The web checks it in CI — a failed `api:check` blocks the PR.

**`api.d.ts` is COMMITTED to git.** Visibility of contract changes in PRs is exactly the "accurate stable integration" goal. CI runs `api:check` to guarantee it's regenerated, not stale.

### 6.2 New `src/lib/api.ts` (thin, type-safe)

```typescript
// Illustrative — real implementation handles all HTTP methods uniformly.
import type { paths, components } from "@/types/api"

export type ApiResponse<T> = {
  data: T;
  meta?: components["schemas"]["PaginationMetaDto"];
};

// Picks the success response body type for a given path + method.
type ResponseBody<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  paths[P][M] extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  never;

export const api = {
  async request<P extends keyof paths, M extends keyof paths[P]>(
    path: P,
    method: M,
    init?: Omit<RequestInit, "method"> & { params?: Record<string, unknown> }
  ): Promise<ResponseBody<P, M>> {
    // fetch with auto-token, error handling, single-envelope unwrap
  }
};
```

The new `lib/api.ts` is ~80 lines (down from ~300). It does:
1. Build URL from path + params
2. Inject auth token from `localStorage`
3. Parse the **single** envelope (`{ data, meta? }`)
4. Throw typed `ApiRequestError` on non-2xx

**No more `WrappedResponse`. No more `unwrapResponse`. No more `as any` for envelope handling.**

### 6.3 Service layer pattern

**Default:** each feature owns its service at `src/features/<feature>/services/<feature>-api.ts`.

```typescript
// src/features/users/services/users-api.ts
import { api } from "@/lib/api"
import type { components } from "@/types/api"

type UserDto = components["schemas"]["User"]
type QueryUserDto = components["schemas"]["QueryUserDto"]
type CreateUserDto = components["schemas"]["CreateUserDto"]

export const usersApi = {
  list: (q: QueryUserDto) => api.request("/v1/users", "get", { params: q }),
  get:  (id: string)     => api.request(`/v1/users/{id}`, "get"),
  create: (data: CreateUserDto) => api.request("/v1/users", "post", { body: data }),
  update: (id: string, data: CreateUserDto) => api.request(`/v1/users/{id}`, "patch", { body: data }),
  delete: (id: string)   => api.request(`/v1/users/{id}`, "delete"),
}
```

**Exception for cross-cutting services:** auth, content, menus, roles stay at `src/services/` because they're consumed by multiple features (sidebar, router, providers). Anything feature-specific moves under `features/<feature>/services/`.

**Refactor rule:** if a service is consumed by ≥2 features AND it's not a primary domain (auth, content, menus, roles), it can stay at `src/services/`. Default is colocation.

Existing `src/services/auth.ts` and `src/services/content.ts` are kept and refreshed (typed against generated types).

### 6.4 Mapper convention (DTO → domain)

```typescript
// src/features/users/mappers/api-to-domain.ts
import type { components } from "@/types/api"
import type { User, UserRole, UserStatus } from "../types"

type UserDto = components["schemas"]["User"]

export function userFromDto(dto: UserDto): User {
  return {
    id: dto.id,
    name: [dto.firstName, dto.lastName].filter(Boolean).join(" ").trim() || dto.email,
    email: dto.email,
    role: (dto.role?.name?.toLowerCase() ?? "user") as UserRole,
    tier: dto.tier ?? "Lv0",
    status: (dto.status?.name?.toLowerCase() ?? "active") as UserStatus,
    pointsBalance: dto.pointsBalance ?? 0,
    chatQuotaUsed: dto.chatQuotaUsed ?? 0,
    chatQuotaTotal: dto.chatQuotaTotal ?? 0,
    currentPlanId: dto.currentPlanId ?? undefined,
    subscriptionExpiredAt: dto.subscriptionExpiredAt ?? undefined,
    registeredAt: dto.registeredAt ?? "",
    lastLoginAt: dto.lastLoginAt ?? undefined,
  }
}
```

Each feature has a `mappers/` directory. Mappers are **pure functions** — easy to unit-test, no React. This is the "可插拔" piece: if the server changes `User.firstName` to `User.givenName`, only this mapper changes.

### 6.5 Hooks layer (slim)

```typescript
// src/features/users/hooks/use-users.ts
"use client"
import { useState, useCallback } from "react"
import { usersApi } from "../services/users-api"
import { userFromDto } from "../mappers/api-to-domain"
import type { User, UserQueryParams } from "../types"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  // ...
  const fetchUsers = useCallback(async (params: UserQueryParams = {}) => {
    const response = await usersApi.list({
      page: (params.page ?? 0) + 1,    // 0-based UI → 1-based server
      pageSize: params.pageSize ?? 10,
      role: params.role,
      status: params.status,
      tier: params.tier,
      search: params.search,
    })
    setUsers(response.data.map(userFromDto))
    setPagination({
      page: (response.meta?.page ?? 1) - 1,   // back to 0-based for UI
      pageSize: response.meta?.pageSize ?? 10,
      total: response.meta?.total ?? 0,
    })
  }, [])
  // ... create / update / delete similarly
}
```

The hook file becomes ~40 lines (down from ~220). Transformations that were sprinkled everywhere (`firstName + lastName`, `role: {id:0/1/2}`, etc.) are now **one place** — the mapper.

### 6.6 Feature folder layout (canonical)

```
src/features/users/
├── services/
│   └── users-api.ts          # ALL HTTP calls for this feature (typed)
├── mappers/
│   └── api-to-domain.ts     # DTO → domain
├── hooks/
│   └── use-users.ts         # React state, calls usersApi
├── types/
│   └── index.ts             # domain types (UI shape)
├── components/
│   ├── users-columns.tsx
│   ├── users-table.tsx
│   ├── user-form.tsx
│   └── user-dialog.tsx
└── users/
    └── page.tsx
```

---

## 7. Git workflow

### 7.1 Branch model

```
main                                     ← production, versioned tags (v1.0.0, v1.1.0, ...)
  └─ feature/v1.0.0                      ← development branch, accumulates commits
       ├─ commit 1: feat(envelope): add interceptor
       ├─ commit 2: feat(codegen): generate web types
       ├─ commit 3: refactor(users): extract mapper
       ├─ commit 4: fix(bills/flows): pagination meta
       └─ ... (more commits as development progresses)

After user acceptance testing passes:
  feature/v1.0.0 ──PR──► main (tagged v1.0.0)
```

**Same model for both repos**, with **synchronized versioning**:

```
Axiom-Saas-Server:                     Axiom-Saas-Web:
main                                  main
  └─ feature/v1.0.0                     └─ feature/v1.0.0
       ├─ server commits                   ├─ web commits
       └─ (released together)              └─ (released together)
```

Both `feature/vX.Y.Z` branches PR to their respective `main` after testing. The version number is **shared across both repos** — server v1.0.0 and web v1.0.0 always go together.

### 7.2 Commit convention

Conventional Commits enforced by existing `commitlint.config.js` in both repos:

```
feat(scope): description
fix(scope): description
refactor(scope): description
docs(scope): description
chore(scope): description
test(scope): description
perf(scope): description
```

- `scope` is the feature or area name (`users`, `bills/flows`, `envelope`, `codegen`, etc.)
- Subject ≤72 chars, imperative mood
- Body explains **why**, not **what**
- Footer: `Refs: TICKET-123`, `BREAKING CHANGE: ...` if applicable

### 7.3 Single-agent workflow

One agent drives both repos for a given version:

1. **Plan a version** — identify what server changes and what web changes are needed for vX.Y.Z
2. **Open `feature/vX.Y.Z`** on both repos at the start of the cycle
3. **Iterate commits** — multiple commits across both repos, each commit's scope obvious from the message
4. **Verify** — run all checks locally, generate Swagger, regenerate web types, run tests on both
5. **Wait for user acceptance testing** — don't merge to main until user confirms
6. **PR to main** on both repos, with cross-links in PR descriptions
7. **Tag vX.Y.Z** on both repos (server with `release-it`, web with manual tag)

### 7.4 Per-commit discipline

Each commit should be:
- **Coherent:** one logical change
- **Buildable:** every commit passes lint + type-check + tests on its own repo (commits land in one repo at a time; the other repo catches up in a paired commit)
- **Contract-consistent:** if a commit changes server's contract, an immediately-following commit on web regenerates `api.d.ts` and updates affected mappers. Both commits land in the same `feature/vX.Y.Z` cycle but on different repos.
- **Reversible:** small enough to revert without orphaning dependent work

### 7.5 PR template

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

### 7.6 CI per-PR

Required to pass on every PR:
- Lint (`npm run lint`)
- Type-check / build (`npm run build`)
- Unit tests (`npm test`)
- **Server:** contract doc generation succeeds
- **Web:** `api:check` succeeds (web's `api.d.ts` matches server's current Swagger)

Cross-repo PRs are linked but **not gated** — each repo's CI runs independently.

### 7.7 What gets added to both repos

- `.github/PULL_REQUEST_TEMPLATE.md` (template above)
- `docs/integration.md` — documents the shared version model and cross-repo coordination rules
- `CONTRIBUTING.md` — links to both CLAUDE.md files, explains the version branch flow

### 7.8 What does NOT change

- Conventional Commits enforcement (already in both repos)
- Husky + lint-staged (already in both repos)
- `release-it` on server (already works)
- Web's `pnpm-lock.yaml` based dependency management

---

## 8. Testing requirements

### 8.1 Server (NestJS)

- **Unit tests:** every service gets a `*.spec.ts`. Coverage of public methods, mocked repositories.
- **Controller tests:** thin — verify decorators, guard order, response shape (does the interceptor fire?). Mock the service.
- **DTO tests:** `class-validator` decorators are validated by the integration test — no separate DTO unit tests unless logic is non-obvious.
- **E2E tests:** one per major flow (`auth`, `users-crud`, `bills-flows`, `bills-consumptions`). Each E2E test asserts the **envelope shape** (`{ data, meta? }`), not just the inner payload.
- **Contract test:** new — `test/contract/contract.spec.ts` boots the app, hits `/api/docs-json`, asserts the OpenAPI document is valid and contains expected schemas. This is what makes the codegen reliable.

### 8.2 Web (React + Vite)

- **Mapper tests:** every `mappers/api-to-domain.ts` gets a `*.test.ts` with at least: happy path, missing-field fallback, enum/string coercion edge case. Mappers are pure functions — fast, easy to test.
- **Service tests:** `usersApi.list()` etc. tested against a mock fetch. Assert: correct URL, correct params, correct body, response mapped.
- **Hook tests:** `use-users.ts` tested with `@testing-library/react` — mocked service. Assert: state transitions, loading/error states.
- **Component tests:** only for non-trivial logic (form validation, table filtering, multi-step flows). Snapshot tests are NOT used.
- **Contract alignment test:** `npm run api:check` in CI is the contract test. If web's `api.d.ts` is stale, PR fails.

### 8.3 Cypress E2E (required for SaaS UI)

Cypress is added because the SaaS UI has rich user interaction (forms, tables, dialogs, drag-drop, multi-step flows) that mapper/hook/component tests can't fully cover.

```
web/cypress/
├── e2e/
│   ├── auth/
│   │   ├── sign-in.cy.ts
│   │   ├── sign-up.cy.ts
│   │   └── forgot-password.cy.ts
│   ├── users/
│   │   ├── list.cy.ts
│   │   ├── create.cy.ts
│   │   ├── edit.cy.ts
│   │   └── delete.cy.ts
│   ├── bills/
│   │   ├── flows-list.cy.ts
│   │   └── consumptions-list.cy.ts
│   └── ...
├── fixtures/
│   ├── users.json
│   └── ...
└── support/
    ├── commands.ts          # custom Cypress commands (login, navigate)
    └── e2e.ts               # global setup
```

**Custom Cypress commands:**

```typescript
// cypress/support/commands.ts
Cypress.Commands.add("login", (email, password) => {
  cy.visit("/auth/sign-in")
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="sign-in-button"]').click()
  cy.url().should("include", "/dashboard")
})

Cypress.Commands.add("logout", () => { /* ... */ })

Cypress.Commands.add("dataTestId", (id) => cy.get(`[data-testid="${id}"]`))
```

**`data-testid` convention (new):**

Every interactive element that a Cypress test needs to find gets `data-testid="..."`. This is how tests stay stable across CSS refactors.

```tsx
<Button data-testid="user-create-submit">Create User</Button>
```

**Cypress config:**

```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    video: false,
    screenshotOnRunFailure: true,
  },
})
```

**Test data setup:**

- Use server's seed data for deterministic fixtures
- Or use Cypress `intercept()` to mock API responses for isolated UI tests
- **Strategy:** prefer real API for happy-path E2E; use `intercept` only for edge-case scenarios (network failures, slow responses)

**Commands added:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "api:generate": "openapi-typescript ../Axiom-Saas-Server/docs/swagger.json -o src/types/api.d.ts",
    "api:check": "openapi-typescript ../Axiom-Saas-Server/docs/swagger.json -o src/types/api.d.ts --check"
  }
}
```

### 8.4 Coverage targets (tracked, not enforced initially)

| Layer | Target |
|---|---|
| Server service | 80% |
| Server controller | 60% (thin layer) |
| Server mapper | 90% |
| Web mapper | 90% |
| Web service | 80% |
| Web hook | 60% |
| Cypress E2E | one happy-path spec per major feature |

### 8.5 Out of test scope (this refactor)

- Performance / load tests
- Visual regression tests

---

## 9. Migration plan / phasing

Work executes in **ordered phases** under the same `feature/vX.Y.Z` branch on both repos. Each phase produces a coherent, shippable state.

### Phase 0 — Foundation (must ship first)

**Server:**
- Add `ResponseEnvelopeInterceptor`
- Add `PaginationQueryDto` base + per-feature filter DTOs
- Convert every list controller to use filter DTO (remove raw `@Query()`)
- Export Swagger to `docs/swagger.json` on build
- Add contract test (`test/contract/contract.spec.ts`)

**Web:**
- Add `openapi-typescript` + scripts
- Add `src/types/api.d.ts` (initial generation)
- Replace `src/lib/api.ts` (drop `unwrapResponse`, ~80 lines)
- Add Cypress + `data-testid` convention
- Set up base Cypress structure (`auth/sign-in.cy.ts`)
- Add `docs/integration.md`

**Both:**
- Add PR template
- Add shared `CONTRIBUTING.md`

### Phase 1 — Highest-bug modules

1. **users** (highest complexity, biggest source of bugs)
2. **bills/flows** (financial data — accuracy critical)
3. **bills/consumptions** (same)

For each module:
- Server: ensure DTOs are OpenAPI-friendly (`@ApiOkResponse({ type: User })` decorators correct)
- Web: extract service, mapper, refactor hook, add mapper unit test + Cypress E2E for main flow

### Phase 2 — Remaining business modules

4. **plans**
5. **subscriptions**
6. **roles**
7. **menus**

### Phase 3 — Content + data modules

8. **content** (audio-interpretation, intelligence, research-analysis)
9. **categories**
10. **etl**
11. **parse-tasks**
12. **versions**

### Phase 4 — Long tail

13. **scrape-log**
14. **oss-browser**
15. **auth-google / auth-facebook / auth-apple** (if not already in Phase 0)
16. **files** (upload — slightly different because of multipart)

### Per-module sub-checklist

A "module" here means a logical unit (e.g. `bills/flows`, `bills/consumptions`), not necessarily one NestJS module or one web feature directory. Sub-features inside a directory (e.g. `bills/flows` and `bills/consumptions` both live under `features/bills/`) get separate passes through this checklist.

```
□ Server (for the module's controllers)
  - [ ] All controllers use typed query DTO
  - [ ] All response types have @ApiOkResponse/@ApiCreatedResponse decorator
  - [ ] No controller-side response wrapping (interceptor handles it)
  - [ ] `npm run build` exports Swagger
□ Web (for the module's feature or sub-feature)
  - [ ] Service exists and is fully typed (`features/<m>/services/<m>-api.ts` or `src/services/<m>.ts` for cross-cutting)
  - [ ] Mapper exists (`features/<m>/mappers/api-to-domain.ts`)
  - [ ] Mapper unit test passes
  - [ ] Hook calls service, not API directly
  - [ ] No `as any` in hook (grep check)
  - [ ] `npm run api:check` passes
  - [ ] Cypress spec exists for the module's main flow
□ Both
  - [ ] PR description cross-links the two repo PRs
  - [ ] Both CIs pass
  - [ ] User acceptance test for the module's main flow
```

### Rollout gate

User acceptance testing happens after each phase, before merge to `main`. Each phase is independently shippable — if a phase is approved, intermediate versions (v0.1, v0.2, ...) can be tagged.

---

## 10. Engineering principles, applied

### 易维护 (Maintainable)

- One response envelope, applied globally — no per-controller format choice
- Types generated from source of truth (Swagger) — no manual drift
- Mappers are pure functions — easy to read, test, and modify
- Hooks are slim (~40 lines) — most logic is in mappers/services
- Standardized feature folder layout — predictable where things go

### 可插拔 (Pluggable)

- Swap the wire format → only mappers change
- Swap the fetch library → only `lib/api.ts` changes
- Swap a service implementation → only the service module changes; hooks and components unchanged
- Add a new endpoint → add to service, add to mapper, add to hook — never modify existing code

### 可拓展 (Extensible)

- New feature = generate types + write service + write mapper + write hook + write components, following the same recipe
- Cross-cutting concerns (auth, content, menus, roles) live at top-level `src/services/`; feature-specific concerns colocated under `features/<f>/`
- Phase plan provides a known-good order for adding new modules
- Cypress command library grows over time — `login`, `logout`, `dataTestId` are seeds

---

## 11. Open questions / decisions log

| Decision | Choice | Rationale |
|---|---|---|
| Codegen tool | `openapi-typescript` | Lowest disruption; fits existing fetch-based design |
| Envelope format | `{ data, meta?, message? }` | One format covers both single-item and paginated cases |
| Breaking change strategy | None (hard cut) | Inconsistency itself is the bug; back-compat would perpetuate it |
| `api.d.ts` in git | Commit | Visibility of contract changes in PRs |
| Service layer location | Colocate by default, top-level for cross-cutting | Easy to find feature code; cross-cutting stays accessible |
| Cypress over alternatives | Cypress | Standard for SaaS UI; integrates well with `data-testid` |
| Web state management | Stay with Zustand + Context | Don't introduce TanStack Query in this engagement |
| Database schema | No changes | Stay focused on contract and code health |

---

## 12. Success criteria

The refactor is complete when:

1. **All four response envelope formats in CLAUDE.md are gone.** Only `{ data, meta?, message? }` exists.
2. **`unwrapResponse()` and `WrappedResponse` are deleted from `lib/api.ts`.** Web's API layer is ~80 lines.
3. **`api:check` is in web CI** and fails when server's contract changes without web's `api.d.ts` being regenerated.
4. **No `as any` casts in web hooks** for envelope shape (some may remain for genuinely unknown fields).
5. **Every feature module** has the canonical folder structure with service / mapper / hook / types.
6. **Every mapper has unit tests** with ≥90% coverage.
7. **Cypress E2E suite** covers auth + every Phase-1/2/3 module's main flow.
8. **Both repos' PR templates and `docs/integration.md` exist** and reference the cross-repo workflow.
9. **`feature/v1.0.0`** in both repos is green, user-tested, PR'd to `main`, and tagged.