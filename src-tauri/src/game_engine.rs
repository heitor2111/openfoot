use crate::engine::match_engine::{simulate_full, simulate_silent, EventType, MatchPlayer, TeamSide};
use crate::models::energy::{energy_drain, energy_recovery};
use crate::models::player::Position;
use crate::models::{Coach, League, Player};
use crate::models::lineup::SavedLineup;
use crate::models::tactics::Tactics;
use rand::Rng;
use serde::{Serialize, Deserialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TeamMeta {
    id: String,
    name: String,
    stadium: String,
    squad: Vec<Player>,
    coach: Option<Coach>,
    #[serde(default)]
    budget: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScheduledMatch {
    home_idx: usize,
    away_idx: usize,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct Standing {
    played: u32,
    wins: u32,
    draws: u32,
    losses: u32,
    goals_for: i32,
    goals_against: i32,
    points: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeagueSeasonState {
    league_id: String,
    pub current_round: usize,
    teams: Vec<TeamMeta>,
    schedule: Vec<Vec<ScheduledMatch>>,
    table: HashMap<String, Standing>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CareerState {
    pub player_team_id: String,
    pub player_league_id: String,
    pub coach_name: String,
    pub morale: i32,
    /// Contador de sequência: positivo = vitórias, negativo = derrotas, 0 = sem sequência
    pub result_streak: i32,
    /// Ano atual da carreira (incrementa a cada temporada)
    pub current_season: u32,
  /// Histórico de títulos: ano → (liga_id, posição)
    pub titles_history: Vec<(u32, String, u32)>,
    pub active_league_ids: Vec<String>,
    pub seasons: HashMap<String, LeagueSeasonState>,
    /// Energia atual de cada jogador do time do jogador (playerId → 0..100).
    pub player_energy: HashMap<String, f64>,
    /// Orçamento do time do jogador (persistente através das temporadas)
    #[serde(default)]
    pub player_team_budget: i64,
    /// Estado do mercado de transferências de jogadores.
    #[serde(default)]
    pub transfer_market: TransferMarketState,
    /// Artilharia acumulada da temporada atual por liga.
    #[serde(default)]
    pub season_goal_tally_by_league: HashMap<String, HashMap<String, GoalScorerTallyEntryDto>>,
    /// Histórico consolidado por temporada (campeões, artilheiros e transferências).
    #[serde(default)]
    pub season_history: Vec<CareerSeasonSummaryDto>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TransferMarketState {
    /// Preço alvo oculto por atleta, fixo por temporada (player_id lowercased -> multiplicador 1.10..1.50).
    #[serde(default)]
    pub asking_price_multipliers: HashMap<String, f64>,
    /// Tentativas usadas pelo jogador para comprar um atleta (máximo 3).
    #[serde(default)]
    pub offer_attempts: HashMap<String, u8>,
    /// Atletas bloqueados após 3 recusas.
    #[serde(default)]
    pub blocked_players: HashSet<String>,
    /// Propostas pendentes feitas por clubes da IA para atletas do jogador.
    #[serde(default)]
    pub pending_ai_offers: Vec<AiPlayerOfferDto>,
    /// Total de transferências IA<->IA concluídas na temporada atual.
    #[serde(default)]
    pub ai_to_ai_transfers_done_season: u32,
    /// Log simples da rodada para UI de atividade do mercado.
    #[serde(default)]
    pub ai_market_activity_round: Vec<AiMarketActivityDto>,
    /// Transferências concluídas na temporada atual (mundo inteiro das ligas ativas).
    #[serde(default)]
    pub season_world_transfers: Vec<WorldTransferDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalScorerTallyEntryDto {
    pub player_id: Option<String>,
    pub player_name: String,
    pub team_name: String,
    pub goals: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferMarketPlayerDto {
    pub player_id: String,
    pub player_name: String,
    pub position: String,
    pub overall: u8,
    pub speed: u8,
    pub shooting: u8,
    pub passing: u8,
    pub dribbling: u8,
    pub defense: u8,
    pub stamina: u8,
    pub age: Option<u8>,
    pub nationality: Option<String>,
    pub market_value: u64,
    pub team_id: String,
    pub team_name: String,
    pub league_id: String,
    pub league_name: String,
    pub country: String,
    pub attempts_used: u8,
    pub is_blocked: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferMarketQueryDto {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub league_id: Option<String>,
    #[serde(default)]
    pub team_id: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub position: Option<String>,
    #[serde(default)]
    pub ovr_min: Option<u8>,
    #[serde(default)]
    pub ovr_max: Option<u8>,
    #[serde(default)]
    pub age_min: Option<u8>,
    #[serde(default)]
    pub age_max: Option<u8>,
    #[serde(default)]
    pub value_min: Option<u64>,
    #[serde(default)]
    pub value_max: Option<u64>,
    #[serde(default)]
    pub speed_min: Option<u8>,
    #[serde(default)]
    pub speed_max: Option<u8>,
    #[serde(default)]
    pub shooting_min: Option<u8>,
    #[serde(default)]
    pub shooting_max: Option<u8>,
    #[serde(default)]
    pub passing_min: Option<u8>,
    #[serde(default)]
    pub passing_max: Option<u8>,
    #[serde(default)]
    pub dribbling_min: Option<u8>,
    #[serde(default)]
    pub dribbling_max: Option<u8>,
    #[serde(default)]
    pub defense_min: Option<u8>,
    #[serde(default)]
    pub defense_max: Option<u8>,
    #[serde(default)]
    pub stamina_min: Option<u8>,
    #[serde(default)]
    pub stamina_max: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferMarketPageDto {
    pub items: Vec<TransferMarketPlayerDto>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
    pub has_next: bool,
    pub has_prev: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferMarketLeagueOptionDto {
    pub league_id: String,
    pub league_name: String,
    pub country: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferMarketTeamOptionDto {
    pub team_id: String,
    pub team_name: String,
    pub league_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferMarketCatalogDto {
    pub countries: Vec<String>,
    pub leagues: Vec<TransferMarketLeagueOptionDto>,
    pub teams: Vec<TransferMarketTeamOptionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferOfferResultDto {
    pub result: String,
    pub attempts_used: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiPlayerOfferDto {
    pub player_id: String,
    pub player_name: String,
    #[serde(default)]
    pub player_overall: Option<u8>,
    #[serde(default)]
    pub player_market_value: Option<u64>,
    pub offering_team_id: String,
    pub offering_team_name: String,
    pub offer_value: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiMarketActivityDto {
    pub league_id: String,
    pub seller_team_name: String,
    pub buyer_team_name: String,
    pub player_name: String,
    pub offer_value: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldTransferDto {
    pub league_id: String,
    pub seller_team_name: String,
    pub buyer_team_name: String,
    pub player_name: String,
    pub offer_value: u64,
    pub transfer_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonLeagueChampionDto {
    pub league_id: String,
    pub league_name: String,
    pub champion_team_id: String,
    pub champion_team_name: String,
    pub points: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonTopScorerDto {
    pub league_id: String,
    pub league_name: String,
    pub player_id: Option<String>,
    pub player_name: String,
    pub team_name: String,
    pub goals: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonWorldTransferDto {
    pub league_id: String,
    pub league_name: String,
    pub seller_team_name: String,
    pub buyer_team_name: String,
    pub player_name: String,
    pub offer_value: u64,
    pub transfer_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CareerSeasonSummaryDto {
    pub season: u32,
    pub league_champions: Vec<SeasonLeagueChampionDto>,
    pub top_scorers: Vec<SeasonTopScorerDto>,
    pub world_transfers: Vec<SeasonWorldTransferDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableEntryDto {
    team_id: String,
    team_name: String,
    played: u32,
    wins: u32,
    draws: u32,
    losses: u32,
    goals_for: i32,
    goals_against: i32,
    goal_diff: i32,
    points: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureDto {
    home_team_id: String,
    home_team_name: String,
    home_stadium: String,
    home_coach_name: String,
    away_team_id: String,
    away_team_name: String,
    away_coach_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchEventDto {
    minute: u32,
    event_type: String, // "goal" | "nearMiss" | "save" | "foul" | "yellowCard" | "redCard"
    team_side: String,  // "home" | "away"
    team_name: String,
    player_name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoundMatchDto {
    home_team_id: String,
    home_team_name: String,
    home_coach_name: String,
    home_goals: i32,
    away_team_id: String,
    away_team_name: String,
    away_coach_name: String,
    away_goals: i32,
    events: Vec<MatchEventDto>,
    /// Energia dos jogadores que integraram o elenco original (titular ou reserva) após esta partida.
    player_energy_after: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundLeagueSnapshotDto {
    league_id: String,
    current_round: u32,
    total_rounds: u32,
    leader_team_name: String,
    leader_points: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CareerSnapshotDto {
    league_id: String,
    player_team_id: String,
    coach_name: String,
    morale: i32,
    current_season: u32,
    is_season_ended: bool,
    active_league_ids: Vec<String>,
    current_round: u32,
    total_rounds: u32,
    player_position: u32,
    player_team_budget: i64,
    league_division_level: u8,
    next_match_date: String,
    table: Vec<TableEntryDto>,
    next_round_fixtures: Vec<FixtureDto>,
    current_league_top_scorers: Vec<GoalScorerTallyEntryDto>,
    background_leagues: Vec<BackgroundLeagueSnapshotDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundGoalEventDto {
    minute: u32,
    scorer_name: String,
    #[serde(default)]
    assister_name: Option<String>,
    home_team_name: String,
    away_team_name: String,
    home_goals: i32,
    away_goals: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundMatchDto {
    home_team_name: String,
    away_team_name: String,
    home_goals: i32,
    away_goals: i32,
    goal_events: Vec<BackgroundGoalEventDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundLeagueRoundDto {
    league_id: String,
    played_round: u32,
    leader_team_name: String,
    leader_points: u32,
    matches: Vec<BackgroundMatchDto>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulateRoundResultDto {
    played_round: u32,
    matches: Vec<RoundMatchDto>,
    background_leagues: Vec<BackgroundLeagueRoundDto>,
    snapshot: CareerSnapshotDto,
    /// Energia de todos os jogadores do time do jogador após a rodada.
    player_energy_after: HashMap<String, f64>,
    /// Se o técnico (jogador) foi demitido após esta rodada devido à moral baixa.
    dismissed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarMatchDto {
    home_team_id: String,
    home_team_name: String,
    away_team_id: String,
    away_team_name: String,
    home_goals: Option<i32>,
    away_goals: Option<i32>,
    is_player_match: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarRoundDto {
    round_number: u32,
    matches: Vec<CalendarMatchDto>,
    is_played: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarDataDto {
    league_id: String,
    league_name: String,
    player_team_id: String,
    current_round: u32,
    total_rounds: u32,
    current_season: u32,
    rounds: Vec<CalendarRoundDto>,
}

pub fn start_career(league: &League, player_team_id: &str) -> Result<CareerState, String> {
    let mut league_map = HashMap::new();
    league_map.insert(league.id.clone(), league.clone());
    start_career_multi(
        &league_map,
        &league.id,
        player_team_id,
        std::slice::from_ref(&league.id),
        "Treinador",
    )
}

pub fn start_career_multi(
    leagues: &HashMap<String, League>,
    player_league_id: &str,
    player_team_id: &str,
    active_league_ids: &[String],
    coach_name: &str,
) -> Result<CareerState, String> {
    let mut dedup_active: Vec<String> = Vec::new();

    for league_id in active_league_ids {
        if dedup_active.iter().all(|id| !id.eq_ignore_ascii_case(league_id)) {
            dedup_active.push(league_id.clone());
        }
    }

    if dedup_active
        .iter()
        .all(|id| !id.eq_ignore_ascii_case(player_league_id))
    {
        dedup_active.push(player_league_id.to_string());
    }

    // Expandir para incluir divisões conectadas (superior e inferior)
    // Isso permite rebaixamento/acesso automático
    let mut expanded_league_ids = dedup_active.clone();
    for league_id in &dedup_active {
        if let Some(league) = leagues.get(league_id) {
            // Adicionar divisão inferior se existir
            if let Some(lower_id) = &league.lower_division_id {
                if expanded_league_ids.iter().all(|id| !id.eq_ignore_ascii_case(lower_id)) {
                    expanded_league_ids.push(lower_id.clone());
                }
            }
            // Adicionar divisão superior se existir
            if let Some(upper_id) = &league.upper_division_id {
                if expanded_league_ids.iter().all(|id| !id.eq_ignore_ascii_case(upper_id)) {
                    expanded_league_ids.push(upper_id.clone());
                }
            }
        }
    }

    let mut seasons = HashMap::new();

    for league_id in &expanded_league_ids {
        let league = leagues
            .get(league_id)
            .ok_or_else(|| format!("Liga '{}' nao encontrada", league_id))?;

        let season = build_league_season(league)?;
        seasons.insert(league_id.clone(), season);
    }

    let player_season = seasons
        .get(player_league_id)
        .ok_or_else(|| format!("Liga '{}' nao encontrada", player_league_id))?;

    if !player_season
        .teams
        .iter()
        .any(|team| team.id.eq_ignore_ascii_case(player_team_id))
    {
        return Err(format!("Time '{}' nao encontrado na liga", player_team_id));
    }

    // Inicializar energia de todos os jogadores do time do jogador em 100
    let player_squad = seasons
        .get(player_league_id)
        .and_then(|s| s.teams.iter().find(|t| t.id.eq_ignore_ascii_case(player_team_id)))
        .map(|t| &t.squad);

    let player_energy: HashMap<String, f64> = player_squad
        .map(|squad| squad.iter().map(|p| (p.id.clone(), 100.0)).collect())
        .unwrap_or_default();

    // Inicializar orçamento do time do jogador (budget inicial calculado)
    let player_team_budget = seasons
        .get(player_league_id)
        .and_then(|s| s.teams.iter().find(|t| t.id.eq_ignore_ascii_case(player_team_id)))
        .and_then(|t| t.budget)
        .unwrap_or(0);

    Ok(CareerState {
        player_team_id: player_team_id.to_string(),
        player_league_id: player_league_id.to_string(),
        coach_name: coach_name.to_string(),
        morale: 75,
        result_streak: 0,
        current_season: 1,
        titles_history: Vec::new(),
        active_league_ids: expanded_league_ids,
        seasons,
        player_energy,
        player_team_budget,
        transfer_market: TransferMarketState::default(),
        season_goal_tally_by_league: HashMap::new(),
        season_history: Vec::new(),
    })
}

pub fn snapshot(state: &CareerState, all_leagues: &HashMap<String, League>) -> CareerSnapshotDto {
    let player_season = state
        .seasons
        .get(&state.player_league_id)
        .expect("BUG: player league season not found in career state - invalid state");

    let table_rows = sorted_table_rows(player_season);

    let next_round_fixtures = player_season
        .schedule
        .get(player_season.current_round)
        .map(|matches| {
            matches
                .iter()
                .map(|m| {
                    let home_team = &player_season.teams[m.home_idx];
                    let away_team = &player_season.teams[m.away_idx];
                    
                    let is_home_player = home_team.id.eq_ignore_ascii_case(&state.player_team_id);
                    let is_away_player = away_team.id.eq_ignore_ascii_case(&state.player_team_id);
                    
                    let home_coach_name = if is_home_player {
                        state.coach_name.clone()
                    } else {
                        home_team.coach.as_ref().map(|c| c.name.clone()).unwrap_or_default()
                    };
                    
                    let away_coach_name = if is_away_player {
                        state.coach_name.clone()
                    } else {
                        away_team.coach.as_ref().map(|c| c.name.clone()).unwrap_or_default()
                    };
                    
                    FixtureDto {
                        home_team_id: home_team.id.clone(),
                        home_team_name: home_team.name.clone(),
                        home_stadium: home_team.stadium.clone(),
                        home_coach_name,
                        away_team_id: away_team.id.clone(),
                        away_team_name: away_team.name.clone(),
                        away_coach_name,
                    }
                })
                .collect()
        })
        .unwrap_or_default();

    // Posicao do jogador na tabela
    let player_position = table_rows
        .iter()
        .position(|row| row.team_id.eq_ignore_ascii_case(&state.player_team_id))
        .map(|idx| idx as u32 + 1)
        .unwrap_or(0);

    // Data gerada - temporada comeca em 01/02, +7 dias por rodada
    let season_year = 2026 + (state.current_season - 1) as i32;
    let season_start = chrono::NaiveDate::from_ymd_opt(season_year, 2, 1)
        .expect("BUG: invalid hardcoded season start date");
    let round_date = season_start + chrono::Duration::weeks(player_season.current_round as i64);
    let next_match_date = round_date.format("%d/%m/%Y").to_string();

    let mut current_league_top_scorers = state
        .season_goal_tally_by_league
        .get(&state.player_league_id)
        .map(|scorers| scorers.values().cloned().collect::<Vec<_>>())
        .unwrap_or_default();

    current_league_top_scorers.sort_by(|a, b| {
        b.goals
            .cmp(&a.goals)
            .then_with(|| a.player_name.cmp(&b.player_name))
    });

    let mut background_leagues: Vec<BackgroundLeagueSnapshotDto> = state
        .active_league_ids
        .iter()
        .filter(|league_id| !league_id.eq_ignore_ascii_case(&state.player_league_id))
        .filter_map(|league_id| {
            state.seasons.get(league_id).map(|season| {
                let leader = season_leader(season);
                BackgroundLeagueSnapshotDto {
                    league_id: season.league_id.clone(),
                    current_round: season.current_round as u32,
                    total_rounds: season.schedule.len() as u32,
                    leader_team_name: leader.0,
                    leader_points: leader.1,
                }
            })
        })
        .collect();

    background_leagues.sort_by(|a, b| a.league_id.cmp(&b.league_id));

    let is_season_ended = player_season.current_round >= player_season.schedule.len();

    // Buscar division_level da liga atual
    let league_division_level = all_leagues
        .get(&state.player_league_id)
        .map(|league| league.division_level)
        .unwrap_or(1);

    CareerSnapshotDto {
        league_id: state.player_league_id.clone(),
        player_team_id: state.player_team_id.clone(),
        coach_name: state.coach_name.clone(),
        morale: state.morale,
        current_season: state.current_season,
        is_season_ended,
        active_league_ids: state.active_league_ids.clone(),
        current_round: player_season.current_round as u32,
        total_rounds: player_season.schedule.len() as u32,
        player_position,
        player_team_budget: state.player_team_budget,
        league_division_level,
        next_match_date,
        table: table_rows,
        next_round_fixtures,
        current_league_top_scorers,
        background_leagues,
    }
}

/// Inicia uma nova temporada: reseta tabela, gera novo calendário, incrementa temporada
/// Registra título/vice se aplicável
pub fn start_new_season(
    state: &mut CareerState,
    all_leagues: &HashMap<String, League>,
) -> Result<CareerSnapshotDto, String> {
    // Consolidar estatísticas da temporada encerrada para consulta histórica.
    let season_summary = build_career_season_summary(state, all_leagues, state.current_season);
    state.season_history.push(season_summary);

    // Registrar posição final da temporada anterior no histórico
    if let Some(player_season) = state.seasons.get(&state.player_league_id) {
        let final_standings = sorted_table_rows(player_season);
        if let Some(final_position) = final_standings
            .iter()
            .position(|entry| entry.team_id.eq_ignore_ascii_case(&state.player_team_id))
        {
            let final_pos = (final_position + 1) as u32;
            state.titles_history.push((
                state.current_season,
                state.player_league_id.clone(),
                final_pos,
            ));
        }
    }

    // REBAIXAMENTO/PROMOÇÃO: Trocar times entre divisões do mesmo país
    let player_country = all_leagues
        .get(&state.player_league_id)
        .map(|l| l.country.clone())
        .unwrap_or_default();

    // Encontrar todas as divisões conectadas ativas do país do jogador
    let mut division_pairs: Vec<(String, String)> = Vec::new();
    
    for league_id in &state.active_league_ids.clone() {
        if let Some(league) = all_leagues.get(league_id) {
            if league.country == player_country {
                // Se tem divisão inferior E essa divisão está ativa
                if let Some(lower_id) = &league.lower_division_id {
                    if state.active_league_ids.contains(lower_id) {
                        division_pairs.push((league_id.clone(), lower_id.clone()));
                    }
                }
            }
        }
    }

    // Processar rebaixamento/promoção para cada par de divisões
    for (upper_id, lower_id) in division_pairs {
        // Obter tabelas finais de ambas divisões
        let upper_table = state.seasons.get(&upper_id)
            .map(sorted_table_rows)
            .unwrap_or_default();
        let lower_table = state.seasons.get(&lower_id)
            .map(sorted_table_rows)
            .unwrap_or_default();

        // Identificar times a rebaixar (4 últimos da superior)
        let relegated_ids: Vec<String> = upper_table
            .iter()
            .rev()
            .take(4)
            .map(|e| e.team_id.clone())
            .collect();

        // Identificar times a promover (4 primeiros da inferior)
        let promoted_ids: Vec<String> = lower_table
            .iter()
            .take(4)
            .map(|e| e.team_id.clone())
            .collect();

        // Extrair os times que vão trocar de divisão
        let mut teams_to_relegate: Vec<TeamMeta> = Vec::new();
        let mut teams_to_promote: Vec<TeamMeta> = Vec::new();

        if let Some(upper_season) = state.seasons.get_mut(&upper_id) {
            upper_season.teams.retain(|t| {
                if relegated_ids.contains(&t.id) {
                    teams_to_relegate.push(t.clone());
                    false
                } else {
                    true
                }
            });
        }

        if let Some(lower_season) = state.seasons.get_mut(&lower_id) {
            lower_season.teams.retain(|t| {
                if promoted_ids.contains(&t.id) {
                    teams_to_promote.push(t.clone());
                    false
                } else {
                    true
                }
            });
        }

        // Adicionar times nas novas divisões
        if let Some(upper_season) = state.seasons.get_mut(&upper_id) {
            for team in teams_to_promote {
                upper_season.teams.push(team);
            }
        }

        if let Some(lower_season) = state.seasons.get_mut(&lower_id) {
            for team in teams_to_relegate {
                lower_season.teams.push(team);
            }
        }

        // Atualizar liga do jogador se ele foi rebaixado/promovido
        if relegated_ids.contains(&state.player_team_id) {
            state.player_league_id = lower_id.clone();
        } else if promoted_ids.contains(&state.player_team_id) {
            state.player_league_id = upper_id.clone();
        }
    }

    // Incrementar temporada
    state.current_season += 1;
    state.result_streak = 0;
    state.season_goal_tally_by_league.clear();

    // Resetar energia dos jogadores
    for energy in state.player_energy.values_mut() {
        *energy = 100.0;
    }

    // Resetar controle do mercado para a nova temporada.
    state.transfer_market = TransferMarketState::default();

    // Resetar tabela, calendário e rodada de todas as ligas MANTENDO os times atuais
    for league_id in &state.active_league_ids.clone() {
        if let Some(season) = state.seasons.get_mut(league_id) {
            // Gerar novo calendário com os times ATUAIS (já com rebaixados/promovidos)
            let schedule = generate_schedule(season.teams.len());
            
            // Resetar tabela
            let mut table = HashMap::new();
            for team in &season.teams {
                table.insert(team.id.clone(), Standing::default());
            }
            
            season.schedule = schedule;
            season.table = table;
            season.current_round = 0;
        }
    }

    Ok(snapshot(state, all_leagues))
}

pub fn get_calendar_data(state: &CareerState) -> Result<CalendarDataDto, String> {
    let player_season = state
        .seasons
        .get(&state.player_league_id)
        .ok_or_else(|| format!("Liga '{}' não encontrada", state.player_league_id))?;

    let league_name = player_season.teams.first()
        .map(|t| {
            // Tenta inferir o nome da liga pelo primeiro time (simplificação)
            // TODO: Armazenar o nome da liga em LeagueSeasonState
            state.player_league_id.clone()
        })
        .unwrap_or_else(|| state.player_league_id.clone());

    let current_round = player_season.current_round;
    let total_rounds = player_season.schedule.len();

    let mut rounds = Vec::new();

    for (round_idx, round_matches) in player_season.schedule.iter().enumerate() {
        let round_number = (round_idx + 1) as u32;
        let is_played = round_idx < current_round;

        let matches = round_matches
            .iter()
            .map(|m| {
                let home = &player_season.teams[m.home_idx];
                let away = &player_season.teams[m.away_idx];

                let is_player_match = home.id.eq_ignore_ascii_case(&state.player_team_id)
                    || away.id.eq_ignore_ascii_case(&state.player_team_id);

                // TODO: Armazenar placares históricos para mostrar resultados
                // Por enquanto, jogos já jogados também terão null
                CalendarMatchDto {
                    home_team_id: home.id.clone(),
                    home_team_name: home.name.clone(),
                    away_team_id: away.id.clone(),
                    away_team_name: away.name.clone(),
                    home_goals: None,
                    away_goals: None,
                    is_player_match,
                }
            })
            .collect();

        rounds.push(CalendarRoundDto {
            round_number,
            matches,
            is_played,
        });
    }

    Ok(CalendarDataDto {
        league_id: state.player_league_id.clone(),
        league_name,
        player_team_id: state.player_team_id.clone(),
        current_round: (current_round + 1) as u32,
        total_rounds: total_rounds as u32,
        current_season: state.current_season,
        rounds,
    })
}

/// Retorna o melhor jogador disponível (não em `picked_ids`) cuja posição seja
/// uma das `preferred`, tentando-as em ordem de prioridade.
fn pick_best_for_slot(
    squad: &[Player],
    picked_ids: &HashSet<String>,
    preferred: &[Position],
) -> Option<Player> {
    for pos in preferred {
        let best = squad
            .iter()
            .filter(|p| !picked_ids.contains(&p.id) && p.position == *pos)
            .max_by_key(|p| p.overall());
        if let Some(p) = best {
            return Some(p.clone());
        }
    }
    None
}

/// Escalação automática baseada em recipe de slots por formação.
/// Cada slot define posições preferidas em ordem: ZAG nunca ocupa slot de LAT,
/// LAT-E nunca ocupa slot de ZAG a não ser como último recurso do elenco.
fn auto_lineup(squad: &[Player], formation: &crate::models::tactics::Formation) -> Vec<Player> {
    use crate::models::tactics::Formation;
    use Position::*;

    // 11 slots por formação; cada slot = posições em ordem de preferência
    let recipe: Vec<Vec<Position>> = match formation {
        Formation::F442 => vec![
            vec![GOL],
            vec![ZAG, LAT_E, LAT_D, VOL],        // CB1
            vec![ZAG, LAT_E, LAT_D, VOL],        // CB2
            vec![LAT_E, ZAG, PNT_E],             // LB
            vec![LAT_D, ZAG, PNT_D],             // RB
            vec![VOL, MEI, MEI_A],               // CM1
            vec![VOL, MEI, MEI_A],               // CM2
            vec![PNT_E, MEI, MEI_A],             // LM
            vec![PNT_D, MEI, MEI_A],             // RM
            vec![ATA, SA, MEI_A, PNT_E, PNT_D],  // ST1
            vec![ATA, SA, MEI_A, PNT_E, PNT_D],  // ST2
        ],
        Formation::F433 => vec![
            vec![GOL],
            vec![ZAG, LAT_E, LAT_D, VOL],        // CB1
            vec![ZAG, LAT_E, LAT_D, VOL],        // CB2
            vec![LAT_E, ZAG, PNT_E],             // LB
            vec![LAT_D, ZAG, PNT_D],             // RB
            vec![VOL, MEI],                       // CDM
            vec![MEI, VOL, MEI_A],               // CM1
            vec![MEI, MEI_A, VOL],               // CM2
            vec![PNT_E, MEI_A, ATA],             // LW
            vec![ATA, SA, MEI_A],                // ST
            vec![PNT_D, MEI_A, ATA],             // RW
        ],
        Formation::F352 => vec![
            vec![GOL],
            vec![ZAG, LAT_E, LAT_D, VOL],        // CB1
            vec![ZAG, LAT_E, LAT_D, VOL],        // CB2
            vec![ZAG, LAT_E, LAT_D, VOL],        // CB3
            vec![VOL, MEI],                       // CDM
            vec![MEI, VOL, MEI_A],               // CM1
            vec![MEI_A, MEI, VOL],               // CAM
            vec![MEI, MEI_A, VOL],               // CM2
            vec![PNT_E, PNT_D, MEI, LAT_E, LAT_D], // WB-L
            vec![SA, ATA, MEI_A],                // CF
            vec![ATA, SA, PNT_E, PNT_D],         // ST
        ],
        Formation::F532 => vec![
            vec![GOL],
            vec![ZAG, LAT_E, LAT_D],             // CB1
            vec![ZAG, LAT_E, LAT_D],             // CB2
            vec![ZAG, LAT_E, LAT_D],             // CB3
            vec![LAT_E, ZAG, PNT_E],             // LWB
            vec![LAT_D, ZAG, PNT_D],             // RWB
            vec![VOL, MEI],                       // CDM
            vec![MEI, VOL, MEI_A],               // CM1
            vec![MEI, MEI_A, VOL],               // CM2
            vec![SA, ATA, MEI_A],                // CF
            vec![ATA, SA, PNT_E, PNT_D],         // ST
        ],
        Formation::F451 => vec![
            vec![GOL],
            vec![ZAG, LAT_E, LAT_D],             // CB1
            vec![ZAG, LAT_E, LAT_D],             // CB2
            vec![LAT_E, ZAG, PNT_E],             // LB
            vec![LAT_D, ZAG, PNT_D],             // RB
            vec![PNT_E, MEI, LAT_E],             // LM
            vec![VOL, MEI],                       // CDM
            vec![MEI_A, MEI, PNT_E, PNT_D],      // CAM
            vec![MEI, VOL],                       // CM
            vec![PNT_D, MEI, LAT_D],             // RM
            vec![ATA, SA, MEI_A],                // ST
        ],
        Formation::F343 => vec![
            vec![GOL],
            vec![ZAG, LAT_E, LAT_D],             // CB1
            vec![ZAG, LAT_E, LAT_D],             // CB2
            vec![ZAG, LAT_E, LAT_D],             // CB3
            vec![PNT_E, MEI, LAT_E],             // LM
            vec![VOL, MEI],                       // CDM
            vec![MEI, MEI_A, VOL],               // CM
            vec![PNT_D, MEI, LAT_D],             // RM
            vec![PNT_E, ATA, MEI_A],             // LW
            vec![ATA, SA, MEI_A],                // ST
            vec![PNT_D, ATA, MEI_A],             // RW
        ],
    };

    let mut picked: Vec<Player> = Vec::with_capacity(11);

    for slot_preferred in &recipe {
        let picked_ids: HashSet<String> = picked.iter().map(|p| p.id.clone()).collect();
        if let Some(player) = pick_best_for_slot(squad, &picked_ids, slot_preferred) {
            picked.push(player);
        }
    }

    // Fallback: completar se o elenco não tiver posições suficientes
    if picked.len() < 11 {
        let picked_ids: HashSet<String> = picked.iter().map(|p| p.id.clone()).collect();
        let mut rest: Vec<Player> = squad
            .iter()
            .filter(|p| !picked_ids.contains(&p.id))
            .cloned()
            .collect();
        rest.sort_by(|a, b| b.overall().cmp(&a.overall()));
        let need = 11 - picked.len();
        picked.extend(rest.into_iter().take(need));
    }

    picked.truncate(11);
    picked
}

fn best_eleven(squad: &[Player]) -> Vec<Player> {
    auto_lineup(squad, &crate::models::tactics::Formation::F442)
}

fn squad_for_match(squad: &[Player], lineup: &SavedLineup) -> Vec<Player> {
    let lineup_ids = lineup.starter_ids();
    if lineup_ids.is_empty() {
        return best_eleven(squad);
    }
    let filtered: Vec<Player> = squad
        .iter()
        .filter(|p| lineup_ids.iter().any(|id| id.eq_ignore_ascii_case(&p.id)))
        .cloned()
        .collect();
    if filtered.is_empty() {
        return best_eleven(squad);
    }
    filtered
}

/// Resultado de uma partida para cálculo de moral
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MatchResult {
    Win,
    Draw,
    Loss,
}

/// Calcula a mudança de moral baseada no resultado da partida e contexto
/// 
/// # Regras:
/// - Vitória: +8% base
/// - Empate: -1% base
/// - Derrota: -4% base
/// - Sequências amplificam o efeito (+1% adicional por jogo na sequência, até +4%)
/// - Posição na tabela: Top 6 = +2%, últimos 4 = -2% (aplicado a cada 5 rodadas)
/// 
/// # Retorna
/// (nova_moral, novo_streak)
fn calculate_morale_change(
    current_morale: i32,
    current_streak: i32,
    result: MatchResult,
    position: u32,
    current_round: u32,
) -> (i32, i32) {
    // Variação base (valores suavizados)
    let base_change = match result {
        MatchResult::Win => 8,
        MatchResult::Draw => -1,
        MatchResult::Loss => -4,
    };

    // Atualizar streak
    let new_streak = match result {
        MatchResult::Win => {
            if current_streak >= 0 {
                current_streak + 1 // Continua ou inicia win streak
            } else {
                1 // Quebra loss streak, inicia win streak
            }
        }
        MatchResult::Loss => {
            if current_streak <= 0 {
                current_streak - 1 // Continua ou inicia loss streak
            } else {
                -1 // Quebra win streak, inicia loss streak
            }
        }
        MatchResult::Draw => 0, // Empate quebra qualquer streak
    };

    // Bônus de sequência (máximo +4%)
    let streak_bonus = match result {
        MatchResult::Win => {
            let streak_count = new_streak.max(0);
            if streak_count >= 2 {
                (streak_count - 1).min(4) // 2 wins = +1%, 3 wins = +2%, ..., até +4%
            } else {
                0
            }
        }
        MatchResult::Loss => {
            let streak_count = (-new_streak).max(0);
            if streak_count >= 2 {
                -((streak_count - 1).min(4)) // 2 losses = -1%, 3 losses = -2%, ..., até -4%
            } else {
                0
            }
        }
        MatchResult::Draw => 0,
    };

    // Bônus/penalidade de posição na tabela (aplicado a cada 5 rodadas, valores suavizados)
    let position_modifier = if current_round % 5 == 0 {
        if position <= 6 {
            2 // Top 6: +2%
        } else if position >= 17 {
            -2 // Últimos 4: -2% (suavizado de -3%)
        } else {
            0
        }
    } else {
        0
    };

    // Calcular nova moral
    let total_change = base_change + streak_bonus + position_modifier;
    let new_morale = (current_morale + total_change).clamp(0, 100);

    (new_morale, new_streak)
}

/// Calcula a chance de demissão baseada na moral atual
/// 
/// # Regras:
/// - Moral >= 25%: 0% de chance de demissão
/// - Moral < 25%: chance aumenta linearmente
/// - Moral = 5%: 80% de chance
/// - Moral = 0%: 100% de chance
/// 
/// # Fórmula
/// Se moral < 25: chance = (25 - moral) / 20 * 80
/// Se moral = 0: força 100%
/// 
/// # Retorna
/// Probabilidade de demissão (0.0 a 1.0)
fn calculate_dismissal_chance(morale: i32) -> f64 {
    if morale >= 25 {
        return 0.0;
    }
    
    if morale == 0 {
        return 1.0; // 100% de chance se moral zerou
    }
    
    // Interpolação linear: 25% → 0%, 5% → 80%, 0% → 100%
    let chance = ((25 - morale) as f64 / 20.0) * 0.8;
    chance.min(1.0)
}

pub fn simulate_next_round(
    state: &mut CareerState,
    lineup: &SavedLineup,
    tactics: Tactics,
    all_leagues: &HashMap<String, League>,
) -> Result<SimulateRoundResultDto, String> {
    state.transfer_market.ai_market_activity_round.clear();

    let mut goal_tally_events: Vec<(String, Option<String>, String, String)> = Vec::new();

    let (player_results, played_round, player_goal_tallies) = {
        let player_season = state
            .seasons
            .get_mut(&state.player_league_id)
            .ok_or_else(|| format!("Liga '{}' nao encontrada", state.player_league_id))?;

        let round_matches = player_season
            .schedule
            .get(player_season.current_round)
            .cloned()
            .ok_or_else(|| "Temporada encerrada".to_string())?;

        let played_round = player_season.current_round + 1;
        let player_team_id = state.player_team_id.clone();
        let mut player_results = Vec::with_capacity(round_matches.len());
        let mut round_goal_tallies: Vec<(String, Option<String>, String, String)> = Vec::new();

        let lineup_slot_zones = lineup.starter_slot_zones();
        let starter_ids: std::collections::HashSet<String> = lineup
            .starters
            .iter()
            .map(|s| s.player_id.to_lowercase())
            .collect();
        let bench_ids: std::collections::HashSet<String> = lineup
            .bench
            .iter()
            .map(|id| id.to_lowercase())
            .collect();

        for m in &round_matches {
            let home = &player_season.teams[m.home_idx];
            let away = &player_season.teams[m.away_idx];

            let is_player_home = home.id.eq_ignore_ascii_case(&player_team_id);
            let is_player_away = away.id.eq_ignore_ascii_case(&player_team_id);

            // Converter Vec<Player> em Vec<MatchPlayer> injetando energia corrente
            let home_match_squad: Vec<MatchPlayer> = if is_player_home {
                squad_for_match(&home.squad, lineup)
                    .into_iter()
                    .map(|p| {
                        let energy = state.player_energy.get(&p.id).copied().unwrap_or(100.0);
                        MatchPlayer { player: p, energy }
                    })
                    .collect()
            } else {
                let home_formation = home.coach.as_ref()
                    .and_then(|c| crate::models::tactics::Formation::from_str(&c.tactics))
                    .unwrap_or_default();
                auto_lineup(&home.squad, &home_formation)
                    .into_iter()
                    .map(|p| MatchPlayer { player: p, energy: 100.0 })
                    .collect()
            };

            let away_match_squad: Vec<MatchPlayer> = if is_player_away {
                squad_for_match(&away.squad, lineup)
                    .into_iter()
                    .map(|p| {
                        let energy = state.player_energy.get(&p.id).copied().unwrap_or(100.0);
                        MatchPlayer { player: p, energy }
                    })
                    .collect()
            } else {
                let away_formation = away.coach.as_ref()
                    .and_then(|c| crate::models::tactics::Formation::from_str(&c.tactics))
                    .unwrap_or_default();
                auto_lineup(&away.squad, &away_formation)
                    .into_iter()
                    .map(|p| MatchPlayer { player: p, energy: 100.0 })
                    .collect()
            };

            let home_lineup_zones = if is_player_home { Some(&lineup_slot_zones) } else { None };
            let away_lineup_zones = if is_player_away { Some(&lineup_slot_zones) } else { None };

            let home_tactics = if is_player_home {
                tactics.clone()
            } else {
                home.coach.as_ref().map(|c| c.derive_tactics()).unwrap_or_default()
            };
            let away_tactics = if is_player_away {
                tactics.clone()
            } else {
                away.coach.as_ref().map(|c| c.derive_tactics()).unwrap_or_default()
            };

            let (home_goals, away_goals, raw_events) =
                simulate_full(home_match_squad, away_match_squad, &home_tactics, &away_tactics, home_lineup_zones, away_lineup_zones);

            update_table(
                &mut player_season.table,
                &home.id,
                &away.id,
                home_goals as i32,
                away_goals as i32,
            );

            let home_name = home.name.clone();
            let away_name = away.name.clone();
            let home_coach_name = if is_player_home {
                state.coach_name.clone()
            } else {
                home.coach.as_ref().map(|c| c.name.clone()).unwrap_or_default()
            };
            let away_coach_name = if is_player_away {
                state.coach_name.clone()
            } else {
                away.coach.as_ref().map(|c| c.name.clone()).unwrap_or_default()
            };
            let events: Vec<MatchEventDto> = raw_events
                .iter()
                .filter_map(|event| {
                    let event_type_str = match &event.event_type {
                        EventType::Goal => "goal",
                        EventType::NearMiss => "nearMiss",
                        EventType::Save => "save",
                        EventType::Foul => "foul",
                        EventType::YellowCard => "yellowCard",
                        EventType::RedCard => "redCard",
                        EventType::Corner => "corner",
                        EventType::Injury => "injury",
                        _ => return None,
                    };
                    let (team_side, team_name) = match &event.team {
                        Some(TeamSide::Home) => ("home", home_name.as_str()),
                        Some(TeamSide::Away) => ("away", away_name.as_str()),
                        None => return None,
                    };
                    Some(MatchEventDto {
                        minute: event.minute as u32,
                        event_type: event_type_str.to_string(),
                        team_side: team_side.to_string(),
                        team_name: team_name.to_string(),
                        player_name: event.player_name.clone(),
                    })
                })
                .collect();

            for event in &raw_events {
                if !matches!(event.event_type, EventType::Goal) {
                    continue;
                }
                let Some(player_name) = event.player_name.as_ref() else {
                    continue;
                };
                let Some(side) = event.team.as_ref() else {
                    continue;
                };

                let (team_ref, team_name) = match side {
                    TeamSide::Home => (home, home.name.clone()),
                    TeamSide::Away => (away, away.name.clone()),
                };
                let player_id = find_player_id_by_name(team_ref, player_name);

                round_goal_tallies.push((
                    state.player_league_id.clone(),
                    player_id,
                    player_name.clone(),
                    team_name,
                ));
            }

            // Calcular player_energy_after para a partida do jogador
            let match_energy_after = if is_player_home || is_player_away {
                let player_season_ref = &player_season;
                let team = if is_player_home {
                    &player_season_ref.teams[m.home_idx]
                } else {
                    &player_season_ref.teams[m.away_idx]
                };
                team.squad
                    .iter()
                    .map(|p| {
                        let current = state.player_energy.get(&p.id).copied().unwrap_or(100.0);
                        let minutes = if starter_ids.contains(&p.id.to_lowercase()) { Some(90u8) }
                            else if bench_ids.contains(&p.id.to_lowercase()) { Some(0u8) }
                            else { None };
                        let drain = match minutes {
                            Some(m) => energy_drain(p.stamina, &tactics.play_style, m),
                            None => 0.0,
                        };
                        let recovery = energy_recovery(p.stamina, minutes);
                        let new_energy = (current - drain + recovery).clamp(0.0, 100.0);
                        (p.id.clone(), new_energy)
                    })
                    .collect::<HashMap<_, _>>()
            } else {
                HashMap::new()
            };

            // Persistir energia atualizada no CareerState
            for (id, val) in &match_energy_after {
                state.player_energy.insert(id.clone(), *val);
            }

            // Atualizar moral se for a partida do jogador
            if is_player_home || is_player_away {
                let result = if is_player_home {
                    if home_goals > away_goals {
                        MatchResult::Win
                    } else if home_goals < away_goals {
                        MatchResult::Loss
                    } else {
                        MatchResult::Draw
                    }
                } else {
                    // is_player_away
                    if away_goals > home_goals {
                        MatchResult::Win
                    } else if away_goals < home_goals {
                        MatchResult::Loss
                    } else {
                        MatchResult::Draw
                    }
                };

                // Obter posição atual do jogador na tabela
                let sorted_standings = sorted_table_rows(&player_season);
                let player_position = sorted_standings
                    .iter()
                    .position(|entry| entry.team_id.eq_ignore_ascii_case(&state.player_team_id))
                    .map(|pos| (pos + 1) as u32)
                    .unwrap_or(20);

                let (new_morale, new_streak) = calculate_morale_change(
                    state.morale,
                    state.result_streak,
                    result,
                    player_position,
                    player_season.current_round as u32,
                );

                state.morale = new_morale;
                state.result_streak = new_streak;
            }

            player_results.push(RoundMatchDto {
                home_team_id: home.id.clone(),
                home_team_name: home_name,
                home_coach_name,
                home_goals: home_goals as i32,
                away_team_id: away.id.clone(),
                away_team_name: away_name,
                away_coach_name,
                away_goals: away_goals as i32,
                events,
                player_energy_after: match_energy_after,
            });
        }

        player_season.current_round += 1;

        // Verificar se a temporada terminou e aplicar bônus de título
        if player_season.current_round >= player_season.schedule.len() {
            let final_standings = sorted_table_rows(&player_season);
            if let Some(champion_pos) = final_standings
                .iter()
                .position(|entry| entry.team_id.eq_ignore_ascii_case(&state.player_team_id))
            {
                match champion_pos {
                    0 => {
                        // Campeão: +50%
                        state.morale = (state.morale + 50).min(100);
                        state.result_streak = 0; // Reset streak após título
                    }
                    1 => {
                        // Vice-campeão: +30%
                        state.morale = (state.morale + 30).min(100);
                        state.result_streak = 0;
                    }
                    _ => {}
                }
            }
        }

        (player_results, played_round, round_goal_tallies)
    };

    goal_tally_events.extend(player_goal_tallies);

    let mut background_results = Vec::new();

    let other_leagues: Vec<String> = state
        .active_league_ids
        .iter()
        .filter(|league_id| !league_id.eq_ignore_ascii_case(&state.player_league_id))
        .cloned()
        .collect();

    for league_id in other_leagues {
        if let Some(season) = state.seasons.get_mut(&league_id) {
            if season.current_round >= season.schedule.len() {
                continue;
            }

            let round_matches = season.schedule[season.current_round].clone();
            let mut bg_matches: Vec<BackgroundMatchDto> = Vec::with_capacity(round_matches.len());

            for m in &round_matches {
                let home = &season.teams[m.home_idx];
                let away = &season.teams[m.away_idx];

                let (home_goals, away_goals, goal_events) =
                    simulate_silent(
                        {
                            let f = home.coach.as_ref()
                                .and_then(|c| crate::models::tactics::Formation::from_str(&c.tactics))
                                .unwrap_or_default();
                            auto_lineup(&home.squad, &f)
                        },
                        {
                            let f = away.coach.as_ref()
                                .and_then(|c| crate::models::tactics::Formation::from_str(&c.tactics))
                                .unwrap_or_default();
                            auto_lineup(&away.squad, &f)
                        },
                        home.coach.as_ref().map(|c| c.derive_tactics()).unwrap_or_default(),
                        away.coach.as_ref().map(|c| c.derive_tactics()).unwrap_or_default(),
                    );

                update_table(
                    &mut season.table,
                    &home.id,
                    &away.id,
                    home_goals as i32,
                    away_goals as i32,
                );

                let home_name = home.name.clone();
                let away_name = away.name.clone();

                bg_matches.push(BackgroundMatchDto {
                    home_team_name: home_name.clone(),
                    away_team_name: away_name.clone(),
                    home_goals: home_goals as i32,
                    away_goals: away_goals as i32,
                    goal_events: {
                        let mut home_g = 0i32;
                        let mut away_g = 0i32;
                        goal_events
                            .iter()
                            .map(|event| {
                                let minute = event.minute;
                                let side = &event.team;
                                let scorer_name = &event.scorer_name;
                                match side {
                                    TeamSide::Home => home_g += 1,
                                    TeamSide::Away => away_g += 1,
                                }

                                let (team_ref, team_name) = match side {
                                    TeamSide::Home => (home, home.name.clone()),
                                    TeamSide::Away => (away, away.name.clone()),
                                };
                                let player_id = find_player_id_by_name(team_ref, scorer_name);
                                goal_tally_events.push((
                                    league_id.clone(),
                                    player_id,
                                    scorer_name.clone(),
                                    team_name,
                                ));

                                BackgroundGoalEventDto {
                                    minute: minute as u32,
                                    scorer_name: scorer_name.clone(),
                                    assister_name: event.assister_name.clone(),
                                    home_team_name: home_name.clone(),
                                    away_team_name: away_name.clone(),
                                    home_goals: home_g,
                                    away_goals: away_g,
                                }
                            })
                            .collect()
                    },
                });
            }

            season.current_round += 1;
            let leader = season_leader(season);

            background_results.push(BackgroundLeagueRoundDto {
                league_id: season.league_id.clone(),
                played_round: season.current_round as u32,
                leader_team_name: leader.0,
                leader_points: leader.1,
                matches: bg_matches,
            });
        }
    }

    for (league_id, player_id, player_name, team_name) in goal_tally_events {
        register_goal_tally(state, &league_id, player_id, &player_name, &team_name);
    }

    background_results.sort_by(|a, b| a.league_id.cmp(&b.league_id));

    // Verificar chance de demissão baseada na moral
    let dismissal_chance = calculate_dismissal_chance(state.morale);
    let dismissed = if dismissal_chance > 0.0 {
        let roll = rand::thread_rng().gen::<f64>();
        roll < dismissal_chance
    } else {
        false
    };

    maybe_generate_ai_offer_for_player_team(state);
    maybe_simulate_ai_to_ai_transfer(state);

    Ok(SimulateRoundResultDto {
        played_round: played_round as u32,
        matches: player_results,
        background_leagues: background_results,
        snapshot: snapshot(state, all_leagues),
        player_energy_after: state.player_energy.clone(),
        dismissed,
    })
}

fn position_group(position: &str) -> &'static str {
    let pos = position.to_uppercase();
    if pos.starts_with("GOL") || pos.starts_with("GK") {
        "GOL"
    } else if pos.starts_with("DEF") || pos.starts_with("ZAG") || pos.starts_with("LAT") {
        "DEF"
    } else if pos.starts_with("MEI") || pos.starts_with("VOL") || pos.starts_with("MC") {
        "MEI"
    } else {
        "ATA"
    }
}

fn position_label(position: &Position) -> &'static str {
    match position {
        Position::GOL => "GOL",
        Position::ZAG => "ZAG",
        Position::LAT_E => "LAT-E",
        Position::LAT_D => "LAT-D",
        Position::VOL => "VOL",
        Position::MEI => "MEI",
        Position::MEI_A => "MEI-A",
        Position::PNT_E => "PNT-E",
        Position::PNT_D => "PNT-D",
        Position::SA => "SA",
        Position::ATA => "ATA",
    }
}

fn find_player_id_by_name(team: &TeamMeta, player_name: &str) -> Option<String> {
    team.squad
        .iter()
        .find(|p| p.name.eq_ignore_ascii_case(player_name))
        .map(|p| p.id.clone())
}

fn register_goal_tally(
    state: &mut CareerState,
    league_id: &str,
    player_id: Option<String>,
    player_name: &str,
    team_name: &str,
) {
    let key = player_id
        .clone()
        .unwrap_or_else(|| format!("name::{}", player_name.to_lowercase()));

    let league_tally = state
        .season_goal_tally_by_league
        .entry(league_id.to_string())
        .or_default();

    let entry = league_tally.entry(key).or_insert(GoalScorerTallyEntryDto {
        player_id,
        player_name: player_name.to_string(),
        team_name: team_name.to_string(),
        goals: 0,
    });

    // Atualiza o clube a cada gol: se o jogador foi transferido após o primeiro gol,
    // o nome do time reflete o clube atual (onde marcou o gol mais recente).
    entry.team_name = team_name.to_string();
    entry.goals = entry.goals.saturating_add(1);
}

fn build_career_season_summary(
    state: &CareerState,
    all_leagues: &HashMap<String, League>,
    season: u32,
) -> CareerSeasonSummaryDto {
    let mut league_champions: Vec<SeasonLeagueChampionDto> = state
        .active_league_ids
        .iter()
        .filter_map(|league_id| {
            let season_state = state.seasons.get(league_id)?;
            let standings = sorted_table_rows(season_state);
            let champion = standings.first()?;
            let league_name = all_leagues
                .get(league_id)
                .map(|l| l.name.clone())
                .unwrap_or_else(|| league_id.clone());

            Some(SeasonLeagueChampionDto {
                league_id: league_id.clone(),
                league_name,
                champion_team_id: champion.team_id.clone(),
                champion_team_name: champion.team_name.clone(),
                points: champion.points,
            })
        })
        .collect();

    league_champions.sort_by(|a, b| a.league_name.cmp(&b.league_name));

    let mut top_scorers: Vec<SeasonTopScorerDto> = state
        .season_goal_tally_by_league
        .iter()
        .filter_map(|(league_id, scorer_map)| {
            let top = scorer_map
                .values()
                .max_by(|a, b| a.goals.cmp(&b.goals).then(a.player_name.cmp(&b.player_name)))?;

            let league_name = all_leagues
                .get(league_id)
                .map(|l| l.name.clone())
                .unwrap_or_else(|| league_id.clone());

            Some(SeasonTopScorerDto {
                league_id: league_id.clone(),
                league_name,
                player_id: top.player_id.clone(),
                player_name: top.player_name.clone(),
                team_name: top.team_name.clone(),
                goals: top.goals,
            })
        })
        .collect();

    top_scorers.sort_by(|a, b| a.league_name.cmp(&b.league_name));

    let mut world_transfers: Vec<SeasonWorldTransferDto> = state
        .transfer_market
        .season_world_transfers
        .iter()
        .map(|transfer| {
            let league_name = all_leagues
                .get(&transfer.league_id)
                .map(|l| l.name.clone())
                .unwrap_or_else(|| transfer.league_id.clone());

            SeasonWorldTransferDto {
                league_id: transfer.league_id.clone(),
                league_name,
                seller_team_name: transfer.seller_team_name.clone(),
                buyer_team_name: transfer.buyer_team_name.clone(),
                player_name: transfer.player_name.clone(),
                offer_value: transfer.offer_value,
                transfer_type: transfer.transfer_type.clone(),
            }
        })
        .collect();

    world_transfers.sort_by(|a, b| b.offer_value.cmp(&a.offer_value));

    CareerSeasonSummaryDto {
        season,
        league_champions,
        top_scorers,
        world_transfers,
    }
}

fn team_strength(team: &TeamMeta) -> f32 {
    let mut overalls: Vec<u8> = team.squad.iter().map(|p| p.overall()).collect();
    overalls.sort_unstable_by(|a, b| b.cmp(a));
    let top: Vec<u8> = overalls.into_iter().take(11).collect();
    if top.is_empty() {
        return 0.0;
    }
    top.iter().map(|v| *v as f32).sum::<f32>() / top.len() as f32
}

fn find_weakest_group(team: &TeamMeta) -> Option<&'static str> {
    let mut sums: HashMap<&'static str, (u32, u32)> = HashMap::new();
    for player in &team.squad {
        let group = position_group(position_label(&player.position));
        let entry = sums.entry(group).or_insert((0, 0));
        entry.0 += player.overall() as u32;
        entry.1 += 1;
    }

    ["GOL", "DEF", "MEI", "ATA"]
        .iter()
        .filter_map(|group| {
            sums.get(group)
                .map(|(sum, count)| (*group, *sum as f32 / *count as f32))
        })
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(group, _)| group)
}

fn maybe_generate_ai_offer_for_player_team(state: &mut CareerState) {
    let mut rng = rand::thread_rng();
    if !rng.gen_bool(0.10) {
        return;
    }

    let Some(player_season) = state.seasons.get(&state.player_league_id) else {
        return;
    };
    let Some(player_team) = player_season
        .teams
        .iter()
        .find(|t| t.id.eq_ignore_ascii_case(&state.player_team_id))
    else {
        return;
    };

    let candidates: Vec<&Player> = player_team
        .squad
        .iter()
        .filter(|p| p.market_value.unwrap_or(0) > 0)
        .collect();
    if candidates.is_empty() {
        return;
    }

    let Some(player) = candidates.get(rng.gen_range(0..candidates.len())) else {
        return;
    };
    let market_value = player.market_value.unwrap_or(0);
    if market_value == 0 {
        return;
    }

    let factor = rng.gen_range(1.10..=1.50);
    let offer_value = (market_value as f64 * factor).round() as u64;

    let mut buyer_candidates: Vec<(String, String)> = Vec::new();
    for league_id in &state.active_league_ids {
        if let Some(season) = state.seasons.get(league_id) {
            for team in &season.teams {
                if team.id.eq_ignore_ascii_case(&state.player_team_id) {
                    continue;
                }
                if team.budget.unwrap_or(0) < offer_value as i64 {
                    continue;
                }
                buyer_candidates.push((team.id.clone(), team.name.clone()));
            }
        }
    }
    if buyer_candidates.is_empty() {
        return;
    }

    let (offering_team_id, offering_team_name) =
        buyer_candidates[rng.gen_range(0..buyer_candidates.len())].clone();

    // Manter no máximo uma proposta pendente por atleta.
    state
        .transfer_market
        .pending_ai_offers
        .retain(|offer| !offer.player_id.eq_ignore_ascii_case(&player.id));

    state.transfer_market.pending_ai_offers.push(AiPlayerOfferDto {
        player_id: player.id.clone(),
        player_name: player.name.clone(),
        player_overall: Some(player.overall()),
        player_market_value: player.market_value,
        offering_team_id,
        offering_team_name,
        offer_value,
    });
}

fn maybe_simulate_ai_to_ai_transfer(state: &mut CareerState) {
    if state.transfer_market.ai_to_ai_transfers_done_season >= 5 {
        return;
    }

    let mut rng = rand::thread_rng();
    // Probabilidade base maior para tornar o mercado mundial mais ativo.
    // Aumenta após metade da temporada caso ainda não tenha ocorrido transferência IA↔IA.
    let dynamic_chance = {
        let rounds_info = state
            .active_league_ids
            .iter()
            .find_map(|league_id| {
                state
                    .seasons
                    .get(league_id)
                    .map(|season| (season.current_round, season.schedule.len()))
            })
            .unwrap_or((0, 0));
        let crossed_half = rounds_info.1 > 0 && rounds_info.0 >= (rounds_info.1 / 2);
        if state.transfer_market.ai_to_ai_transfers_done_season == 0 && crossed_half {
            0.45
        } else {
            0.22
        }
    };

    if !rng.gen_bool(dynamic_chance) {
        return;
    }

    let mut league_candidates: Vec<String> = state
        .active_league_ids
        .iter()
        .filter(|id| state.seasons.contains_key(*id))
        .cloned()
        .collect();
    league_candidates.sort();

    for league_id in league_candidates {
        let Some(season) = state.seasons.get(&league_id) else {
            continue;
        };
        if season.teams.len() < 2 {
            continue;
        }

        let mut team_strengths: Vec<(usize, f32)> = season
            .teams
            .iter()
            .enumerate()
            .filter(|(_, t)| !t.id.eq_ignore_ascii_case(&state.player_team_id))
            .map(|(idx, team)| (idx, team_strength(team)))
            .collect();
        if team_strengths.len() < 2 {
            continue;
        }

        team_strengths.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        let buyer_idx = team_strengths[0].0;
        let seller_idx = team_strengths[team_strengths.len() - 1].0;
        if buyer_idx == seller_idx {
            continue;
        }

        let buyer = &season.teams[buyer_idx];
        let seller = &season.teams[seller_idx];
        let buyer_budget = buyer.budget.unwrap_or(0);
        if buyer_budget <= 0 {
            continue;
        }

        let weakest_group = find_weakest_group(buyer).unwrap_or("ATA");

        let mut candidates: Vec<(usize, u64)> = seller
            .squad
            .iter()
            .enumerate()
            .filter_map(|(idx, p)| {
                let mv = p
                    .market_value
                    .unwrap_or_else(|| (p.overall() as u64).saturating_mul(900_000));
                if position_group(position_label(&p.position)) != weakest_group {
                    return None;
                }
                Some((idx, mv))
            })
            .collect();

        if candidates.is_empty() {
            candidates = seller
                .squad
                .iter()
                .enumerate()
                .map(|(idx, p)| {
                    let mv = p
                        .market_value
                        .unwrap_or_else(|| (p.overall() as u64).saturating_mul(900_000));
                    (idx, mv)
                })
                .collect();
        }
        if candidates.is_empty() {
            continue;
        }

        candidates.sort_by(|a, b| {
            seller.squad[b.0]
                .overall()
                .cmp(&seller.squad[a.0].overall())
        });

        // Prefere o melhor jogador que o comprador consegue pagar (fator máx 1.35).
        // Se nenhum couber no budget, tenta o mais barato como última opção.
        let chosen = candidates
            .iter()
            .find(|&&(_, mv)| buyer_budget >= (mv as f64 * 1.35).round() as i64)
            .or_else(|| candidates.last())
            .copied();
        let Some((candidate_idx, candidate_mv)) = chosen else {
            continue;
        };

        let factor = rng.gen_range(1.00..=1.35);
        let offer_value = (candidate_mv as f64 * factor).round() as u64;
        if buyer_budget < offer_value as i64 {
            continue;
        }

        let candidate_player = &seller.squad[candidate_idx];
        let seller_same_group_count = seller
            .squad
            .iter()
            .filter(|p| {
                position_group(position_label(&p.position))
                    == position_group(position_label(&candidate_player.position))
            })
            .count();
        let mut acceptance_chance: f64 = 0.60;
        if candidate_player.age.unwrap_or(24) >= 30 {
            acceptance_chance += 0.15;
        }
        if candidate_player.overall() >= 85 {
            acceptance_chance -= 0.10;
        }
        if seller_same_group_count >= 3 {
            acceptance_chance += 0.10;
        }
        acceptance_chance = acceptance_chance.clamp(0.30, 0.95);

        if !rng.gen_bool(acceptance_chance) {
            continue;
        }

        let Some(season_mut) = state.seasons.get_mut(&league_id) else {
            continue;
        };

        let (buyer_team_name, seller_team_name, player_name) = if seller_idx < buyer_idx {
            let (left, right) = season_mut.teams.split_at_mut(buyer_idx);
            let seller_team = &mut left[seller_idx];
            let buyer_team = &mut right[0];

            if buyer_team.budget.unwrap_or(0) < offer_value as i64 {
                continue;
            }

            let transferred = seller_team.squad.remove(candidate_idx);
            let player_name = transferred.name.clone();
            buyer_team.squad.push(transferred);

            if let Some(budget) = buyer_team.budget.as_mut() {
                *budget -= offer_value as i64;
            }
            if let Some(budget) = seller_team.budget.as_mut() {
                *budget += offer_value as i64;
            }

            (buyer_team.name.clone(), seller_team.name.clone(), player_name)
        } else {
            let (left, right) = season_mut.teams.split_at_mut(seller_idx);
            let buyer_team = &mut left[buyer_idx];
            let seller_team = &mut right[0];

            if buyer_team.budget.unwrap_or(0) < offer_value as i64 {
                continue;
            }

            let transferred = seller_team.squad.remove(candidate_idx);
            let player_name = transferred.name.clone();
            buyer_team.squad.push(transferred);

            if let Some(budget) = buyer_team.budget.as_mut() {
                *budget -= offer_value as i64;
            }
            if let Some(budget) = seller_team.budget.as_mut() {
                *budget += offer_value as i64;
            }

            (buyer_team.name.clone(), seller_team.name.clone(), player_name)
        };

        state.transfer_market.ai_to_ai_transfers_done_season += 1;
        state
            .transfer_market
            .ai_market_activity_round
            .push(AiMarketActivityDto {
                league_id: league_id.clone(),
                seller_team_name: seller_team_name.clone(),
                buyer_team_name: buyer_team_name.clone(),
                player_name: player_name.clone(),
                offer_value,
            });
        state.transfer_market.season_world_transfers.push(WorldTransferDto {
            league_id,
            seller_team_name,
            buyer_team_name,
            player_name,
            offer_value,
            transfer_type: "ai_to_ai".to_string(),
        });
        break;
    }
}

fn find_player_in_ai_teams(
    state: &CareerState,
    player_id: &str,
) -> Option<(String, usize, usize)> {
    for (league_id, season) in &state.seasons {
        for (team_idx, team) in season.teams.iter().enumerate() {
            if team.id.eq_ignore_ascii_case(&state.player_team_id) {
                continue;
            }
            if let Some(player_idx) = team
                .squad
                .iter()
                .position(|p| p.id.eq_ignore_ascii_case(player_id))
            {
                return Some((league_id.clone(), team_idx, player_idx));
            }
        }
    }
    None
}

pub fn list_transfer_market_players(
    state: &CareerState,
    all_leagues: &HashMap<String, League>,
) -> Vec<TransferMarketPlayerDto> {
    let mut out: Vec<TransferMarketPlayerDto> = Vec::new();

    for league_id in &state.active_league_ids {
        let Some(season) = state.seasons.get(league_id) else {
            continue;
        };
        let league_name = all_leagues
            .get(league_id)
            .map(|l| l.name.clone())
            .unwrap_or_else(|| league_id.clone());
        let country = all_leagues
            .get(league_id)
            .map(|l| l.country.clone())
            .unwrap_or_default();

        for team in &season.teams {
            if team.id.eq_ignore_ascii_case(&state.player_team_id) {
                continue;
            }
            for player in &team.squad {
                let market_value = player.market_value.unwrap_or(0);
                if market_value == 0 {
                    continue;
                }

                let key = player.id.to_lowercase();
                let attempts_used = *state.transfer_market.offer_attempts.get(&key).unwrap_or(&0);
                let is_blocked = state.transfer_market.blocked_players.contains(&key);

                out.push(TransferMarketPlayerDto {
                    player_id: player.id.clone(),
                    player_name: player.name.clone(),
                    position: position_label(&player.position).to_string(),
                    overall: player.overall(),
                    speed: player.speed,
                    shooting: player.shooting,
                    passing: player.passing,
                    dribbling: player.dribbling,
                    defense: player.defense,
                    stamina: player.stamina,
                    age: player.age,
                    nationality: player.nationality.clone(),
                    market_value,
                    team_id: team.id.clone(),
                    team_name: team.name.clone(),
                    league_id: league_id.clone(),
                    league_name: league_name.clone(),
                    country: country.clone(),
                    attempts_used,
                    is_blocked,
                });
            }
        }
    }

    out.sort_by(|a, b| {
        b.overall
            .cmp(&a.overall)
            .then(a.player_name.cmp(&b.player_name))
    });
    out
}

pub fn transfer_market_catalog(
    state: &CareerState,
    all_leagues: &HashMap<String, League>,
) -> TransferMarketCatalogDto {
    let mut countries: Vec<String> = Vec::new();
    let mut leagues: Vec<TransferMarketLeagueOptionDto> = Vec::new();
    let mut teams: Vec<TransferMarketTeamOptionDto> = Vec::new();

    for league_id in &state.active_league_ids {
        let country = all_leagues
            .get(league_id)
            .map(|l| l.country.clone())
            .unwrap_or_default();
        let league_name = all_leagues
            .get(league_id)
            .map(|l| l.name.clone())
            .unwrap_or_else(|| league_id.clone());

        countries.push(country.clone());
        leagues.push(TransferMarketLeagueOptionDto {
            league_id: league_id.clone(),
            league_name,
            country,
        });

        if let Some(season) = state.seasons.get(league_id) {
            for team in &season.teams {
                if team.id.eq_ignore_ascii_case(&state.player_team_id) {
                    continue;
                }
                teams.push(TransferMarketTeamOptionDto {
                    team_id: team.id.clone(),
                    team_name: team.name.clone(),
                    league_id: league_id.clone(),
                });
            }
        }
    }

    countries.sort();
    countries.dedup();
    leagues.sort_by(|a, b| {
        a.country
            .cmp(&b.country)
            .then(a.league_name.cmp(&b.league_name))
    });
    teams.sort_by(|a, b| a.team_name.cmp(&b.team_name));

    TransferMarketCatalogDto {
        countries,
        leagues,
        teams,
    }
}

pub fn list_transfer_market_players_page(
    state: &CareerState,
    all_leagues: &HashMap<String, League>,
    query: TransferMarketQueryDto,
) -> TransferMarketPageDto {
    let mut players = list_transfer_market_players(state, all_leagues);

    if let Some(country) = query.country.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()) {
        players.retain(|p| p.country.eq_ignore_ascii_case(country));
    }
    if let Some(league_id) = query.league_id.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()) {
        players.retain(|p| p.league_id.eq_ignore_ascii_case(league_id));
    }
    if let Some(team_id) = query.team_id.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()) {
        players.retain(|p| p.team_id.eq_ignore_ascii_case(team_id));
    }
    if let Some(name) = query.name.as_ref().map(|v| v.trim().to_lowercase()).filter(|v| !v.is_empty()) {
        players.retain(|p| p.player_name.to_lowercase().contains(&name));
    }
    if let Some(position) = query.position.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()) {
        players.retain(|p| p.position.eq_ignore_ascii_case(position));
    }
    if let Some(ovr_min) = query.ovr_min {
        players.retain(|p| p.overall >= ovr_min);
    }
    if let Some(ovr_max) = query.ovr_max {
        players.retain(|p| p.overall <= ovr_max);
    }
    if let Some(age_min) = query.age_min {
        players.retain(|p| p.age.map(|age| age >= age_min).unwrap_or(false));
    }
    if let Some(age_max) = query.age_max {
        players.retain(|p| p.age.map(|age| age <= age_max).unwrap_or(false));
    }
    if let Some(value_min) = query.value_min {
        players.retain(|p| p.market_value >= value_min);
    }
    if let Some(value_max) = query.value_max {
        players.retain(|p| p.market_value <= value_max);
    }
    if let Some(speed_min) = query.speed_min {
        players.retain(|p| p.speed >= speed_min);
    }
    if let Some(speed_max) = query.speed_max {
        players.retain(|p| p.speed <= speed_max);
    }
    if let Some(shooting_min) = query.shooting_min {
        players.retain(|p| p.shooting >= shooting_min);
    }
    if let Some(shooting_max) = query.shooting_max {
        players.retain(|p| p.shooting <= shooting_max);
    }
    if let Some(passing_min) = query.passing_min {
        players.retain(|p| p.passing >= passing_min);
    }
    if let Some(passing_max) = query.passing_max {
        players.retain(|p| p.passing <= passing_max);
    }
    if let Some(dribbling_min) = query.dribbling_min {
        players.retain(|p| p.dribbling >= dribbling_min);
    }
    if let Some(dribbling_max) = query.dribbling_max {
        players.retain(|p| p.dribbling <= dribbling_max);
    }
    if let Some(defense_min) = query.defense_min {
        players.retain(|p| p.defense >= defense_min);
    }
    if let Some(defense_max) = query.defense_max {
        players.retain(|p| p.defense <= defense_max);
    }
    if let Some(stamina_min) = query.stamina_min {
        players.retain(|p| p.stamina >= stamina_min);
    }
    if let Some(stamina_max) = query.stamina_max {
        players.retain(|p| p.stamina <= stamina_max);
    }

    let total = players.len() as u32;
    let page_size = query.page_size.unwrap_or(50).clamp(1, 100);
    let total_pages = if total == 0 {
        1
    } else {
        ((total + page_size - 1) / page_size).max(1)
    };

    let page = query.page.unwrap_or(1).max(1).min(total_pages);
    let start = ((page - 1) * page_size) as usize;
    let end = (start + page_size as usize).min(players.len());
    let items = if start >= players.len() {
        Vec::new()
    } else {
        players[start..end].to_vec()
    };

    TransferMarketPageDto {
        items,
        total,
        page,
        page_size,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1,
    }
}

pub fn get_player_team_squad(state: &CareerState) -> Result<Vec<Player>, String> {
    let season = state
        .seasons
        .get(&state.player_league_id)
        .ok_or_else(|| "Liga do jogador nao encontrada".to_string())?;

    let player_team = season
        .teams
        .iter()
        .find(|team| team.id.eq_ignore_ascii_case(&state.player_team_id))
        .ok_or_else(|| "Seu time nao foi encontrado".to_string())?;

    Ok(player_team.squad.clone())
}

pub fn make_transfer_offer(
    state: &mut CareerState,
    player_id: &str,
    offer_value: u64,
) -> Result<TransferOfferResultDto, String> {
    let key = player_id.to_lowercase();
    let attempts_before = *state.transfer_market.offer_attempts.get(&key).unwrap_or(&0);

    if state.transfer_market.blocked_players.contains(&key) {
        return Ok(TransferOfferResultDto {
            result: "blocked".to_string(),
            attempts_used: attempts_before,
        });
    }

    if state.player_team_budget < offer_value as i64 {
        return Ok(TransferOfferResultDto {
            result: "insufficient_budget".to_string(),
            attempts_used: attempts_before,
        });
    }

    let (seller_league_id, seller_team_idx, seller_player_idx) =
        find_player_in_ai_teams(state, player_id)
            .ok_or_else(|| "Atleta nao encontrado no mercado".to_string())?;

    let market_value = state
        .seasons
        .get(&seller_league_id)
        .and_then(|season| season.teams.get(seller_team_idx))
        .and_then(|team| team.squad.get(seller_player_idx))
        .and_then(|p| p.market_value)
        .ok_or_else(|| "Atleta sem valor de mercado valido".to_string())?;

    let multiplier = *state
        .transfer_market
        .asking_price_multipliers
        .entry(key.clone())
        .or_insert_with(|| rand::thread_rng().gen_range(1.10..=1.50));

    let asking_value = (market_value as f64 * multiplier).round() as u64;
    if offer_value >= asking_value {
        let (transferred, seller_team_name) = {
            let season = state
                .seasons
                .get_mut(&seller_league_id)
                .ok_or_else(|| "Liga do atleta nao encontrada".to_string())?;
            let seller_team = season
                .teams
                .get_mut(seller_team_idx)
                .ok_or_else(|| "Time vendedor nao encontrado".to_string())?;
            let player = seller_team.squad.remove(seller_player_idx);
            let seller_team_name = seller_team.name.clone();
            if let Some(budget) = seller_team.budget.as_mut() {
                *budget += offer_value as i64;
            }
            (player, seller_team_name)
        };

        let transferred_player_name = transferred.name.clone();
        let buyer_team_name = {
            let player_league_id = state.player_league_id.clone();
            let player_team_id = state.player_team_id.clone();
            let season = state
                .seasons
                .get_mut(&player_league_id)
                .ok_or_else(|| "Liga do jogador nao encontrada".to_string())?;
            let player_team = season
                .teams
                .iter_mut()
                .find(|team| team.id.eq_ignore_ascii_case(&player_team_id))
                .ok_or_else(|| "Seu time nao foi encontrado".to_string())?;
            let name = player_team.name.clone();
            player_team.squad.push(transferred);
            name
        };

        state.player_team_budget -= offer_value as i64;
        state.transfer_market.offer_attempts.remove(&key);
        state.transfer_market.blocked_players.remove(&key);
        state.transfer_market.season_world_transfers.push(WorldTransferDto {
            league_id: seller_league_id,
            seller_team_name,
            buyer_team_name,
            player_name: transferred_player_name,
            offer_value,
            transfer_type: "ai_to_player".to_string(),
        });

        return Ok(TransferOfferResultDto {
            result: "accepted".to_string(),
            attempts_used: attempts_before,
        });
    }

    let attempts = attempts_before.saturating_add(1);
    state.transfer_market.offer_attempts.insert(key.clone(), attempts);
    if attempts >= 3 {
        state.transfer_market.blocked_players.insert(key);
    }

    Ok(TransferOfferResultDto {
        result: "refused".to_string(),
        attempts_used: attempts,
    })
}

pub fn list_ai_player_offers(state: &CareerState) -> Vec<AiPlayerOfferDto> {
    state.transfer_market.pending_ai_offers.clone()
}

pub fn list_ai_market_activity(state: &CareerState) -> Vec<AiMarketActivityDto> {
    state.transfer_market.ai_market_activity_round.clone()
}

pub fn list_career_season_history(state: &CareerState) -> Vec<CareerSeasonSummaryDto> {
    let mut history = state.season_history.clone();
    history.sort_by(|a, b| b.season.cmp(&a.season));
    history
}

pub fn respond_ai_player_offer(
    state: &mut CareerState,
    player_id: &str,
    accept: bool,
) -> Result<(), String> {
    let offer_idx = state
        .transfer_market
        .pending_ai_offers
        .iter()
        .position(|o| o.player_id.eq_ignore_ascii_case(player_id))
        .ok_or_else(|| "Proposta nao encontrada".to_string())?;

    let offer = state.transfer_market.pending_ai_offers.remove(offer_idx);
    if !accept {
        return Ok(());
    }

    let player_league_id = state.player_league_id.clone();
    let player_team_id = state.player_team_id.clone();

    let (transferred_player, seller_team_name) = {
        let season = state
            .seasons
            .get_mut(&player_league_id)
            .ok_or_else(|| "Liga do jogador nao encontrada".to_string())?;
        let player_team = season
            .teams
            .iter_mut()
            .find(|team| team.id.eq_ignore_ascii_case(&player_team_id))
            .ok_or_else(|| "Seu time nao foi encontrado".to_string())?;

        let seller_team_name = player_team.name.clone();

        let player_idx = player_team
            .squad
            .iter()
            .position(|p| p.id.eq_ignore_ascii_case(&offer.player_id))
            .ok_or_else(|| "Atleta nao encontrado no seu elenco".to_string())?;
        (player_team.squad.remove(player_idx), seller_team_name)
    };

    let mut pushed = false;
    for season in state.seasons.values_mut() {
        if let Some(team) = season
            .teams
            .iter_mut()
            .find(|team| team.id.eq_ignore_ascii_case(&offer.offering_team_id))
        {
            team.squad.push(transferred_player.clone());
            if let Some(budget) = team.budget.as_mut() {
                *budget -= offer.offer_value as i64;
            }
            pushed = true;
            break;
        }
    }

    if !pushed {
        return Err("Time ofertante nao encontrado".to_string());
    }

    state.player_team_budget += offer.offer_value as i64;
    state.transfer_market.season_world_transfers.push(WorldTransferDto {
        league_id: state.player_league_id.clone(),
        seller_team_name,
        buyer_team_name: offer.offering_team_name,
        player_name: offer.player_name,
        offer_value: offer.offer_value,
        transfer_type: "ai_to_player".to_string(),
    });
    Ok(())
}

fn build_league_season(league: &League) -> Result<LeagueSeasonState, String> {
    let mut teams: Vec<TeamMeta> = league
        .teams
        .iter()
        .map(|team| TeamMeta {
            id: team.id.clone(),
            name: team.name.clone(),
            stadium: team.stadium.clone(),
            squad: team.squad.clone(),
            coach: team.coach.clone(),
            budget: Some(team.budget),
        })
        .collect();

    teams.sort_by(|a, b| a.name.cmp(&b.name));

    if teams.len() < 2 {
        return Err(format!(
            "Liga '{}' precisa ter pelo menos dois times",
            league.id
        ));
    }

    let schedule = generate_schedule(teams.len());

    let mut table = HashMap::new();
    for team in &teams {
        table.insert(team.id.clone(), Standing::default());
    }

    Ok(LeagueSeasonState {
        league_id: league.id.clone(),
        current_round: 0,
        teams,
        schedule,
        table,
    })
}

fn sorted_table_rows(season: &LeagueSeasonState) -> Vec<TableEntryDto> {
    let mut table_rows: Vec<TableEntryDto> = season
        .teams
        .iter()
        .filter_map(|team| {
            season.table.get(&team.id).map(|standing| TableEntryDto {
                team_id: team.id.clone(),
                team_name: team.name.clone(),
                played: standing.played,
                wins: standing.wins,
                draws: standing.draws,
                losses: standing.losses,
                goals_for: standing.goals_for,
                goals_against: standing.goals_against,
                goal_diff: standing.goals_for - standing.goals_against,
                points: standing.points,
            })
        })
        .collect();

    table_rows.sort_by(|a, b| {
        b.points
            .cmp(&a.points)
            .then((b.goal_diff).cmp(&a.goal_diff))
            .then(b.goals_for.cmp(&a.goals_for))
            .then(a.team_name.cmp(&b.team_name))
    });

    table_rows
}

fn season_leader(season: &LeagueSeasonState) -> (String, u32) {
    let table = sorted_table_rows(season);
    if let Some(first) = table.first() {
        (first.team_name.clone(), first.points)
    } else {
        ("-".to_string(), 0)
    }
}

fn update_table(
    table: &mut HashMap<String, Standing>,
    home_id: &str,
    away_id: &str,
    home_goals: i32,
    away_goals: i32,
) {
    if let Some(home) = table.get_mut(home_id) {
        home.played += 1;
        home.goals_for += home_goals;
        home.goals_against += away_goals;
        if home_goals > away_goals {
            home.wins += 1;
            home.points += 3;
        } else if home_goals == away_goals {
            home.draws += 1;
            home.points += 1;
        } else {
            home.losses += 1;
        }
    }

    if let Some(away) = table.get_mut(away_id) {
        away.played += 1;
        away.goals_for += away_goals;
        away.goals_against += home_goals;
        if away_goals > home_goals {
            away.wins += 1;
            away.points += 3;
        } else if away_goals == home_goals {
            away.draws += 1;
            away.points += 1;
        } else {
            away.losses += 1;
        }
    }
}

fn generate_schedule(team_count: usize) -> Vec<Vec<ScheduledMatch>> {
    let mut participants: Vec<Option<usize>> = (0..team_count).map(Some).collect();
    if participants.len() % 2 == 1 {
        participants.push(None);
    }

    let rounds = participants.len() - 1;
    let half = participants.len() / 2;
    let mut first_leg: Vec<Vec<ScheduledMatch>> = Vec::with_capacity(rounds);

    for round in 0..rounds {
        let mut games = Vec::new();
        for i in 0..half {
            let a = participants[i];
            let b = participants[participants.len() - 1 - i];
            if let (Some(t1), Some(t2)) = (a, b) {
                if round % 2 == 0 {
                    games.push(ScheduledMatch {
                        home_idx: t1,
                        away_idx: t2,
                    });
                } else {
                    games.push(ScheduledMatch {
                        home_idx: t2,
                        away_idx: t1,
                    });
                }
            }
        }

        first_leg.push(games);

        if let Some(last) = participants.pop() {
            participants.insert(1, last);
        }
    }

    let mut second_leg: Vec<Vec<ScheduledMatch>> = first_leg
        .iter()
        .map(|games| {
            games
                .iter()
                .map(|m| ScheduledMatch {
                    home_idx: m.away_idx,
                    away_idx: m.home_idx,
                })
                .collect()
        })
        .collect();

    first_leg.append(&mut second_leg);
    first_leg
}

// ══════════════════════════════════════════════════════════════════════════════
// Transferência de Técnicos
// ══════════════════════════════════════════════════════════════════════════════

/// Struct para representar uma oferta de clube para o técnico
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClubOfferDto {
    pub team_id: String,
    pub team_name: String,
    pub league_id: String,
    pub current_position: u32,
    pub morale: i32,
}

/// Lista clubes disponíveis para o técnico demitido.
/// Retorna clubes de todas as ligas que estão em situação difícil (moral baixa, posição ruim).
pub fn list_available_clubs(
    state: &CareerState,
    all_leagues: &HashMap<String, League>,
) -> Vec<ClubOfferDto> {
    let mut offers: Vec<ClubOfferDto> = Vec::new();

    for league_id in &state.active_league_ids {
        if let Some(season) = state.seasons.get(league_id) {
            let league = all_leagues.get(league_id);
            if league.is_none() {
                continue;
            }

            let table = sorted_table_rows(season);
            let total_teams = table.len() as u32;

            // Apenas oferecer clubes no bottom 40% da tabela (zona de rebaixamento + próximos)
            // Exemplo: campeonato com 20 times → oferecer apenas do 13º em diante
            let min_position = ((total_teams as f32 * 0.6).ceil() as u32).max(1);

            for (idx, entry) in table.iter().enumerate() {
                let position = (idx + 1) as u32;

                // Não oferecer o próprio time do jogador
                if entry.team_id.eq_ignore_ascii_case(&state.player_team_id) {
                    continue;
                }

                // Apenas times na metade inferior da tabela podem oferecer vaga
                if position < min_position {
                    continue;
                }

                // Simular moral baseada na posição:
                // - Últimos 4 colocados: moral 10-25% (situação crítica)
                // - Zona intermediária de perigo: moral 25-45% (situação difícil)
                let relegation_zone = total_teams.saturating_sub(3);
                let simulated_morale = if position > relegation_zone {
                    // Zona de rebaixamento direta: moral muito baixa
                    rand::thread_rng().gen_range(10..=25)
                } else {
                    // Próximo da zona: moral baixa/média
                    rand::thread_rng().gen_range(25..=45)
                };

                offers.push(ClubOfferDto {
                    team_id: entry.team_id.clone(),
                    team_name: entry.team_name.clone(),
                    league_id: league_id.clone(),
                    current_position: position,
                    morale: simulated_morale,
                });

                // Limitar a 5 ofertas no máximo
                if offers.len() >= 5 {
                    break;
                }
            }
        }
    }

    // Ordenar por posição (pior primeiro - maiores chances de rebaixamento no topo)
    offers.sort_by(|a, b| b.current_position.cmp(&a.current_position));

    offers
}

/// Transfere o técnico do jogador para outro time.
/// Reseta a moral para um valor inicial e atualiza o time do jogador.
pub fn transfer_coach_to_team(
    state: &mut CareerState,
    new_team_id: &str,
    all_leagues: &HashMap<String, League>,
) -> Result<CareerSnapshotDto, String> {
    // Encontrar em qual liga está o novo time
    let mut found_league_id: Option<String> = None;

    for (league_id, season) in &state.seasons {
        if season.teams.iter().any(|t| t.id.eq_ignore_ascii_case(new_team_id)) {
            found_league_id = Some(league_id.clone());
            break;
        }
    }

    let new_league_id = found_league_id.ok_or_else(|| {
        format!("Time {} não encontrado em nenhuma liga ativa", new_team_id)
    })?;

    // Atualizar o estado
    state.player_team_id = new_team_id.to_string();
    state.player_league_id = new_league_id;
    state.morale = 60; // Moral inicial moderada no novo clube
    state.result_streak = 0;

    // Recalcular energia dos jogadores do novo time
    state.player_energy.clear();
    if let Some(season) = state.seasons.get(&state.player_league_id) {
        if let Some(team_meta) = season.teams.iter().find(|t| t.id.eq_ignore_ascii_case(new_team_id)) {
            for player in &team_meta.squad {
                state.player_energy.insert(player.id.clone(), 100.0);
            }
        }
    }

    Ok(snapshot(state, all_leagues))
}

