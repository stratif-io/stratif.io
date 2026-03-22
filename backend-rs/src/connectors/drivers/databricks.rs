use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

pub struct DatabricksBackend;
impl DatabricksBackend { pub fn new() -> Self { Self } }

impl SqlDialect for DatabricksBackend {
    fn dialect_name(&self) -> &'static str { "databricks" }
    fn identifier_quote_char(&self) -> char { '`' }

    fn date_trunc(&self, unit: &str, col: &str) -> String { format!("DATE_TRUNC('{unit}', {col})") }
    fn date_diff_days(&self, start: &str, end: &str) -> String { format!("DATEDIFF({end}, {start})") }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String {
        format!("(unix_timestamp({end}) - unix_timestamp({start}))")
    }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("(unix_timestamp({later}) - unix_timestamp({earlier})) > {}", minutes * 60)
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("CAST({expr} AS STRING)") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        format!("get_json_object({col}, '$.{key}')")
    }
    fn extract_hour(&self, col: &str) -> String { format!("CAST(EXTRACT(HOUR FROM {col}) AS INTEGER)") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("CAST(EXTRACT(DAYOFWEEK FROM {col}) AS INTEGER)") }
    fn extract_year(&self, col: &str) -> String { format!("CAST(EXTRACT(YEAR FROM {col}) AS INTEGER)") }
    fn extract_month(&self, col: &str) -> String { format!("CAST(EXTRACT(MONTH FROM {col}) AS INTEGER)") }
    fn extract_week(&self, col: &str) -> String { format!("CAST(EXTRACT(WEEK FROM {col}) AS INTEGER)") }
    fn extract_quarter(&self, col: &str) -> String { format!("CAST(EXTRACT(QUARTER FROM {col}) AS INTEGER)") }
    fn string_concat(&self, parts: &[&str]) -> String { parts.join(" || ") }

    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        format!(
            "(SELECT `{uid_field}` AS user_id, `{ts_field}` AS timestamp, `{en_field}` AS event_name FROM `{source_table}`)"
        )
    }
    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String {
        let q = query.trim();
        let upper = q.to_uppercase();
        if upper.starts_with("WITH ") {
            format!("WITH events AS {cte_body}, {}", &q[5..])
        } else {
            format!("WITH events AS {cte_body} {q}")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::connectors::dialect::SqlDialect;
    fn b() -> DatabricksBackend { DatabricksBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "databricks"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '`'); }
    #[test] fn date_trunc() { assert_eq!(b().date_trunc("day", "ts"), "DATE_TRUNC('day', ts)"); }
    #[test] fn date_diff_days() { assert_eq!(b().date_diff_days("a", "b"), "DATEDIFF(b, a)"); }
    #[test] fn epoch_diff_seconds() {
        assert_eq!(b().epoch_diff_seconds("a", "b"), "(unix_timestamp(b) - unix_timestamp(a))");
    }
    #[test] fn interval_minutes_exceeded() {
        assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "(unix_timestamp(l) - unix_timestamp(e)) > 1800");
    }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "CAST(x AS STRING)"); }
    #[test] fn json_extract_string() {
        assert_eq!(b().json_extract_string("props", "plan"), "get_json_object(props, '$.plan')");
    }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "CAST(EXTRACT(HOUR FROM ts) AS INTEGER)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "CAST(EXTRACT(DAYOFWEEK FROM ts) AS INTEGER)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "a || b"); }
}
