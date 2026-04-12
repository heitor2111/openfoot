use rand::seq::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};

use crate::models::attributes::{zone_strength, Attributes, Zone};
use crate::models::player::{Player, Position};
use crate::models::probability::{
    apply_creator_bonus, goal_probability, shot_type_strength, zone_contest, ShotType,
};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MatchState {
    pub minute: u8,
    pub home_score: u8,
    pub away_score: u8,
    pub home_squad: Vec<Player>,
    pub away_squad: Vec<Player>,
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
    pub team: Option<TeamSide>,
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
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum TeamSide {
    Home,
    Away,
}

pub fn simulate_tick(state: &mut MatchState) -> Option<MatchEvent> {
    if state.is_paused || state.is_finished {
        return None;
    }

    if state.minute > 90 {
        state.is_finished = true;
        return Some(push_event(state, EventType::FullTime, None, None));
    }

    if state.minute == 45 {
        let event = push_event(state, EventType::HalfTime, None, None);
        state.minute = state.minute.saturating_add(1);
        return Some(event);
    }

    let home_midfield = zone_strength(&state.home_squad, Zone::Midfield);
    let away_midfield = zone_strength(&state.away_squad, Zone::Midfield);
    let home_advances = zone_contest(home_midfield, away_midfield);

    // Nem toda jogada que vence o meio-campo vira ataque perigoso.
    if rand::random::<f64>() > 0.25 {
        state.minute = state.minute.saturating_add(1);
        return None;
    }

    let home_squad = state.home_squad.clone();
    let away_squad = state.away_squad.clone();

    let tick_event = if home_advances {
        resolve_attack(
            state,
            TeamSide::Home,
            Zone::Attack,
            Zone::Defense,
            &home_squad,
            &away_squad,
        )
    } else {
        resolve_attack(
            state,
            TeamSide::Away,
            Zone::Attack,
            Zone::Defense,
            &away_squad,
            &home_squad,
        )
    };

    state.minute = state.minute.saturating_add(1);
    tick_event
}

pub fn simulate_silent(home: Vec<Player>, away: Vec<Player>) -> (u8, u8) {
    let mut home_score = 0u8;
    let mut away_score = 0u8;

    for minute in 1..=90u8 {
        let home_midfield = zone_strength(&home, Zone::Midfield);
        let away_midfield = zone_strength(&away, Zone::Midfield);
        let home_advances = zone_contest(home_midfield, away_midfield);

        if rand::random::<f64>() > 0.25 {
            let _ = minute;
            continue;
        }

        let scored = if home_advances {
            silent_attack_resolves(&home, &away, TeamSide::Home)
        } else {
            silent_attack_resolves(&away, &home, TeamSide::Away)
        };

        match scored {
            Some(TeamSide::Home) => home_score = home_score.saturating_add(1),
            Some(TeamSide::Away) => away_score = away_score.saturating_add(1),
            None => {
                let _ = minute;
            }
        }
    }

    (home_score.min(15), away_score.min(15))
}

pub fn simulate_full(home: Vec<Player>, away: Vec<Player>) -> (u8, u8, Vec<MatchEvent>) {
    let mut state = MatchState {
        minute: 1,
        home_score: 0,
        away_score: 0,
        home_squad: home,
        away_squad: away,
        is_paused: false,
        is_finished: false,
        events: Vec::new(),
    };

    while !state.is_finished {
        simulate_tick(&mut state);
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
) -> Option<MatchEvent> {
    let attack_strength = zone_strength(attacking_squad, attack_zone);
    let defense_strength = zone_strength(defending_squad, defense_zone);

    if !zone_contest(attack_strength, defense_strength) {
        return None;
    }

    let attacker = select_attacker(attacking_squad)?;
    let creator = select_creator(attacking_squad).unwrap_or(attacker);
    let gk_candidate = select_goalkeeper(defending_squad);
    let no_real_gk = gk_candidate.is_none();
    let goalkeeper = gk_candidate.or_else(|| defending_squad.first())?;

    let attacker_attrs = Attributes::from_player(attacker);
    let goalkeeper_attrs = Attributes::from_player(goalkeeper);
    let shot_type = random_shot_type();
    let shot_strength = shot_type_strength(
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::SHT, attacker.stamina),
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::SPD, attacker.stamina),
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::DRB, attacker.stamina),
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::STR, attacker.stamina),
        shot_type,
    );
    let creator_bonus = apply_creator_bonus(
        shot_strength,
        Attributes::from_player(creator).get_effective_attribute(
            crate::models::attributes::AttributeKind::PAS,
            creator.stamina,
        ),
    );
    let raw_gk_def = goalkeeper_attrs.get_effective_attribute(
        crate::models::attributes::AttributeKind::DEF,
        goalkeeper.stamina,
    );
    let effective_gk_def = if no_real_gk { raw_gk_def * 0.3 } else { raw_gk_def };
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
            Some(attacking_side),
        ));
    }

    let event_type = if rng.gen::<f64>() < 0.5 {
        EventType::Save
    } else {
        EventType::NearMiss
    };

    Some(push_event(
        state,
        event_type,
        Some(attacker.name.clone()),
        Some(attacking_side),
    ))
}

