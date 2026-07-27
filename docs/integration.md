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
- CI: `pnpm api:check` — fails the PR if `api.d.ts` is stale

When server's contract changes:

1. Server PR includes `BREAKING CHANGE:` footer if applicable.
2. Web PR in the same `feature/vX.Y.Z` cycle runs `pnpm api:generate` and updates affected mappers/services.
3. Both PRs land in their respective repos before either merges to `main`.

## API access pattern

- Default: each feature owns its service at `src/features/<f>/services/<f>-api.ts`.
- Cross-cutting (auth, content, menus, roles): `src/services/<f>.ts`.
- Hooks call services, not `lib/api.ts` directly.
- Mappers (`src/features/<f>/mappers/api-to-domain.ts`) translate DTO → domain. Pure functions.

## References

- Master spec: `docs/integration-standards.md`
- Conventions: `CLAUDE.md`