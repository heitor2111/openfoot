/**
 * Níveis de reputação do jogador.
 * Categoriza-o com base em seu desempenho, conquistas e reconhecimento no futebol.
 *
 * @enum {number}
 */
export enum PlayerReputation {
  /** Jogador com desempenho e resultados ruins. - ex.: Rony */
  BAD = 1,
  /** Jogador com sucesso moderado e consistência. - ex.: Matheus Pereira */
  AVERAGE = 2,
  /** Jogador conhecido por desempenho sólido e resultados positivos. - ex.: Philippe Coutinho */
  GOOD = 3,
  /** Jogador com histórico de alto desempenho e sucesso. - ex.: Neymar Jr. */
  EXCELLENT = 4,
  /** Jogador de elite reconhecido globalmente por suas habilidades e conquistas excepcionais. - ex.: Cristiano Ronaldo */
  WORLD_CLASS = 5,
}

/**
 * Posições do jogador — espelha o enum `Position` do backend Rust.
 * Os valores das chaves correspondem exatamente às strings serializadas pelo backend.
 *
 * @enum {string}
 */
export enum PlayerPosition {
  /** Goleiro */
  GOL = 'GOL',
  /** Zagueiro */
  ZAG = 'ZAG',
  /** Lateral-esquerdo */
  LAT_E = 'LAT-E',
  /** Lateral-direito */
  LAT_D = 'LAT-D',
  /** Volante */
  VOL = 'VOL',
  /** Meia */
  MEI = 'MEI',
  /** Meia-atacante */
  MEI_A = 'MEI-A',
  /** Ponta-esquerda */
  PNT_E = 'PNT-E',
  /** Ponta-direita */
  PNT_D = 'PNT-D',
  /** Segundo-atacante */
  SA = 'SA',
  /** Atacante */
  ATA = 'ATA',
}

/**
 * Pé dominante do jogador
 *
 * @enum {string}
 */
export enum PlayerFoot {
  /** Canhoto */
  LEFT = 'L',
  /** Destro */
  RIGHT = 'R',
  /** Ambidestro */
  BOTH = 'B',
}

/**
 * Lado preferido do jogador
 *
 * @enum {string}
 */
export enum PlayerSide {
  /** Jogadores que preferem atuar no lado esquerdo do campo. */
  LEFT = 'L',
  /** Jogadores que preferem atuar no lado direito do campo. */
  RIGHT = 'R',
  /** Jogadores que preferem atuar em posições centrais no campo. */
  CENTER = 'C',
  /** Jogadores que se sentem confortáveis atuando em qualquer lado do campo. */
  BOTH = 'B',
}

/**
 * Habilidades especiais do jogador
 *
 * @enum {string}
 */
export enum PlayerSpecialSkill {
  /** Especialista em cobranças de falta ou situações de bola parada. - ex.: Lionel Messi */
  FREE_KICK_SPECIALIST = 'FREE_KICK_SPECIALIST',
  /** Especialista em cobranças de pênalti. - ex.: Cristiano Ronaldo */
  PENALTY_SPECIALIST = 'PENALTY_SPECIALIST',
  /** Especialista em defender cobranças de pênalti. - ex.: Fábio */
  PENALTY_DEFENDER = 'PENALTY_DEFENDER',
  /** Especialista em criar oportunidades de gol para companheiros de equipe através de passes precisos e visão de jogo. - ex.: Kevin De Bruyne */
  ASSIST_SPECIALIST = 'ASSIST_SPECIALIST',
  /** Especialista em marcar gols, frequentemente liderando a tabela de artilheiros do clube. - ex.: Robert Lewandowski */
  GOALSCORER = 'GOALSCORER',
}
