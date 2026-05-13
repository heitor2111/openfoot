use rand::seq::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::models::attributes::{
    natural_slot_zone, out_of_position_multiplier, zone_strength, AttributeKind, Attributes, Zone,
};
use crate::models::lineup::SlotZone;
use crate::models::player::{Player, Position};
use crate::models::probability::{
    apply_creator_bonus, goal_probability, shot_type_strength, zone_contest, ShotType,
};
use crate::models::tactics::{PlayStyle, Tactics, TacticsZone};

#[derive(Clone, Debug)]
pub struct MatchPlayer {
    pub player: Player,
    pub energy: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchState {
    pub minute: u8,
    pub home_score: u8,
    pub away_score: u8,
    pub home_squad: Vec<Player>,
    pub away_squad: Vec<Player>,
    pub home_lineup_zones: Option<HashMap<String, SlotZone>>,
    pub away_lineup_zones: Option<HashMap<String, SlotZone>>,
    pub is_paused: bool,
    pub is_finished: bool,
    pub events: Vec<MatchEvent>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchEvent {
    pub sequence_id: u32,
    pub minute: u8,
    pub event_type: EventType,
    pub player_name: Option<String>,
    pub assister_name: Option<String>,
    pub team: Option<TeamSide>,
}

#[derive(Clone, Debug)]
pub struct SilentGoalEvent {
    pub minute: u8,
    pub team: TeamSide,
    pub scorer_name: String,
    pub assister_name: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum EventType {
    Goal,
    YellowCard,
    RedCard,
    Foul,
    Corner,
    Substitution,
    HalfTime,
    FullTime,
    NearMiss,
    Save,
    KickOff,
    Injury,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum TeamSide {
    Home,
    Away,
}

pub fn simulate_tick(state: &mut MatchState, home_tactics: &Tactics, away_tactics: &Tactics) -> Option<MatchEvent> {
    if state.is_paused || state.is_finished {
        return None;
    }

    if state.minute > 90 {
        state.is_finished = true;
        return Some(push_event(state, EventType::FullTime, None, None, None));
    }

    if state.minute == 45 {
        let event = push_event(state, EventType::HalfTime, None, None, None);
        state.minute = state.minute.saturating_add(1);
        return Some(event);
    }

    let home_mid = zone_strength_with_tactics(
        &state.home_squad,
        TacticsZone::Midfield,
        &home_tactics.formation,
        &home_tactics.play_style,
        state.home_lineup_zones.as_ref(),
    ) * (1.0 + home_tactics.play_style.interaction_modifier(&away_tactics.play_style));
    
    let away_mid = zone_strength_with_tactics(
        &state.away_squad,
        TacticsZone::Midfield,
        &away_tactics.formation,
        &away_tactics.play_style,
        state.away_lineup_zones.as_ref(),
    ) * (1.0 + away_tactics.play_style.interaction_modifier(&home_tactics.play_style));
    
    let home_advances = zone_contest(home_mid, away_mid);

    // Nem toda jogada que vence o meio-campo vira ataque perigoso.
    if rand::random::<f64>() > 0.25 {
        state.minute = state.minute.saturating_add(1);
        return None;
    }

    let home_squad = state.home_squad.clone();
    let away_squad = state.away_squad.clone();
    let home_lineup_zones = state.home_lineup_zones.clone();
    let away_lineup_zones = state.away_lineup_zones.clone();

    let tick_event = if home_advances {
        resolve_attack(
            state,
            TeamSide::Home,
            Zone::Attack,
            Zone::Defense,
            &home_squad,
            &away_squad,
            home_lineup_zones.as_ref(),
            away_lineup_zones.as_ref(),
            home_tactics,
            away_tactics,
        )
    } else {
        resolve_attack(
            state,
            TeamSide::Away,
            Zone::Attack,
            Zone::Defense,
            &away_squad,
            &home_squad,
            away_lineup_zones.as_ref(),
            home_lineup_zones.as_ref(),
            away_tactics,
            home_tactics,
        )
    };

    state.minute = state.minute.saturating_add(1);
    tick_event
}

pub fn simulate_silent(
    home: Vec<Player>,
    away: Vec<Player>,
    home_tactics: Tactics,
    away_tactics: Tactics,
) -> (u8, u8, Vec<SilentGoalEvent>) {
    let home_match_squad: Vec<MatchPlayer> = home
        .into_iter()
        .map(|p| MatchPlayer {
            energy: p.energy,
            player: p,
        })
        .collect();
    let away_match_squad: Vec<MatchPlayer> = away
        .into_iter()
        .map(|p| MatchPlayer {
            energy: p.energy,
            player: p,
        })
        .collect();

    let (home_goals, away_goals, raw_events) = simulate_full(
        home_match_squad,
        away_match_squad,
        &home_tactics,
        &away_tactics,
        None,
        None,
    );

    let goal_events = raw_events
        .into_iter()
        .filter_map(|event| {
            if !matches!(event.event_type, EventType::Goal) {
                return None;
            }

            Some(SilentGoalEvent {
                minute: event.minute,
                team: event.team?,
                scorer_name: event.player_name?,
                assister_name: event.assister_name,
            })
        })
        .collect();

    (home_goals.min(15), away_goals.min(15), goal_events)
}

pub fn simulate_full(
    home: Vec<MatchPlayer>,
    away: Vec<MatchPlayer>,
    home_tactics: &Tactics,
    away_tactics: &Tactics,
    home_lineup_zones: Option<&HashMap<String, SlotZone>>,
    away_lineup_zones: Option<&HashMap<String, SlotZone>>,
) -> (u8, u8, Vec<MatchEvent>) {
    let mut state = MatchState {
        minute: 1,
        home_score: 0,
        away_score: 0,
        home_squad: home.into_iter().map(|mp| { let mut p = mp.player; p.energy = mp.energy; p }).collect(),
        away_squad: away.into_iter().map(|mp| { let mut p = mp.player; p.energy = mp.energy; p }).collect(),
        home_lineup_zones: home_lineup_zones.cloned(),
        away_lineup_zones: away_lineup_zones.cloned(),
        is_paused: false,
        is_finished: false,
        events: Vec::new(),
    };

    while !state.is_finished {
        simulate_tick(&mut state, home_tactics, away_tactics);
    }

    (state.home_score.min(15), state.away_score.min(15), state.events)
}

fn resolve_attack(
    state: &mut MatchState,
    attacking_side: TeamSide,
    attack_zone: Zone,
    defense_zone: Zone,
    attacking_squad: &[Player],
    defending_squad: &[Player],
    attacking_lineup_zones: Option<&HashMap<String, SlotZone>>,
    defending_lineup_zones: Option<&HashMap<String, SlotZone>>,
    attacking_tactics: &Tactics,
    defending_tactics: &Tactics,
) -> Option<MatchEvent> {
    // Modificador de interação na fase de ataque (Contraataque vs PosseDeBola)
    let attack_phase_modifier = if matches!(attacking_tactics.play_style, PlayStyle::Contraataque)
        && matches!(defending_tactics.play_style, PlayStyle::PosseDeBola)
    {
        0.15
    } else {
        0.0
    };
    
    let atk_strength = zone_strength_with_tactics(
        attacking_squad,
        TacticsZone::Attack,
        &attacking_tactics.formation,
        &attacking_tactics.play_style,
        attacking_lineup_zones,
    ) * (1.0 + attack_phase_modifier);
    
    let def_strength = zone_strength_with_tactics(
        defending_squad,
        TacticsZone::Defense,
        &defending_tactics.formation,
        &defending_tactics.play_style,
        defending_lineup_zones,
    );

    // fallback para zone_strength original nos casos que nao tem contexto tatico
    let _ = attack_zone;
    let _ = defense_zone;

    if !zone_contest(atk_strength, def_strength) {
        // Defesa venceu — Momento 1 para escanteio (defensor afasta antes do chute)
        let mut rng = rand::thread_rng();
        
        // Chance de escanteio baseada no melhor defensor
        if let Some(best_defender) = select_best_defender(defending_squad) {
            let def_str_sum = (best_defender.defense + best_defender.stamina) as f64;
            let baseline: f64 = 150.0;
            let corner_prob = def_str_sum.powi(2) / (def_str_sum.powi(2) + baseline.powi(2));
            
            if rng.gen::<f64>() < corner_prob {
                return Some(push_event(
                    state,
                    EventType::Corner,
                    None,
                    None,
                    Some(attacking_side.clone()),
                ));
            }
        }
        
        // Caso não gere escanteio, chance de falta baseada no pior defensor
        if let Some(defender) = select_worst_defender(defending_squad) {
            let foul_chance = if defender.defense < 60 {
                0.25
            } else {
                0.10
            };
            
            if rng.gen::<f64>() < foul_chance {
                // Falta cometida
                let yellow_chance = 0.25;  // 25% de cartão amarelo dado que houve falta
                let red_chance = 0.05;     // 5% de cartão vermelho dado que houve falta
                
                let event_type = if rng.gen::<f64>() < red_chance {
                    EventType::RedCard
                } else if rng.gen::<f64>() < yellow_chance {
                    EventType::YellowCard
                } else {
                    EventType::Foul
                };
                
                // Inverter o lado do time pois a falta é do time defensor
                let foul_side = match attacking_side {
                    TeamSide::Home => TeamSide::Away,
                    TeamSide::Away => TeamSide::Home,
                };
                
                return Some(push_event(
                    state,
                    event_type,
                    Some(defender.name.clone()),
                    None,
                    Some(foul_side),
                ));
            }
        }
        
        return None;
    }

    let attacker = select_attacker(attacking_squad, &attacking_tactics.play_style)?;
    let creator = select_creator(attacking_squad, &attacking_tactics.play_style).unwrap_or(attacker);
    let (goalkeeper, goalkeeper_penalty) =
        select_goalkeeper_with_penalty(defending_squad, defending_lineup_zones);
    let goalkeeper = goalkeeper.or_else(|| defending_squad.first())?;

    let attacker_attrs = Attributes::from_player(attacker);
    let goalkeeper_attrs = Attributes::from_player(goalkeeper);
    let shot_type = random_shot_type_with_style(&attacking_tactics.play_style);
    let shot_strength = shot_type_strength(
        attacker_attrs.get_effective_attribute_with_energy(crate::models::attributes::AttributeKind::SHT, attacker.stamina, attacker.energy),
        attacker_attrs.get_effective_attribute_with_energy(crate::models::attributes::AttributeKind::SPD, attacker.stamina, attacker.energy),
        attacker_attrs.get_effective_attribute_with_energy(crate::models::attributes::AttributeKind::DRB, attacker.stamina, attacker.energy),
        attacker_attrs.get_effective_attribute_with_energy(crate::models::attributes::AttributeKind::STR, attacker.stamina, attacker.energy),
        shot_type,
    );
    let creator_bonus = apply_creator_bonus(
        shot_strength,
        Attributes::from_player(creator).get_effective_attribute_with_energy(
            crate::models::attributes::AttributeKind::PAS,
            creator.stamina,
            creator.energy,
        ),
    );
    let raw_gk_def = goalkeeper_attrs.get_effective_attribute_with_energy(
        crate::models::attributes::AttributeKind::DEF,
        goalkeeper.stamina,
        goalkeeper.energy,
    );
    let effective_gk_def = raw_gk_def * goalkeeper_penalty;
    let goal_chance = goal_probability(creator_bonus, effective_gk_def);

    let mut rng = rand::thread_rng();
    let scoring = rng.gen::<f64>() < goal_chance;

    if scoring {
        match attacking_side {
            TeamSide::Home => state.home_score = state.home_score.saturating_add(1),
            TeamSide::Away => state.away_score = state.away_score.saturating_add(1),
        }

        return Some(push_event(
            state,
            EventType::Goal,
            Some(attacker.name.clone()),
            if creator.id != attacker.id {
                Some(creator.name.clone())
            } else {
                None
            },
            Some(attacking_side.clone()),
        ));
    }

    // Momento 2 — Chute aconteceu mas não entrou: chance de escanteio
    let is_save = rng.gen::<f64>() < 0.5;
    let event_type = if is_save {
        EventType::Save
    } else {
        EventType::NearMiss
    };
    
    // Calcular probabilidade de escanteio baseada no tipo de evento
    let corner_prob = if is_save {
        // Save → usar DEF do goleiro
        let gk_def = raw_gk_def;
        let baseline: f64 = 120.0;
        gk_def.powi(2) / (gk_def.powi(2) + baseline.powi(2))
    } else {
        // NearMiss → usar média DEF+STR dos defensores
        let defenders: Vec<&Player> = defending_squad
            .iter()
            .filter(|p| matches!(p.position, Position::ZAG | Position::LAT_E | Position::LAT_D))
            .collect();
        
        if !defenders.is_empty() {
            let avg_def_str: f64 = defenders
                .iter()
                .map(|p| (p.defense + p.stamina) as f64)
                .sum::<f64>() / defenders.len() as f64;
            let baseline: f64 = 160.0;
            avg_def_str.powi(2) / (avg_def_str.powi(2) + baseline.powi(2))
        } else {
            0.0
        }
    };
    
    if rng.gen::<f64>() < corner_prob {
        // Gera escanteio ao invés do evento Save/NearMiss
        return Some(push_event(
            state,
            EventType::Corner,
            None,
            None,
            Some(attacking_side.clone()),
        ));
    }

    Some(push_event(
        state,
        event_type,
        Some(attacker.name.clone()),
        None,
        Some(attacking_side),
    ))
}

fn push_event(
    state: &mut MatchState,
    event_type: EventType,
    player_name: Option<String>,
    assister_name: Option<String>,
    team: Option<TeamSide>,
) -> MatchEvent {
    let event = MatchEvent {
        sequence_id: state.events.len() as u32 + 1,
        minute: state.minute,
        event_type,
        player_name,
        assister_name,
        team,
    };
    state.events.push(event.clone());
    event
}

fn select_goalkeeper_with_penalty<'a>(
    players: &'a [Player],
    lineup_zones: Option<&HashMap<String, SlotZone>>,
) -> (Option<&'a Player>, f64) {
    if let Some(zones) = lineup_zones {
        if let Some(player_in_gol) = players.iter().find(|p| zones.get(&p.id) == Some(&SlotZone::Gol)) {
            let penalty = if matches!(player_in_gol.position, Position::GOL) {
                1.0
            } else {
                0.25
            };
            return (Some(player_in_gol), penalty);
        }

        return (players.first(), 0.20);
    }

    match players.iter().find(|player| matches!(player.position, Position::GOL)) {
        Some(gk) => (Some(gk), 1.0),
        None => (players.first(), 0.30),
    }
}

fn select_worst_defender<'a>(players: &'a [Player]) -> Option<&'a Player> {
    let mut defenders: Vec<&Player> = players
        .iter()
        .filter(|player| {
            matches!(
                player.position,
                Position::ZAG | Position::LAT_E | Position::LAT_D | Position::VOL
            )
        })
        .collect();

    if defenders.is_empty() {
        defenders = players.iter().collect();
    }

    // Seleciona o defensor com menor atributo DEF (mais propenso a cometer faltas)
    defenders.into_iter().min_by_key(|p| p.defense)
}

fn select_best_defender<'a>(players: &'a [Player]) -> Option<&'a Player> {
    let mut defenders: Vec<&Player> = players
        .iter()
        .filter(|player| {
            matches!(
                player.position,
                Position::ZAG | Position::LAT_E | Position::LAT_D
            )
        })
        .collect();

    if defenders.is_empty() {
        defenders = players.iter().collect();
    }

    // Seleciona o defensor com maior soma DEF+STR (melhor para afastar a bola)
    defenders.into_iter().max_by_key(|p| p.defense + p.stamina)
}

