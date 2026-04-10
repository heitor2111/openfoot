import type { BrazilianState } from '@/types/static/brazilianStates'

interface StateInfo {
  name: string
  demonym: string
}

export const brazilianStatesPtBR: Record<BrazilianState, StateInfo> = {
  AC: { name: 'Acre', demonym: 'Acreano' },
  AL: { name: 'Alagoas', demonym: 'Alagoano' },
  AP: { name: 'Amapá', demonym: 'Amapaense' },
  AM: { name: 'Amazonas', demonym: 'Amazonense' },
  BA: { name: 'Bahia', demonym: 'Baiano' },
  CE: { name: 'Ceará', demonym: 'Cearense' },
  DF: { name: 'Distrito Federal', demonym: 'Brasiliense' },
  ES: { name: 'Espírito Santo', demonym: 'Capixaba' },
  GO: { name: 'Goiás', demonym: 'Goiano' },
  MA: { name: 'Maranhão', demonym: 'Maranhense' },
  MT: { name: 'Mato Grosso', demonym: 'Mato-grossense' },
  MS: { name: 'Mato Grosso do Sul', demonym: 'Sul-mato-grossense' },
  MG: { name: 'Minas Gerais', demonym: 'Mineiro' },
  PA: { name: 'Pará', demonym: 'Paraense' },
  PB: { name: 'Paraíba', demonym: 'Paraibano' },
  PR: { name: 'Paraná', demonym: 'Paranaense' },
  PE: { name: 'Pernambuco', demonym: 'Pernambucano' },
  PI: { name: 'Piauí', demonym: 'Piauiense' },
  RJ: { name: 'Rio de Janeiro', demonym: 'Carioca' },
  RN: { name: 'Rio Grande do Norte', demonym: 'Potiguar' },
  RS: { name: 'Rio Grande do Sul', demonym: 'Gaúcho' },
  RO: { name: 'Rondônia', demonym: 'Rondoniense' },
  RR: { name: 'Roraima', demonym: 'Roraimense' },
  SC: { name: 'Santa Catarina', demonym: 'Catarinense' },
  SP: { name: 'São Paulo', demonym: 'Paulista' },
  SE: { name: 'Sergipe', demonym: 'Sergipano' },
  TO: { name: 'Tocantins', demonym: 'Tocantinense' },
}
