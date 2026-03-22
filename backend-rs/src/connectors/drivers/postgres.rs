use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

pub struct PostgresBackend;
impl PostgresBackend { pub fn new() -> Self { Self } }

impl SqlDialect for PostgresBackend {
    fn dialect_name(&self) -> &'static str { "postgres" }
    fn identifier_quote_char(&self) -> char { '"' }

    fn date_trunc(&self, unit: &str, col: &str) -> String {
        format!("DATE_TRUNC('{unit}', {col})")
    }
    fn date_diff_days(&self, start: &str, end: &str) -> String {
        format!("CAST(EXTRACT(DAY FROM ({end}::timestamp - {start}::timestamp)) AS INTEGER)")
    }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String {
        format!("EXTRACT(EPOCH FROM ({end} - {start}))")
    }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("{later} - {earlier} > INTERVAL '{minutes} minutes'")
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("CAST({expr} AS TEXT)") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        let parts: Vec<&str> = key.split('.').collect();
        if parts.len() == 1 {
            format!("{col}->>'{key}'")
        } else {
            let keys = parts.iter().map(|p| format!("'{p}'")).collect::<Vec<_>>().join(", ");
            format!("json_extract_path_text({col}, {keys})")
        }
    }
    fn extract_hour(&self, col: &str) -> String { format!("CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("CAST(EXTRACT(DOW FROM {col}) AS INTEGER)") }
    fn extract_year(&self, col: &str) -> String { format!("CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)") }
    fn extract_month(&self, col: &str) -> String { format!("CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)") }
    fn extract_week(&self, col: &str) -> String { format!("CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)") }
    fn extract_quarter(&self, col: &str) -> String { format!("CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)") }
    fn string_concat(&self, parts: &[&str]) -> String { parts.join(" || ") }

    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        format!(
            "(SELECT \"{uid_field}\" AS user_id, \"{ts_field}\" AS timestamp, \"{en_field}\" AS event_name FROM \"{source_table}\")"
        )
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let cte_def = format!("events AS {cte_body}");
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH {cte_def}, {}", &q[5..])
        } else {
            format!("WITH {cte_def} {q}")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;
    fn b() -> PostgresBackend { PostgresBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "postgres"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '"'); }
    #[test] fn date_trunc() { assert_eq!(b().date_trunc("day", "ts"), "DATE_TRUNC('day', ts)"); }
    #[test] fn date_diff_days() {
        assert_eq!(b().date_diff_days("a", "b"), "CAST(EXTRACT(DAY FROM (b::timestamp - a::timestamp)) AS INTEGER)");
    }
    #[test] fn epoch_diff_seconds() {
        assert_eq!(b().epoch_diff_seconds("a", "b"), "EXTRACT(EPOCH FROM (b - a))");
    }
    #[test] fn interval_minutes_exceeded() {
        assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "l - e > INTERVAL '30 minutes'");
    }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "CAST(x AS TEXT)"); }
    #[test] fn json_extract_simple() {
        assert_eq!(b().json_extract_string("props", "plan"), "props->>'plan'");
    }
    #[test] fn json_extract_nested() {
        assert_eq!(b().json_extract_string("props", "a.b"), "json_extract_path_text(props, 'a', 'b')");
    }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "CAST(EXTRACT(HOUR FROM ts) AS INTEGER)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "CAST(EXTRACT(DOW FROM ts) AS INTEGER)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "a || b"); }
}