fn silent_attack_resolves(
    attacking_squad: &[Player],
    defending_squad: &[Player],
    attacking_side: TeamSide,
) -> Option<TeamSide> {
    let attack_strength = zone_strength(attacking_squad, Zone::Attack);
    let defense_strength = zone_strength(defending_squad, Zone::Defense);

    if !zone_contest(attack_strength, defense_strength) {
        return None;
    }

    let attacker = select_attacker(attacking_squad)?;
    let creator = select_creator(attacking_squad).unwrap_or(attacker);
    let gk_candidate = select_goalkeeper(defending_squad);
    let no_real_gk = gk_candidate.is_none();
    let goalkeeper = gk_candidate.or_else(|| defending_squad.first())?;

    let attacker_attrs = Attributes::from_player(attacker);
    let goalkeeper_attrs = Attributes::from_player(goalkeeper);
    let shot_type = random_shot_type();
    let shot_strength = shot_type_strength(
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::SHT, attacker.stamina),
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::SPD, attacker.stamina),
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::DRB, attacker.stamina),
        attacker_attrs.get_effective_attribute(crate::models::attributes::AttributeKind::STR, attacker.stamina),
        shot_type,
    );
    let creator_bonus = apply_creator_bonus(
        shot_strength,
        Attributes::from_player(creator).get_effective_attribute(
            crate::models::attributes::AttributeKind::PAS,
            creator.stamina,
        ),
    );
    let raw_gk_def = goalkeeper_attrs.get_effective_attribute(
        crate::models::attributes::AttributeKind::DEF,
        goalkeeper.stamina,
    );
    let effective_gk_def = if no_real_gk { raw_gk_def * 0.3 } else { raw_gk_def };
    let goal_chance = goal_probability(creator_bonus, effective_gk_def);

    if rand::random::<f64>() < goal_chance {
        Some(attacking_side)
    } else {
        None
    }
}

fn push_event(
    state: &mut MatchState,
    event_type: EventType,
    player_name: Option<String>,
    team: Option<TeamSide>,
) -> MatchEvent {
    let event = MatchEvent {
        sequence_id: state.events.len() as u32 + 1,
        minute: state.minute,
        event_type,
        player_name,
        team,
    };
    state.events.push(event.clone());
    event
}

fn select_goalkeeper(players: &[Player]) -> Option<&Player> {
    players.iter().find(|player| matches!(player.position, Position::GOL))
}

fn select_attacker(players: &[Player]) -> Option<&Player> {
    let mut attackers: Vec<&Player> = players
        .iter()
        .filter(|player| {
            matches!(
                player.position,
                Position::ATA | Position::SA | Position::PNT_E | Position::PNT_D | Position::MEI_A
            )
        })
        .collect();

    if attackers.is_empty() {
        attackers = players.iter().collect();
    }

    let mut rng = rand::thread_rng();
    attackers.choose(&mut rng).copied()
}

fn select_creator(players: &[Player]) -> Option<&Player> {
    let mut creators: Vec<&Player> = players
        .iter()
        .filter(|player| {
            matches!(
                player.position,
                Position::MEI | Position::MEI_A | Position::VOL | Position::PNT_E | Position::PNT_D
            )
        })
        .collect();

    if creators.is_empty() {
        creators = players.iter().collect();
    }

    let mut rng = rand::thread_rng();
    creators.choose(&mut rng).copied()
}

fn random_shot_type() -> ShotType {
    let mut rng = rand::thread_rng();
    match rng.gen_range(0..7) {
        0 => ShotType::Normal,
        1 => ShotType::CounterAttack,
        2 => ShotType::LongShot,
        3 => ShotType::Individual,
        4 => ShotType::Header,
        5 => ShotType::FreeKick,
        _ => ShotType::Normal,
    }
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
            league_id: "league-1".to_string(),
            status: PlayerStatus::Titular,
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
        let (home, away) = simulate_silent(sample_squad("h"), sample_squad("a"));
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
            is_paused: false,
            is_finished: false,
            events: Vec::new(),
        };

        let event = simulate_tick(&mut state).expect("expected halftime event");
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
            is_paused: false,
            is_finished: false,
            events: Vec::new(),
        };

        let event = simulate_tick(&mut state).expect("expected fulltime event");
        assert!(matches!(event.event_type, EventType::FullTime));
        assert!(state.is_finished);
    }
}
