use crate::connectors::types::CustomProperty;

pub trait SqlDialect: Send + Sync {
    fn dialect_name(&self) -> &'static str;
    fn identifier_quote_char(&self) -> char;

    fn date_trunc(&self, unit: &str, col: &str) -> String;
    fn date_diff_days(&self, start: &str, end: &str) -> String;
    fn epoch_diff_seconds(&self, start: &str, end: &str) -> String;
    fn interval_minutes_exceeded(&self, earlier: &str, later: &str, minutes: u32) -> String;

    fn cast_to_text(&self, expr: &str) -> String;
    fn json_extract_string(&self, col: &str, key: &str) -> String;
    fn extract_hour(&self, col: &str) -> String;
    fn extract_day_of_week(&self, col: &str) -> String;
    fn extract_year(&self, col: &str) -> String;
    fn extract_month(&self, col: &str) -> String;
    fn extract_week(&self, col: &str) -> String;
    fn extract_quarter(&self, col: &str) -> String;

    fn string_concat(&self, parts: &[&str]) -> String;

    fn build_events_cte(
        &self,
        source_table: &str,
        uid_field: &str,
        ts_field: &str,
        en_field: &str,
        custom_props: &[CustomProperty],
    ) -> String;

    fn prepend_events_cte(&self, cte_body: &str, query: &str) -> String;
}
