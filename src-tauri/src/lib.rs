// src-tauri/src/lib.rs

mod models;
mod data_loader;

use data_loader::load_all_leagues;
use models::League;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub leagues: Mutex<Option<HashMap<String, League>>>,
}

#[tauri::command]
fn fetch_leagues(state: State<AppState>) -> Result<Vec<League>, String> {
    let mut cache = state.leagues.lock().unwrap();
    if cache.is_none() {
        *cache = Some(load_all_leagues().map_err(|e| e.to_string())?);
    }
    Ok(cache.as_ref().unwrap().values().cloned().collect())
}

#[tauri::command]
fn fetch_league(id: String, state: State<AppState>) -> Result<League, String> {
    let mut cache = state.leagues.lock().unwrap();
    if cache.is_none() {
        *cache = Some(load_all_leagues().map_err(|e| e.to_string())?);
    }
    cache
        .as_ref()
        .unwrap()
        .get(&id)
        .cloned()
        .ok_or_else(|| format!("Liga '{}' não encontrada", id))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            leagues: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![fetch_leagues, fetch_league])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o app");
}