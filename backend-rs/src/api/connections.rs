use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::error::ApiError;
use super::state::{open_analytics_conn, AppState, decrypt_credentials, encrypt_credentials};
use crate::connectors::drivers::sqlite::execute_on_handle;
use crate::connectors::types::SqlValue;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct ConnectionRow {
    id: String,
    name: String,
    db_type: String,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize)]
struct SchemaConfigRow {
    id: String,
    connection_id: String,
    user_id_field: String,
    timestamp_field: String,
    event_name_field: String,
    events_table: String,
    custom_properties: Vec<CustomPropertyDto>,
    session_timeout_minutes: i64,
    updated_at: String,
}

#[derive(Serialize)]
struct FilterConfigRow {
    id: String,
    connection_id: String,
    filter_fields: Vec<FilterFieldDto>,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct CustomPropertyDto {
    name: String,
    path: String,
    r#type: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct FilterFieldDto {
    name: String,
    field: String,
    r#type: String,
}

#[derive(Deserialize)]
pub struct CreateConnectionBody {
    name: String,
    db_type: String,
    credentials: Value,
}

#[derive(Deserialize)]
pub struct UpdateConnectionBody {
    name: Option<String>,
    credentials: Option<Value>,
}

#[derive(Deserialize)]
pub struct SchemaConfigBody {
    user_id_field: String,
    timestamp_field: String,
    event_name_field: String,
    events_table: String,
    #[serde(default)]
    custom_properties: Vec<CustomPropertyDto>,
    #[serde(default = "default_session_timeout")]
    session_timeout_minutes: i64,
}

fn default_session_timeout() -> i64 {
    30
}

#[derive(Deserialize)]
pub struct FilterConfigBody {
    filter_fields: Vec<FilterFieldDto>,
}

#[derive(Deserialize)]
pub struct BrowseQuery {
    catalog: Option<String>,
    schema: Option<String>,
}

#[derive(Deserialize)]
pub struct FieldOptionsQuery {
    field: String,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn sql_escape(s: &str) -> String {
    s.replace('\'', "''")
}

fn now_iso() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

fn extract_text(val: &SqlValue) -> String {
    match val {
        SqlValue::Text(s) => s.clone(),
        SqlValue::Int(i) => i.to_string(),
        SqlValue::Float(f) => f.to_string(),
        SqlValue::Null => String::new(),
        SqlValue::Bool(b) => b.to_string(),
    }
}

fn extract_int(val: &SqlValue) -> i64 {
    match val {
        SqlValue::Int(i) => *i,
        SqlValue::Text(s) => s.parse().unwrap_or(0),
        _ => 0,
    }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/connections
pub async fn list_connections(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = execute_on_handle(
        &state.product_db,
        "SELECT id, name, db_type, created_at, updated_at FROM connections ORDER BY created_at DESC",
    )
    .await?;

    let conns: Vec<ConnectionRow> = rows
        .into_iter()
        .map(|r| ConnectionRow {
            id: extract_text(&r[0]),
            name: extract_text(&r[1]),
            db_type: extract_text(&r[2]),
            created_at: extract_text(&r[3]),
            updated_at: extract_text(&r[4]),
        })
        .collect();

    Ok(Json(serde_json::json!(conns)))
}

/// POST /api/connections
pub async fn create_connection(
    State(state): State<AppState>,
    Json(body): Json<CreateConnectionBody>,
) -> Result<impl IntoResponse, ApiError> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = now_iso();
    let encrypted = encrypt_credentials(&body.credentials, &state.encryption_key)?;

    let sql = format!(
        "INSERT INTO connections (id, name, db_type, credentials_encrypted, created_at, updated_at) \
         VALUES ('{}', '{}', '{}', '{}', '{}', '{}')",
        sql_escape(&id),
        sql_escape(&body.name),
        sql_escape(&body.db_type),
        sql_escape(&encrypted),
        sql_escape(&now),
        sql_escape(&now),
    );
    execute_on_handle(&state.product_db, &sql).await?;

    let conn = ConnectionRow {
        id,
        name: body.name,
        db_type: body.db_type,
        created_at: now.clone(),
        updated_at: now,
    };
    Ok((StatusCode::CREATED, Json(serde_json::json!(conn))))
}

/// GET /api/connections/:id
pub async fn get_connection(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT id, name, db_type, created_at, updated_at FROM connections WHERE id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await?;

    let r = rows.first().ok_or_else(|| anyhow::anyhow!("connection not found"))?;
    let conn = ConnectionRow {
        id: extract_text(&r[0]),
        name: extract_text(&r[1]),
        db_type: extract_text(&r[2]),
        created_at: extract_text(&r[3]),
        updated_at: extract_text(&r[4]),
    };
    Ok(Json(serde_json::json!(conn)))
}

/// PATCH /api/connections/:id
pub async fn update_connection(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
    Json(body): Json<UpdateConnectionBody>,
) -> Result<impl IntoResponse, ApiError> {
    let now = now_iso();
    let mut sets = vec![format!("updated_at = '{}'", sql_escape(&now))];

    if let Some(ref name) = body.name {
        sets.push(format!("name = '{}'", sql_escape(name)));
    }
    if let Some(ref creds) = body.credentials {
        let encrypted = encrypt_credentials(creds, &state.encryption_key)?;
        sets.push(format!("credentials_encrypted = '{}'", sql_escape(&encrypted)));
    }

    let sql = format!(
        "UPDATE connections SET {} WHERE id = '{}'",
        sets.join(", "),
        sql_escape(&conn_id),
    );
    execute_on_handle(&state.product_db, &sql).await?;

    // Re-fetch
    get_connection(State(state), Path(conn_id)).await
}

/// DELETE /api/connections/:id
pub async fn delete_connection(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    // Delete associated configs first
    let esc_id = sql_escape(&conn_id);
    execute_on_handle(
        &state.product_db,
        &format!("DELETE FROM connection_schema_configs WHERE connection_id = '{esc_id}'"),
    )
    .await
    .ok(); // ignore if table doesn't exist
    execute_on_handle(
        &state.product_db,
        &format!("DELETE FROM connection_filter_configs WHERE connection_id = '{esc_id}'"),
    )
    .await
    .ok();
    execute_on_handle(
        &state.product_db,
        &format!("DELETE FROM connections WHERE id = '{esc_id}'"),
    )
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/connections/:id/test
pub async fn test_connection(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    // Get db_type first
    let rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT db_type FROM connections WHERE id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await?;
    let db_type = extract_text(
        rows.first()
            .ok_or_else(|| anyhow::anyhow!("connection not found"))?
            .first()
            .ok_or_else(|| anyhow::anyhow!("no db_type column"))?,
    );

    match open_analytics_conn(&state, &conn_id).await {
        Ok((mut conn, backend)) => {
            match backend.execute_any(&mut conn, "SELECT 1", vec![]).await {
                Ok(_) => Ok(Json(serde_json::json!({ "ok": true, "db_type": db_type }))),
                Err(e) => Ok(Json(
                    serde_json::json!({ "ok": false, "error": e.to_string(), "db_type": db_type }),
                )),
            }
        }
        Err(e) => Ok(Json(
            serde_json::json!({ "ok": false, "error": e.to_string(), "db_type": db_type }),
        )),
    }
}

/// GET /api/connections/:id/schema
pub async fn get_schema_config(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT id, connection_id, user_id_field, timestamp_field, event_name_field, \
             events_table, custom_properties, session_timeout_minutes, updated_at \
             FROM connection_schema_configs WHERE connection_id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await;

    match rows {
        Ok(rows) if !rows.is_empty() => {
            let r = &rows[0];
            let custom_props: Vec<CustomPropertyDto> =
                serde_json::from_str(&extract_text(&r[6])).unwrap_or_default();
            let config = SchemaConfigRow {
                id: extract_text(&r[0]),
                connection_id: extract_text(&r[1]),
                user_id_field: extract_text(&r[2]),
                timestamp_field: extract_text(&r[3]),
                event_name_field: extract_text(&r[4]),
                events_table: extract_text(&r[5]),
                custom_properties: custom_props,
                session_timeout_minutes: extract_int(&r[7]),
                updated_at: extract_text(&r[8]),
            };
            Ok(Json(serde_json::json!(config)))
        }
        _ => Ok(Json(serde_json::json!(null))),
    }
}

/// PUT /api/connections/:id/schema
pub async fn upsert_schema_config(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
    Json(body): Json<SchemaConfigBody>,
) -> Result<impl IntoResponse, ApiError> {
    let now = now_iso();
    let custom_props_json = sql_escape(&serde_json::to_string(&body.custom_properties)?);
    let esc_id = sql_escape(&conn_id);

    // Check if exists
    let existing = execute_on_handle(
        &state.product_db,
        &format!("SELECT id FROM connection_schema_configs WHERE connection_id = '{esc_id}'"),
    )
    .await;

    if let Ok(ref rows) = existing {
        if !rows.is_empty() {
            let sql = format!(
                "UPDATE connection_schema_configs SET user_id_field = '{}', timestamp_field = '{}', \
                 event_name_field = '{}', events_table = '{}', custom_properties = '{}', \
                 session_timeout_minutes = {}, updated_at = '{}' WHERE connection_id = '{}'",
                sql_escape(&body.user_id_field),
                sql_escape(&body.timestamp_field),
                sql_escape(&body.event_name_field),
                sql_escape(&body.events_table),
                custom_props_json,
                body.session_timeout_minutes,
                sql_escape(&now),
                esc_id,
            );
            execute_on_handle(&state.product_db, &sql).await?;
            return get_schema_config(State(state), Path(conn_id)).await;
        }
    }

    // Insert
    let id = uuid::Uuid::new_v4().to_string();
    let sql = format!(
        "INSERT INTO connection_schema_configs (id, connection_id, user_id_field, timestamp_field, \
         event_name_field, events_table, custom_properties, session_timeout_minutes, updated_at) \
         VALUES ('{}', '{}', '{}', '{}', '{}', '{}', '{}', {}, '{}')",
        sql_escape(&id),
        esc_id,
        sql_escape(&body.user_id_field),
        sql_escape(&body.timestamp_field),
        sql_escape(&body.event_name_field),
        sql_escape(&body.events_table),
        custom_props_json,
        body.session_timeout_minutes,
        sql_escape(&now),
    );
    execute_on_handle(&state.product_db, &sql).await?;
    get_schema_config(State(state), Path(conn_id)).await
}

/// GET /api/connections/:id/filters
pub async fn get_filter_config(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT id, connection_id, filter_fields, updated_at \
             FROM connection_filter_configs WHERE connection_id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await;

    match rows {
        Ok(rows) if !rows.is_empty() => {
            let r = &rows[0];
            let filter_fields: Vec<FilterFieldDto> =
                serde_json::from_str(&extract_text(&r[2])).unwrap_or_default();
            let config = FilterConfigRow {
                id: extract_text(&r[0]),
                connection_id: extract_text(&r[1]),
                filter_fields,
                updated_at: extract_text(&r[3]),
            };
            Ok(Json(serde_json::json!(config)))
        }
        _ => Ok(Json(serde_json::json!(null))),
    }
}

/// PUT /api/connections/:id/filters
pub async fn upsert_filter_config(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
    Json(body): Json<FilterConfigBody>,
) -> Result<impl IntoResponse, ApiError> {
    let now = now_iso();
    let filter_fields_json = sql_escape(&serde_json::to_string(&body.filter_fields)?);
    let esc_id = sql_escape(&conn_id);

    let existing = execute_on_handle(
        &state.product_db,
        &format!("SELECT id FROM connection_filter_configs WHERE connection_id = '{esc_id}'"),
    )
    .await;

    if let Ok(ref rows) = existing {
        if !rows.is_empty() {
            let sql = format!(
                "UPDATE connection_filter_configs SET filter_fields = '{}', updated_at = '{}' \
                 WHERE connection_id = '{}'",
                filter_fields_json,
                sql_escape(&now),
                esc_id,
            );
            execute_on_handle(&state.product_db, &sql).await?;
            return get_filter_config(State(state), Path(conn_id)).await;
        }
    }

    let id = uuid::Uuid::new_v4().to_string();
    let sql = format!(
        "INSERT INTO connection_filter_configs (id, connection_id, filter_fields, updated_at) \
         VALUES ('{}', '{}', '{}', '{}')",
        sql_escape(&id),
        esc_id,
        filter_fields_json,
        sql_escape(&now),
    );
    execute_on_handle(&state.product_db, &sql).await?;
    get_filter_config(State(state), Path(conn_id)).await
}

/// GET /api/connections/:id/filter-options
pub async fn get_filter_options(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    // Get filter config to know which fields to query
    let config_rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT filter_fields FROM connection_filter_configs WHERE connection_id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await;

    let filter_fields: Vec<FilterFieldDto> = match config_rows {
        Ok(ref rows) if !rows.is_empty() => {
            serde_json::from_str(&extract_text(&rows[0][0])).unwrap_or_default()
        }
        _ => vec![],
    };

    if filter_fields.is_empty() {
        return Ok(Json(serde_json::json!({ "options": {} })));
    }

    // Get schema config to know the events table
    let schema_rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT events_table FROM connection_schema_configs WHERE connection_id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await;

    let events_table = match schema_rows {
        Ok(ref rows) if !rows.is_empty() => extract_text(&rows[0][0]),
        _ => {
            return Ok(Json(serde_json::json!({ "options": {} })));
        }
    };

    let (mut conn, backend) = open_analytics_conn(&state, &conn_id).await?;
    let quote = backend.identifier_quote_char();

    let mut options = serde_json::Map::new();
    for ff in &filter_fields {
        let safe_field = ff.field.replace(quote, "");
        let safe_table = events_table.replace(quote, "");
        let sql = format!(
            "SELECT DISTINCT {q}{field}{q} FROM {q}{table}{q} WHERE {q}{field}{q} IS NOT NULL ORDER BY {q}{field}{q} LIMIT 500",
            q = quote,
            field = safe_field,
            table = safe_table,
        );
        match backend.execute_any(&mut conn, &sql, vec![]).await {
            Ok(rows) => {
                let vals: Vec<Value> = rows
                    .into_iter()
                    .filter_map(|r| r.into_iter().next())
                    .map(|v| match v {
                        SqlValue::Text(s) => Value::String(s),
                        SqlValue::Int(i) => Value::Number(i.into()),
                        SqlValue::Float(f) => {
                            serde_json::Number::from_f64(f)
                                .map(Value::Number)
                                .unwrap_or(Value::Null)
                        }
                        SqlValue::Bool(b) => Value::Bool(b),
                        SqlValue::Null => Value::Null,
                    })
                    .collect();
                options.insert(ff.name.clone(), Value::Array(vals));
            }
            Err(_) => {
                options.insert(ff.name.clone(), Value::Array(vec![]));
            }
        }
    }

    Ok(Json(serde_json::json!({ "options": options })))
}

/// GET /api/connections/:id/field-options?field=
pub async fn get_field_options(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
    Query(q): Query<FieldOptionsQuery>,
) -> Result<impl IntoResponse, ApiError> {
    // Get schema config for events table
    let schema_rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT events_table FROM connection_schema_configs WHERE connection_id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await;

    let events_table = match schema_rows {
        Ok(ref rows) if !rows.is_empty() => extract_text(&rows[0][0]),
        _ => return Err(anyhow::anyhow!("no schema config found").into()),
    };

    let (mut conn, backend) = open_analytics_conn(&state, &conn_id).await?;
    let quote = backend.identifier_quote_char();
    let safe_field = q.field.replace(quote, "");
    let safe_table = events_table.replace(quote, "");

    let sql = format!(
        "SELECT DISTINCT {q}{field}{q} FROM {q}{table}{q} WHERE {q}{field}{q} IS NOT NULL ORDER BY {q}{field}{q} LIMIT 500",
        q = quote,
        field = safe_field,
        table = safe_table,
    );

    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;
    let values: Vec<Value> = rows
        .into_iter()
        .filter_map(|r| r.into_iter().next())
        .map(|v| match v {
            SqlValue::Text(s) => Value::String(s),
            SqlValue::Int(i) => Value::Number(i.into()),
            SqlValue::Float(f) => serde_json::Number::from_f64(f)
                .map(Value::Number)
                .unwrap_or(Value::Null),
            SqlValue::Bool(b) => Value::Bool(b),
            SqlValue::Null => Value::Null,
        })
        .collect();

    Ok(Json(serde_json::json!({ "field": q.field, "values": values })))
}

/// GET /api/connections/:id/credentials
pub async fn get_credentials(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT credentials_encrypted FROM connections WHERE id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await?;

    let r = rows.first().ok_or_else(|| anyhow::anyhow!("connection not found"))?;
    let encrypted = extract_text(&r[0]);
    let decrypted = decrypt_credentials(&encrypted, &state.encryption_key)?;
    let creds: Value = serde_json::from_str(&decrypted)?;

    // Mask sensitive fields
    let masked = match creds {
        Value::Object(map) => {
            let mut masked_map = serde_json::Map::new();
            for (k, v) in map {
                let lower = k.to_lowercase();
                if lower.contains("password") || lower.contains("token") || lower.contains("secret")
                {
                    masked_map.insert(k, Value::String("*******".to_string()));
                } else {
                    masked_map.insert(k, v);
                }
            }
            Value::Object(masked_map)
        }
        other => other,
    };

    Ok(Json(serde_json::json!({ "fields": masked })))
}

/// GET /api/connections/:id/schema/detect
pub async fn detect_schema(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &conn_id).await?;
    let schema_info = backend.detect_schema(&mut conn, None).await?;

    let columns: Vec<Value> = schema_info
        .columns
        .iter()
        .map(|c| serde_json::json!({ "name": c.name, "type": c.sql_type }))
        .collect();

    let proposed: Vec<Value> = schema_info
        .proposed_custom_properties
        .iter()
        .map(|p| serde_json::json!({ "name": p.name, "path": p.path, "type": p.prop_type }))
        .collect();

    Ok(Json(serde_json::json!({
        "tables": schema_info.tables,
        "events_table": schema_info.events_table,
        "columns": columns,
        "suggestions": schema_info.suggestions,
        "proposed_custom_properties": proposed,
    })))
}

/// GET /api/connections/:id/browse?catalog=&schema=
pub async fn browse_connection(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
    Query(q): Query<BrowseQuery>,
) -> Result<impl IntoResponse, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &conn_id).await?;
    let items = backend
        .browse(
            &mut conn,
            q.catalog.as_deref(),
            q.schema.as_deref(),
        )
        .await?;

