pub mod any_backend;
pub mod backend;
pub mod dialect;
pub mod drivers;
pub mod mod_types;
pub mod types;

pub use any_backend::AnyBackend;
pub use backend::DatabaseBackend;
pub use dialect::SqlDialect;
pub use mod_types::BackendConnection;
pub use types::*;

use std::collections::HashMap;
use anyhow::{anyhow, Result};

use crate::connectors::drivers::{
    clickhouse::ClickHouseBackend,
    databricks::DatabricksBackend,
    duckdb::DuckDbBackend,
    postgres::PostgresBackend,
    snowflake::SnowflakeBackend,
    sqlite::SqliteBackend,
};

pub struct BackendRegistry {
    backends: HashMap<String, Box<dyn AnyBackend>>,
}

impl Default for BackendRegistry {
    fn default() -> Self {
        let mut r = Self { backends: HashMap::new() };
        r.register("duckdb",      DuckDbBackend::new());
        r.register("sqlite",      SqliteBackend::new());
        r.register("postgresql",  PostgresBackend::new());
        r.register("snowflake",   SnowflakeBackend::new());
        r.register("clickhouse",  ClickHouseBackend::new());
        r.register("databricks",  DatabricksBackend::new());
        r
    }
}

impl BackendRegistry {
    pub fn register<B: AnyBackend + 'static>(&mut self, name: &str, backend: B) {
        self.backends.insert(name.to_string(), Box::new(backend));
    }

    pub fn get(&self, db_type: &str) -> Result<&dyn AnyBackend> {
        self.backends
            .get(db_type)
            .map(|b| b.as_ref())
            .ok_or_else(|| anyhow!("Unsupported db_type: {db_type}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_has_all_drivers() {
        let reg = BackendRegistry::default();
        let cases = [
            ("duckdb",      "duckdb"),
            ("sqlite",      "sqlite"),
            ("postgresql",  "postgres"),
            ("snowflake",   "snowflake"),
            ("clickhouse",  "clickhouse"),
            ("databricks",  "databricks"),
        ];
        for (key, expected_dialect) in cases {
            let b = reg.get(key).expect(key);
            assert_eq!(b.dialect_name(), expected_dialect, "dialect_name mismatch for {key}");
        }
    }

    #[test]
    fn registry_unknown_key_errors() {
        let reg = BackendRegistry::default();
        assert!(reg.get("oracle").is_err());
    }
}