fn select_attacker<'a>(players: &'a [Player], play_style: &PlayStyle) -> Option<&'a Player> {
    let mut attackers: Vec<&Player> = players
        .iter()
        .filter(|player| {
            // Posições base para todos os estilos
            let is_base_attacker = matches!(
                player.position,
                Position::ATA | Position::SA | Position::PNT_E | Position::PNT_D | Position::MEI_A
            );
            
            // Posições extras por estilo de jogo
            let is_style_attacker = match play_style {
                PlayStyle::JogoAereo => matches!(player.position, Position::ZAG | Position::VOL),
                PlayStyle::BolaDireta => matches!(player.position, Position::VOL),
                PlayStyle::PressingAlto => matches!(player.position, Position::LAT_E | Position::LAT_D),
                PlayStyle::Retranca => matches!(player.position, Position::VOL),
                _ => false,
            };
            
            // Para Retranca, APENAS VOL pode atacar (raramente)
            if matches!(play_style, PlayStyle::Retranca) {
                return matches!(player.position, Position::VOL);
            }
            
            is_base_attacker || is_style_attacker
        })
        .collect();

    if attackers.is_empty() {
        attackers = players.iter().collect();
    }

    if attackers.is_empty() {
        return None;
    }

    // Sorteio ponderado para aproximar a "escalação automática":
    // atacantes mais qualificados tendem a finalizar mais.
    let weight_for = |p: &Player| {
        let base = (p.shooting as f64 * 1.80)
            + (p.dribbling as f64 * 0.75)
            + (p.speed as f64 * 0.55)
            + (p.overall() as f64 * 0.45);

        let position_bonus = match p.position {
            Position::ATA => 1.50,      // Atacante: forte preferência
            Position::SA => 1.25,       // Segundo atacante: bom bônus
            Position::PNT_E | Position::PNT_D => 0.90,  // Ponta: menos preferência que atacante
            Position::MEI_A => 1.03,
            Position::VOL => 0.84,
            Position::LAT_E | Position::LAT_D => 0.80,
            Position::ZAG => 0.70,
            Position::GOL | Position::MEI => 0.65,
        };

        let style_bonus = match play_style {
            PlayStyle::JogoAereo if matches!(p.position, Position::ATA | Position::ZAG) => 1.10,
            PlayStyle::BolaDireta if matches!(p.position, Position::ATA | Position::SA) => 1.08,
            PlayStyle::PressingAlto if matches!(p.position, Position::ATA | Position::PNT_E | Position::PNT_D) => 1.06,
            PlayStyle::Retranca if matches!(p.position, Position::VOL) => 1.12,
            _ => 1.0,
        };

        (base * position_bonus * style_bonus).max(1.0)
    };

    let mut rng = rand::thread_rng();
    let total_weight: f64 = attackers.iter().map(|p| weight_for(p)).sum();
    if total_weight <= f64::EPSILON {
        return attackers.choose(&mut rng).copied();
    }

    let mut draw = rng.gen_range(0.0..total_weight);
    for attacker in &attackers {
        draw -= weight_for(attacker);
        if draw <= 0.0 {
            return Some(attacker);
        }
    }

    attackers.last().copied()
}

