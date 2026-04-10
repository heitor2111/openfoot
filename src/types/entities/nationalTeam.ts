import type { Country } from '../static/countries'

/**
 * Representa a entidade da seleção nacional
 *
 * @property {string} id - Identificador único da seleção
 * @property {string} stadiumId - Identificador do estádio principal da seleção (relacionamento com a entidade Stadium)
 * @property {string} name - Nome completo da seleção - ex.: "Seleção Brasileira de Futebol"
 * @property {string} shortName - Nome abreviado da seleção - ex.: "Brasil"
 * @property {string} abbrName - Nome abreviado da seleção - ex.: "BRA"
 * @property {string} primaryColor - Cor primária do uniforme da seleção (código hexadecimal)
 * @property {string} secondaryColor - Cor secundária do uniforme da seleção (código hexadecimal)
 * @property {string | null} tertiaryColor - Cor terciária do uniforme da seleção (código hexadecimal)
 * @property {string | null} flagRef - Endereço da imagem da bandeira da seleção
 * @property {string | null} logoRef - Endereço da imagem do logo da federação
 * @property {string | null} primaryKitRef - Endereço da imagem do uniforme principal
 * @property {string | null} secondaryKitRef - Endereço da imagem do uniforme secundário
 * @property {string | null} tertiaryKitRef - Endereço da imagem do uniforme terciário
 * @property {string | null} goalkeeperKitRef - Endereço da imagem do uniforme do goleiro
 * @property {Country} country - País onde a seleção está localizada
 */
export interface NationalTeam {
  id: string
  stadiumId: string
  name: string
  shortName: string
  abbrName: string
  primaryColor: string
  secondaryColor: string
  tertiaryColor: string | null
  flagRef: string | null
  logoRef: string | null
  primaryKitRef: string | null
  secondaryKitRef: string | null
  tertiaryKitRef: string | null
  goalkeeperKitRef: string | null
  country: Country
}
