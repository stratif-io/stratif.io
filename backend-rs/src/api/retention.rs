use axum::{extract::{Query, State}, Json};
use serde::{Deserialize, Serialize};

use super::error::{ApiError, DataResponse};
use super::state::{open_analytics_conn, AppState};
use crate::connectors::types::SqlValue;
use crate::query::retention::build_retention_query;

#[derive(Deserialize)]
pub struct RetentionParams {
    pub connection_id: String,
    pub start_date: String,
    pub end_date: String,
    #[serde(default = "default_granularity")]
    pub granularity: String,
    pub event_name: Option<String>,
}

fn default_granularity() -> String { "day".into() }

#[derive(Serialize)]
pub struct RetentionMilestone {
    pub period: i64,
    pub retained: i64,
}

#[derive(Serialize)]
pub struct CohortRow {
    pub cohort_date: String,
    pub cohort_size: i64,
    pub milestones: Vec<RetentionMilestone>,
}

pub async fn get_retention(
    State(state): State<AppState>,
    Query(params): Query<RetentionParams>,
) -> Result<Json<DataResponse<Vec<CohortRow>>>, ApiError> {
    let (mut conn, backend) = open_analytics_conn(&state, &params.connection_id).await?;
    let sql = build_retention_query(
        backend,
        &params.start_date, &params.end_date,
        &params.granularity,
        params.event_name.as_deref(),
    );
    let rows = backend.execute_any(&mut conn, &sql, vec![]).await?;

    // Group rows by cohort_date
    use std::collections::BTreeMap;
    let mut cohorts: BTreeMap<String, (i64, Vec<RetentionMilestone>)> = BTreeMap::new();

    for row in rows {
        let cohort_date = match &row[0] { SqlValue::Text(s) => s.clone(), other => format!("{other:?}") };
        let cohort_size = match &row[1] { SqlValue::Int(n) => *n, _ => 0 };
        let period = match &row[2] { SqlValue::Int(n) => *n, _ => continue };
        let retained = match &row[3] { SqlValue::Int(n) => *n, _ => 0 };

        let entry = cohorts.entry(cohort_date).or_insert((cohort_size, vec![]));
        entry.0 = cohort_size;
        entry.1.push(RetentionMilestone { period, retained });
    }

    let result: Vec<CohortRow> = cohorts.into_iter().map(|(cohort_date, (cohort_size, milestones))| {
        CohortRow { cohort_date, cohort_size, milestones }
    }).collect();

    Ok(Json(DataResponse { data: result }))
}
