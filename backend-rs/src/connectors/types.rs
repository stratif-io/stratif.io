use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum SqlValue {
    Int(i64),
    Float(f64),
    Text(String),
    Bool(bool),
    Null,
}

pub type Row = Vec<SqlValue>;

#[derive(Debug, Clone)]
pub struct ColumnInfo {
    pub name: String,
    pub sql_type: String,
}

#[derive(Debug, Clone)]
pub struct SchemaInfo {
    pub tables: Vec<String>,
    pub events_table: String,
    pub columns: Vec<ColumnInfo>,
    pub suggestions: HashMap<String, String>,
    pub proposed_custom_properties: Vec<CustomProperty>,
}

#[derive(Debug, Clone)]
pub struct CustomProperty {
    pub name: String,
    pub path: String,
    pub prop_type: String,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BrowseKind {
    Schema,
    Table,
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowseNode {
    pub name: String,
    pub full_name: String,
    pub kind: BrowseKind,
}
