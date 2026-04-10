/**
 * Tipos de participantes na competição
 * Indica se a competição é disputada por clubes ou seleções nacionais.
 *
 * - CLUB: Esta é uma competição entre clubes. - ex.: Brasileirão
 * - NATIONAL: Esta é uma competição entre seleções nacionais. - ex.: Copa do Mundo
 */
export enum CompetitionParticipantType {
  CLUB = 'CLUB',
  NATIONAL = 'NATIONAL',
}

/**
 * Escopo da competição
 * Indica a abrangência geográfica e o nível de participação dos clubes ou seleções envolvidas.
 *
 * - STATE: Competição disputada por clubes dentro de um estado ou região específica. - ex.: Campeonato Mineiro
 * - NATIONAL: Competição disputada por clubes de um país inteiro. - ex.: Campeonato Brasileiro
 * - CONTINENTAL: Competição disputada por clubes ou seleções de múltiplos países dentro de um continente. - ex.: Copa Libertadores e Copa América
 * - INTERNATIONAL: Competição disputada por clubes ou seleções de múltiplos países em diferentes continentes. - ex.: Mundial de Clubes e Copa do Mundo
 */
export enum CompetitionScope {
  STATE = 'STATE',
  NATIONAL = 'NATIONAL',
  CONTINENTAL = 'CONTINENTAL',
  INTERNATIONAL = 'INTERNATIONAL',
}
