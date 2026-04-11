// src-tauri/src/models/league.rs
use serde::{Deserialize, Serialize};
use crate::models::Team;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct League {
    pub id: String,
    pub name: String,
    pub country: String,
    #[serde(default)]
    pub teams: Vec<Team>,
}

pub const BRA_SERIE_A: &str = "bra-serie-a";
pub const BRA_SERIE_B: &str = "bra-serie-b";

/// Schema bruto do leagues.json (TeamIds são strings — o loader popula os Teams depois).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct LeaguesFile {
    pub leagues: Vec<LeagueRecord>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct LeagueRecord {
    pub id: String,
    pub name: String,
    pub country: String,
    pub team_ids: Vec<String>,
}