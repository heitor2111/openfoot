import type { Country } from '../static/countries'

/**
 * Representa a entidade do estádio
 *
 * @property {string} id - Identificador único do estádio
 * @property {string} name - Nome oficial do estádio - ex.: "Estádio Governador Magalhães Pinto"
 * @property {string | null} nickname - Apelido ou nome alternativo do estádio - ex.: "Mineirão"
 * @property {number} capacity - Capacidade máxima de assentos
 * @property {Country} country - País onde o estádio está localizado
 * @property {string | null} imageRef - Referência opcional para uma imagem do estádio
 */
export interface Stadium {
  id: string
  name: string
  nickname: string | null
  capacity: number
  country: Country
  imageRef: string | null
}
