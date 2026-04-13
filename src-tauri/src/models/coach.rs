use serde::{Deserialize, Serialize};
use crate::models::tactics::{Formation, PlayStyle, Tactics};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Coach {
    pub id: String,
    pub name: String,
    pub overall: u8,
    pub experience: u8,
    /// Formação preferida do técnico, ex: "3-5-2"
    pub tactics: String,
}

impl Coach {
    /// Deriva a tática completa (formação + estilo) a partir dos atributos do técnico.
    ///
    /// - `tactics` (string) → `Formation`
    /// - `overall` determina o `PlayStyle`:
    ///   ≥75 → Pressing Alto ou Posse de Bola (intercalado por experience)
    ///   55–74 → Normal ou Jogo Aéreo
    ///   <55 → Contra-ataque ou Bola Direta
    pub fn derive_tactics(&self) -> Tactics {
        let formation = Formation::from_str(&self.tactics).unwrap_or_default();
        let play_style = match self.overall {
            75..=u8::MAX => {
                if self.experience >= 25 {
                    PlayStyle::PosseDeBola
                } else {
                    PlayStyle::PressingAlto
                }
            }
            55..=74 => {
                if self.experience >= 20 {
                    PlayStyle::JogoAereo
                } else {
                    PlayStyle::Normal
                }
            }
            _ => {
                if self.experience >= 15 {
                    PlayStyle::Contraataque
                } else {
                    PlayStyle::BolaDireta
                }
            }
        };
        Tactics { formation, play_style }
    }
}
