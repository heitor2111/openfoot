import type { ClubReputation } from '../enums/club'
import type { BrazilianState } from '../static/brazilianStates'
import type { Country } from '../static/countries'

/**
 * Representa a entidade do clube
 *
 * @property {string} id - Identificador único do clube
 * @property {string} stadiumId - Identificador do estádio principal do clube (relacionamento com a entidade Stadium)
 * @property {string} name - Nome completo do clube - ex.: "Cruzeiro Esporte Clube"
 * @property {string} shortName - Nome abreviado do clube - ex.: "Cruzeiro"
 * @property {string} abbrName - Nome abreviado do clube - ex.: "CRU"
 * @property {string} primaryColor - Cor primária do uniforme do clube (código hexadecimal)
 * @property {string} secondaryColor - Cor secundária do uniforme do clube (código hexadecimal)
 * @property {string | null} tertiaryColor - Cor terciária do uniforme do clube (código hexadecimal)
 * @property {string | null} logoRef - Endereço da imagem do logo do clube
 * @property {string | null} primaryKitRef - Endereço da imagem do uniforme principal
 * @property {string | null} secondaryKitRef - Endereço da imagem do uniforme secundário
 * @property {string | null} tertiaryKitRef - Endereço da imagem do uniforme terciário
 * @property {string | null} goalkeeperKitRef - Endereço da imagem do uniforme do goleiro
 * @property {BrazilianState | null} state - Estado onde o clube está localizado (aplicável apenas para clubes brasileiros, devido à presença de campeonatos estaduais)
 * @property {Country} country - País onde o clube está localizado
 * @property {ClubReputation} reputation - Nível de reputação do clube
 * @property {number} competitivePower - Avaliação do poder competitivo do clube - Escala de 1 a 25
 * @property {number} financialPower - Avaliação do poder financeiro do clube - Escala de 1 a 25
 */
export interface Club {
  id: string
  stadiumId: string
  name: string
  shortName: string
  abbrName: string
  primaryColor: string
  secondaryColor: string
  tertiaryColor: string | null
  logoRef: string | null
  primaryKitRef: string | null
  secondaryKitRef: string | null
  tertiaryKitRef: string | null
  goalkeeperKitRef: string | null
  state: BrazilianState | null
  country: Country
  reputation: ClubReputation
  competitivePower: number
  financialPower: number
}