    Ok(Json(serde_json::json!({ "items": items })))
}

/// GET /api/connections/:id/string
pub async fn get_connection_string(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let rows = execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT db_type, credentials_encrypted FROM connections WHERE id = '{}'",
            sql_escape(&conn_id)
        ),
    )
    .await?;
    let r = rows.first().ok_or_else(|| anyhow::anyhow!("connection not found"))?;
    let db_type = extract_text(&r[0]);
    let encrypted = extract_text(&r[1]);
    let decrypted = decrypt_credentials(&encrypted, &state.encryption_key)?;
    let creds: serde_json::Value = serde_json::from_str(&decrypted)?;

    let connection_string = match db_type.as_str() {
        "duckdb" => creds.get("file_path")
            .or_else(|| creds.get("s3_path"))
            .and_then(|v| v.as_str())
            .map(|p| format!("duckdb://{p}")),
        "sqlite" => creds.get("file_path")
            .and_then(|v| v.as_str())
            .map(|p| format!("sqlite://{p}")),
        "postgresql" => {
            let host = creds.get("host").and_then(|v| v.as_str()).unwrap_or("localhost");
            let port = creds.get("port").and_then(|v| v.as_u64()).unwrap_or(5432);
            let db = creds.get("database").and_then(|v| v.as_str()).unwrap_or("");
            let user = creds.get("user").or_else(|| creds.get("username")).and_then(|v| v.as_str()).unwrap_or("");
            Some(format!("postgresql://{user}@{host}:{port}/{db}"))
        }
        _ => None,
    };

    Ok(Json(serde_json::json!({ "connection_string": connection_string })))
}

/// GET /api/connections/:id/tables
pub async fn list_tables(
    State(state): State<AppState>,
    Path(conn_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &conn_id).await?;
    let tables = backend.get_tables(&mut conn).await?;
    Ok(Json(serde_json::json!({ "tables": tables })))
}
