use std::collections::{BTreeMap, HashSet};
use std::fs;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const LEAGUES_FILE: &str = "resources/data/leagues.json";
const TEAMS_FILE: &str = "resources/data/teams.json";
const PLAYERS_FILE: &str = "resources/data/players.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPatchMetadata {
    pub patch_id: String,
    pub base_version: Option<String>,
    pub author: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EntityPatch {
    #[serde(default)]
    pub upserts: Vec<Value>,
    #[serde(default)]
    pub deletes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataPatch {
    pub metadata: DataPatchMetadata,
    #[serde(default)]
    pub leagues: EntityPatch,
    #[serde(default)]
    pub teams: EntityPatch,
    #[serde(default)]
    pub players: EntityPatch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataBundle {
    pub leagues: Vec<Value>,
    pub teams: Vec<Value>,
    pub players: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ApplyDataPatchReport {
    pub dry_run: bool,
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub leagues_upserts: usize,
    pub leagues_deletes: usize,
    pub teams_upserts: usize,
    pub teams_deletes: usize,
    pub players_upserts: usize,
    pub players_deletes: usize,
    pub resulting_leagues: usize,
    pub resulting_teams: usize,
    pub resulting_players: usize,
}

fn asset_path(relative: &str) -> String {
    let base = std::env::current_dir().unwrap_or_default();
    base.join(relative).to_string_lossy().into_owned()
}

fn load_root(path: &str) -> Result<Value, String> {
    let full = asset_path(path);
    let raw = fs::read_to_string(&full).map_err(|e| format!("Falha ao ler {}: {}", full, e))?;
    serde_json::from_str::<Value>(&raw).map_err(|e| format!("JSON invalido em {}: {}", full, e))
}

fn save_root(path: &str, value: &Value) -> Result<(), String> {
    let full = asset_path(path);
    let raw = serde_json::to_string_pretty(value)
        .map_err(|e| format!("Falha ao serializar {}: {}", full, e))?;
    fs::write(&full, raw).map_err(|e| format!("Falha ao escrever {}: {}", full, e))
}

fn read_array(root: &Value, key: &str) -> Result<Vec<Value>, String> {
    root.get(key)
        .and_then(|v| v.as_array())
        .cloned()
        .ok_or_else(|| format!("Chave '{}' ausente ou invalida no JSON", key))
}

fn write_array(root: &mut Value, key: &str, items: Vec<Value>) -> Result<(), String> {
    let obj = root
        .as_object_mut()
        .ok_or_else(|| "Root JSON invalido: esperado objeto".to_string())?;
    obj.insert(key.to_string(), Value::Array(items));
    Ok(())
}

fn value_id(v: &Value) -> Option<String> {
    if let Some(id) = v.get("Id").and_then(|x| x.as_str()) {
        return Some(id.to_string());
    }
    if let Some(id) = v.get("id").and_then(|x| x.as_str()) {
        return Some(id.to_string());
    }
    None
}

fn get_string_field<'a>(v: &'a Value, keys: &[&str]) -> Option<&'a str> {
    for key in keys {
        if let Some(value) = v.get(*key).and_then(|x| x.as_str()) {
            return Some(value);
        }
    }
    None
}

fn get_string_array(v: &Value, keys: &[&str]) -> Option<Vec<String>> {
    for key in keys {
        if let Some(arr) = v.get(*key).and_then(|x| x.as_array()) {
            let mut out = Vec::new();
            for item in arr {
                if let Some(s) = item.as_str() {
                    out.push(s.to_string());
                }
            }
            return Some(out);
        }
    }
    None
}

fn map_by_id(items: &[Value], label: &str) -> Result<BTreeMap<String, Value>, String> {
    let mut map = BTreeMap::new();
    for item in items {
        let id = value_id(item).ok_or_else(|| format!("{} sem Id detectado", label))?;
        if map.contains_key(&id) {
            return Err(format!("{} com Id duplicado: {}", label, id));
        }
        map.insert(id, item.clone());
    }
    Ok(map)
}

fn merge_entity(items: &[Value], patch: &EntityPatch, label: &str) -> Result<Vec<Value>, String> {
    let mut map = map_by_id(items, label)?;

    for id in &patch.deletes {
        map.remove(id);
    }

    for upsert in &patch.upserts {
        let id = value_id(upsert).ok_or_else(|| format!("{} upsert sem Id", label))?;
        map.insert(id, upsert.clone());
    }

    Ok(map.into_values().collect())
}

fn validate_relations(leagues: &[Value], teams: &[Value], players: &[Value]) -> (Vec<String>, Vec<String>) {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let league_ids: HashSet<String> = leagues.iter().filter_map(value_id).collect();
    let team_ids: HashSet<String> = teams.iter().filter_map(value_id).collect();

    for team in teams {
        let team_id = value_id(team).unwrap_or_else(|| "<sem-id>".to_string());
        let league_id = get_string_field(team, &["LeagueId", "leagueId", "league_id"]);
        match league_id {
            Some(id) if league_ids.contains(id) => {}
            Some(id) => errors.push(format!("Team '{}' referencia LeagueId inexistente: '{}'", team_id, id)),
            None => errors.push(format!("Team '{}' sem LeagueId", team_id)),
        }
    }

    for player in players {
        let player_id = value_id(player).unwrap_or_else(|| "<sem-id>".to_string());
        let team_id = get_string_field(player, &["TeamId", "teamId", "team_id"]);
        match team_id {
            Some(id) if team_ids.contains(id) => {}
            Some(id) => errors.push(format!("Player '{}' referencia TeamId inexistente: '{}'", player_id, id)),
            None => errors.push(format!("Player '{}' sem TeamId", player_id)),
        }
    }

    for league in leagues {
        let league_id = value_id(league).unwrap_or_else(|| "<sem-id>".to_string());
        if let Some(team_refs) = get_string_array(league, &["TeamIds", "teamIds", "team_ids"]) {
            for team_ref in team_refs {
                if !team_ids.contains(&team_ref) {
                    warnings.push(format!(
                        "League '{}' possui TeamId '{}' nao encontrado em teams",
                        league_id, team_ref
                    ));
                }
            }
        }
    }

    (errors, warnings)
}

fn build_patch(base: &DataBundle, target: &DataBundle, metadata: DataPatchMetadata) -> Result<DataPatch, String> {
    fn diff_entity(base: &[Value], target: &[Value], label: &str) -> Result<EntityPatch, String> {
        let base_map = map_by_id(base, label)?;
        let target_map = map_by_id(target, label)?;

        let mut upserts = Vec::new();
        let mut deletes = Vec::new();

        for (id, target_item) in &target_map {
            match base_map.get(id) {
                Some(base_item) if base_item == target_item => {}
                _ => upserts.push(target_item.clone()),
            }
        }

        for id in base_map.keys() {
            if !target_map.contains_key(id) {
                deletes.push(id.clone());
            }
        }

        Ok(EntityPatch { upserts, deletes })
    }

    Ok(DataPatch {
        metadata,
        leagues: diff_entity(&base.leagues, &target.leagues, "league")?,
        teams: diff_entity(&base.teams, &target.teams, "team")?,
        players: diff_entity(&base.players, &target.players, "player")?,
    })
}

#[tauri::command]
pub fn export_data_bundle() -> Result<String, String> {
    let leagues_root = load_root(LEAGUES_FILE)?;
    let teams_root = load_root(TEAMS_FILE)?;
    let players_root = load_root(PLAYERS_FILE)?;

    let bundle = DataBundle {
        leagues: read_array(&leagues_root, "Leagues")?,
        teams: read_array(&teams_root, "Teams")?,
        players: read_array(&players_root, "Players")?,
    };

    serde_json::to_string_pretty(&bundle).map_err(|e| format!("Falha ao serializar bundle: {}", e))
}

#[tauri::command]
pub fn create_data_patch(
    base_bundle_json: String,
    target_bundle_json: String,
    base_version: Option<String>,
    author: Option<String>,
) -> Result<String, String> {
    let base: DataBundle = serde_json::from_str(&base_bundle_json)
        .map_err(|e| format!("Base bundle invalido: {}", e))?;
    let target: DataBundle = serde_json::from_str(&target_bundle_json)
        .map_err(|e| format!("Target bundle invalido: {}", e))?;

    let metadata = DataPatchMetadata {
        patch_id: format!("patch-{}", Utc::now().timestamp()),
        base_version,
        author,
        created_at: Utc::now().to_rfc3339(),
    };

    let patch = build_patch(&base, &target, metadata)?;
    serde_json::to_string_pretty(&patch).map_err(|e| format!("Falha ao serializar patch: {}", e))
}

#[tauri::command]
pub fn apply_data_patch(patch_json: String, dry_run: Option<bool>) -> Result<ApplyDataPatchReport, String> {
    let patch: DataPatch = serde_json::from_str(&patch_json)
        .map_err(|e| format!("Patch invalido: {}", e))?;

    let dry_run = dry_run.unwrap_or(false);

    let mut leagues_root = load_root(LEAGUES_FILE)?;
    let mut teams_root = load_root(TEAMS_FILE)?;
    let mut players_root = load_root(PLAYERS_FILE)?;

    let leagues = read_array(&leagues_root, "Leagues")?;
    let teams = read_array(&teams_root, "Teams")?;
    let players = read_array(&players_root, "Players")?;

    let next_leagues = merge_entity(&leagues, &patch.leagues, "league")?;
    let next_teams = merge_entity(&teams, &patch.teams, "team")?;
    let next_players = merge_entity(&players, &patch.players, "player")?;

    let (errors, warnings) = validate_relations(&next_leagues, &next_teams, &next_players);
    let valid = errors.is_empty();

    let report = ApplyDataPatchReport {
        dry_run,
        valid,
        errors,
        warnings,
        leagues_upserts: patch.leagues.upserts.len(),
        leagues_deletes: patch.leagues.deletes.len(),
        teams_upserts: patch.teams.upserts.len(),
        teams_deletes: patch.teams.deletes.len(),
        players_upserts: patch.players.upserts.len(),
        players_deletes: patch.players.deletes.len(),
        resulting_leagues: next_leagues.len(),
        resulting_teams: next_teams.len(),
        resulting_players: next_players.len(),
    };

    if !report.valid || dry_run {
        return Ok(report);
    }

    write_array(&mut leagues_root, "Leagues", next_leagues)?;
    write_array(&mut teams_root, "Teams", next_teams)?;
    write_array(&mut players_root, "Players", next_players)?;

    save_root(LEAGUES_FILE, &leagues_root)?;
    save_root(TEAMS_FILE, &teams_root)?;
    save_root(PLAYERS_FILE, &players_root)?;

    Ok(report)
}

#[tauri::command]
pub fn export_data_patch_template(base_version: Option<String>, author: Option<String>) -> Result<String, String> {
    let patch = DataPatch {
        metadata: DataPatchMetadata {
            patch_id: format!("patch-{}", Utc::now().timestamp()),
            base_version,
            author,
            created_at: Utc::now().to_rfc3339(),
        },
        leagues: EntityPatch::default(),
        teams: EntityPatch::default(),
        players: EntityPatch::default(),
    };

    serde_json::to_string_pretty(&json!(patch))
        .map_err(|e| format!("Falha ao serializar template de patch: {}", e))
}