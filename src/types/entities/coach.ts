import type { CoachReputation } from '../enums/coach'
import type { Country } from '../static/countries'

/**
 * Representa a entidade do ténico do clube/seleção nacional
 *
 * @property {string} id - Identificador único do técnico
 * @property {string | null} clubId - Identificador do clube ao qual o técnico está associado (relacionamento com a entidade Club)
 * @property {string | null} nationalTeamId - Identificador da seleção nacional ao qual o técnico está associado (relacionamento com a entidade NationalTeam)
 * @property {string} name - Nome do técnico
 * @property {Country} country - País do técnico
 * @property {CoachReputation} reputation - Nível de reputação do técnico
 * @property {string | null} avatarRef - Endereço da imagem do avatar do técnico
 * @property {string | null} favoriteTactic - Tática favorita do técnico
 */
export interface Coach {
  id: string
  clubId: string | null
  nationalTeamId: string | null
  name: string
  country: Country
  reputation: CoachReputation
  avatarRef: string | null
  favoriteTactic: string | null
}
