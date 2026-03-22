use std::sync::Arc;
use anyhow::{anyhow, Context, Result};
use base64::Engine;
use sha2::{Digest, Sha256};

use crate::connectors::drivers::sqlite::SqliteHandle;
use crate::connectors::mod_types::BackendConnection;
use crate::connectors::BackendRegistry;
use crate::connectors::AnyBackend;

/// Shared application state, passed to every handler via `State<AppState>`.
#[derive(Clone)]
pub struct AppState {
    /// All registered analytics backends (DuckDB, Postgres, Snowflake, etc.).
    pub registry: Arc<BackendRegistry>,
    /// Product database (users, connections, credentials). SQLite actor handle.
    /// SqliteHandle contains an mpsc::Sender which is Clone+Send+Sync — no Mutex needed.
    pub product_db: SqliteHandle,
    /// Encryption key for decrypting stored credentials.
    pub encryption_key: Arc<String>,
}

/// Decrypt a Fernet-encrypted credential string.
/// Key derivation: SHA-256(raw_key_bytes) → URL-safe base64 → Fernet key.
/// This matches the Python backend's crypto.py derivation.
fn decrypt_credentials(encrypted: &str, encryption_key: &str) -> Result<String> {
    let hash = Sha256::digest(encryption_key.as_bytes());
    let fernet_key = base64::engine::general_purpose::URL_SAFE.encode(hash);
    let fernet = fernet::Fernet::new(&fernet_key)
        .ok_or_else(|| anyhow!("invalid fernet key derived from STRATIFIO_ENCRYPTION_KEY"))?;
    let decrypted_bytes = fernet
        .decrypt(encrypted)
        .map_err(|e| anyhow!("fernet decrypt failed: {e}"))?;
    String::from_utf8(decrypted_bytes).context("decrypted credentials are not valid UTF-8")
}

/// Open a fresh analytics database connection for the given `connection_id`.
///
/// Steps:
/// 1. Query the product DB: `SELECT credentials, driver FROM connections WHERE id = '{connection_id}'`
/// 2. Decrypt credentials with Fernet.
/// 3. Look up the backend driver: `registry.get(&driver)`.
/// 4. Open a new connection: `backend.open_any(creds_json_value).await`.
///
/// Returns `(BackendConnection, &dyn AnyBackend)` — the connection and backend reference.
/// The backend reference borrows from `state` which lives for the duration of the request.
pub async fn open_analytics_conn<'r>(
    state: &'r AppState,
    connection_id: &str,
) -> Result<(BackendConnection, &'r dyn AnyBackend)> {
    let rows = crate::connectors::drivers::sqlite::execute_on_handle(
        &state.product_db,
        &format!(
            "SELECT credentials, driver FROM connections WHERE id = '{}'",
            connection_id.replace('\'', "''")
        ),
    )
    .await
    .context("failed to query product DB for connection")?;

    let row = rows
        .first()
        .ok_or_else(|| anyhow!("connection '{connection_id}' not found in product DB"))?;

    let encrypted = match &row[0] {
        crate::connectors::types::SqlValue::Text(s) => s.clone(),
        _ => return Err(anyhow!("credentials column is not text")),
    };
    let driver = match &row[1] {
        crate::connectors::types::SqlValue::Text(s) => s.clone(),
        _ => return Err(anyhow!("driver column is not text")),
    };

    let decrypted_json = decrypt_credentials(&encrypted, &state.encryption_key)?;
    let creds_value: serde_json::Value = serde_json::from_str(&decrypted_json)
        .context("decrypted credentials are not valid JSON")?;

    let backend = state.registry.get(&driver)?;
    let conn = backend.open_any(creds_value).await?;

    Ok((conn, backend))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt_roundtrip() {
        let key = "test-encryption-key-that-is-32-chars!!";
        let hash = Sha256::digest(key.as_bytes());
        let fernet_key = base64::engine::general_purpose::URL_SAFE.encode(hash);
        let fernet = fernet::Fernet::new(&fernet_key).unwrap();

        let plaintext = r#"{"file_path": ":memory:"}"#;
        let encrypted = fernet.encrypt(plaintext.as_bytes());

        let decrypted = decrypt_credentials(&encrypted, key).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[tokio::test]
    async fn test_open_analytics_conn() {
        use crate::connectors::drivers::sqlite::SqliteBackend;
        use crate::connectors::backend::DatabaseBackend;
        use crate::connectors::drivers::sqlite::SqliteCredentials;

        let encryption_key = "test-encryption-key-that-is-32-chars!!";
        let hash = Sha256::digest(encryption_key.as_bytes());
        let fernet_key = base64::engine::general_purpose::URL_SAFE.encode(hash);
        let fernet_inst = fernet::Fernet::new(&fernet_key).unwrap();

        // Create in-memory product DB
        let sqlite_backend = SqliteBackend::new();
        let mut product_conn = DatabaseBackend::open(
            &sqlite_backend,
            &SqliteCredentials { file_path: ":memory:".into() },
        )
        .await
        .unwrap();

        let product_handle = match &product_conn {
            BackendConnection::Sqlite(h) => h.clone(),
            _ => panic!("expected Sqlite variant"),
        };

        // Create connections table and insert test row
        DatabaseBackend::execute(
            &sqlite_backend,
            &mut product_conn,
            "CREATE TABLE connections (id TEXT, credentials TEXT, driver TEXT)",
            vec![],
        )
        .await
        .unwrap();

        let creds_json = r#"{"file_path": ":memory:"}"#;
        let encrypted = fernet_inst.encrypt(creds_json.as_bytes());
        let insert_sql = format!(
            "INSERT INTO connections VALUES ('test-conn-1', '{}', 'duckdb')",
            encrypted
        );
        DatabaseBackend::execute(&sqlite_backend, &mut product_conn, &insert_sql, vec![])
            .await
            .unwrap();

        let state = AppState {
            registry: Arc::new(BackendRegistry::default()),
            product_db: product_handle,
            encryption_key: Arc::new(encryption_key.to_string()),
        };

        let (conn, backend) = open_analytics_conn(&state, "test-conn-1").await.unwrap();
        assert_eq!(backend.dialect_name(), "duckdb");
        match conn {
            BackendConnection::DuckDb(_) => {}
            _ => panic!("expected DuckDb connection"),
        }
    }
}