fn select_creator<'a>(players: &'a [Player], play_style: &PlayStyle) -> Option<&'a Player> {
    let mut creators: Vec<&Player> = players
        .iter()
        .filter(|player| {
            // Para Retranca, APENAS VOL e ZAG podem criar
            if matches!(play_style, PlayStyle::Retranca) {
                return matches!(player.position, Position::VOL | Position::ZAG);
            }
            
            // Posições base para todos os estilos
            let is_base_creator = matches!(
                player.position,
                Position::MEI | Position::MEI_A | Position::VOL | Position::PNT_E | Position::PNT_D
            );
            
            // Posições extras por estilo de jogo
            let is_style_creator = match play_style {
                PlayStyle::BolaDireta => matches!(player.position, Position::ZAG | Position::LAT_E | Position::LAT_D),
                PlayStyle::PressingAlto => matches!(player.position, Position::LAT_E | Position::LAT_D),
                _ => false,
            };
            
            is_base_creator || is_style_creator
        })
        .collect();

    if creators.is_empty() {
        creators = players.iter().collect();
    }

    let mut rng = rand::thread_rng();
    creators.choose(&mut rng).copied()
}

/// zone_strength com modificadores taticos aplicados
pub fn zone_strength_with_tactics(
    players: &[Player],
    tactics_zone: TacticsZone,
    formation: &crate::models::tactics::Formation,
    play_style: &PlayStyle,
    lineup_zones: Option<&HashMap<String, SlotZone>>,
) -> f64 {
    let engine_zone = match tactics_zone {
        TacticsZone::Defense => Zone::Defense,
        TacticsZone::Midfield => Zone::Midfield,
        TacticsZone::Attack => Zone::Attack,
    };

    let zone_players: Vec<(&Player, f64)> = players
        .iter()
        .filter_map(|player| {
            let slot_zone = lineup_zones
                .and_then(|zones| zones.get(&player.id).copied())
                .unwrap_or_else(|| natural_slot_zone(&player.position));

            if !slot_zone_matches_tactics(slot_zone, tactics_zone) {
                return None;
            }

            let penalty = out_of_position_multiplier(&player.position, &slot_zone);
            Some((player, penalty))
        })
        .collect();

    let base = if zone_players.is_empty() {
        zone_strength(players, engine_zone)
    } else {
        zone_players
            .iter()
            .map(|(player, penalty)| {
                let attrs = Attributes::from_player(player);
                let primary = position_primary_for_zone(tactics_zone);
                mean_effective_attrs_zone(&attrs, &primary, player.stamina, player.energy) * penalty
            })
            .sum::<f64>()
            / zone_players.len() as f64
    };
    let formation_mul = formation.zone_multiplier(tactics_zone);
    let (def_mod, mid_mod, atk_mod) = play_style.zone_modifiers();

    let style_mul = match tactics_zone {
        TacticsZone::Defense => def_mod,
        TacticsZone::Midfield => mid_mod,
        TacticsZone::Attack => atk_mod,
    };

    // Times com menos de 11 têm buracos no campo em todas as zonas.
    // 7 jogadores → 64% de cobertura; 11 → 100%.
    let squad_coverage = (players.len() as f64 / 11.0).min(1.0);

    base * formation_mul * style_mul * squad_coverage
}

