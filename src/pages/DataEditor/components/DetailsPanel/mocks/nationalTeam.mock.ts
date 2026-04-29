import type { NationalTeamDetails } from '../types'

import { CoachReputation } from '@/types/enums/coach'

export const NATIONAL_TEAM_DETAILS_LIST: NationalTeamDetails[] = [
  // ── Brazil ──────────────────────────────────────────────────────────────────
  {
    id: 'nt-1',
    stadiumId: 'st-nt-1',
    name: 'Confederação Brasileira de Futebol',
    shortName: 'Brasil',
    abbrName: 'BRA',
    primaryColor: '#FFDF00',
    secondaryColor: '#002776',
    tertiaryColor: null,
    flagRef: 'https://upload.wikimedia.org/wikipedia/en/0/05/Flag_of_Brazil.svg',
    logoRef:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Brazilian_Football_Confederation_logo.svg/250px-Brazilian_Football_Confederation_logo.svg.png',
    primaryKitRef:
      'https://copa2026.fit/_next/image?url=https%3A%2F%2Fcbf.promo%2FImages%2Fjersey-yellow-P0-fBirW.jpg.png&w=3840&q=75',
    secondaryKitRef:
      'https://copa2026.fit/_next/image?url=https%3A%2F%2Fcbf.promo%2FImages%2Fjersey-blue-9t0io43b.jpg.png&w=384&q=75',
    tertiaryKitRef: null,
    goalkeeperKitRef: null,
    country: 'BRA',

    stadium: {
      id: 'st-nt-1',
      name: 'Estádio Jornalista Mário Filho',
      nickname: 'Maracanã',
      imageRef: null,
      capacity: 78838,
      country: 'BRA',
    },

    coach: {
      id: 'c-nt-1',
      clubId: null,
      nationalTeamId: 'nt-1',
      name: 'Carlo Ancelotti',
      avatarRef: null,
      reputation: CoachReputation.WORLD_CLASS,
      country: 'ITA',
      favoriteTactic: '4-2-4',
    },
  },

  // ── Argentina ────────────────────────────────────────────────────────────────
  {
    id: 'nt-2',
    stadiumId: 'st-nt-2',
    name: 'Asociación del Fútbol Argentino',
    shortName: 'Argentina',
    abbrName: 'ARG',
    primaryColor: '#74ACDF',
    secondaryColor: '#FFFFFF',
    tertiaryColor: null,
    flagRef: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg',
    logoRef: null,
    primaryKitRef: null,
    secondaryKitRef: null,
    tertiaryKitRef: null,
    goalkeeperKitRef: null,
    country: 'ARG',

    stadium: {
      id: 'st-nt-2',
      name: 'Estadio Monumental Antonio Vespucio Liberti',
      nickname: 'El Monumental',
      imageRef: null,
      capacity: 84567,
      country: 'ARG',
    },

    coach: {
      id: 'c-nt-2',
      clubId: null,
      nationalTeamId: 'nt-2',
      name: 'Lionel Scaloni',
      avatarRef: null,
      reputation: CoachReputation.EXCELLENT,
      country: 'ARG',
      favoriteTactic: '4-3-3',
    },
  },

  // ── France ───────────────────────────────────────────────────────────────────
  {
    id: 'nt-3',
    stadiumId: 'st-nt-3',
    name: 'Fédération Française de Football',
    shortName: 'França',
    abbrName: 'FRA',
    primaryColor: '#002395',
    secondaryColor: '#FFFFFF',
    tertiaryColor: '#ED2939',
    flagRef: 'https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg',
    logoRef: null,
    primaryKitRef: null,
    secondaryKitRef: null,
    tertiaryKitRef: null,
    goalkeeperKitRef: null,
    country: 'FRA',

    stadium: {
      id: 'st-nt-3',
      name: 'Stade de France',
      nickname: null,
      imageRef: null,
      capacity: 81338,
      country: 'FRA',
    },

    coach: {
      id: 'c-nt-3',
      clubId: null,
      nationalTeamId: 'nt-3',
      name: 'Didier Deschamps',
      avatarRef: null,
      reputation: CoachReputation.WORLD_CLASS,
      country: 'FRA',
      favoriteTactic: '4-2-3-1',
    },
  },

  // ── Germany ──────────────────────────────────────────────────────────────────
  {
    id: 'nt-4',
    stadiumId: 'st-nt-4',
    name: 'Deutscher Fußball-Bund',
    shortName: 'Alemanha',
    abbrName: 'GER',
    primaryColor: '#FFFFFF',
    secondaryColor: '#000000',
    tertiaryColor: '#DD0000',
    flagRef: 'https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg',
    logoRef: null,
    primaryKitRef: null,
    secondaryKitRef: null,
    tertiaryKitRef: null,
    goalkeeperKitRef: null,
    country: 'GER',

    stadium: {
      id: 'st-nt-4',
      name: 'Olympiastadion Berlin',
      nickname: null,
      imageRef: null,
      capacity: 74475,
      country: 'GER',
    },

    coach: {
      id: 'c-nt-4',
      clubId: null,
      nationalTeamId: 'nt-4',
      name: 'Julian Nagelsmann',
      avatarRef: null,
      reputation: CoachReputation.GOOD,
      country: 'GER',
      favoriteTactic: '4-2-3-1',
    },
  },

  // ── Spain ────────────────────────────────────────────────────────────────────
  {
    id: 'nt-5',
    stadiumId: 'st-nt-5',
    name: 'Real Federación Española de Fútbol',
    shortName: 'Espanha',
    abbrName: 'ESP',
    primaryColor: '#AA151B',
    secondaryColor: '#F1BF00',
    tertiaryColor: null,
    flagRef: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg',
    logoRef: null,
    primaryKitRef: null,
    secondaryKitRef: null,
    tertiaryKitRef: null,
    goalkeeperKitRef: null,
    country: 'ESP',

    stadium: {
      id: 'st-nt-5',
      name: 'Estadio de La Cartuja',
      nickname: 'La Cartuja',
      imageRef: null,
      capacity: 60000,
      country: 'ESP',
    },

    coach: {
      id: 'c-nt-5',
      clubId: null,
      nationalTeamId: 'nt-5',
      name: 'Luis de la Fuente',
      avatarRef: null,
      reputation: CoachReputation.GOOD,
      country: 'ESP',
      favoriteTactic: '4-3-3',
    },
  },

  // ── England ──────────────────────────────────────────────────────────────────
  {
    id: 'nt-6',
    stadiumId: 'st-nt-6',
    name: 'The Football Association',
    shortName: 'Inglaterra',
    abbrName: 'ENG',
    primaryColor: '#FFFFFF',
    secondaryColor: '#012169',
    tertiaryColor: '#CF142B',
    flagRef: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Flag_of_England.svg',
    logoRef: null,
    primaryKitRef: null,
    secondaryKitRef: null,
    tertiaryKitRef: null,
    goalkeeperKitRef: null,
    country: 'ENG',

    stadium: {
      id: 'st-nt-6',
      name: 'Wembley Stadium',
      nickname: 'Wembley',
      imageRef: null,
      capacity: 90000,
      country: 'ENG',
    },

    coach: {
      id: 'c-nt-6',
      clubId: null,
      nationalTeamId: 'nt-6',
      name: 'Thomas Tuchel',
      avatarRef: null,
      reputation: CoachReputation.EXCELLENT,
      country: 'GER',
      favoriteTactic: '4-2-3-1',
    },
  },

  // ── Portugal ─────────────────────────────────────────────────────────────────
  {
    id: 'nt-7',
    stadiumId: 'st-nt-7',
    name: 'Federação Portuguesa de Futebol',
    shortName: 'Portugal',
    abbrName: 'POR',
    primaryColor: '#006600',
    secondaryColor: '#FF0000',
    tertiaryColor: null,
    flagRef: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg',
    logoRef: null,
    primaryKitRef: null,
    secondaryKitRef: null,
    tertiaryKitRef: null,
    goalkeeperKitRef: null,
    country: 'POR',

    stadium: {
      id: 'st-nt-7',
      name: 'Estádio da Luz',
      nickname: 'Da Luz',
      imageRef: null,
      capacity: 65647,
      country: 'POR',
    },

    coach: {
      id: 'c-nt-7',
      clubId: null,
      nationalTeamId: 'nt-7',
      name: 'Roberto Martínez',
      avatarRef: null,
      reputation: CoachReputation.GOOD,
      country: 'ESP',
      favoriteTactic: '4-3-3',
    },
  },
]
