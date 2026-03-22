use crate::connectors::dialect::SqlDialect;
use crate::connectors::types::CustomProperty;

pub struct ClickHouseBackend;
impl ClickHouseBackend { pub fn new() -> Self { Self } }

impl SqlDialect for ClickHouseBackend {
    fn dialect_name(&self) -> &'static str { "clickhouse" }
    fn identifier_quote_char(&self) -> char { '`' }

    fn date_trunc(&self, unit: &str, col: &str) -> String {
        let fn_name = match unit {
            "hour"    => "toStartOfHour",
            "day"     => "toStartOfDay",
            "week"    => "toStartOfWeek",
            "month"   => "toStartOfMonth",
            "quarter" => "toStartOfQuarter",
            "year"    => "toStartOfYear",
            _         => "toStartOfDay",
        };
        format!("{fn_name}({col})")
    }
    fn date_diff_days(&self, start: &str, end: &str) -> String { format!("dateDiff('day', {start}, {end})") }
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String { format!("dateDiff('second', {start}, {end})") }
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String {
        format!("dateDiff('minute', {earlier}, {later}) > {minutes}")
    }
    fn cast_to_text(&self, expr: &str) -> String { format!("toString({expr})") }
    fn json_extract_string(&self, col: &str, key: &str) -> String {
        format!("JSONExtractString({col}, '{key}')")
    }
    fn extract_hour(&self, col: &str) -> String { format!("toHour({col})") }
    fn extract_day_of_week(&self, col: &str) -> String { format!("toDayOfWeek({col})") }
    fn extract_year(&self, col: &str) -> String { format!("toYear({col})") }
    fn extract_month(&self, col: &str) -> String { format!("toMonth({col})") }
    fn extract_week(&self, col: &str) -> String { format!("toWeek({col})") }
    fn extract_quarter(&self, col: &str) -> String { format!("toQuarter({col})") }
    fn string_concat(&self, parts: &[&str]) -> String {
        format!("concat({})", parts.join(", "))
    }
    fn build_events_cte(&self, source_table: &str, uid_field: &str, ts_field: &str, en_field: &str, _custom_props: &[CustomProperty]) -> String {
        format!(
            "(SELECT `{uid_field}` AS user_id, `{ts_field}` AS timestamp, `{en_field}` AS event_name FROM `{source_table}`)"
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
    fn b() -> ClickHouseBackend { ClickHouseBackend::new() }

    #[test] fn dialect_name() { assert_eq!(b().dialect_name(), "clickhouse"); }
    #[test] fn identifier_quote_char() { assert_eq!(b().identifier_quote_char(), '`'); }
    #[test] fn date_trunc_day() { assert_eq!(b().date_trunc("day", "ts"), "toStartOfDay(ts)"); }
    #[test] fn date_trunc_hour() { assert_eq!(b().date_trunc("hour", "ts"), "toStartOfHour(ts)"); }
    #[test] fn date_trunc_month() { assert_eq!(b().date_trunc("month", "ts"), "toStartOfMonth(ts)"); }
    #[test] fn date_trunc_week() { assert_eq!(b().date_trunc("week", "ts"), "toStartOfWeek(ts)"); }
    #[test] fn date_trunc_quarter() { assert_eq!(b().date_trunc("quarter", "ts"), "toStartOfQuarter(ts)"); }
    #[test] fn date_trunc_year() { assert_eq!(b().date_trunc("year", "ts"), "toStartOfYear(ts)"); }
    #[test] fn date_diff_days() { assert_eq!(b().date_diff_days("a", "b"), "dateDiff('day', a, b)"); }
    #[test] fn epoch_diff_seconds() { assert_eq!(b().epoch_diff_seconds("a", "b"), "dateDiff('second', a, b)"); }
    #[test] fn interval_minutes_exceeded() {
        assert_eq!(b().interval_minutes_exceeded("e", "l", 30), "dateDiff('minute', e, l) > 30");
    }
    #[test] fn cast_to_text() { assert_eq!(b().cast_to_text("x"), "toString(x)"); }
    #[test] fn json_extract_string() {
        assert_eq!(b().json_extract_string("props", "plan"), "JSONExtractString(props, 'plan')");
    }
    #[test] fn extract_hour() { assert_eq!(b().extract_hour("ts"), "toHour(ts)"); }
    #[test] fn extract_day_of_week() { assert_eq!(b().extract_day_of_week("ts"), "toDayOfWeek(ts)"); }
    #[test] fn extract_year() { assert_eq!(b().extract_year("ts"), "toYear(ts)"); }
    #[test] fn extract_month() { assert_eq!(b().extract_month("ts"), "toMonth(ts)"); }
    #[test] fn extract_week() { assert_eq!(b().extract_week("ts"), "toWeek(ts)"); }
    #[test] fn extract_quarter() { assert_eq!(b().extract_quarter("ts"), "toQuarter(ts)"); }
    #[test] fn string_concat() { assert_eq!(b().string_concat(&["a", "b"]), "concat(a, b)"); }
}
