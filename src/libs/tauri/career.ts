import { invoke } from '@tauri-apps/api/core'

export interface TeamOption {
  id: string
  name: string
  budget?: number
}

export interface SquadPlayer {
  id: string
  name: string
  position: string
  speed: number
  shooting: number
  passing: number
  dribbling: number
  defense: number
  stamina: number
  status?: string
  energy?: number
  age?: number
  nationality?: string
  marketValue?: number
}

export interface TeamDetail {
  id: string
  name: string
  leagueId: string
  squad: SquadPlayer[]
}

export interface LeagueDetail {
  id: string
  name: string
  country: string
  teams: TeamDetail[]
}

export interface LeagueOption {
  id: string
  name: string
  country: string
  confederation: string
  teams: TeamOption[]
}

export interface Fixture {
  homeTeamId: string
  homeTeamName: string
  homeStadium: string
  homeCoachName: string
  awayTeamId: string
  awayTeamName: string
  awayCoachName: string
}

export interface TableEntry {
  teamId: string
  teamName: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface BackgroundLeagueSnapshot {
  leagueId: string
  currentRound: number
  totalRounds: number
  leaderTeamName: string
  leaderPoints: number
}

export interface GoalScorerTallyEntry {
  playerId?: string
  playerName: string
  teamName: string
  goals: number
}

export interface CareerSnapshot {
  leagueId: string
  playerTeamId: string
  coachName: string
  morale: number
  currentSeason: number
  isSeasonEnded: boolean
  activeLeagueIds: string[]
  currentRound: number
  totalRounds: number
  playerPosition: number
  playerTeamBudget: number
  leagueDivisionLevel: number
  nextMatchDate: string
  table: TableEntry[]
  nextRoundFixtures: Fixture[]
  currentLeagueTopScorers: GoalScorerTallyEntry[]
  backgroundLeagues: BackgroundLeagueSnapshot[]
}

export interface MatchEvent {
  minute: number
  eventType: string // 'goal' | 'nearMiss' | 'save' | 'foul' | 'yellowCard' | 'redCard'
  teamSide: string  // 'home' | 'away'
  teamName: string
  playerName?: string
}

export interface RoundMatch {
  homeTeamId: string
  homeTeamName: string
  homeCoachName: string
  homeGoals: number
  awayTeamId: string
  awayTeamName: string
  awayCoachName: string
  awayGoals: number
  events: MatchEvent[]
  playerEnergyAfter?: Record<string, number>
}

export interface BackgroundGoalEvent {
  minute: number
  homeTeamName: string
  awayTeamName: string
  homeGoals: number
  awayGoals: number
}

export interface BackgroundMatch {
  homeTeamName: string
  awayTeamName: string
  homeGoals: number
  awayGoals: number
  goalEvents: BackgroundGoalEvent[]
}

export interface BackgroundLeagueRound {
  leagueId: string
  playedRound: number
  leaderTeamName: string
  leaderPoints: number
  matches: BackgroundMatch[]
}

export interface SimulateRoundResult {
  playedRound: number
  matches: RoundMatch[]
  backgroundLeagues: BackgroundLeagueRound[]
  snapshot: CareerSnapshot
  playerEnergyAfter?: Record<string, number>
  dismissed: boolean
}

export type SlotZone = 'GOL' | 'DEF' | 'MEI' | 'ATA'

export interface LineupStarterSlot {
  playerId: string
  slotZone: SlotZone
  slotIndex: number
}

export interface SavedLineup {
  starters: LineupStarterSlot[]
  bench: string[]
}

interface RawTeam {
  id?: string
  name?: string
  Id?: string
  Name?: string
}

interface RawLeague {
  id?: string
  name?: string
  teams?: RawTeam[]
  country?: string
  confederation?: string
  Id?: string
  Name?: string
  Teams?: RawTeam[]
  Country?: string
  Confederation?: string
}

interface RawSquadPlayer {
  id?: string
  name?: string
  position?: string
  speed?: number
  shooting?: number
  passing?: number
  dribbling?: number
  defense?: number
  stamina?: number
  status?: string
  age?: number
  nationality?: string
  marketValue?: number
  market_value?: number
  Id?: string
  Name?: string
  Position?: string
  Speed?: number
  Shooting?: number
  Passing?: number
  Dribbling?: number
  Defense?: number
  Stamina?: number
  Status?: string
  Age?: number
  Nationality?: string
  MarketValue?: number
  Market_Value?: number
}

interface RawTeamDetail extends RawTeam {
  leagueId?: string
  squad?: RawSquadPlayer[]
  LeagueId?: string
  Squad?: RawSquadPlayer[]
}

interface RawLeagueDetail extends RawLeague {
  teams?: RawTeamDetail[]
  Teams?: RawTeamDetail[]
}

const normalizeTeam = (raw: RawTeam): TeamOption | null => {
  const id = raw.id ?? raw.Id
  const name = raw.name ?? raw.Name

  if (!id || !name) return null
  return { id, name }
}

const normalizeLeague = (raw: RawLeague): LeagueOption | null => {
  const id = raw.id ?? raw.Id
  const name = raw.name ?? raw.Name
  const country = raw.country ?? raw.Country ?? ''
  const confederation = raw.confederation ?? raw.Confederation ?? ''
  const teamsRaw = raw.teams ?? raw.Teams ?? []

  if (!id || !name) return null

  return {
    id,
    name,
    country,
    confederation,
    teams: teamsRaw.map(normalizeTeam).filter((team): team is TeamOption => team !== null),
  }
}

const normalizeSquadPlayer = (raw: RawSquadPlayer): SquadPlayer | null => {
  const id = raw.id ?? raw.Id
  const name = raw.name ?? raw.Name
  const position = raw.position ?? raw.Position
  const speed = raw.speed ?? raw.Speed
  const shooting = raw.shooting ?? raw.Shooting
  const passing = raw.passing ?? raw.Passing
  const dribbling = raw.dribbling ?? raw.Dribbling
  const defense = raw.defense ?? raw.Defense
  const stamina = raw.stamina ?? raw.Stamina
  const status = raw.status ?? raw.Status
  const age = raw.age ?? raw.Age
  const nationality = raw.nationality ?? raw.Nationality
  const marketValue = raw.marketValue ?? raw.market_value ?? raw.MarketValue ?? raw.Market_Value

  if (
    !id ||
    !name ||
    !position ||
    speed === undefined ||
    shooting === undefined ||
    passing === undefined ||
    dribbling === undefined ||
    defense === undefined ||
    stamina === undefined
  ) {
    return null
  }

  return {
    id,
    name,
    position,
    speed,
    shooting,
    passing,
    dribbling,
    defense,
    stamina,
    status,
    age,
    nationality,
    marketValue,
  }
}

const normalizeTeamDetail = (raw: RawTeamDetail): TeamDetail | null => {
  const id = raw.id ?? raw.Id
  const name = raw.name ?? raw.Name
  const leagueId = raw.leagueId ?? raw.LeagueId
  const squadRaw = raw.squad ?? raw.Squad ?? []

  if (!id || !name || !leagueId) return null

  return {
    id,
    name,
    leagueId,
    squad: squadRaw
      .map(normalizeSquadPlayer)
      .filter((player): player is SquadPlayer => player !== null),
  }
}

const normalizeLeagueDetail = (raw: RawLeagueDetail): LeagueDetail | null => {
  const id = raw.id ?? raw.Id
  const name = raw.name ?? raw.Name
  const country = raw.country ?? raw.Country
  const teamsRaw = raw.teams ?? raw.Teams ?? []

  if (!id || !name || !country) return null

  return {
    id,
    name,
    country,
    teams: teamsRaw
      .map(normalizeTeamDetail)
      .filter((team): team is TeamDetail => team !== null),
  }
}

export const fetchLeagues = async () => {
  const raw = await invoke<RawLeague[]>('fetch_leagues')
  return raw.map(normalizeLeague).filter((league): league is LeagueOption => league !== null)
}

export const fetchLeague = async (id: string) => {
  const raw = await invoke<RawLeagueDetail>('fetch_league', { id })
  const normalized = normalizeLeagueDetail(raw)

  if (!normalized) {
    throw new Error(`Formato de liga invalido para '${id}'`)
  }

  return normalized
}

export const startNewCareer = async (leagueId: string, teamId: string) =>
  invoke<CareerSnapshot>('start_new_career', { leagueId, teamId })

export const startNewCareerMulti = async (
  leagueId: string,
  teamId: string,
  coachName: string,
  activeLeagueIds: string[]
) =>
  invoke<CareerSnapshot>('start_new_career_multi', {
    leagueId,
    teamId,
    coachName,
    activeLeagueIds,
  })

export const simulateCareerRound = async (formation: string, playStyle: string) =>
  invoke<SimulateRoundResult>('simulate_career_round', { formation, playStyle })

export const getCareerSnapshot = async () =>
  invoke<CareerSnapshot>('get_career_snapshot')

export const advanceToNextSeason = async () =>
  invoke<CareerSnapshot>('advance_to_next_season')

export const saveLineup = async (lineup: SavedLineup) =>
  invoke<void>('save_lineup', { lineup })

export const getLineup = async () =>
  invoke<SavedLineup>('get_lineup')

export const getPlayerEnergies = async () =>
  invoke<Record<string, number>>('get_player_energies')

export const getPlayerTeamSquad = async () => {
  const raw = await invoke<RawSquadPlayer[]>('get_player_team_squad')
  return raw
    .map(normalizeSquadPlayer)
    .filter((player): player is SquadPlayer => player !== null)
}

// ===== CALENDAR DATA =====

export interface CalendarMatch {
  homeTeamId: string
  homeTeamName: string
  awayTeamId: string
  awayTeamName: string
  homeGoals: number | null
  awayGoals: number | null
  isPlayerMatch: boolean
}

export interface CalendarRound {
  roundNumber: number
  matches: CalendarMatch[]
  isPlayed: boolean
}

export interface CalendarData {
  leagueId: string
  leagueName: string
  playerTeamId: string
  currentRound: number
  totalRounds: number
  currentSeason: number
  rounds: CalendarRound[]
}

export const getCalendarData = async () =>
  invoke<CalendarData>('get_calendar_data')

// ===== COACH TRANSFERS =====

export interface ClubOffer {
  teamId: string
  teamName: string
  leagueId: string
  currentPosition: number
  morale: number
}

export const listCoachJobOffers = async () =>
  invoke<ClubOffer[]>('list_coach_job_offers')

export const acceptCoachJobOffer = async (newTeamId: string) =>
  invoke<CareerSnapshot>('accept_coach_job_offer', { newTeamId })

// ===== PLAYER TRANSFER MARKET =====

export interface TransferMarketPlayer {
  playerId: string
  playerName: string
  position: string
  overall: number
  speed: number
  shooting: number
  passing: number
  dribbling: number
  defense: number
  stamina: number
  age?: number
  nationality?: string
  marketValue: number
  teamId: string
  teamName: string
  leagueId: string
  leagueName: string
  country: string
  attemptsUsed: number
  isBlocked: boolean
}

export interface TransferMarketQuery {
  page?: number
  pageSize?: number
  country?: string
  leagueId?: string
  teamId?: string
  name?: string
  position?: string
  ovrMin?: number
  ovrMax?: number
  ageMin?: number
  ageMax?: number
  valueMin?: number
  valueMax?: number
  speedMin?: number
  speedMax?: number
  shootingMin?: number
  shootingMax?: number
  passingMin?: number
  passingMax?: number
  dribblingMin?: number
  dribblingMax?: number
  defenseMin?: number
  defenseMax?: number
  staminaMin?: number
  staminaMax?: number
}

export interface TransferMarketPage {
  items: TransferMarketPlayer[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface TransferMarketLeagueOption {
  leagueId: string
  leagueName: string
  country: string
}

export interface TransferMarketTeamOption {
  teamId: string
  teamName: string
  leagueId: string
}

export interface TransferMarketCatalog {
  countries: string[]
  leagues: TransferMarketLeagueOption[]
  teams: TransferMarketTeamOption[]
}

export type TransferOfferResultKind =
  | 'accepted'
  | 'refused'
  | 'blocked'
  | 'insufficient_budget'

export interface TransferOfferResult {
  result: TransferOfferResultKind
  attemptsUsed: number
}

export interface AiPlayerOffer {
  playerId: string
  playerName: string
  playerOverall?: number
  playerMarketValue?: number
  offeringTeamId: string
  offeringTeamName: string
  offerValue: number
}

export interface AiMarketActivity {
  leagueId: string
  sellerTeamName: string
  buyerTeamName: string
  playerName: string
  offerValue: number
}

export interface SeasonLeagueChampion {
  leagueId: string
  leagueName: string
  championTeamId: string
  championTeamName: string
  points: number
}

export interface SeasonTopScorer {
  leagueId: string
  leagueName: string
  playerId?: string
  playerName: string
  teamName: string
  goals: number
}

export interface SeasonWorldTransfer {
  leagueId: string
  leagueName: string
  sellerTeamName: string
  buyerTeamName: string
  playerName: string
  offerValue: number
  transferType: string
}

export interface CareerSeasonSummary {
  season: number
  leagueChampions: SeasonLeagueChampion[]
  topScorers: SeasonTopScorer[]
  worldTransfers: SeasonWorldTransfer[]
}

export const listTransferMarket = async (query?: TransferMarketQuery) =>
  invoke<TransferMarketPage>('list_transfer_market', { query })

export const listTransferMarketCatalog = async () =>
  invoke<TransferMarketCatalog>('list_transfer_market_catalog')

export const submitTransferOffer = async (playerId: string, offerValue: number) =>
  invoke<TransferOfferResult>('submit_transfer_offer', { playerId, offerValue })

export const listAiPlayerTransferOffers = async () =>
  invoke<AiPlayerOffer[]>('list_ai_player_transfer_offers')

export const respondAiPlayerTransferOffer = async (playerId: string, accept: boolean) =>
  invoke<CareerSnapshot>('respond_ai_player_transfer_offer', { playerId, accept })

export const listAiMarketRoundActivity = async () =>
  invoke<AiMarketActivity[]>('list_ai_market_round_activity')

export const listCareerSeasonStatistics = async () =>
  invoke<CareerSeasonSummary[]>('list_career_season_statistics')
