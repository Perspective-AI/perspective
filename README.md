# Perspective

Open source packages for [Perspective AI](https://getperspective.ai) — AI-powered conversation agents.

## Packages

| Package                                           | Description                                 | Version                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [@perspective-ai/sdk](./packages/sdk)             | Core embed SDK for vanilla JS and CDN usage | [![npm](https://img.shields.io/npm/v/@perspective-ai/sdk)](https://www.npmjs.com/package/@perspective-ai/sdk)             |
| [@perspective-ai/sdk-react](./packages/sdk-react) | React components for Perspective embeds     | [![npm](https://img.shields.io/npm/v/@perspective-ai/sdk-react)](https://www.npmjs.com/package/@perspective-ai/sdk-react) |

## Documentation

See package READMEs for detailed documentation:

- [@perspective-ai/sdk README](./packages/sdk/README.md)
- [@perspective-ai/sdk-react README](./packages/sdk-react/README.md)

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode (watch)
pnpm dev
```

## Installing locally for development

When working on unreleased SDK changes, there are several ways to use the local packages in a consuming app.

### Option 1: Snapshot releases (recommended for PR testing)

Every PR with a changeset automatically publishes snapshot packages to npm. Install using the PR tag:

```bash
# Use the PR-specific tag (always points to latest snapshot from that PR)
pnpm add @perspective-ai/sdk@pr-21
pnpm add @perspective-ai/sdk-react@pr-21

# Or pin to a specific snapshot version
pnpm add @perspective-ai/sdk@0.0.0-pr-21-20260224144030
```

No local setup required — works in CI and for teammates.

### Option 2: pnpm overrides (recommended for Next.js apps)

Use pnpm `overrides` in the consuming app's `package.json` to point at local packages:

```jsonc
// package.json
{
  "pnpm": {
    "overrides": {
      "@perspective-ai/sdk": "link:../path/to/embed/packages/sdk",
      "@perspective-ai/sdk-react": "link:../path/to/embed/packages/sdk-react",
    },
  },
}
```

Then run `pnpm install`. To restore published versions, remove the overrides and run `pnpm install` again.

### Option 3: file: protocol with install-links (for Turbopack apps)

For apps using Next.js Turbopack (e.g. the demos repo), `pnpm link` symlinks **don't work** — Turbopack can't resolve peer deps through symlinks. Use `file:` protocol with `--config.install-links=true` to copy packages instead:

```bash
# 1. Build SDK
cd /path/to/embed && pnpm build

# 2. Install both packages together (so sdk-react can resolve sdk as peer dep)
cd /path/to/consuming-app
pnpm add @perspective-ai/sdk@file:/path/to/embed/packages/sdk \
         @perspective-ai/sdk-react@file:/path/to/embed/packages/sdk-react \
         --config.install-links=true
```

You may also need `transpilePackages` in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  transpilePackages: ["@perspective-ai/sdk", "@perspective-ai/sdk-react"],
};
```

### Option 4: pnpm pack (test the exact publish artifact)

This simulates what npm would install, catching issues like missing `files` entries:

```bash
# 1. Build
pnpm build

# 2. Pack each package
cd packages/sdk && pnpm pack       # creates perspective-ai-sdk-x.x.x.tgz
cd packages/sdk-react && pnpm pack # creates perspective-ai-sdk-react-x.x.x.tgz

# 3. Install the tarballs in your consuming app
pnpm add /path/to/embed/packages/sdk/perspective-ai-sdk-1.1.3.tgz
pnpm add /path/to/embed/packages/sdk-react/perspective-ai-sdk-react-1.1.3.tgz
```

### Gotchas

- **Always nuke `.next` after relinking** — Turbopack caches resolved modules aggressively. After relinking you'll get "Unable to open static sorted file" panics or stale code unless you `rm -rf .next` in the consuming app.
- **Dev server won't auto-detect SDK rebuilds** — after `pnpm build` in the SDK repo, restart the consuming app's dev server. It doesn't watch `node_modules`.
- **Don't commit lockfile/package.json changes from linking** — restore published versions before committing.

## Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

### Adding a changeset

When making changes that should be released, add a changeset:

```bash
pnpm changeset
```

Select the packages affected and bump type (patch/minor/major). This creates a file in `.changeset/` describing the change.

### Release process

1. PRs with changesets merge to `main`
2. Release workflow creates a "Version Packages" PR
3. Merging that PR publishes to npm

## License

MIT
