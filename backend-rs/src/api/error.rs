use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

/// Wrapper so handlers can return `Result<_, ApiError>` and use `?` freely.
pub struct ApiError(pub anyhow::Error);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let msg = self.0.to_string();
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response()
    }
}

impl<E: Into<anyhow::Error>> From<E> for ApiError {
    fn from(e: E) -> Self {
        ApiError(e.into())
    }
}

/// Standard envelope: `{ "data": T }`.
#[derive(Serialize)]
pub struct DataResponse<T: Serialize> {
    pub data: T,
}

/// Property filter from query params / JSON body.
#[derive(serde::Deserialize, Clone, Debug)]
pub struct Filter {
    pub property: String,
    pub operator: String,
    pub value: String,
}

impl Filter {
    /// Convert to a SQL WHERE fragment using the dialect's quoting.
    pub fn to_sql(&self, quote: char) -> String {
        let col = format!("{quote}{}{quote}", self.property);
        let val = self.value.replace('\'', "''"); // basic SQL escape
        match self.operator.as_str() {
            "equals" => format!("{col} = '{val}'"),
            "not_equals" => format!("{col} != '{val}'"),
            "contains" => format!("{col} LIKE '%{val}%'"),
            "not_contains" => format!("{col} NOT LIKE '%{val}%'"),
            "greater_than" => format!("{col} > '{val}'"),
            "less_than" => format!("{col} < '{val}'"),
            "is_set" => format!("{col} IS NOT NULL"),
            "is_not_set" => format!("{col} IS NULL"),
            _ => format!("{col} = '{val}'"),
        }
    }
}

/// Build a combined WHERE fragment from a slice of filters (with leading " AND").
pub fn filters_to_sql(filters: &[Filter], quote: char) -> String {
    if filters.is_empty() {
        String::new()
    } else {
        let clauses: Vec<String> = filters.iter().map(|f| f.to_sql(quote)).collect();
        format!(" AND {}", clauses.join(" AND "))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filter_equals_to_sql() {
        let f = Filter {
            property: "country".into(),
            operator: "equals".into(),
            value: "US".into(),
        };
        assert_eq!(f.to_sql('"'), r#""country" = 'US'"#);
    }

    #[test]
    fn filter_contains_to_sql() {
        let f = Filter {
            property: "page".into(),
            operator: "contains".into(),
            value: "pricing".into(),
        };
        assert_eq!(f.to_sql('"'), r#""page" LIKE '%pricing%'"#);
    }

    #[test]
    fn filter_sql_injection_escaped() {
        let f = Filter {
            property: "name".into(),
            operator: "equals".into(),
            value: "O'Brien".into(),
        };
        assert_eq!(f.to_sql('"'), r#""name" = 'O''Brien'"#);
    }

    #[test]
    fn filters_to_sql_empty() {
        assert_eq!(filters_to_sql(&[], '"'), "");
    }

    #[test]
    fn filters_to_sql_multiple() {
        let filters = vec![
            Filter { property: "a".into(), operator: "equals".into(), value: "1".into() },
            Filter { property: "b".into(), operator: "not_equals".into(), value: "2".into() },
        ];
        assert_eq!(
            filters_to_sql(&filters, '"'),
            r#" AND "a" = '1' AND "b" != '2'"#
        );
    }

    #[test]
    fn filter_deserialize() {
        let json = r#"{"property":"country","operator":"equals","value":"US"}"#;
        let f: Filter = serde_json::from_str(json).unwrap();
        assert_eq!(f.property, "country");
    }
}
