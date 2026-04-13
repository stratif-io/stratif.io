# Contributing to stratif.io

Thanks for your interest in contributing. stratif.io is actively developed and new contributions are welcome — connectors, features, bug fixes, and docs.

## Ground rules

- All PRs are reviewed and merged by the maintainer. There are no direct pushes to the repo.
- For **features and new connectors**: open an issue first to discuss scope and approach. This avoids wasted work.
- For **bug fixes**: you can open a PR directly. A linked issue is appreciated but not required.
- Keep PRs focused. One logical change per PR.

## Before you submit

Run the full quality suite and make sure everything passes:

```bash
bun run lint && bun run build && bun run test:run
```

## What makes a good contribution

- **New connector** — a new warehouse or database driver. Open an issue with the database name, the Python library you plan to use, and any relevant prior art. See existing connectors in `backend/` for the pattern to follow.
- **New analytics feature** — open an issue describing the use case and the query logic. Include a rough SQL sketch if you have one.
- **Bug fix** — include a test that reproduces the bug before the fix and passes after.
- **Docs** — always welcome, no issue required.

## Questions and ideas

Open a [GitHub Discussion](https://github.com/stratif-io/stratif.io/discussions) or an [Issue](https://github.com/stratif-io/stratif.io/issues).
