# API Reference

The API reference is served interactively by your running stratif.io instance.

## Accessing the Reference

Once stratif.io is running, open:

```
http://<your-instance>/api/reference
```

For local development:

```
http://localhost:8000/api/reference
```

The reference is powered by [Scalar](https://scalar.com/) and includes all endpoints with request/response schemas and a built-in HTTP client.

## OpenAPI Spec

The raw OpenAPI JSON spec is available at:

```
http://<your-instance>/openapi.json
```

You can use this to generate client SDKs or import into tools like Postman or Insomnia.

## Endpoints

| Prefix | Description |
|---|---|
| `GET /api/trend` | Event counts over time |
| `GET /api/retention` | Cohort retention table |
| `GET /api/events` | Event list and top events |
| `GET /api/events/top` | Top events by count |
| `GET /api/mission-control` | Platform health metrics |
| `GET /api/paths` | User journey paths |
| `GET /api/conversion` | Funnel conversion steps |
| `GET /api/pivot` | Pivot table data |
| `GET /api/sessions` | Session summaries |
| `GET/POST /api/connections` | Connection management |
| `GET /api/health` | Health check |
