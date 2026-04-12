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
            Position::GOL => {
                let v = self.defense as f32 * 0.5
                    + self.stamina as f32 * 0.2
                    + self.passing as f32 * 0.2
                    + self.speed as f32 * 0.1;
                v.round() as u8
            }
            Position::ZAG | Position::LAT_E | Position::LAT_D => {
                let v = self.defense as f32 * 0.4
                    + self.speed as f32 * 0.2
                    + self.passing as f32 * 0.2
                    + self.stamina as f32 * 0.2;
                v.round() as u8
            }
            Position::VOL | Position::MEI | Position::MEI_A => {
                let v = self.passing as f32 * 0.35
                    + self.dribbling as f32 * 0.25
                    + self.defense as f32 * 0.2
                    + self.stamina as f32 * 0.2;
                v.round() as u8
            }
            Position::PNT_E | Position::PNT_D | Position::SA | Position::ATA => {
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
#[allow(non_camel_case_types)]
pub enum Position {
    #[serde(rename = "GOL", alias = "GK")]
    GOL,
    #[serde(rename = "ZAG", alias = "CB")]
    ZAG,
    #[serde(rename = "LAT-E", alias = "LB")]
    LAT_E,
    #[serde(rename = "LAT-D", alias = "RB")]
    LAT_D,
    #[serde(rename = "VOL", alias = "CDM", alias = "DM")]
    VOL,
    #[serde(rename = "MEI", alias = "CM")]
    MEI,
    #[serde(rename = "MEI-A", alias = "CAM")]
    MEI_A,
    #[serde(rename = "PNT-E", alias = "LW", alias = "LM")]
    PNT_E,
    #[serde(rename = "PNT-D", alias = "RW", alias = "RM")]
    PNT_D,
    #[serde(rename = "SA", alias = "CF")]
    SA,
    #[serde(rename = "ATA", alias = "ST")]
    ATA,
}

impl Position {
    pub fn display_rank(&self) -> u8 {
        match self {
            Position::GOL => 0,
            Position::ZAG => 1,
            Position::LAT_E => 2,
            Position::LAT_D => 3,
            Position::VOL => 4,
            Position::MEI => 5,
            Position::MEI_A => 6,
            Position::PNT_E => 7,
            Position::PNT_D => 8,
            Position::SA => 9,
            Position::ATA => 10,
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