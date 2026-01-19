# Perspective

Open source packages for [Perspective AI](https://getperspective.ai) - the AI-powered research platform.

## Packages

| Package                                        | Description                                 | Version                                                                                                             |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [@perspective/sdk](./packages/sdk)             | Core embed SDK for vanilla JS and CDN usage | [![npm](https://img.shields.io/npm/v/@perspective/sdk)](https://www.npmjs.com/package/@perspective/sdk)             |
| [@perspective/sdk-react](./packages/sdk-react) | React components for Perspective embeds     | [![npm](https://img.shields.io/npm/v/@perspective/sdk-react)](https://www.npmjs.com/package/@perspective/sdk-react) |

## Documentation

See package READMEs for detailed documentation:

- [@perspective/sdk README](./packages/sdk/README.md)
- [@perspective/sdk-react README](./packages/sdk-react/README.md)

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
