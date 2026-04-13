# Contributing to stratif.io

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## Before submitting

Pre-commit hooks run automatically on every commit (ruff lint/format, type-check, lint-staged, TypeScript). Run the following manually before opening a PR:

```bash
# Frontend
bun run build && bun run test:run

# Backend
uv run pytest backend/
```

All checks must pass with zero warnings.

## Questions or ideas?

[Start a discussion](https://github.com/stratif-io/stratif.io/discussions)
