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