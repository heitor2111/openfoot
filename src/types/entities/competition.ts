import type { CompetitionParticipantType, CompetitionScope } from '../enums/competition'

/**
 * Representa a entidade da competição
 *
 * @property {string} id - Identificador único da competição
 * @property {string} name - Nome completo da competição - ex.: "Copa Libertadores da América"
 * @property {string} shortName - Nome abreviado da competição - ex.: "CONMEBOL Libertadores"
 * @property {string} primaryColor - Cor primária associada à competição (código hexadecimal)
 * @property {string} secondaryColor - Cor secundária associada à competição (código hexadecimal)
 * @property {string | null} tertiaryColor - Cor terciária opcional para a competição (código hexadecimal)
 * @property {string} logoRef - Endereço da imagem do logo da competição
 * @property {string} trophyRef - Endereço da imagem do troféu da competição
 * @property {string[] | null} state - Estado ou estados onde a competição é realizada (se aplicável)
 * @property {string[] | null} country - País ou países onde a competição é realizada (se aplicável)
 * @property {string[] | null} continent - Continente ou continentes onde a competição é realizada (se aplicável)
 * @property {CompetitionScope} scope - Escopo da competição (ex.: REGIONAL, NACIONAL, INTERNACIONAL)
 * @property {CompetitionParticipantType} participantsType - Tipo de participantes na competição (ex.: CLUBE, NACIONAL)
 */
export interface Competition {
  id: string
  name: string
  shortName: string
  primaryColor: string
  secondaryColor: string
  tertiaryColor: string | null
  logoRef: string
  trophyRef: string
  state: string[] | null
  country: string[] | null
  continent: string[] | null
  scope: CompetitionScope
  participantsType: CompetitionParticipantType
}