fn slot_zone_matches_tactics(slot_zone: SlotZone, tactics_zone: TacticsZone) -> bool {
    match tactics_zone {
        TacticsZone::Defense => matches!(slot_zone, SlotZone::Gol | SlotZone::Def),
        TacticsZone::Midfield => matches!(slot_zone, SlotZone::Mei),
        TacticsZone::Attack => matches!(slot_zone, SlotZone::Ata),
    }
}

fn position_primary_for_zone(zone: TacticsZone) -> [AttributeKind; 3] {
    match zone {
        TacticsZone::Defense => [AttributeKind::DEF, AttributeKind::STR, AttributeKind::SPD],
        TacticsZone::Midfield => [AttributeKind::PAS, AttributeKind::DEF, AttributeKind::STA],
        TacticsZone::Attack => [AttributeKind::SHT, AttributeKind::SPD, AttributeKind::DRB],
    }
}

fn mean_effective_attrs_zone(attrs: &Attributes, kinds: &[AttributeKind; 3], sta: u8, energy: f64) -> f64 {
    kinds
        .iter()
        .map(|kind| attrs.get_effective_attribute_with_energy(kind.clone(), sta, energy))
        .sum::<f64>()
        / 3.0
}

fn random_shot_type_with_style(play_style: &PlayStyle) -> ShotType {
    let weights = play_style.shot_type_weights();
    let total: u32 = weights.iter().sum();
    let mut rng = rand::thread_rng();
    let mut pick = rng.gen_range(0..total);

    let shot_types = [
        ShotType::Normal,
        ShotType::CounterAttack,
        ShotType::LongShot,
        ShotType::Individual,
        ShotType::Header,
        ShotType::FreeKick,
    ];

    for (weight, shot_type) in weights.iter().zip(shot_types.iter()) {
        if pick < *weight {
            return shot_type.clone();
        }
        pick -= weight;
    }

    ShotType::Normal
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::player::PlayerStatus;

    fn make_player(id: &str, name: &str, position: Position) -> Player {
        Player {
            id: id.to_string(),
            name: name.to_string(),
            position,
            speed: 75,
            shooting: 75,
            passing: 75,
            dribbling: 75,
            defense: 75,
            stamina: 80,
            team_id: "team-1".to_string(),
            league_id: Some("league-1".to_string()),
            status: PlayerStatus::Titular,
            age: None,
            nationality: None,
            market_value: None,
            energy: 100.0,
        }
    }

    fn sample_squad(prefix: &str) -> Vec<Player> {
        vec![
            make_player(&format!("{prefix}-gk"), "GK", Position::GOL),
            make_player(&format!("{prefix}-cb"), "CB", Position::ZAG),
            make_player(&format!("{prefix}-lb"), "LB", Position::LAT_E),
            make_player(&format!("{prefix}-rb"), "RB", Position::LAT_D),
            make_player(&format!("{prefix}-dm"), "DM", Position::VOL),
            make_player(&format!("{prefix}-cm"), "CM", Position::MEI),
            make_player(&format!("{prefix}-cam"), "CAM", Position::MEI_A),
            make_player(&format!("{prefix}-lw"), "LW", Position::PNT_E),
            make_player(&format!("{prefix}-rw"), "RW", Position::PNT_D),
            make_player(&format!("{prefix}-sa"), "SA", Position::SA),
            make_player(&format!("{prefix}-st"), "ST", Position::ATA),
        ]
    }

    #[test]
    fn simulate_silent_returns_reasonable_score_range() {
        let (home, away, _) = simulate_silent(sample_squad("h"), sample_squad("a"), Tactics::default(), Tactics::default());
        assert!((0..=15).contains(&home));
        assert!((0..=15).contains(&away));
    }

    #[test]
    fn simulate_tick_at_minute_45_emits_half_time() {
        let mut state = MatchState {
            minute: 45,
            home_score: 0,
            away_score: 0,
            home_squad: sample_squad("h"),
            away_squad: sample_squad("a"),
            home_lineup_zones: None,
            away_lineup_zones: None,
            is_paused: false,
            is_finished: false,
            events: Vec::new(),
        };

        let tactics = Tactics::default();
        let event = simulate_tick(&mut state, &tactics, &tactics).expect("expected halftime event");
        assert!(matches!(event.event_type, EventType::HalfTime));
    }

    #[test]
    fn simulate_tick_at_minute_91_emits_full_time_and_marks_finished() {
        let mut state = MatchState {
            minute: 91,
            home_score: 1,
            away_score: 0,
            home_squad: sample_squad("h"),
            away_squad: sample_squad("a"),
            home_lineup_zones: None,
            away_lineup_zones: None,
            is_paused: false,
            is_finished: false,
            events: Vec::new(),
        };

        let tactics = Tactics::default();
        let event = simulate_tick(&mut state, &tactics, &tactics).expect("expected fulltime event");
        assert!(matches!(event.event_type, EventType::FullTime));
        assert!(state.is_finished);
    }
}
