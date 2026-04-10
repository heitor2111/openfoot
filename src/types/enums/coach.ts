/**
 * Níveis de reputação do treinador
 * Categoriza-o com base em seu desempenho, resultados e reconhecimento no mundo do futebol.
 *
 * - BAD: Treinador com histórico de desempenho e resultados ruins. - ex.: Fernando Diniz
 * - AVERAGE: Treinador com histórico de sucesso moderado e consistência. - ex.: Jorge Sampaoli
 * - GOOD: Treinador com histórico de desempenho sólido e resultados positivos. - ex.: Abel Ferreira
 * - EXCELLENT: Treinador com histórico de alto desempenho e sucesso. - ex.: José Mourinho
 * - WORLD_CLASS: Treinador de elite com histórico de reconhecimento global por suas habilidades e conquistas excepcionais. - ex.: Pep Guardiola
 */
export enum CoachReputation {
  BAD = 1,
  AVERAGE = 2,
  GOOD = 3,
  EXCELLENT = 4,
  WORLD_CLASS = 5,
}
