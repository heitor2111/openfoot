// src-tauri/src/models/energy.rs
//
// Sistema de Energia dos atletas.
// Energia é um valor dinâmico (0–100) não persistido no JSON,
// mantido no CareerState durante uma carreira ativa.

use crate::models::tactics::PlayStyle;

/// Quanto de energia um titular perde ao jogar `minutes` minutos com determinado estilo.
///
/// Fórmula:
///   drain_base  = minutes * 0.48
///   stamina_factor = 1.0 - (stamina / 100) * 0.4  →  [0.6, 1.0]
///   resultado  = drain_base * stamina_factor * style_multiplier
///
/// Exemplos (90 minutos, Normal):
///   sta=100 → 90 * 0.32 * 0.60 = 17.3
///   sta=70  → 90 * 0.32 * 0.72 = 20.7
///   sta=50  → 90 * 0.32 * 0.80 = 23.0
///   sta=0   → 90 * 0.32 * 1.00 = 28.8
pub fn energy_drain(stamina: u8, play_style: &PlayStyle, minutes: u8) -> f64 {
    let drain_base = minutes as f64 * 0.32;
    let stamina_factor = 1.0 - (stamina.min(100) as f64 / 100.0) * 0.4;
    let style_mul = play_style.energy_drain_multiplier();
    (drain_base * stamina_factor * style_mul).clamp(0.0, 100.0)
}

/// Quanto de energia um atleta recupera após a rodada.
///
/// - Não convocado: recupera o suficiente para ficar em 100.0 (passa como `None`).
/// - Jogou (`minutes > 0`): recuperação leve baseada em stamina: 4 + (stamina / 100) * 8 → [4, 12].
/// - Convocado mas não entrou (minutes == 0): banco descansa bem: 6 + (stamina / 100) * 9 → [6, 15].
pub fn energy_recovery(stamina: u8, minutes_played: Option<u8>) -> f64 {
    match minutes_played {
        None => 100.0, // não foi convocado – reseta para 100
        Some(0) => {
            // Reserva que não entrou – descansou bem
            6.0 + (stamina.min(100) as f64 / 100.0) * 9.0
        }
        Some(_) => {
            // Jogou – recuperação pós-jogo limitada
            4.0 + (stamina.min(100) as f64 / 100.0) * 8.0
        }
    }
}

/// Multiplicador de performance baseado na energia atual.
/// Aplica degradação progressiva conforme o atleta fica cansado.
pub fn energy_performance_multiplier(energy: f64) -> f64 {
    let e = energy.clamp(0.0, 100.0);
    if e >= 80.0 { 1.00 }
    else if e >= 60.0 { 0.95 }
    else if e >= 40.0 { 0.88 }
    else if e >= 20.0 { 0.78 }
    else { 0.65 }
}

/// Probabilidade de lesão por tick de jogo quando a energia está abaixo de 20.
/// Returns 0.0 quando energy >= 20.
///
/// Exemplos:
///   energy=19 → 1% de chance/tick
///   energy=15 → 5%
///   energy=10 → 10%
///   energy=5  → 15%
///   energy=0  → 20%
pub fn injury_chance_per_tick(energy: f64) -> f64 {
    let e = energy.clamp(0.0, 100.0);
    if e >= 20.0 {
        0.0
    } else {
        (20.0 - e) / 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drain_increases_with_pressing_alto() {
        let normal = energy_drain(50, &PlayStyle::Normal, 90);
        let pressing = energy_drain(50, &PlayStyle::PressingAlto, 90);
        assert!(pressing > normal, "Pressing Alto deve gastar mais energia que Normal");
    }

    #[test]
    fn drain_decreases_with_higher_stamina() {
        let low_sta = energy_drain(30, &PlayStyle::Normal, 90);
        let high_sta = energy_drain(90, &PlayStyle::Normal, 90);
        assert!(high_sta < low_sta, "Stamina alto deve gastar menos energia");
    }

    #[test]
    fn recovery_full_when_not_playing() {
        assert_eq!(energy_recovery(50, None), 100.0);
    }

    #[test]
    fn recovery_partial_when_played() {
        let rec = energy_recovery(100, Some(90));
        assert!(rec >= 10.0 && rec <= 30.0);
    }

    #[test]
    fn performance_multiplier_at_full_energy() {
        assert_eq!(energy_performance_multiplier(100.0), 1.00);
    }

    #[test]
    fn performance_multiplier_drops_below_20() {
        assert_eq!(energy_performance_multiplier(10.0), 0.65);
    }

    #[test]
    fn injury_chance_zero_above_20() {
        assert_eq!(injury_chance_per_tick(25.0), 0.0);
    }

    #[test]
    fn injury_chance_increases_below_20() {
        let c15 = injury_chance_per_tick(15.0);
        let c5 = injury_chance_per_tick(5.0);
        assert!(c5 > c15);
        assert!((c15 - 0.05).abs() < 1e-9);
    }
}
