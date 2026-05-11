# Contributing

Thanks for helping make the Perspective Embed SDK better. PRs, issues, and framework examples are all welcome.

## Prerequisites

- **Node** 20+
- **pnpm** 10+ (the repo pins `pnpm@10.25.0` — install via `corepack enable` or `npm i -g pnpm`)

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

Watch mode during development:

```bash
pnpm dev
```

Run a single package's tests:

```bash
pnpm --filter @perspective-ai/sdk test
pnpm --filter @perspective-ai/sdk-react test
```

## Changesets

User-facing changes need a changeset so they get picked up by the release workflow:

```bash
pnpm changeset
```

Pick the affected packages and bump type (patch / minor / major). A file appears in `.changeset/` — commit it with your PR. Merging to `main` triggers a "Version Packages" PR; merging that publishes to npm.

## PR checklist

- [ ] Tests for new behavior
- [ ] Changeset added if the change is user-facing
- [ ] `pnpm lint` and `pnpm typecheck` pass
- [ ] README / package README updated if the public API changed

## Running the SDK locally against a consuming app

When you're developing SDK changes and want to try them in a real app, the repo publishes snapshot releases for every PR with a changeset — usually the easiest path.

### Option 1: Snapshot releases (recommended for PR testing)

Every PR with a changeset automatically publishes snapshot packages. Install using the PR tag:

```bash
pnpm add @perspective-ai/sdk@pr-21
pnpm add @perspective-ai/sdk-react@pr-21
```

No local setup required — works in CI and for teammates. Pin to a specific snapshot if you need reproducibility:

```bash
pnpm add @perspective-ai/sdk@0.0.0-pr-21-20260224144030
```

### Option 2: pnpm overrides

Use pnpm `overrides` in the consuming app's `package.json`:

```jsonc
{
  "pnpm": {
    "overrides": {
      "@perspective-ai/sdk": "link:../path/to/perspective-sdk/packages/sdk",
      "@perspective-ai/sdk-react": "link:../path/to/perspective-sdk/packages/sdk-react",
    },
  },
}
```

Run `pnpm install`. Remove the overrides and re-install to restore published versions.

### Option 3: `file:` protocol with `install-links` (Turbopack apps)

`pnpm link` symlinks don't work with Next.js Turbopack — it can't resolve peer deps through symlinks. Use `file:` with `--config.install-links=true` so pnpm copies packages:

```bash
# 1. Build the SDK
cd /path/to/perspective-sdk && pnpm build

# 2. Install both packages together (so sdk-react resolves sdk as a peer dep)
cd /path/to/consuming-app
pnpm add @perspective-ai/sdk@file:/path/to/perspective-sdk/packages/sdk \
         @perspective-ai/sdk-react@file:/path/to/perspective-sdk/packages/sdk-react \
         --config.install-links=true
```

You may also need `transpilePackages` in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  transpilePackages: ["@perspective-ai/sdk", "@perspective-ai/sdk-react"],
};
```

### Option 4: `pnpm pack` (test the exact publish artifact)

Simulates what npm would install — catches issues like missing `files` entries:

```bash
pnpm build
cd packages/sdk && pnpm pack
cd packages/sdk-react && pnpm pack

pnpm add /path/to/perspective-sdk/packages/sdk/perspective-ai-sdk-x.x.x.tgz
pnpm add /path/to/perspective-sdk/packages/sdk-react/perspective-ai-sdk-react-x.x.x.tgz
```

### Gotchas

- **Always nuke `.next` after relinking.** Turbopack caches resolved modules aggressively — you'll get "Unable to open static sorted file" panics or stale code unless you `rm -rf .next` in the consuming app.
- **Dev server won't auto-detect SDK rebuilds.** After `pnpm build` in the SDK repo, restart the consuming app's dev server. It doesn't watch `node_modules`.
- **Don't commit lockfile/package.json changes from linking.** Restore published versions before committing.

## Reporting issues

- **Bugs**: [open an issue](https://github.com/Perspective-AI/perspective/issues/new) with a minimal repro, SDK version (`@perspective-ai/sdk` / `-react`), framework + version, and the browser.
- **Security**: email `support@getperspective.ai` instead of opening a public issue.

## Code of conduct

Be kind. Assume good intent. No harassment, discrimination, or personal attacks.
