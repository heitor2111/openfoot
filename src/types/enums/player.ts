/**
 * Níveis de reputação do jogador.
 * Categoriza-o com base em seu desempenho, conquistas e reconhecimento no futebol.
 *
 * - BAD: Jogadores com desempenho e resultados ruins. - ex.: Rony
 * - AVERAGE: Jogadores com sucesso moderado e consistência. - ex.: Matheus Pereira
 * - GOOD: Jogadores conhecidos por desempenho sólido e resultados positivos. - ex.: Philippe Coutinho
 * - EXCELLENT: Jogadores com histórico de alto desempenho e sucesso. - ex.: Neymar Jr.
 * - WORLD_CLASS: Jogadores de elite reconhecidos globalmente por suas habilidades e conquistas excepcionais. ex.: Cristiano Ronaldo
 */
export enum PlayerReputation {
  BAD = 1,
  AVERAGE = 2,
  GOOD = 3,
  EXCELLENT = 4,
  WORLD_CLASS = 5,
}

/**
 * Posições do jogador
 *
 * - GOALKEEPER: Goleiro
 * - DEFENDER: Zagueiro
 * - SIDE_BACK: Lateral
 * - MIDFIELDER: Meio-campista
 * - FORWARD: Atacante
 */
export enum PlayerPosition {
  GOALKEEPER = 'GK',
  DEFENDER = 'DF',
  SIDE_BACK = 'SB',
  MIDFIELDER = 'MF',
  FORWARD = 'FW',
}

/**
 * Pé dominante do jogador
 *
 * - LEFT: Canhoto
 * - RIGHT: Destro
 * - BOTH: Ambidestro
 */
export enum PlayerFoot {
  LEFT = 'L',
  RIGHT = 'R',
  BOTH = 'B',
}

/**
 * Lado preferido do jogador
 *
 * - LEFT: Jogadores que preferem atuar no lado esquerdo do campo.
 * - RIGHT: Jogadores que preferem atuar no lado direito do campo.
 * - CENTER: Jogadores que preferem atuar em posições centrais no campo.
 * - BOTH: Jogadores que se sentem confortáveis atuando em qualquer lado do campo.
 */
export enum PlayerSide {
  LEFT = 'L',
  RIGHT = 'R',
  CENTER = 'C',
  BOTH = 'B',
}

/**
 * Habilidades especiais do jogador
 *
 * - FREE_KICK_SPECIALIST: Especialista em cobranças de falta ou situações de bola parada. - ex.: Lionel Messi
 * - PENALTY_SPECIALIST: Especialista em cobranças de pênalti. - ex.: Cristiano Ronaldo
 * - PENALTY_DEFENDER: Especialista em defender cobranças de pênalti. - ex.: Fábio
 * - ASSIST_SPECIALIST: Especialista em criar oportunidades de gol para companheiros de equipe através de passes precisos e visão de jogo. - ex.: Kevin De Bruyne
 * - GOALSCORER: Especialista em marcar gols, frequentemente liderando a tabela de artilheiros do clube. - ex.: Robert Lewandowski
 */
export enum PlayerSpecialSkill {
  FREE_KICK_SPECIALIST = 'FREE_KICK_SPECIALIST',
  PENALTY_SPECIALIST = 'PENALTY_SPECIALIST',
  PENALTY_DEFENDER = 'PENALTY_DEFENDER',
  ASSIST_SPECIALIST = 'ASSIST_SPECIALIST',
  GOALSCORER = 'GOALSCORER',
}
