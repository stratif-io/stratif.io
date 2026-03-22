use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

pub struct SqliteBackend;
impl SqliteBackend { pub fn new() -> Self { Self } }

impl SqlDialect for SqliteBackend {
    fn dialect_name(&self) -> &'static str { "sqlite" }
    fn identifier_quote_char(&self) -> char { '"' }

    fn date_trunc(&self, unit: &str, col: &str) -> String {
        match unit {
            "hour"  => format!("STRFTIME('%Y-%m-%d %H:00:00', {col})"),
            "day"   => format!("DATE({col})"),
            "week"  => format!("DATE({col}, 'weekday 1', '-6 days')"),
            "month" => format!("STRFTIME('%Y-%m-01', {col})"),
            "year"  => format!("STRFTIME('%Y-01-01', {col})"),
            _       => format!("DATE({col})"),
        }
    }
    fn date_diff_days(&self, start: &str, end: &str) -> String {
        format!("CAST(julianday({end}) - julianday({start}) AS INTEGER)")
    }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String {
        format!("(STRFTIME('%s', {end}) - STRFTIME('%s', {start}))")
    }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("(STRFTIME('%s', {later}) - STRFTIME('%s', {earlier})) > {}", minutes * 60)
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("CAST({expr} AS TEXT)") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        format!("json_extract({col}, '$.{key}')")
    }
    fn extract_hour(&self, col: &str) -> String { format!("CAST(STRFTIME('%H', {col}) AS INTEGER)") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("CAST(STRFTIME('%w', {col}) AS INTEGER)") }
    fn extract_year(&self, col: &str) -> String { format!("CAST(STRFTIME('%Y', {col}) AS INTEGER)") }
    fn extract_month(&self, col: &str) -> String { format!("CAST(STRFTIME('%m', {col}) AS INTEGER)") }
    fn extract_week(&self, col: &str) -> String { format!("CAST(STRFTIME('%W', {col}) AS INTEGER)") }
    fn extract_quarter(&self, col: &str) -> String {
        format!("CAST((CAST(STRFTIME('%m', {col}) AS INTEGER) + 2) / 3 AS INTEGER)")
    }
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
    fn b() -> SqliteBackend { SqliteBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "sqlite"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '"'); }
    #[test] fn date_trunc_day() { assert_eq!(b().date_trunc("day", "ts"), "DATE(ts)"); }
    #[test] fn date_trunc_hour() { assert_eq!(b().date_trunc("hour", "ts"), "STRFTIME('%Y-%m-%d %H:00:00', ts)"); }
    #[test] fn date_trunc_month() { assert_eq!(b().date_trunc("month", "ts"), "STRFTIME('%Y-%m-01', ts)"); }
    #[test] fn date_trunc_week() { assert_eq!(b().date_trunc("week", "ts"), "DATE(ts, 'weekday 1', '-6 days')"); }
    #[test] fn date_trunc_year() { assert_eq!(b().date_trunc("year", "ts"), "STRFTIME('%Y-01-01', ts)"); }
    #[test] fn date_diff_days() { assert_eq!(b().date_diff_days("a", "b"), "CAST(julianday(b) - julianday(a) AS INTEGER)"); }
    #[test] fn epoch_diff_seconds() { assert_eq!(b().epoch_diff_seconds("a", "b"), "(STRFTIME('%s', b) - STRFTIME('%s', a))"); }
    #[test] fn interval_minutes_exceeded() { assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "(STRFTIME('%s', l) - STRFTIME('%s', e)) > 1800"); }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "CAST(x AS TEXT)"); }
    #[test] fn json_extract_string() { assert_eq!(b().json_extract_string("props", "plan"), "json_extract(props, '$.plan')"); }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "CAST(STRFTIME('%H', ts) AS INTEGER)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "CAST(STRFTIME('%w', ts) AS INTEGER)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "a || b"); }
}
