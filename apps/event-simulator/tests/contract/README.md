# Seeder-Studio contract tests

Pin the TS axis-math twin to the Python simulator's behaviour within envelopes.

Run locally:

```bash
uv run python apps/seeder-studio/tests/contract/generate_python_reference.py
bun run --filter @stratifio/seeder-studio test:contract
```

CI should run both in sequence on any change to `seeders/simulator/**` or
`apps/seeder-studio/src/lib/twin/**`.
