// src-tauri/src/models/player.rs
//
// Portado do FutSimulatorOS (C#) para Rust.
// Estrutura espelha o schema de players.json:
// Id, Name, Position, Speed, Shooting, Passing,
// Dribbling, Defense, Stamina, TeamId, LeagueId, Status

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Player {
    pub id: String,
    pub name: String,
    pub position: Position,
    pub speed: u8,
    pub shooting: u8,
    pub passing: u8,
    pub dribbling: u8,
    pub defense: u8,
    pub stamina: u8,
    pub team_id: String,
    pub league_id: String,
    #[serde(default)]
    pub status: PlayerStatus,
}

impl Player {
    /// Overall calculado como média ponderada dos atributos,
    /// igual à lógica do C# (Overall não estava no JSON, era calculado).
    pub fn overall(&self) -> u8 {
        match self.position {
            Position::GK => {
                let v = self.defense as f32 * 0.5
                    + self.stamina as f32 * 0.2
                    + self.passing as f32 * 0.2
                    + self.speed as f32 * 0.1;
                v.round() as u8
            }
            Position::CB | Position::LB | Position::RB => {
                let v = self.defense as f32 * 0.4
                    + self.speed as f32 * 0.2
                    + self.passing as f32 * 0.2
                    + self.stamina as f32 * 0.2;
                v.round() as u8
            }
            Position::CM | Position::CAM | Position::CDM | Position::DM | Position::LM | Position::RM => {
                let v = self.passing as f32 * 0.35
                    + self.dribbling as f32 * 0.25
                    + self.defense as f32 * 0.2
                    + self.stamina as f32 * 0.2;
                v.round() as u8
            }
            Position::LW | Position::RW | Position::ST | Position::CF => {
                let v = self.shooting as f32 * 0.35
                    + self.speed as f32 * 0.25
                    + self.dribbling as f32 * 0.25
                    + self.passing as f32 * 0.15;
                v.round() as u8
            }
        }
    }
}

/// Posições espelhadas do C# (campo Position: string → enum tipado).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum Position {
    GK,
    CB, LB, RB,
    CDM, DM,
    CM, LM, RM,
    CAM,
    LW, RW,
    CF, ST,
}

impl Position {
    pub fn display_rank(&self) -> u8 {
        match self {
            Position::GK => 0,
            Position::CB => 1,
            Position::LB => 2,
            Position::RB => 3,
            Position::CDM | Position::DM => 4,
            Position::CM | Position::LM | Position::RM => 5,
            Position::CAM => 6,
            Position::LW => 7,
            Position::RW => 8,
            Position::CF => 9,
            Position::ST => 10,
        }
    }
}

/// Status do jogador na escalação.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum PlayerStatus {
    Titular,
    Reserva,
    #[default]
    #[serde(rename = "Não Convocado")]
    NaoConvocado,
}