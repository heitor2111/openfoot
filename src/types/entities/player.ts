import type {
  PlayerFoot,
  PlayerPosition,
  PlayerReputation,
  PlayerSide,
  PlayerSpecialSkill,
} from '../enums/player'
import type { Country } from '../static/countries'

/**
 * Representa a entidade do jogador
 *
 * @property {string} id - Identificador único do jogador
 * @property {string | null} clubId - Identificador do clube ao qual o jogador está associado (relacionamento com a entidade Club)
 * @property {string} name - Nome completo do jogador
 * @property {Country} country - País do jogador
 * @property {Date | null} birthdate - Data de nascimento do jogador
 * @property {PlayerPosition} position - Posição de jogo do jogador
 * @property {PlayerFoot} dominantFoot - Pé dominante do jogador
 * @property {PlayerSide} preferredSide - Lado preferido do jogador
 * @property {PlayerReputation} reputation - Nível de reputação do jogador
 * @property {PlayerSpecialSkill[]} specialSkills - Lista de habilidades especiais do jogador
 * @property {string | null} avatarRef - URL da imagem do avatar do jogador
 */
export interface Player {
  id: string
  clubId: string | null
  name: string
  country: Country
  birthdate: Date | null
  position: PlayerPosition
  dominantFoot: PlayerFoot
  preferredSide: PlayerSide
  reputation: PlayerReputation
  specialSkills: PlayerSpecialSkill[]
  avatarRef: string | null
}
