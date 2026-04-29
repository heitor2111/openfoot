import type { Club } from '@/types/entities/club'
import type { Coach } from '@/types/entities/coach'
import type { NationalTeam } from '@/types/entities/nationalTeam'
import type { Player } from '@/types/entities/player'
import type { Stadium } from '@/types/entities/stadium'

export interface ClubDetails extends Club {
  stadium: Stadium
  coach: Coach | null
  players: Player[]
}

export interface NationalTeamDetails extends NationalTeam {
  stadium: Stadium
  coach: Coach | null
}
