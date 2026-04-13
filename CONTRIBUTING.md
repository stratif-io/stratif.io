# Contributing to stratif.io

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## Before submitting

Run the full quality suite:

```bash
# Frontend
bun run lint && bun run build && bun run test:run

# Backend
uv run ruff check . && uv run ruff format --check . && uv run pytest backend/
```

All checks must pass with zero warnings.

## Questions or ideas?

[Start a discussion](https://github.com/stratif-io/stratif.io/discussions)
