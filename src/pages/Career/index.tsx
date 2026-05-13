import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState, createContext, useDeferredValue } from 'react'
import { useNavigate } from 'react-router'
import { useVirtualizer } from '@tanstack/react-virtual'

import Table from '@/components/Table'
import {
  getLineup,
  getCareerSnapshot,
  getPlayerEnergies,
  getPlayerTeamSquad,
  saveLineup,
  simulateCareerRound,
  advanceToNextSeason,
  listTransferMarket,
  listTransferMarketCatalog,
  submitTransferOffer,
  listAiPlayerTransferOffers,
  respondAiPlayerTransferOffer,
  listAiMarketRoundActivity,
  listCareerSeasonStatistics,
  type CareerSnapshot,
  type MatchEvent,
  type RoundMatch,
  type SavedLineup,
  type SimulateRoundResult,
  type SlotZone as ApiSlotZone,
  type SquadPlayer,
  type TransferMarketPlayer,
  type TransferMarketCatalog,
  type TransferMarketQuery,
  type TransferOfferResult,
  type AiPlayerOffer,
  type AiMarketActivity,
  type CareerSeasonSummary,
} from '@/libs/tauri/career'
import { saveCareer } from '@/libs/tauri/saves'
import { PlayerPosition } from '@/types/enums/player'
import Calendar from '@/pages/Calendar'

type TabKey = 'partida' | 'escalacao' | 'calendario' | 'mercado' | 'estatisticas'
type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2' | '4-5-1' | '3-4-3'
type PlayStyle =
  | 'Pressing Alto'
  | 'Posse de Bola'
  | 'Contra-ataque'
  | 'Transição Rápida'
  | 'Jogo pelos Lados'
  | 'Retranca'
type SpeedKey = 'devagar' | 'normal' | 'rapido' | 'instantaneo'
type LiveState = 'idle' | 'running' | 'paused' | 'done'
type SquadStatus = 'Titular' | 'Reserva'
type SquadSortColumn =
  | 'name'
  | 'age'
  | 'position'
  | 'energy'
  | 'overall'
  | 'speed'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defense'
  | 'stamina'
  | 'nationality'
  | 'marketValue'
type SortDirection = 'asc' | 'desc'

type SquadRow = SquadPlayer & {
  status: SquadStatus
}

// Context para drag state isolado
type DragContextType = {
  dragPosRef: React.MutableRefObject<{ x: number; y: number } | null>
  forceUpdateTrigger: number
}

const DragContext = createContext<DragContextType | null>(null)

const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1', '3-4-3']
const PLAY_STYLES: PlayStyle[] = [
  'Pressing Alto',
  'Posse de Bola',
  'Contra-ataque',
  'Transição Rápida',
  'Jogo pelos Lados',
  'Retranca',
]
const SPEED_LABELS: Record<SpeedKey, string> = {
  devagar: 'Devagar',
  normal: 'Normal',
  rapido: 'Rapido',
  instantaneo: 'Instantaneo',
}
const SPEED_DELAYS: Record<SpeedKey, number> = {
  devagar: 150,
  normal: 60,
  rapido: 20,
  instantaneo: 0,
}

const EVENT_STYLES: Record<string, { label: string; cls: string }> = {
  goal: { label: 'GOL', cls: 'bg-primary text-primary-content' },
  nearMiss: { label: 'Chute', cls: 'bg-warning/30 text-warning-content' },
  save: { label: 'Defendido', cls: 'bg-info/30 text-info-content' },
  foul: { label: 'Falta', cls: 'bg-base-300 text-base-content' },
  yellowCard: { label: 'Amarelo 🟨', cls: 'bg-yellow-500/30 text-yellow-200' },
  redCard: { label: 'Vermelho 🟥', cls: 'bg-red-500/30 text-red-200' },
  corner: { label: 'Escanteio ⚐', cls: 'bg-accent/30 text-accent-content' },
}

type MenuItem = {
  key: TabKey | null
  label: string
  icon: string
  comingSoon?: boolean
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'partida', label: 'Partida', icon: '▶' },
  { key: 'escalacao', label: 'Elenco', icon: '👥' },
  { key: 'calendario', label: 'Calendario', icon: '📅' },
  { key: null, label: 'Salvar Jogo', icon: '💾' },
  { key: 'mercado' as TabKey, label: 'Transferencias', icon: '💸' },
  { key: null, label: 'Departamentos', icon: '🏢', comingSoon: true },
  { key: 'estatisticas', label: 'Estatisticas', icon: '📊' },
]

const abbrevName = (name: string) => {
  const parts = name.trim().split(' ')
  if (parts.length <= 1) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

const formatTransferMoney = (value: number, decimals = 2) => `EUR ${(value / 1_000_000).toFixed(decimals)}M`

/** OVR Base: talento estrutural do jogador. Paridade com `Player::overall()` no Rust. */
const computeBaseOvr = (player: SquadPlayer): number => {
  const { defense, stamina, passing, speed, dribbling, shooting } = player
  const position = player.position.trim().toUpperCase()

  if (position === PlayerPosition.GOL) {
    return Math.round(defense * 0.5 + stamina * 0.2 + passing * 0.2 + speed * 0.1)
  }

  if (position === PlayerPosition.ZAG || position === PlayerPosition.LAT_E || position === PlayerPosition.LAT_D) {
    return Math.round(defense * 0.4 + speed * 0.2 + passing * 0.2 + stamina * 0.2)
  }

  if (position === PlayerPosition.VOL || position === PlayerPosition.MEI || position === PlayerPosition.MEI_A) {
    return Math.round(passing * 0.35 + dribbling * 0.25 + defense * 0.2 + stamina * 0.2)
  }

  if (
    position === PlayerPosition.PNT_E ||
    position === PlayerPosition.PNT_D ||
    position === PlayerPosition.SA ||
    position === PlayerPosition.ATA
  ) {
    return Math.round(shooting * 0.35 + speed * 0.25 + dribbling * 0.25 + passing * 0.15)
  }

  return Math.round((defense + stamina + passing + speed + dribbling + shooting) / 6)
}

/**
 * OVR Readiness: desempenho efetivo considerando energia dinâmica.
 * Reflete `get_effective_attribute_with_energy` do Rust: desempenho cai linearmente com energia.
 * Usar em: auto-lineup, troca de formação, banco de reservas, seleção de substituição.
 */
const computeReadinessOvr = (player: SquadPlayer, energy: number = 100): number => {
  return Math.round(computeBaseOvr(player) * (energy / 100))
}

const formatMarketValue = (value?: number) => {
  if (!value || value <= 0) return '-'

  if (value >= 1_000_000_000) {
    return `€ ${(value / 1_000_000_000).toFixed(2)} bi`
  }

  if (value >= 1_000_000) {
    return `€ ${(value / 1_000_000).toFixed(2)} mi`
  }

  if (value >= 1_000) {
    return `€ ${(value / 1_000).toFixed(0)} mil`
  }

  return `€ ${value}`
}

const compareNumber = (left: number, right: number) => {
  if (left === right) return 0
  return left > right ? 1 : -1
}

const compareText = (left?: string, right?: string) =>
  (left ?? '').localeCompare(right ?? '', 'pt-BR', { sensitivity: 'base' })

type SlotZone = 'GOL' | 'DEF' | 'MEI' | 'ATA'
type UiSlotLabel = 'GK' | 'LB' | 'CB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'CF' | 'ST'
type PositionCompatibility = 'perfect' | 'fallback' | 'mismatch'

type FieldSlot = {
  zone: SlotZone
  playerId: string | null
}

type BenchSlot = {
  playerId: string | null
}

type RecentSubstitution = {
  slotIdx: number
  zone: SlotZone
  outPlayerName: string
  inPlayerName: string
  minute: number
}

const UI_SLOT_LABEL_PT: Record<UiSlotLabel, string> = {
  GK: 'GOL',
  LB: 'LAT-E',
  CB: 'ZAG',
  RB: 'LAT-D',
  CDM: 'VOL',
  CM: 'MEI',
  CAM: 'MEI-A',
  LW: 'PNT-E',
  RW: 'PNT-D',
  CF: 'SA',
  ST: 'ATA',
}

const FORMATION_SCHEMAS: Record<Formation, UiSlotLabel[]> = {
  '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LW', 'CDM', 'CM', 'RW', 'CF', 'ST'],
  '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'],
  '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LW', 'CDM', 'CM', 'CAM', 'RW', 'CF', 'ST'],
  '5-3-2': ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'CF', 'ST'],
  '4-5-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'LW', 'CDM', 'CAM', 'CM', 'RW', 'ST'],
  '3-4-3': ['GK', 'CB', 'CB', 'CB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'ST', 'RW'],
}

const EXACT_POSITION_MAP: Record<UiSlotLabel, PlayerPosition[]> = {
  GK: [PlayerPosition.GOL],
  LB: [PlayerPosition.LAT_E],
  RB: [PlayerPosition.LAT_D],
  CB: [PlayerPosition.ZAG],
  CDM: [PlayerPosition.VOL],
  CM: [PlayerPosition.MEI],
  CAM: [PlayerPosition.MEI_A],
  LW: [PlayerPosition.PNT_E],
  RW: [PlayerPosition.PNT_D],
  CF: [PlayerPosition.SA],
  ST: [PlayerPosition.ATA],
}

const ZONE_FALLBACK_LABEL: Record<SlotZone, UiSlotLabel> = {
  GOL: 'GK',
  DEF: 'CB',
  MEI: 'CM',
  ATA: 'ST',
}

const toPlayerPosition = (position: string): PlayerPosition | null => {
  const pos = position.trim().toUpperCase()
  return (Object.values(PlayerPosition) as string[]).includes(pos) ? (pos as PlayerPosition) : null
}

const getSlotLabelForIndex = (formation: Formation, slotIdx: number, zone: SlotZone): UiSlotLabel =>
  FORMATION_SCHEMAS[formation]?.[slotIdx] ?? ZONE_FALLBACK_LABEL[zone]

const ADJACENT_ZONES: Partial<Record<SlotZone, SlotZone[]>> = {
  DEF: ['MEI'],
  MEI: ['DEF', 'ATA'],
  ATA: ['MEI'],
}

const getPositionCompatibility = (playerPosition: string, slotZone: SlotZone): PositionCompatibility => {
  const canonical = toPlayerPosition(playerPosition)
  if (!canonical) return 'mismatch'

  if (ZONE_POSITIONS[slotZone].includes(canonical)) return 'perfect'

  const adjacent = ADJACENT_ZONES[slotZone] ?? []
  if (adjacent.some((z) => ZONE_POSITIONS[z].includes(canonical))) return 'fallback'

  return 'mismatch'
}

const compatibilityClass = (compatibility: PositionCompatibility): string => {
  if (compatibility === 'perfect') return 'text-success'
  if (compatibility === 'fallback') return 'text-warning'
  return 'text-error'
}

const ZONE_POSITIONS: Record<SlotZone, PlayerPosition[]> = {
  GOL: [PlayerPosition.GOL],
  DEF: [PlayerPosition.ZAG, PlayerPosition.LAT_E, PlayerPosition.LAT_D],
  MEI: [PlayerPosition.VOL, PlayerPosition.MEI, PlayerPosition.MEI_A],
  ATA: [PlayerPosition.ATA, PlayerPosition.SA, PlayerPosition.PNT_E, PlayerPosition.PNT_D],
}

const isPositionInZone = (zone: SlotZone, position: string) => {
  const canonical = toPlayerPosition(position)
  return canonical !== null && ZONE_POSITIONS[zone].includes(canonical)
}

const isGoalkeeperPosition = (position: string) => isPositionInZone('GOL', position)

type SlotSide = 'left' | 'right' | 'center'

const getSlotSide = (slotLabel: UiSlotLabel): SlotSide => {
  if (slotLabel === 'LB' || slotLabel === 'LW') return 'left'
  if (slotLabel === 'RB' || slotLabel === 'RW') return 'right'
  return 'center'
}

const getPositionSide = (position: string): SlotSide | null => {
  const canonical = toPlayerPosition(position)
  if (!canonical) return null

  if (canonical === PlayerPosition.LAT_E || canonical === PlayerPosition.PNT_E) return 'left'
  if (canonical === PlayerPosition.LAT_D || canonical === PlayerPosition.PNT_D) return 'right'

  return 'center'
}

const isSideCompatibleWithSlot = (position: string, slotLabel: UiSlotLabel): boolean => {
  const slotSide = getSlotSide(slotLabel)
  const playerSide = getPositionSide(position)
  if (playerSide === null) return false
  return playerSide === slotSide
}

const classifyOutfieldLine = (position: string): 'DEF' | 'MEI' | 'ATA' | null => {
  if (isPositionInZone('DEF', position)) return 'DEF'
  if (isPositionInZone('MEI', position)) return 'MEI'
  if (isPositionInZone('ATA', position)) return 'ATA'
  return null
}

const OUTFIELD_FALLBACK: Record<Exclude<SlotZone, 'GOL'>, Array<'DEF' | 'MEI' | 'ATA'>> = {
  DEF: ['DEF', 'MEI', 'ATA'],
  MEI: ['MEI', 'DEF', 'ATA'],
  ATA: ['ATA', 'MEI', 'DEF'],
}

const FORMATION_SLOTS: Record<Formation, SlotZone[]> = {
  '4-4-2': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-3-3': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
  '3-5-2': ['GOL', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '5-3-2': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-5-1': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA'],
  '3-4-3': ['GOL', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
}

const BENCH_SLOT_COUNT = 7

const emptyBenchSlots = (): BenchSlot[] =>
  Array.from({ length: BENCH_SLOT_COUNT }, () => ({ playerId: null }))

const buildBenchSlotsWithIds = (ids: string[]): BenchSlot[] =>
  Array.from({ length: BENCH_SLOT_COUNT }, (_, i) => ({
    playerId: ids[i] ?? null,
  }))

const buildSlotsWithLineup = (formation: Formation, lineupIds: string[]): FieldSlot[] =>
  FORMATION_SLOTS[formation].map((zone, i) => ({
    zone,
    playerId: lineupIds[i] ?? null,
  }))

const buildSlotsWithSavedLineup = (formation: Formation, saved: SavedLineup): FieldSlot[] => {
  const next = buildSlotsWithLineup(formation, [])
  for (const starter of saved.starters) {
    const idx = starter.slotIndex
    if (idx < 0 || idx >= next.length) continue
    next[idx] = {
      ...next[idx],
      playerId: starter.playerId,
    }
  }
  return next
}

const SQUAD_VIRTUALIZATION_THRESHOLD = 20
const SQUAD_ROW_HEIGHT = 34
const SQUAD_VIRTUALIZATION_OVERSCAN = 20  // Aumentado de 8 para reduzir "vazios" durante scroll
const SQUAD_GRID_TEMPLATE = '20% 5% 5% 5% 5% 5% 5% 5% 5% 5% 5% 10% 20%'

// Componente isolado para drag preview sem re-render do Career
const DragPreviewContainer = memo(({ dragSource, playerName }: { dragSource: { type: 'slot' | 'bench' | 'list'; idx: number; playerId: string } | null; playerName: string }) => {
  const dragCtx = useContext(DragContext)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!dragSource || !dragCtx) return

    // Seta a posicao inicial imediatamente ao iniciar o drag.
    const initial = dragCtx.dragPosRef.current
    if (initial) setDragPos(initial)

    // Atualiza em tempo real no mesmo evento de ponteiro.
    const onMove = (e: PointerEvent) => {
      const next = { x: e.clientX, y: e.clientY }
      dragCtx.dragPosRef.current = next
      setDragPos(next)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [dragSource, dragCtx])

  if (!dragSource || !dragPos) return null
  return <DragPreview x={dragPos.x} y={dragPos.y} name={playerName} />
})
DragPreviewContainer.displayName = 'DragPreviewContainer'

const DragPreview = memo(({ x, y, name }: { x: number; y: number; name: string }) => (
  <div
    style={{
      position: 'fixed',
      transform: `translate3d(${x - 36}px, ${y - 24}px, 0)`,
      zIndex: 9999,
      pointerEvents: 'none',
      willChange: 'transform',
    }}
    className='rounded-md px-2 py-1.5 text-center w-[4.5rem] text-xs bg-yellow-400/20 border-2 border-yellow-400 text-yellow-100'
  >
    {abbrevName(name)}
  </div>
))

type SquadTableRowProps = {
  player: SquadRow
  isStarter: boolean
  isBench: boolean
  energy: number
  baseOvr: number
  onPointerDown: (e: React.PointerEvent<HTMLTableRowElement>) => void
  onClick: () => void
}

const SquadTableRow = memo<SquadTableRowProps>(({ player, isStarter, isBench, energy, baseOvr, onPointerDown, onClick }) => {
  const isAssigned = isStarter || isBench
  return (
    <tr
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={[
        isAssigned ? 'cursor-pointer' : 'cursor-grab',
        isStarter
          ? 'bg-success/15 text-base-content hover:bg-success/25'
          : isBench
          ? 'bg-base-content/8 text-base-content hover:bg-base-content/14'
          : 'hover:bg-primary/10',
      ].join(' ')}
      title={player.name}
    >
      <td className='w-[11.25rem] max-w-[11.25rem] font-semibold'>
        <div className='truncate'>{player.name}</div>
      </td>
      <td className='w-16 text-right pr-2'>{player.age ?? '-'}</td>
      <td className='w-[4.5rem] pl-1'>{player.position}</td>
      <td className='w-[4.5rem] text-right font-mono'>{Math.round(energy)}%</td>
      <td className='w-16 text-right font-mono font-bold'>{baseOvr}</td>
      <td className='w-16 text-right'>{player.speed}</td>
      <td className='w-16 text-right'>{player.shooting}</td>
      <td className='w-16 text-right'>{player.passing}</td>
      <td className='w-16 text-right'>{player.dribbling}</td>
      <td className='w-16 text-right'>{player.defense}</td>
      <td className='w-16 text-right pr-2'>{player.stamina}</td>
      <td className='w-[7.5rem] max-w-[7.5rem] truncate pl-1 pr-2'>{player.nationality ?? '-'}</td>
      <td className='w-[7.5rem] whitespace-nowrap text-right pr-2 font-mono'>{formatMarketValue(player.marketValue)}</td>
    </tr>
  )
})
SquadTableRow.displayName = 'SquadTableRow'

type BenchSlotCardProps = {
  benchIdx: number
  player: SquadRow | undefined
  energy: number
  baseOvr: number
  onPointerDown: (ev: React.PointerEvent<HTMLButtonElement>) => void
  onClick: () => void
  refCallback: (el: HTMLButtonElement | null) => void
}

const BenchSlotCard = memo<BenchSlotCardProps>(({ benchIdx, player, energy, baseOvr, onPointerDown, onClick, refCallback }) => {
  const ec = energy >= 70 ? 'bg-success' : energy >= 40 ? 'bg-warning' : 'bg-error'
  return (
    <button
      key={`bench-slot-${benchIdx}`}
      type='button'
      ref={refCallback}
      className={[
        'rounded-md border-2 px-2 py-1 text-left text-xs',
        player
          ? 'border-sky-400/55 bg-slate-800 text-slate-100 hover:border-sky-300'
          : 'border-slate-600/60 bg-slate-800/35 text-slate-400 border-dashed hover:border-slate-500',
      ].join(' ')}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div className='flex items-center justify-between gap-1 leading-none'>
        <span className='truncate font-semibold'>{player ? abbrevName(player.name) : 'Vazio'}</span>
        <span className='shrink-0 font-mono font-bold'>{player ? baseOvr : '--'}</span>
      </div>
      <div className='text-[10px] opacity-55 mt-0.5'>{player ? player.position : '\u00a0'}</div>
      <div className='mt-1 h-1 w-full rounded-full bg-black/30 overflow-hidden'>
        {player && <div className={`h-full rounded-full ${ec}`} style={{ width: `${Math.round(energy)}%` }} />}
      </div>
    </button>
  )
})
BenchSlotCard.displayName = 'BenchSlotCard'

DragPreview.displayName = 'DragPreview'

const Career = () => {
  const navigate = useNavigate()
  const dragCtx = useContext(DragContext)
  const localDragPosRef = useRef<{ x: number; y: number } | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('partida')
  const [snapshot, setSnapshot] = useState<CareerSnapshot | null>(null)
  const [lastRoundMatches, setLastRoundMatches] = useState<RoundMatch[]>([])
  const [squad, setSquad] = useState<SquadRow[]>([])
  const [formation, setFormation] = useState<Formation>('4-4-2')
  const [playStyle, setPlayStyle] = useState<PlayStyle>('Pressing Alto')
  const [simSpeed, setSimSpeed] = useState<SpeedKey>('normal')
  const [liveState, setLiveState] = useState<LiveState>('idle')
  const [liveMinute, setLiveMinute] = useState(0)
  const [expandedMatchKey, setExpandedMatchKey] = useState<string | null>(null)
  const [liveHomeGoals, setLiveHomeGoals] = useState(0)
  const [liveAwayGoals, setLiveAwayGoals] = useState(0)
  const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([])
  const [bgEvents, setBgEvents] = useState<Array<{
    minute: number
    homeTeamName: string
    awayTeamName: string
    homeGoals: number
    awayGoals: number
  }>>([])
  const [focusMatch, setFocusMatch] = useState<RoundMatch | null>(null)
  const [playedRound, setPlayedRound] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Carregando carreira...')
  const [slots, setSlots] = useState<FieldSlot[]>(() => buildSlotsWithLineup('4-4-2', []))
  const [savedSlots, setSavedSlots] = useState<FieldSlot[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null)
  const [dragSource, setDragSource] = useState<{ type: 'slot' | 'bench' | 'list'; idx: number; playerId: string } | null>(null)
  const [subsUsed, setSubsUsed] = useState(0)
  const [subWindowsUsed, setSubWindowsUsed] = useState(0)
  const [subsInCurrentPause, setSubsInCurrentPause] = useState(0)
  const [subOutSlotIdx, setSubOutSlotIdx] = useState<number | null>(null)
  const [subInPlayerId, setSubInPlayerId] = useState('')
  const [recentSubstitution, setRecentSubstitution] = useState<RecentSubstitution | null>(null)
  const [benchSlots, setBenchSlots] = useState<BenchSlot[]>(() => emptyBenchSlots())
  const [playerEnergies, setPlayerEnergies] = useState<Record<string, number>>({})
  const [filterPosition, setFilterPosition] = useState<string>('all')
  const [filterEnergy, setFilterEnergy] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [debouncedFilterPosition, setDebouncedFilterPosition] = useState<string>('all')
  const [debouncedFilterEnergy, setDebouncedFilterEnergy] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [sortColumn, setSortColumn] = useState<SquadSortColumn>('overall')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [dismissedAfterMatch, setDismissedAfterMatch] = useState(false)

  const pendingResult = useRef<SimulateRoundResult | null>(null)
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justDroppedRef = useRef(false)
  const dragPosRef = dragCtx?.dragPosRef ?? localDragPosRef
  const slotRefs = useRef<Map<number, HTMLElement>>(new Map())
  const benchRefs = useRef<Map<number, HTMLElement>>(new Map())
  const squadScrollRef = useRef<HTMLDivElement | null>(null)
  const filterPositionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const filterEnergyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Transfer Market
  const [tmPlayers, setTmPlayers] = useState<TransferMarketPlayer[]>([])
  const [tmCatalog, setTmCatalog] = useState<TransferMarketCatalog | null>(null)
  const [tmAiOffers, setTmAiOffers] = useState<AiPlayerOffer[]>([])
  const [tmAiActivity, setTmAiActivity] = useState<AiMarketActivity[]>([])
  const [tmLoading, setTmLoading] = useState(false)
  const [tmPage, setTmPage] = useState(1)
  const [tmTotalPages, setTmTotalPages] = useState(1)
  const [tmTotalPlayers, setTmTotalPlayers] = useState(0)
  const TM_PAGE_SIZE = 50
  const [tmFilterCountry, setTmFilterCountry] = useState('')
  const [tmFilterLeague, setTmFilterLeague] = useState('')
  const [tmFilterClub, setTmFilterClub] = useState('')
  const [tmFilterName, setTmFilterName] = useState('')
  const [tmFilterPos, setTmFilterPos] = useState('')
  const [tmFilterOvrMin, setTmFilterOvrMin] = useState('')
  const [tmFilterOvrMax, setTmFilterOvrMax] = useState('')
  const [tmFilterAgeMin, setTmFilterAgeMin] = useState('')
  const [tmFilterAgeMax, setTmFilterAgeMax] = useState('')
  const [tmFilterValMin, setTmFilterValMin] = useState('')
  const [tmFilterValMax, setTmFilterValMax] = useState('')
  const [tmFilterSpeedMin, setTmFilterSpeedMin] = useState('')
  const [tmFilterSpeedMax, setTmFilterSpeedMax] = useState('')
  const [tmFilterShootingMin, setTmFilterShootingMin] = useState('')
  const [tmFilterShootingMax, setTmFilterShootingMax] = useState('')
  const [tmFilterPassingMin, setTmFilterPassingMin] = useState('')
  const [tmFilterPassingMax, setTmFilterPassingMax] = useState('')
  const [tmFilterDribblingMin, setTmFilterDribblingMin] = useState('')
  const [tmFilterDribblingMax, setTmFilterDribblingMax] = useState('')
  const [tmFilterDefenseMin, setTmFilterDefenseMin] = useState('')
  const [tmFilterDefenseMax, setTmFilterDefenseMax] = useState('')
  const [tmFilterStaminaMin, setTmFilterStaminaMin] = useState('')
  const [tmFilterStaminaMax, setTmFilterStaminaMax] = useState('')
  const [tmAppliedCountry, setTmAppliedCountry] = useState('')
  const [tmAppliedLeague, setTmAppliedLeague] = useState('')
  const [tmAppliedClub, setTmAppliedClub] = useState('')
  const [tmAppliedName, setTmAppliedName] = useState('')
  const [tmAppliedPos, setTmAppliedPos] = useState('')
  const [tmAppliedOvrMin, setTmAppliedOvrMin] = useState('')
  const [tmAppliedOvrMax, setTmAppliedOvrMax] = useState('')
  const [tmAppliedAgeMin, setTmAppliedAgeMin] = useState('')
  const [tmAppliedAgeMax, setTmAppliedAgeMax] = useState('')
  const [tmAppliedValMin, setTmAppliedValMin] = useState('')
  const [tmAppliedValMax, setTmAppliedValMax] = useState('')
  const [tmAppliedSpeedMin, setTmAppliedSpeedMin] = useState('')
  const [tmAppliedSpeedMax, setTmAppliedSpeedMax] = useState('')
  const [tmAppliedShootingMin, setTmAppliedShootingMin] = useState('')
  const [tmAppliedShootingMax, setTmAppliedShootingMax] = useState('')
  const [tmAppliedPassingMin, setTmAppliedPassingMin] = useState('')
  const [tmAppliedPassingMax, setTmAppliedPassingMax] = useState('')
  const [tmAppliedDribblingMin, setTmAppliedDribblingMin] = useState('')
  const [tmAppliedDribblingMax, setTmAppliedDribblingMax] = useState('')
  const [tmAppliedDefenseMin, setTmAppliedDefenseMin] = useState('')
  const [tmAppliedDefenseMax, setTmAppliedDefenseMax] = useState('')
  const [tmAppliedStaminaMin, setTmAppliedStaminaMin] = useState('')
  const [tmAppliedStaminaMax, setTmAppliedStaminaMax] = useState('')
  const [tmShowAdvanced, setTmShowAdvanced] = useState(false)
  const [tmOfferPlayer, setTmOfferPlayer] = useState<TransferMarketPlayer | null>(null)
  const [tmOfferAmount, setTmOfferAmount] = useState('')
  const [tmOfferFeedback, setTmOfferFeedback] = useState<TransferOfferResult | null>(null)
  const [tmOfferBusy, setTmOfferBusy] = useState(false)
  const [tmRespondBusy, setTmRespondBusy] = useState<string | null>(null)
  const [seasonStatsHistory, setSeasonStatsHistory] = useState<CareerSeasonSummary[]>([])
  const [selectedStatsSeason, setSelectedStatsSeason] = useState<number | null>(null)
  const [seasonStatsLoading, setSeasonStatsLoading] = useState(false)

  const titularesCount = useMemo(
    () => slots.filter((slot) => slot.playerId !== null).length,
    [slots]
  )

  const slotsByZone = useMemo(() => {
    const zoneOrder: SlotZone[] = ['ATA', 'MEI', 'DEF', 'GOL']
    return zoneOrder.map((zone) => ({
      zone,
      entries: slots
        .map((slot, idx) => ({ slot, idx }))
        .filter(({ slot }) => slot.zone === zone),
    }))
  }, [slots])

  const playerById = useMemo(() => {
    const map = new Map<string, SquadRow>()
    squad.forEach((player) => map.set(player.id, player))
    return map
  }, [squad])

  const energyById = useMemo(() => {
    const map = new Map<string, number>()
    squad.forEach((player) => map.set(player.id, playerEnergies[player.id] ?? 100))
    return map
  }, [playerEnergies, squad])

  const baseOvrById = useMemo(() => {
    const map = new Map<string, number>()
    squad.forEach((player) => map.set(player.id, computeBaseOvr(player)))
    return map
  }, [squad])

  const starterIds = useMemo(() => {
    const ids = new Set<string>()
    slots.forEach((slot) => {
      if (slot.playerId) ids.add(slot.playerId)
    })
    return ids
  }, [slots])

  const benchIds = useMemo(() => {
    const ids = new Set<string>()
    benchSlots.forEach((slot) => {
      if (slot.playerId) ids.add(slot.playerId)
    })
    return ids
  }, [benchSlots])

  // useDeferredValue para que a lista de jogadores não bloquear slots ao atualizar
  const deferredSquad = useDeferredValue(squad)

  const filteredSquad = useMemo(() => {
    const rows = deferredSquad.filter((player) => {
      if (debouncedFilterPosition !== 'all') {
        if (debouncedFilterPosition === 'LAT') {
          if (player.position !== 'LAT-E' && player.position !== 'LAT-D') return false
        } else if (debouncedFilterPosition === 'ATA') {
          if (!['ATA', 'SA', 'PNT-E', 'PNT-D'].includes(player.position)) return false
        } else if (debouncedFilterPosition === 'MEI') {
          if (!['MEI', 'MEI-A', 'VOL'].includes(player.position)) return false
        } else if (!player.position.startsWith(debouncedFilterPosition)) {
          return false
        }
      }

      const energy = energyById.get(player.id) ?? 100
      if (debouncedFilterEnergy === 'high' && energy < 70) return false
      if (debouncedFilterEnergy === 'medium' && (energy < 40 || energy >= 70)) return false
      if (debouncedFilterEnergy === 'low' && energy >= 40) return false

      return true
    })

    rows.sort((left, right) => {
      const leftEnergy = energyById.get(left.id) ?? 100
      const rightEnergy = energyById.get(right.id) ?? 100

      const result = (() => {
        switch (sortColumn) {
          case 'name':
            return compareText(left.name, right.name)
          case 'age':
            return compareNumber(left.age ?? -1, right.age ?? -1)
          case 'position':
            return compareText(left.position, right.position)
          case 'energy':
            return compareNumber(leftEnergy, rightEnergy)
          case 'overall':
            return compareNumber(baseOvrById.get(left.id) ?? 0, baseOvrById.get(right.id) ?? 0)
          case 'speed':
            return compareNumber(left.speed, right.speed)
          case 'shooting':
            return compareNumber(left.shooting, right.shooting)
          case 'passing':
            return compareNumber(left.passing, right.passing)
          case 'dribbling':
            return compareNumber(left.dribbling, right.dribbling)
          case 'defense':
            return compareNumber(left.defense, right.defense)
          case 'stamina':
            return compareNumber(left.stamina, right.stamina)
          case 'nationality':
            return compareText(left.nationality, right.nationality)
          case 'marketValue':
            return compareNumber(left.marketValue ?? -1, right.marketValue ?? -1)
          default:
            return 0
        }
      })()

      return sortDirection === 'asc' ? result : -result
    })

    return rows
  }, [baseOvrById, energyById, debouncedFilterEnergy, debouncedFilterPosition, sortColumn, sortDirection, deferredSquad])

  const shouldVirtualizeSquad = filteredSquad.length > SQUAD_VIRTUALIZATION_THRESHOLD
  const squadVirtualizer = useVirtualizer({
    count: filteredSquad.length,
    getScrollElement: () => squadScrollRef.current,
    estimateSize: () => SQUAD_ROW_HEIGHT,
    overscan: SQUAD_VIRTUALIZATION_OVERSCAN,
  })

  const slotDropdownOptionsByIndex = useMemo(
    () =>
      slots.map((slot, idx) => {
        const availablePlayers = squad.filter((player) => !starterIds.has(player.id) || player.id === slot.playerId)
        const sortedByReadiness = [...availablePlayers].sort(
          (a, b) =>
            computeReadinessOvr(b, energyById.get(b.id) ?? 100) -
            computeReadinessOvr(a, energyById.get(a.id) ?? 100)
        )

        const compatible = sortedByReadiness.filter((player) => isPositionInZone(slot.zone, player.position))
        const others = sortedByReadiness.filter((player) => !isPositionInZone(slot.zone, player.position))

        return {
          idx,
          slotLabel: getSlotLabelForIndex(formation, idx, slot.zone),
          compatible,
          others,
          sortedPlayers: [...compatible, ...others],
        }
      }),
    [energyById, formation, slots, squad, starterIds]
  )

  const tmLeagueOptions = useMemo(() => {
    if (!tmCatalog) return []
    return tmCatalog.leagues.filter((league) => !tmFilterCountry || league.country === tmFilterCountry)
  }, [tmCatalog, tmFilterCountry])

  const tmTeamOptions = useMemo(() => {
    if (!tmCatalog) return []
    return tmCatalog.teams.filter((team) => !tmFilterLeague || team.leagueId === tmFilterLeague)
  }, [tmCatalog, tmFilterLeague])

  // Debounce filter changes
  useEffect(() => {
    if (filterPositionTimerRef.current) clearTimeout(filterPositionTimerRef.current)
    filterPositionTimerRef.current = setTimeout(() => {
      setDebouncedFilterPosition(filterPosition)
    }, 300)
    return () => {
      if (filterPositionTimerRef.current) clearTimeout(filterPositionTimerRef.current)
    }
  }, [filterPosition])

  useEffect(() => {
    if (filterEnergyTimerRef.current) clearTimeout(filterEnergyTimerRef.current)
    filterEnergyTimerRef.current = setTimeout(() => {
      setDebouncedFilterEnergy(filterEnergy)
    }, 300)
    return () => {
      if (filterEnergyTimerRef.current) clearTimeout(filterEnergyTimerRef.current)
    }
  }, [filterEnergy])

  const handleSquadSort = useCallback((column: SquadSortColumn) => {
    setSortColumn((current) => {
      if (current === column) {
        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
        return current
      }

      setSortDirection(column === 'name' || column === 'position' || column === 'nationality' ? 'asc' : 'desc')
      return column
    })
  }, [])

  const sortMarker = useCallback((column: SquadSortColumn) => {
    if (sortColumn !== column) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }, [sortColumn, sortDirection])

  const handleApplyTransferMarketFilters = () => {
    setTmPage(1)
    setTmAppliedCountry(tmFilterCountry)
    setTmAppliedLeague(tmFilterLeague)
    setTmAppliedClub(tmFilterClub)
    setTmAppliedName(tmFilterName)
    setTmAppliedPos(tmFilterPos)
    setTmAppliedOvrMin(tmFilterOvrMin)
    setTmAppliedOvrMax(tmFilterOvrMax)
    setTmAppliedAgeMin(tmFilterAgeMin)
    setTmAppliedAgeMax(tmFilterAgeMax)
    setTmAppliedValMin(tmFilterValMin)
    setTmAppliedValMax(tmFilterValMax)
    setTmAppliedSpeedMin(tmFilterSpeedMin)
    setTmAppliedSpeedMax(tmFilterSpeedMax)
    setTmAppliedShootingMin(tmFilterShootingMin)
    setTmAppliedShootingMax(tmFilterShootingMax)
    setTmAppliedPassingMin(tmFilterPassingMin)
    setTmAppliedPassingMax(tmFilterPassingMax)
    setTmAppliedDribblingMin(tmFilterDribblingMin)
    setTmAppliedDribblingMax(tmFilterDribblingMax)
    setTmAppliedDefenseMin(tmFilterDefenseMin)
    setTmAppliedDefenseMax(tmFilterDefenseMax)
    setTmAppliedStaminaMin(tmFilterStaminaMin)
    setTmAppliedStaminaMax(tmFilterStaminaMax)
  }

  const buildTransferMarketQuery = (page = tmPage): TransferMarketQuery => ({
    page,
    pageSize: TM_PAGE_SIZE,
    country: tmAppliedCountry || undefined,
    leagueId: tmAppliedLeague || undefined,
    teamId: tmAppliedClub || undefined,
    name: tmAppliedName || undefined,
    position: tmAppliedPos || undefined,
    ovrMin: tmAppliedOvrMin ? Number(tmAppliedOvrMin) : undefined,
    ovrMax: tmAppliedOvrMax ? Number(tmAppliedOvrMax) : undefined,
    ageMin: tmAppliedAgeMin ? Number(tmAppliedAgeMin) : undefined,
    ageMax: tmAppliedAgeMax ? Number(tmAppliedAgeMax) : undefined,
    valueMin: tmAppliedValMin ? Math.round(Number(tmAppliedValMin) * 1_000_000) : undefined,
    valueMax: tmAppliedValMax ? Math.round(Number(tmAppliedValMax) * 1_000_000) : undefined,
    speedMin: tmAppliedSpeedMin ? Number(tmAppliedSpeedMin) : undefined,
    speedMax: tmAppliedSpeedMax ? Number(tmAppliedSpeedMax) : undefined,
    shootingMin: tmAppliedShootingMin ? Number(tmAppliedShootingMin) : undefined,
    shootingMax: tmAppliedShootingMax ? Number(tmAppliedShootingMax) : undefined,
    passingMin: tmAppliedPassingMin ? Number(tmAppliedPassingMin) : undefined,
    passingMax: tmAppliedPassingMax ? Number(tmAppliedPassingMax) : undefined,
    dribblingMin: tmAppliedDribblingMin ? Number(tmAppliedDribblingMin) : undefined,
    dribblingMax: tmAppliedDribblingMax ? Number(tmAppliedDribblingMax) : undefined,
    defenseMin: tmAppliedDefenseMin ? Number(tmAppliedDefenseMin) : undefined,
    defenseMax: tmAppliedDefenseMax ? Number(tmAppliedDefenseMax) : undefined,
    staminaMin: tmAppliedStaminaMin ? Number(tmAppliedStaminaMin) : undefined,
    staminaMax: tmAppliedStaminaMax ? Number(tmAppliedStaminaMax) : undefined,
  })



  useEffect(() => {
    const loadCareer = async () => {
      setBusy(true)

      try {
        const cached = await getCareerSnapshot()
        setSnapshot(cached)

        const [currentSquad, savedLineup, energies] = await Promise.all([
          getPlayerTeamSquad(),
          getLineup().catch(() => ({ starters: [], bench: [] })),
          getPlayerEnergies().catch(() => ({})),
        ])

        const loadedSlots = buildSlotsWithSavedLineup(formation, savedLineup)
        const orderedSquad = [...currentSquad]
          .map((player) => ({ ...player, status: 'Reserva' as SquadStatus }))
          .sort((a, b) => computeBaseOvr(b) - computeBaseOvr(a))
        const starterIds = new Set(
          loadedSlots
            .map((slot) => slot.playerId)
            .filter((id): id is string => id !== null)
        )
        const benchFromSave = savedLineup.bench
          .filter((id) => !starterIds.has(id))

        setSquad(orderedSquad)
        setSlots(loadedSlots)
        setSavedSlots(loadedSlots.map((slot) => ({ ...slot })))
        setBenchSlots(buildBenchSlotsWithIds(benchFromSave))
        setIsDirty(false)
        setPlayerEnergies(energies)

        setStatus(`Carreira carregada: rodada ${cached.currentRound}/${cached.totalRounds}`)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Nenhuma carreira ativa')
      } finally {
        setBusy(false)
      }
    }

    void loadCareer()
  }, [])

  // Recarregar lineup quando trocar de time (transferência ou load de save)
  useEffect(() => {
    if (!snapshot) return

    const reloadLineupForNewTeam = async () => {
      try {
        const [currentSquad, savedLineup, energies] = await Promise.all([
          getPlayerTeamSquad(),
          getLineup().catch(() => ({ starters: [], bench: [] })),
          getPlayerEnergies().catch(() => ({})),
        ])

        const loadedSlots = buildSlotsWithSavedLineup(formation, savedLineup)
        const orderedSquad = [...currentSquad]
          .map((player) => ({ ...player, status: 'Reserva' as SquadStatus }))
          .sort((a, b) => computeBaseOvr(b) - computeBaseOvr(a))
        const starterIds = new Set(
          loadedSlots
            .map((slot) => slot.playerId)
            .filter((id): id is string => id !== null)
        )
        const benchFromSave = savedLineup.bench
          .filter((id) => !starterIds.has(id))

        setSquad(orderedSquad)
        setSlots(loadedSlots)
        setSavedSlots(loadedSlots.map((slot) => ({ ...slot })))
        setBenchSlots(buildBenchSlotsWithIds(benchFromSave))
        setIsDirty(false)
        setPlayerEnergies(energies)
      } catch (error) {
        console.error('Erro ao recarregar lineup:', error)
      }
    }

    void reloadLineupForNewTeam()
  }, [snapshot?.playerTeamId, snapshot?.playerTeamBudget, formation])

  useEffect(() => {
    if (liveState !== 'running') return

    if (liveMinute >= 90) {
      setLiveState('done')
      return
    }

    // Pausa automática no intervalo (45')
    if (liveMinute === 45) {
      setLiveState('paused')
      setStatus('Intervalo - ajuste tatica e escalacao.')
      return
    }

    liveTimerRef.current = setTimeout(() => {
      setLiveMinute((current) => current + 1)
    }, SPEED_DELAYS[simSpeed])

    return () => {
      if (liveTimerRef.current) {
        clearTimeout(liveTimerRef.current)
        liveTimerRef.current = null
      }
    }
  }, [liveMinute, liveState, simSpeed])

  // Verificar demissão APÓS a partida terminar
  useEffect(() => {
    if (liveState === 'done' && dismissedAfterMatch && snapshot) {
      // Pequeno delay para o usuário ver o resultado antes da mensagem
      const timer = setTimeout(() => {
        alert(`Você foi DEMITIDO! Sua moral caiu para ${snapshot.morale}% e a diretoria perdeu a confiança no seu trabalho.`)
        navigate('/coach-transfer', { replace: true })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [liveState, dismissedAfterMatch, snapshot, navigate])

  // Transfer Market: carregar ofertas recebidas para exibir badge no menu
  useEffect(() => {
    if (!snapshot) return

    void (async () => {
      try {
        const offers = await listAiPlayerTransferOffers()
        setTmAiOffers(offers)
      } catch (err) {
        console.error('Erro ao carregar propostas recebidas:', err)
      }
    })()
  }, [snapshot?.currentRound, snapshot?.currentSeason, snapshot?.playerTeamId])

  useEffect(() => {
    if (activeTab !== 'estatisticas') return

    void (async () => {
      setSeasonStatsLoading(true)
      try {
        const history = await listCareerSeasonStatistics()
        setSeasonStatsHistory(history)
        setSelectedStatsSeason((current) => {
          if (current !== null && history.some((item) => item.season === current)) {
            return current
          }
          return history[0]?.season ?? null
        })
      } catch (err) {
        console.error('Erro ao carregar histórico por temporada:', err)
      } finally {
        setSeasonStatsLoading(false)
      }
    })()
  }, [activeTab, snapshot?.currentSeason])

  // Transfer Market: catálogo e painéis auxiliares
  useEffect(() => {
    if (activeTab !== 'mercado') return
    void (async () => {
      try {
        const [activity, catalog] = await Promise.all([
          listAiMarketRoundActivity(),
          listTransferMarketCatalog(),
        ])
        setTmAiActivity(activity)
        setTmCatalog(catalog)
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares do mercado:', err)
      }
    })()
  }, [activeTab])

  // Transfer Market: lista paginada + filtros server-side
  useEffect(() => {
    if (activeTab !== 'mercado') return

    void (async () => {
      setTmLoading(true)
      try {
        const page = await listTransferMarket(buildTransferMarketQuery())

        setTmPlayers(page.items)
        setTmTotalPages(page.totalPages)
        setTmTotalPlayers(page.total)
      } catch (err) {
        console.error('Erro ao carregar página do mercado:', err)
      } finally {
        setTmLoading(false)
      }
    })()
  }, [
    activeTab,
    tmPage,
    tmAppliedCountry,
    tmAppliedLeague,
    tmAppliedClub,
    tmAppliedName,
    tmAppliedPos,
    tmAppliedOvrMin,
    tmAppliedOvrMax,
    tmAppliedAgeMin,
    tmAppliedAgeMax,
    tmAppliedValMin,
    tmAppliedValMax,
    tmAppliedSpeedMin,
    tmAppliedSpeedMax,
    tmAppliedShootingMin,
    tmAppliedShootingMax,
    tmAppliedPassingMin,
    tmAppliedPassingMax,
    tmAppliedDribblingMin,
    tmAppliedDribblingMax,
    tmAppliedDefenseMin,
    tmAppliedDefenseMax,
    tmAppliedStaminaMin,
    tmAppliedStaminaMax,
  ])

  useEffect(() => {
    if (liveState !== 'running' || !focusMatch) return

    const minuteEvents = focusMatch.events.filter((event) => event.minute === liveMinute)
    if (minuteEvents.length === 0) return

    setLiveEvents((current) => [...current, ...minuteEvents])

    const homeGoals = minuteEvents.filter(
      (event) => event.eventType === 'goal' && event.teamSide === 'home'
    ).length
    const awayGoals = minuteEvents.filter(
      (event) => event.eventType === 'goal' && event.teamSide === 'away'
    ).length

    if (homeGoals > 0) {
      setLiveHomeGoals((current) => current + homeGoals)
    }
    if (awayGoals > 0) {
      setLiveAwayGoals((current) => current + awayGoals)
    }
  }, [focusMatch, liveMinute, liveState])

  useEffect(() => {
    if (liveState !== 'done') return

    const result = pendingResult.current
    if (!result) return

    setSnapshot(result.snapshot)
    setLastRoundMatches(result.matches)
    setSlots(savedSlots.map((slot) => ({ ...slot })))
    setSubsUsed(0)
    setSubWindowsUsed(0)
    setSubsInCurrentPause(0)
    setSubOutSlotIdx(null)
    setSubInPlayerId('')
    setRecentSubstitution(null)
    setIsDirty(false)
    if (result.playerEnergyAfter) setPlayerEnergies(result.playerEnergyAfter)
    setStatus(`Rodada ${result.playedRound} concluida.`)
    setBusy(false)
    pendingResult.current = null
  }, [liveState, savedSlots])

  useEffect(() => {
    if (!recentSubstitution) return

    const timer = setTimeout(() => {
      setRecentSubstitution(null)
    }, 2800)

    return () => clearTimeout(timer)
  }, [recentSubstitution])

  useEffect(() => {
    const titularIds = new Set(slots.map((slot) => slot.playerId).filter((id): id is string => id !== null))
    const squadIds = new Set(squad.map((player) => player.id))

    setBenchSlots((current) => {
      const used = new Set<string>()
      const sanitizedIds = current
        .map((slot) => slot.playerId)
        .filter((id): id is string => {
          if (!id) return false
          if (!squadIds.has(id) || titularIds.has(id) || used.has(id)) return false
          used.add(id)
          return true
        })

      return buildBenchSlotsWithIds(sanitizedIds)
    })
  }, [slots, squad])

  const skipLive = () => {
    if (!focusMatch) return

    setLiveEvents(focusMatch.events)
    setLiveHomeGoals(focusMatch.homeGoals)
    setLiveAwayGoals(focusMatch.awayGoals)
    setLiveMinute(90)
    setLiveState('done')
  }

  const pauseLive = async () => {
    if (liveState !== 'running') return

    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current)
      liveTimerRef.current = null
    }

    setLiveState('paused')
    setSubsInCurrentPause(0)
    setStatus('Partida pausada. Ajuste tatica e escalacao e retome quando quiser.')
    
    // Atualiza as energias dos jogadores em tempo real
    try {
      const energies = await getPlayerEnergies()
      setPlayerEnergies(energies)
    } catch (error) {
      console.warn('Erro ao atualizar energias:', error)
    }
  }

  const resumeLive = () => {
    if (liveState !== 'paused') return

    const intervalPause = liveMinute >= 45 && liveMinute < 46
    if (subsInCurrentPause > 0 && !intervalPause) {
      setSubWindowsUsed((v) => v + 1)
    }

    // Se está no intervalo (minuto 45), avança para 46 ao retomar
    if (liveMinute === 45) {
      setLiveMinute(46)
    }

    setSubsInCurrentPause(0)
    setLiveState('running')
    setStatus(`Rodada ${playedRound} em andamento...`)
  }

  const applySubstitution = () => {
    // Substituição rápida durante a partida (sem pausar)
    const intervalPause = liveMinute >= 45 && liveMinute < 46
    const needsNewWindow = subsInCurrentPause === 0

    if (subsUsed >= 5) {
      setStatus('Limite atingido: maximo de 5 substituicoes.')
      return
    }

    if (!intervalPause && needsNewWindow && subWindowsUsed >= 3) {
      setStatus('Limite atingido: maximo de 3 janelas de substituicao.')
      return
    }

    if (subOutSlotIdx === null || !subInPlayerId) {
      setStatus('Selecione quem sai e quem entra.')
      return
    }

    const outPlayerId = slots[subOutSlotIdx]?.playerId
    if (!outPlayerId) {
      setStatus('O slot selecionado para sair esta vazio.')
      return
    }

    const outPlayer = squad.find((p) => p.id === outPlayerId)
    const inPlayer = squad.find((p) => p.id === subInPlayerId)

    if (!benchSelectionIds.includes(subInPlayerId)) {
      setStatus('Esse atleta nao esta elegivel no banco de reservas.')
      return
    }

    const inAlreadyPlaying = slots.some((slot) => slot.playerId === subInPlayerId)
    if (inAlreadyPlaying) {
      setStatus('Jogador escolhido para entrar ja esta em campo.')
      return
    }

    setSlots((curr) => curr.map((slot, idx) => (
      idx === subOutSlotIdx ? { ...slot, playerId: subInPlayerId } : slot
    )))
    setSubsUsed((v) => v + 1)
    setSubsInCurrentPause((v) => v + 1)
    setRecentSubstitution({
      slotIdx: subOutSlotIdx,
      zone: slots[subOutSlotIdx].zone,
      outPlayerName: outPlayer?.name ?? 'Saiu',
      inPlayerName: inPlayer?.name ?? 'Entrou',
      minute: liveMinute,
    })
    setSubOutSlotIdx(null)
    setSubInPlayerId('')
    
    // Incrementa janela se necessário
    if (!intervalPause && needsNewWindow) {
      setSubWindowsUsed((v) => v + 1)
    }
    
    const nextWindowCount = !intervalPause && needsNewWindow ? subWindowsUsed + 1 : subWindowsUsed
    setStatus(`Substituicao feita (${subsUsed + 1}/5 atletas, ${nextWindowCount}/3 janelas).`)
  }

  const handleInMatchSubstitution = () => {
    if (liveState !== 'paused') return

    const intervalPause = liveMinute >= 45 && liveMinute < 46
    const needsNewWindow = subsInCurrentPause === 0

    if (subsUsed >= 5) {
      setStatus('Limite atingido: maximo de 5 substituicoes.')
      return
    }

    if (!intervalPause && needsNewWindow && subWindowsUsed >= 3) {
      setStatus('Limite atingido: maximo de 3 janelas de substituicao.')
      return
    }

    if (subOutSlotIdx === null || !subInPlayerId) {
      setStatus('Selecione quem sai e quem entra.')
      return
    }

    if (!benchSelectionIds.includes(subInPlayerId)) {
      setStatus('Esse atleta nao esta elegivel no banco de reservas.')
      return
    }

    const outPlayerId = slots[subOutSlotIdx]?.playerId
    if (!outPlayerId) {
      setStatus('O slot selecionado para sair esta vazio.')
      return
    }

    const outPlayer = squad.find((p) => p.id === outPlayerId)
    const inPlayer = squad.find((p) => p.id === subInPlayerId)

    const inAlreadyPlaying = slots.some((slot) => slot.playerId === subInPlayerId)
    if (inAlreadyPlaying) {
      setStatus('Jogador escolhido para entrar ja esta em campo.')
      return
    }

    setSlots((curr) => curr.map((slot, idx) => (
      idx === subOutSlotIdx ? { ...slot, playerId: subInPlayerId } : slot
    )))
    setSubsUsed((v) => v + 1)
    setSubsInCurrentPause((v) => v + 1)
    setRecentSubstitution({
      slotIdx: subOutSlotIdx,
      zone: slots[subOutSlotIdx].zone,
      outPlayerName: outPlayer?.name ?? 'Saiu',
      inPlayerName: inPlayer?.name ?? 'Entrou',
      minute: liveMinute,
    })
    setSubOutSlotIdx(null)
    setSubInPlayerId('')
    const nextWindowCount = !intervalPause && needsNewWindow ? subWindowsUsed + 1 : subWindowsUsed
    setStatus(`Substituicao feita (${subsUsed + 1}/5 atletas, ${nextWindowCount}/3 janelas).`)
  }

  const applyBenchDrop = (targetIdx: number, playerId: string | null) => {
    if (!playerId) return
    if (!squad.some((player) => player.id === playerId)) return

    setSlots((curr) =>
      curr.map((slot) =>
        slot.playerId === playerId ? { ...slot, playerId: null } : slot
      )
    )

    setBenchSlots((curr) => {
      const next = curr.map((slot) => ({ ...slot }))
      for (let i = 0; i < next.length; i += 1) {
        if (next[i].playerId === playerId) {
          next[i].playerId = null
        }
      }
      next[targetIdx] = { playerId }
      return next
    })
  }

  const handleAutoLineup = () => {
    const remaining = [...squad].sort((a, b) => computeReadinessOvr(b, playerEnergies[b.id] ?? 100) - computeReadinessOvr(a, playerEnergies[a.id] ?? 100))
    const picked = new Set<string>()

    const pickBest = (candidates: SquadRow[]) => {
      if (candidates.length === 0) return null
      const best = [...candidates].sort((a, b) => computeReadinessOvr(b, playerEnergies[b.id] ?? 100) - computeReadinessOvr(a, playerEnergies[a.id] ?? 100))[0]
      picked.add(best.id)
      return best
    }

    const nextSlots = FORMATION_SLOTS[formation].map((zone, index) => {
      let chosen: SquadRow | null = null

      // Identificamos o slot exato da formação atual (ex: 'LB', 'RB', 'ST')
      const slotLabel = FORMATION_SCHEMAS[formation][index] as UiSlotLabel
      const preferredPositions = EXACT_POSITION_MAP[slotLabel] || []

      if (zone === 'GOL') {
        chosen = pickBest(remaining.filter((player) => !picked.has(player.id) && isGoalkeeperPosition(player.position)))
      } else {
        // 1. Tentativa primária: buscar a posição exata com base no slot (respeita lateralidade)
        chosen = pickBest(
          remaining.filter((player) => {
            if (picked.has(player.id)) return false
            const playerCanonical = toPlayerPosition(player.position)
            return playerCanonical !== null && preferredPositions.includes(playerCanonical)
          })
        )

        // 2. Fallback por zona se não houver o especialista ou se ele já foi escalado
        if (!chosen) {
          for (const line of OUTFIELD_FALLBACK[zone]) {
            const lineCandidates = remaining.filter((player) => {
              if (picked.has(player.id) || isGoalkeeperPosition(player.position)) return false
              return classifyOutfieldLine(player.position) === line
            })

            const sidePreferred = lineCandidates.filter((player) =>
              isSideCompatibleWithSlot(player.position, slotLabel)
            )

            chosen = pickBest(sidePreferred)
            if (!chosen) {
              chosen = pickBest(lineCandidates)
            }
            if (chosen) break
          }
        }

        // 3. Fallback extremo: qualquer jogador de linha restante
        if (!chosen) {
          chosen = pickBest(
            remaining.filter((player) => !picked.has(player.id) && !isGoalkeeperPosition(player.position))
          )
        }
      }

      return { zone, playerId: chosen?.id ?? null }
    })

    const hasGoalkeeper = nextSlots.some((slot) => slot.zone === 'GOL' && slot.playerId !== null)
    const starters = new Set(nextSlots.map((slot) => slot.playerId).filter((id): id is string => id !== null))
    const reservePool = squad
      .filter((player) => !starters.has(player.id))
      .sort((a, b) => computeReadinessOvr(b, playerEnergies[b.id] ?? 100) - computeReadinessOvr(a, playerEnergies[a.id] ?? 100))

    const reserveIds: string[] = []

    const reserveGoalkeeper = reservePool.find((player) => isGoalkeeperPosition(player.position))
    if (reserveGoalkeeper) {
      reserveIds.push(reserveGoalkeeper.id)
    }

    const outfieldReserves = reservePool
      .filter((player) => !isGoalkeeperPosition(player.position) && !reserveIds.includes(player.id))
      .slice(0, 7 - reserveIds.length)
      .map((player) => player.id)

    reserveIds.push(...outfieldReserves)

    if (reserveIds.length < 7) {
      const remainingAny = reservePool
        .filter((player) => !reserveIds.includes(player.id))
        .slice(0, 7 - reserveIds.length)
        .map((player) => player.id)
      reserveIds.push(...remainingAny)
    }

    // Atualizar slots IMEDIATAMENTE (não deferred)
    setSlots(nextSlots)
    setSelectedSlotIdx(null)
    setSubOutSlotIdx(null)
    setSubInPlayerId('')
    setBenchSlots(buildBenchSlotsWithIds(reserveIds))
    setStatus(hasGoalkeeper 
      ? `Escalação automática aplicada: titulares definidos e banco preenchido (${reserveIds.length}/7).`
      : `Escalação automática aplicada (titulares + banco ${reserveIds.length}/7). Sem goleiro no elenco: preencha manualmente o slot GOL.`)
  }

  const handleFormationChange = (newFormation: Formation) => {
    const currentStarterIds = slots
      .map((slot) => slot.playerId)
      .filter((id): id is string => id !== null)

    const currentStarters = currentStarterIds
      .map((id) => squad.find((player) => player.id === id) ?? null)
      .filter((player): player is SquadRow => player !== null)

    const pickedIds = new Set<string>()

    const pickBest = (candidates: SquadRow[]) => {
      if (candidates.length === 0) return null
      const best = [...candidates].sort((a, b) => computeReadinessOvr(b, playerEnergies[b.id] ?? 100) - computeReadinessOvr(a, playerEnergies[a.id] ?? 100))[0]
      pickedIds.add(best.id)
      return best
    }

    const nextSlots = FORMATION_SLOTS[newFormation].map((zone, index) => {
      const slotLabel = FORMATION_SCHEMAS[newFormation][index]
      const preferredPositions = EXACT_POSITION_MAP[slotLabel] ?? []
      let chosen: SquadRow | null = null

      chosen = pickBest(
        currentStarters.filter((player) => {
          if (pickedIds.has(player.id)) return false
          const canonical = toPlayerPosition(player.position)
          return canonical !== null && preferredPositions.includes(canonical)
        })
      )

      if (!chosen && zone === 'GOL') {
        chosen = pickBest(
          currentStarters.filter((player) => !pickedIds.has(player.id) && isGoalkeeperPosition(player.position))
        )
      }

      if (!chosen && zone !== 'GOL') {
        const zoneCandidates = currentStarters.filter((player) => {
          if (pickedIds.has(player.id) || isGoalkeeperPosition(player.position)) return false
          return classifyOutfieldLine(player.position) === zone
        })

        const sidePreferred = zoneCandidates.filter((player) =>
          isSideCompatibleWithSlot(player.position, slotLabel)
        )

        chosen = pickBest(sidePreferred)
        if (!chosen) {
          chosen = pickBest(zoneCandidates)
        }
      }

      return { zone, playerId: chosen?.id ?? null }
    })

    const finalSlots = nextSlots.map((slot, index) => {
      if (slot.playerId) return slot

      const slotLabel = FORMATION_SCHEMAS[newFormation][index]
      const preferredPositions = EXACT_POSITION_MAP[slotLabel] ?? []
      let chosen: SquadRow | null = null

      if (slot.zone === 'GOL') {
        chosen = pickBest(squad.filter((player) => !pickedIds.has(player.id) && isGoalkeeperPosition(player.position)))
      } else {
        chosen = pickBest(
          squad.filter((player) => {
            if (pickedIds.has(player.id)) return false
            const canonical = toPlayerPosition(player.position)
            return canonical !== null && preferredPositions.includes(canonical)
          })
        )

        if (!chosen) {
          const zoneCandidates = squad.filter((player) => {
            if (pickedIds.has(player.id) || isGoalkeeperPosition(player.position)) return false
            return classifyOutfieldLine(player.position) === slot.zone
          })

          const sidePreferred = zoneCandidates.filter((player) =>
            isSideCompatibleWithSlot(player.position, slotLabel)
          )

          chosen = pickBest(sidePreferred)
          if (!chosen) {
            chosen = pickBest(zoneCandidates)
          }
        }

        if (!chosen) {
          chosen = pickBest(squad.filter((player) => !pickedIds.has(player.id) && !isGoalkeeperPosition(player.position)))
        }
      }

      return { ...slot, playerId: chosen?.id ?? null }
    })

    const hasGoalkeeper = finalSlots.some((slot) => slot.zone === 'GOL' && slot.playerId !== null)
    const starters = new Set(finalSlots.map((slot) => slot.playerId).filter((id): id is string => id !== null))
    const reservePool = squad
      .filter((player) => !starters.has(player.id))
      .sort((a, b) => computeReadinessOvr(b, playerEnergies[b.id] ?? 100) - computeReadinessOvr(a, playerEnergies[a.id] ?? 100))

    const reserveIds: string[] = []
    const reserveGoalkeeper = reservePool.find((player) => isGoalkeeperPosition(player.position))
    if (reserveGoalkeeper) {
      reserveIds.push(reserveGoalkeeper.id)
    }

    const outfieldReserves = reservePool
      .filter((player) => !isGoalkeeperPosition(player.position) && !reserveIds.includes(player.id))
      .slice(0, 7 - reserveIds.length)
      .map((player) => player.id)
    reserveIds.push(...outfieldReserves)

    if (reserveIds.length < 7) {
      const remainingAny = reservePool
        .filter((player) => !reserveIds.includes(player.id))
        .slice(0, 7 - reserveIds.length)
        .map((player) => player.id)
      reserveIds.push(...remainingAny)
    }

    setFormation(newFormation)
    setSlots(finalSlots)
    setSelectedSlotIdx(null)
    setSubOutSlotIdx(null)
    setSubInPlayerId('')
    setBenchSlots(buildBenchSlotsWithIds(reserveIds))

    if (!hasGoalkeeper) {
      setStatus(`Formação ${newFormation} aplicada com realocação inteligente. Sem goleiro disponível para titular.`)
      return
    }

    setStatus(`Formação ${newFormation} aplicada com realocação inteligente dos titulares.`)
  }

  const handleClearLineup = () => {
    setSlots(buildSlotsWithLineup(formation, []))
    setSelectedSlotIdx(null)
    setSubOutSlotIdx(null)
    setSubInPlayerId('')
    setBenchSlots(emptyBenchSlots())
    setStatus('Elenco limpo. Titulares e banco foram esvaziados.')
  }

  const handleSaveLineup = async () => {
    const titularIds = slots
      .map((slot) => slot.playerId)
      .filter((id): id is string => id !== null)
    const starterSet = new Set(titularIds)
    const reserveIds = benchSlots
      .map((slot) => slot.playerId)
      .filter((id): id is string => id !== null && !starterSet.has(id))
    const startersPayload = slots
      .map((slot, idx) => ({ slot, idx }))
      .filter(({ slot }) => slot.playerId !== null)
      .map(({ slot, idx }) => ({
        playerId: slot.playerId as string,
        slotZone: slot.zone as ApiSlotZone,
        slotIndex: idx,
      }))

    const lineupToSave: SavedLineup = {
      starters: startersPayload,
      bench: reserveIds,
    }

    if (titularIds.length < 7) {
      setStatus('Minimo de 7 jogadores. Adicione mais atletas antes de salvar.')
      return
    }

    const golSlotFilled = slots.some((s) => s.zone === 'GOL' && s.playerId !== null)

    if (!golSlotFilled) {
      setStatus('O slot de goleiro precisa estar preenchido.')
      return
    }

    setBusy(true)

    try {
      await saveLineup(lineupToSave)
      setSavedSlots(slots.map((slot) => ({ ...slot })))
      setIsDirty(false)
      setStatus(`Escalacao salva com sucesso (${titularIds.length} titulares + ${reserveIds.length} reservas).`)
    } catch (error) {
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
          ? error.message
          : JSON.stringify(error)
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitOffer = async () => {
    if (!tmOfferPlayer || !tmOfferAmount) return
    setTmOfferBusy(true)
    try {
      const offerValueCents = Math.round(Number(tmOfferAmount) * 1_000_000)
      const result = await submitTransferOffer(tmOfferPlayer.playerId, offerValueCents)
      setTmOfferFeedback(result)
      if (result.result === 'accepted') {
        const newSnapshot = await getCareerSnapshot()
        setSnapshot(newSnapshot)
        const page = await listTransferMarket(buildTransferMarketQuery())
        setTmPlayers(page.items)
        setTmTotalPages(page.totalPages)
        setTmTotalPlayers(page.total)
      }
      setTmPlayers((prev) =>
        prev.map((p) =>
          p.playerId === tmOfferPlayer.playerId
            ? { ...p, attemptsUsed: result.attemptsUsed, isBlocked: result.result === 'blocked' || result.attemptsUsed >= 3 }
            : p
        )
      )
    } catch (err) {
      console.error('Erro ao enviar oferta:', err)
    } finally {
      setTmOfferBusy(false)
    }
  }

  const handleRespondAiOffer = async (playerId: string, accept: boolean) => {
    setTmRespondBusy(playerId)
    try {
      const newSnapshot = await respondAiPlayerTransferOffer(playerId, accept)
      setSnapshot(newSnapshot)
      setTmAiOffers((prev) => prev.filter((o) => o.playerId !== playerId))
      if (accept) {
        const page = await listTransferMarket(buildTransferMarketQuery())
        setTmPlayers(page.items)
        setTmTotalPages(page.totalPages)
        setTmTotalPlayers(page.total)
      }
    } catch (err) {
      console.error('Erro ao responder oferta IA:', err)
    } finally {
      setTmRespondBusy(null)
    }
  }

  const handleSimulateRound = async () => {
    if (!snapshot) return

    // Resetar flag de demissão ao iniciar nova rodada
    setDismissedAfterMatch(false)

    try {
      setBusy(true)
      const result = await simulateCareerRound(formation, playStyle)

      // Armazenar status de demissão para verificar APÓS a partida terminar
      setDismissedAfterMatch(result.dismissed)

      setLiveMinute(0)
      setLiveEvents([])
      setBgEvents([])
      setLiveHomeGoals(0)
      setLiveAwayGoals(0)
      setLiveState('idle')
      setSubsUsed(0)
      setSubWindowsUsed(0)
      setSubsInCurrentPause(0)
      setSubOutSlotIdx(null)
      setSubInPlayerId('')
      setRecentSubstitution(null)

      pendingResult.current = result
      const playerTeamId = result.snapshot.playerTeamId
      const allBgGoals = result.matches
        .filter(
          (match) =>
            match.homeTeamId !== playerTeamId &&
            match.awayTeamId !== playerTeamId
        )
        .flatMap((match) => {
          let homeGoals = 0
          let awayGoals = 0

          return [...match.events]
            .filter((event) => event.eventType === 'goal')
            .sort((a, b) => a.minute - b.minute)
            .map((event) => {
              if (event.teamSide === 'home') homeGoals += 1
              if (event.teamSide === 'away') awayGoals += 1

              return {
                minute: event.minute,
                homeTeamName: match.homeTeamName,
                awayTeamName: match.awayTeamName,
                homeGoals,
                awayGoals,
              }
            })
        })
        .sort((a, b) => a.minute - b.minute)

      setBgEvents(allBgGoals)
      setPlayedRound(result.playedRound)

      const playerMatch =
        result.matches.find(
          (match) =>
            match.homeTeamId === result.snapshot.playerTeamId ||
            match.awayTeamId === result.snapshot.playerTeamId
        ) ?? null

      setFocusMatch(playerMatch)

      if (simSpeed === 'instantaneo' || !playerMatch) {
        if (playerMatch) {
          setLiveEvents(playerMatch.events)
          setLiveHomeGoals(playerMatch.homeGoals)
          setLiveAwayGoals(playerMatch.awayGoals)
        }

        setLiveMinute(90)
        setSnapshot(result.snapshot)
        setLastRoundMatches(result.matches)
        if (result.playerEnergyAfter) setPlayerEnergies(result.playerEnergyAfter)
        setStatus(`Rodada ${result.playedRound} concluida.`)
        setLiveState('done')
        setBusy(false)
        pendingResult.current = null
        // Verificação de demissão será feita no useEffect
        return
      }

      setStatus(`Rodada ${result.playedRound} em andamento...`)
      setBusy(false)
      setLiveState('running')
    } catch (error) {
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
          ? error.message
          : JSON.stringify(error)
      setStatus(msg)
      setBusy(false)
    }
  }

  const handleAdvanceSeason = async () => {
    if (!snapshot) return

    try {
      setBusy(true)
      setStatus('Iniciando nova temporada...')
      const newSnapshot = await advanceToNextSeason()
      setSnapshot(newSnapshot)
      setLastRoundMatches([])
      setLiveState('idle')
      setStatus(`Temporada ${newSnapshot.currentSeason} iniciada! Boa sorte!`)
    } catch (error) {
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
          ? error.message
          : JSON.stringify(error)
      setStatus(`Erro: ${msg}`)
    } finally {
      setBusy(false)
    }
  }

  const queueDragPosition = useCallback((x: number, y: number) => {
    dragPosRef.current = { x, y }
  }, [])

  // Remover jogador do elenco (titulares ou banco)
  const handleRemovePlayerFromLineup = useCallback((playerId: string, isStarter: boolean, isBench: boolean) => {
    if (!isStarter && !isBench) return
    if (isStarter) {
      setSlots((curr) => curr.map((slot) => slot.playerId === playerId ? { ...slot, playerId: null } : slot))
    } else if (isBench) {
      setBenchSlots((curr) => curr.map((slot) => slot.playerId === playerId ? { playerId: null } : slot))
    }
  }, [])

  const startDrag = useCallback((source: { type: 'slot' | 'bench' | 'list'; idx: number; playerId: string }, x: number, y: number) => {
    setDragSource(source)
    dragPosRef.current = { x, y }
  }, [])

  useEffect(() => {
    if (savedSlots.length === 0) {
      setIsDirty(false)
      return
    }

    if (slots.length !== savedSlots.length) {
      setIsDirty(true)
      return
    }

    const changed = slots.some(
      (slot, idx) => slot.zone !== savedSlots[idx]?.zone || slot.playerId !== savedSlots[idx]?.playerId
    )
    setIsDirty(changed)
  }, [slots, savedSlots])

  useEffect(() => {
    if (!dragSource) return

    const onMove = (e: PointerEvent) => {
      queueDragPosition(e.clientX, e.clientY)
    }

    const onUp = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)

      const mark = () => {
        justDroppedRef.current = true
        setTimeout(() => { justDroppedRef.current = false }, 0)
      }

      // Procura slot de titular
      slotRefs.current.forEach((ref, targetIdx) => {
        if (!ref.contains(el)) return
        if (dragSource.type === 'slot' && targetIdx !== dragSource.idx) {
          // Troca dois titulares
          setSlots((curr) => {
            const next = [...curr]
            const temp = next[dragSource.idx].playerId
            next[dragSource.idx] = { ...next[dragSource.idx], playerId: next[targetIdx].playerId }
            next[targetIdx] = { ...next[targetIdx], playerId: temp }
            return next
          })
          mark()
        } else if (dragSource.type === 'list') {
          // Jogador da lista → slot titular
          setSlots((curr) => {
            const next = [...curr]
            const existingIdx = next.findIndex((s) => s.playerId === dragSource.playerId)
            if (existingIdx !== -1)
              next[existingIdx] = { ...next[existingIdx], playerId: next[targetIdx].playerId }
            next[targetIdx] = { ...next[targetIdx], playerId: dragSource.playerId }
            return next
          })
          mark()
        } else if (dragSource.type === 'bench') {
          // Reserva → slot titular: reserva entra no campo, titular anterior vai pro banco
          const displaced = slots[targetIdx]?.playerId ?? null
          setSlots((curr) => {
            const next = [...curr]
            next[targetIdx] = { ...next[targetIdx], playerId: dragSource.playerId }
            return next
          })
          setBenchSlots((curr) => {
            const next = curr.map((s) => ({ ...s }))
            next[dragSource.idx] = { playerId: displaced }
            return next
          })
          mark()
        }
      })

      // Procura slot de reserva
      benchRefs.current.forEach((ref, targetIdx) => {
        if (!ref.contains(el)) return
        if (dragSource.type === 'bench' && targetIdx !== dragSource.idx) {
          // Troca dois reservas
          setBenchSlots((curr) => {
            const next = curr.map((s) => ({ ...s }))
            const temp = next[dragSource.idx].playerId
            next[dragSource.idx] = { playerId: next[targetIdx].playerId }
            next[targetIdx] = { playerId: temp }
            return next
          })
          mark()
        } else if (dragSource.type !== 'bench') {
          // Titular ou lista → reserva
          applyBenchDrop(targetIdx, dragSource.playerId)
          mark()
        }
      })

      setDragSource(null)
      dragPosRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [applyBenchDrop, dragSource, queueDragPosition, slots])

  const handleTabChange = (tabKey: TabKey) => {
    if (tabKey === 'escalacao' && hasLiveMatchOngoing) {
      setStatus('O menu Elenco fica bloqueado durante a partida ao vivo. Use a pausa da aba Partida para ajustar o time.')
      return
    }

    if (activeTab === 'escalacao' && tabKey !== 'escalacao' && isDirty) {
      const shouldLeave = window.confirm(
        'Voce tem mudancas nao salvas no elenco. Deseja sair mesmo assim?'
      )

      if (!shouldLeave) return

      setSlots(savedSlots.map((slot) => ({ ...slot })))
      setSelectedSlotIdx(null)
      setIsDirty(false)
    }

    setActiveTab(tabKey)
  }

  const isLiveRunning = liveState === 'running'
  const isLivePaused = liveState === 'paused'
  const hasLiveMatchOngoing = liveState === 'running' || liveState === 'paused'
  const isHalftimePause = liveMinute >= 45 && liveMinute < 46
  const substitutionLocked =
    subsUsed >= 5 ||
    (subWindowsUsed >= 3 && !isHalftimePause && subsInCurrentPause === 0)
  const showLiveCard = focusMatch && (liveState === 'running' || liveState === 'paused' || liveState === 'done')
  const playerTeamIsHome = focusMatch?.homeTeamId === snapshot?.playerTeamId
  const currentResult = pendingResult.current
  const benchSelectionIds = useMemo(
    () => benchSlots.map((slot) => slot.playerId).filter((id): id is string => id !== null),
    [benchSlots]
  )
  const reservePlayers = useMemo(
    () =>
      squad
        .filter((player) => !starterIds.has(player.id))
        .sort(
          (a, b) =>
            computeReadinessOvr(b, energyById.get(b.id) ?? 100) -
            computeReadinessOvr(a, energyById.get(a.id) ?? 100)
        ),
    [energyById, squad, starterIds]
  )
  const eligibleBenchPlayers = useMemo(
    () => reservePlayers.filter((player) => benchSelectionIds.includes(player.id)),
    [benchSelectionIds, reservePlayers]
  )

  const playerTeamName = useMemo(() => {
    if (!snapshot) return ''
    const entry = snapshot.table.find((t) => t.teamId === snapshot.playerTeamId)
    return entry?.teamName ?? ''
  }, [snapshot])

  const playerTeamTableEntry = useMemo(() => {
    if (!snapshot) return null
    return snapshot.table.find((entry) => entry.teamId === snapshot.playerTeamId) ?? null
  }, [snapshot])

  const squadInsights = useMemo(() => {
    if (squad.length === 0) return null

    const withMarketValue = squad.filter((player) => (player.marketValue ?? 0) > 0)
    const totalOverall = squad.reduce((acc, player) => acc + computeBaseOvr(player), 0)
    const totalAge = squad.reduce((acc, player) => acc + (player.age ?? 0), 0)
    const totalEnergy = squad.reduce((acc, player) => acc + (playerEnergies[player.id] ?? 100), 0)
    const averageMarketValue =
      withMarketValue.length > 0
        ? withMarketValue.reduce((acc, player) => acc + (player.marketValue ?? 0), 0) / withMarketValue.length
        : 0

    const bestOverallPlayer = squad.reduce((best, current) =>
      computeBaseOvr(current) > computeBaseOvr(best) ? current : best
    )
    const highestValuePlayer = withMarketValue.length > 0
      ? withMarketValue.reduce((best, current) =>
          (current.marketValue ?? 0) > (best.marketValue ?? 0) ? current : best
        )
      : null

    return {
      averageOverall: Math.round(totalOverall / squad.length),
      averageAge: Math.round(totalAge / squad.length),
      averageEnergy: Math.round(totalEnergy / squad.length),
      averageMarketValue,
      bestOverallPlayer,
      highestValuePlayer,
      totalPlayers: squad.length,
    }
  }, [squad, playerEnergies])

  const selectedSeasonStats = useMemo(() => {
    if (seasonStatsHistory.length === 0 || selectedStatsSeason === null) return null
    return seasonStatsHistory.find((item) => item.season === selectedStatsSeason) ?? null
  }, [seasonStatsHistory, selectedStatsSeason])

  const currentLeagueTopScorers = useMemo(
    () => (snapshot?.currentLeagueTopScorers ?? []).slice(0, 20),
    [snapshot]
  )

  // Determinar cor da barra de moral baseada no risco de demissão
  const getMoraleBarColor = (morale: number) => {
    if (morale >= 50) return 'bg-success' // Verde - seguro
    if (morale >= 25) return 'bg-warning' // Amarelo - atenção
    if (morale >= 10) return 'bg-orange-500' // Laranja - perigo
    return 'bg-error' // Vermelho - crítico
  }

  return (
    <div className='min-h-svh bg-base-200 text-base-content'>
      <div className='flex min-h-svh'>
        <aside className='sticky top-0 h-svh w-[220px] shrink-0 border-r border-base-content/10 bg-base-300 px-3 py-6'>
          <h1 className='mb-4 px-2 text-2xl font-bold'>Carreira</h1>

          {snapshot && (
            <div className='mb-6 px-2 text-sm space-y-3'>
              <div className='opacity-70'>
                <span className='font-semibold text-primary'>Técnico: </span>
                <span className='truncate'>{snapshot.coachName}</span>
              </div>
              <div className='opacity-70'>
                <span className='font-semibold text-success'>Clube: </span>
                <span className='truncate'>{playerTeamName}</span>
              </div>
              <div className='opacity-70'>
                <span className='font-semibold text-info'>Orçamento: </span>
                <span>{formatTransferMoney(snapshot.playerTeamBudget, 1)}</span>
              </div>
              <div className='opacity-70'>
                <div className='mb-1'>
                  <span className='font-semibold text-warning'>Moral: </span>
                  <span>{snapshot.morale}%</span>
                </div>
                {/* Barra visual de moral */}
                <div className='w-full h-2 bg-base-content/10 rounded-full overflow-hidden'>
                  <div 
                    className={`h-full ${getMoraleBarColor(snapshot.morale)} transition-all duration-300`}
                    style={{ width: `${snapshot.morale}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <nav className='flex flex-col gap-2'>
            {MENU_ITEMS.map((item) => {
              const tabKey = item.key
              const isActive = tabKey !== null && activeTab === tabKey

              const handleClick = () => {
                if (item.label === 'Salvar Jogo') {
                  setShowSaveModal(true)
                } else if (tabKey !== null) {
                  handleTabChange(tabKey)
                }
              }

              return (
                <button
                  key={item.label}
                  type='button'
                  className={[
                    'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors',
                    item.comingSoon
                      ? 'cursor-not-allowed bg-base-200/50 opacity-45'
                      : tabKey === 'escalacao' && hasLiveMatchOngoing
                      ? 'cursor-not-allowed bg-base-200/50 opacity-45'
                      : isActive
                      ? 'bg-green-800 text-green-50'
                      : 'bg-base-200/70 hover:bg-base-100',
                  ].join(' ')}
                  onClick={handleClick}
                  disabled={item.comingSoon || (tabKey === 'escalacao' && hasLiveMatchOngoing)}
                >
                  <span className='text-base leading-none'>{item.icon}</span>
                  <span className='flex-1'>
                    {item.label}
                    {item.comingSoon ? ' (em breve)' : ''}
                  </span>
                  {item.key === 'mercado' && tmAiOffers.length > 0 && (
                    <span className='badge badge-warning badge-xs'>{tmAiOffers.length}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className='min-w-0 flex-1 p-6'>
          <div className='mx-auto flex max-w-screen-2xl flex-col gap-4'>
            <p className='rounded-sm border border-base-content/20 bg-base-300 p-3 text-sm'>{status}</p>

            {activeTab === 'partida' && (
              <>
                {/* Cabecalho: botao + velocidade */}
                <div className='flex flex-wrap items-center gap-3'>
                  {snapshot?.isSeasonEnded ? (
                    <button
                      type='button'
                      className='btn btn-success btn-lg'
                      onClick={() => void handleAdvanceSeason()}
                      disabled={busy}
                    >
                      🏆 Avançar para Temporada {(snapshot.currentSeason || 1) + 1}
                    </button>
                  ) : (
                    <button
                      type='button'
                      className='btn btn-primary'
                      onClick={() => void handleSimulateRound()}
                      disabled={busy || !snapshot || snapshot.currentRound >= snapshot.totalRounds || hasLiveMatchOngoing}
                    >
                      ▶ Iniciar Partida
                    </button>
                  )}
                  {hasLiveMatchOngoing && (
                    isLivePaused ? (
                      <button
                        type='button'
                        className='btn btn-warning btn-sm'
                        onClick={resumeLive}
                        disabled={busy}
                      >
                        ▶ Retomar Partida
                      </button>
                    ) : (
                      <button
                        type='button'
                        className='btn btn-warning btn-sm'
                        onClick={() => void pauseLive()}
                        disabled={busy}
                      >
                        ⏸ Pausar Partida
                      </button>
                    )
                  )}
                  <div className='flex items-center gap-1 ml-auto'>
                    <span className='text-xs opacity-60 mr-1'>Vel:</span>
                    {(['devagar', 'normal', 'rapido', 'instantaneo'] as SpeedKey[]).map((speed) => (
                      <button
                        key={speed}
                        type='button'
                        className={`btn btn-xs ${simSpeed === speed ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSimSpeed(speed)}
                      >
                        {SPEED_LABELS[speed]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card da proxima partida + Tabela de classificação */}
                {snapshot && !hasLiveMatchOngoing && liveState !== 'done' && (() => {
                  const nextMatch = snapshot.nextRoundFixtures.find(
                    (f) => f.homeTeamId === snapshot.playerTeamId || f.awayTeamId === snapshot.playerTeamId
                  )
                  if (!nextMatch) return null
                  
                  const isHome = nextMatch.homeTeamId === snapshot.playerTeamId
                  return (
                    <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)_minmax(18rem,0.72fr)]'>
                      {/* Coluna 1: Próxima partida */}
                      <div className='w-full bg-base-100 border border-primary/30 rounded-lg p-5'>
                        <div className='flex items-center justify-between mb-3'>
                          <div>
                            <span className='text-xs uppercase tracking-widest opacity-40'>Proxima partida</span>
                            <div className='text-xs opacity-50 mt-0.5'>
                              Rodada {snapshot.currentRound + 1}/{snapshot.totalRounds} · {snapshot.nextMatchDate}
                            </div>
                          </div>
                          <div className='text-right'>
                            <div className='text-xs opacity-40'>{isHome ? '🏠 Mandante' : '✈ Visitante'}</div>
                            <div className='text-xs opacity-50 mt-0.5'>{nextMatch.homeStadium}</div>
                          </div>
                        </div>

                        <div className='flex items-center justify-center gap-4'>
                          <div className={`flex-1 text-right ${isHome ? 'text-primary' : ''}`}>
                            <div className='text-lg font-bold'>{nextMatch.homeTeamName}</div>
                            <div className='text-xs opacity-60 mt-0.5'>Técnico: {nextMatch.homeCoachName}</div>
                          </div>
                          <div className='text-2xl font-mono opacity-30 px-2'>vs</div>
                          <div className={`flex-1 ${!isHome ? 'text-primary' : ''}`}>
                            <div className='text-lg font-bold'>{nextMatch.awayTeamName}</div>
                            <div className='text-xs opacity-60 mt-0.5'>Técnico: {nextMatch.awayCoachName}</div>
                          </div>
                        </div>

                        <div className='mt-4 pt-3 border-t border-base-content/10 flex items-center justify-between text-xs opacity-50'>
                          <span>📊 {snapshot.playerPosition}º na classificacao</span>
                          <span>{snapshot.leagueId}</span>
                        </div>
                      </div>

                      {/* Coluna 2: Tabela de classificação */}
                      <div className='bg-base-100 border border-base-content/10 rounded-lg p-4 flex h-[44rem] min-h-0 flex-col overflow-hidden'>
                        <div className='text-xs uppercase tracking-widest opacity-40 mb-3'>
                          Classificação
                        </div>
                        <div className='min-h-0 overflow-auto flex-1'>
                          <table className='w-full text-sm'>
                            <thead className='sticky top-0 bg-base-100'>
                              <tr className='border-b border-base-content/10'>
                                <th className='text-left py-2 pr-2 text-xs opacity-50'>#</th>
                                <th className='text-left py-2 pr-3 text-xs opacity-50'>Time</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>P</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>J</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>V</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>E</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>D</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>GP</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>GC</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>SG</th>
                              </tr>
                            </thead>
                            <tbody>
                              {snapshot.table.map((entry, idx) => {
                                const isPlayerTeam = entry.teamId === snapshot.playerTeamId
                                const totalTeams = snapshot.table.length
                                const isRelegation = idx >= totalTeams - 4
                                const isPromotion = idx < 4 && snapshot.leagueDivisionLevel > 1

                                const zoneClass = isRelegation
                                  ? 'bg-error/10'
                                  : isPromotion
                                  ? 'bg-success/10'
                                  : ''

                                return (
                                  <tr
                                    key={entry.teamId}
                                    className={`border-b border-base-content/5 ${isPlayerTeam ? 'font-semibold' : ''} ${zoneClass}`}
                                  >
                                    <td className='py-1.5 pr-2 text-xs opacity-60'>{idx + 1}</td>
                                    <td className={`py-1.5 pr-3 truncate max-w-[100px] text-xs ${isPlayerTeam ? 'text-primary' : ''}`}>
                                      {entry.teamName}
                                    </td>
                                    <td className='text-center py-1.5 px-1 font-bold text-xs'>{entry.points}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.played}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.wins}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.draws}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.losses}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.goalsFor}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.goalsAgainst}</td>
                                    <td className={`text-center py-1.5 px-1 font-semibold text-xs ${entry.goalDiff > 0 ? 'text-success' : entry.goalDiff < 0 ? 'text-error' : 'opacity-50'}`}>
                                      {entry.goalDiff > 0 ? '+' : ''}{entry.goalDiff}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Coluna 3: Artilheiros */}
                      <div className='bg-base-100 border border-base-content/10 rounded-lg p-4 flex h-[20rem] min-h-0 flex-col overflow-hidden'>
                        <div className='text-xs uppercase tracking-widest opacity-40 mb-3'>
                          Artilheiros
                        </div>
                        <div className='min-h-0 overflow-auto flex-1'>
                          <table className='w-full text-sm'>
                            <thead className='sticky top-0 bg-base-100'>
                              <tr className='border-b border-base-content/10'>
                                <th className='text-left py-2 pr-3 text-xs opacity-50'>Nome</th>
                                <th className='text-left py-2 pr-3 text-xs opacity-50'>Time</th>
                                <th className='text-right py-2 text-xs opacity-50'>Gols</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentLeagueTopScorers.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className='py-4 text-center text-xs opacity-60'>Sem gols registrados</td>
                                </tr>
                              ) : (
                                currentLeagueTopScorers.map((scorer, idx) => (
                                  <tr key={`${scorer.playerId ?? scorer.playerName}-${idx}`} className='border-b border-base-content/5'>
                                    <td className='py-1.5 pr-3 text-xs font-medium'>{scorer.playerName}</td>
                                    <td className='py-1.5 pr-3 text-xs opacity-70'>{scorer.teamName}</td>
                                    <td className='py-1.5 text-right text-xs font-bold'>{scorer.goals}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Grids ao vivo em layout 2x2 */}
                {isLiveRunning && (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3 h-[660px]'>
                    {/* Grid 1: Card da partida ao vivo - ALTURA FIXA 330px */}
                    {showLiveCard && focusMatch && (
                      <div className='bg-base-100 border-2 border-primary/50 rounded-lg p-3 flex flex-col h-[330px]'>
                        <div className='flex items-center justify-between mb-2'>
                          <span className='text-[10px] uppercase tracking-widest opacity-50'>
                            Partida em andamento
                          </span>
                          <div className='flex items-center gap-2'>
                            <button type='button' className='btn btn-ghost btn-xs' onClick={pauseLive}>
                              Pausar
                            </button>
                            {hasLiveMatchOngoing && (
                              <button type='button' className='btn btn-ghost btn-xs' onClick={skipLive}>
                                Pular
                              </button>
                            )}
                            <span className='font-mono text-xl font-bold text-primary tabular-nums'>
                              {String(liveMinute).padStart(2, '0')}&apos;
                            </span>
                          </div>
                        </div>

                        <div className='flex items-center justify-center gap-4 mb-2'>
                          <div className={`flex-1 text-right ${playerTeamIsHome ? 'text-primary' : ''}`}>
                            <div className='text-sm font-semibold leading-tight'>{focusMatch.homeTeamName}</div>
                            <div className='text-[10px] opacity-60 mt-0.5'>Técnico: {focusMatch.homeCoachName}</div>
                          </div>
                          <div className='text-3xl font-mono font-bold text-primary min-w-[5rem] text-center tabular-nums'>
                            {liveHomeGoals} - {liveAwayGoals}
                          </div>
                          <div className={`flex-1 ${playerTeamIsHome ? '' : 'text-primary'}`}>
                            <div className='text-sm font-semibold leading-tight'>{focusMatch.awayTeamName}</div>
                            <div className='text-[10px] opacity-60 mt-0.5'>Técnico: {focusMatch.awayCoachName}</div>
                          </div>
                        </div>

                        <div className='w-full bg-base-300 rounded-full h-1.5 mb-1'>
                          <div
                            className='bg-primary h-1.5 rounded-full transition-all duration-100'
                            style={{ width: `${(liveMinute / 90) * 100}%` }}
                          />
                        </div>
                        <div className='flex justify-between text-[10px] opacity-30 mb-2'>
                          <span>0&apos;</span>
                          <span>45&apos;</span>
                          <span>90&apos;</span>
                        </div>

                        <div className='bg-base-200 rounded p-2 h-[170px] overflow-y-auto'>
                          {liveEvents.length === 0 && (
                            <p className='text-xs opacity-30 text-center mt-4'>Aguardando lances...</p>
                          )}
                          {[...liveEvents].reverse().map((event, index) => {
                            const isHome = event.teamSide === 'home'
                            const eventStyle = EVENT_STYLES[event.eventType] ?? {
                              label: event.eventType,
                              cls: 'bg-base-300 text-base-content',
                            }
                            
                            // Formata descrição com nome do jogador em broadcast style
                            let description = event.teamName
                            if (event.playerName) {
                              if (event.eventType === 'goal') {
                                description = `⚽ GOL: ${event.playerName}`
                              } else if (event.eventType === 'save') {
                                description = `🧤 Defesa: ${event.playerName}`
                              } else if (event.eventType === 'nearMiss') {
                                description = `💨 Chute: ${event.playerName}`
                              } else if (event.eventType === 'foul') {
                                description = `🦶 Falta: ${event.playerName}`
                              } else if (event.eventType === 'yellowCard') {
                                description = `🟨 Amarelo: ${event.playerName}`
                              } else if (event.eventType === 'redCard') {
                                description = `🟥 Expulso: ${event.playerName}`
                              } else if (event.eventType === 'corner') {
                                description = `⚐ Escanteio`
                              } else if (event.eventType === 'kickOff') {
                                description = 'Início'  
                              } else if (event.eventType === 'halfTime') {
                                description = 'Intervalo'
                              } else if (event.eventType === 'fullTime') {
                                description = 'Fim de jogo'
                              }
                            }
                            
                            return (
                              <div
                                key={`${event.minute}-${event.eventType}-${index}`}
                                className={`flex items-center gap-1.5 py-0.5 text-xs font-mono ${isHome ? '' : 'flex-row-reverse'}`}
                              >
                                <span className='text-[10px] opacity-40 w-6 shrink-0 text-right'>{event.minute}&apos;</span>
                                <span className={`px-1 py-0.5 rounded text-[10px] font-bold ${eventStyle.cls}`}>
                                  {eventStyle.label}
                                </span>
                                <span className={event.eventType === 'goal' ? 'font-bold text-primary' : 'opacity-70'}>
                                  {description}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Grid NOVO: Alterações Rápidas - altura 330px */}
                    <div className='bg-base-100 border border-base-content/10 rounded-lg p-3 h-[330px] flex flex-col overflow-y-auto'>
                      <div className='text-xs uppercase tracking-widest opacity-40 mb-3'>
                        Alterações Rápidas
                      </div>
                      
                      <div className='space-y-3 flex-1'>
                        {/* Formação */}
                        <div>
                          <label className='text-xs opacity-60 mb-1 block'>Formação</label>
                          <select
                            className='select select-sm select-bordered w-full'
                            value={formation}
                            onChange={(e) => handleFormationChange(e.target.value as Formation)}
                          >
                            {FORMATIONS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>

                        {/* Estilo de Jogo */}
                        <div>
                          <label className='text-xs opacity-60 mb-1 block'>Estilo de Jogo</label>
                          <select
                            className='select select-sm select-bordered w-full'
                            value={playStyle}
                            onChange={(e) => setPlayStyle(e.target.value as PlayStyle)}
                          >
                            {PLAY_STYLES.map((ps) => (
                              <option key={ps} value={ps}>{ps}</option>
                            ))}
                          </select>
                        </div>

                        {/* Substituições Rápidas */}
                        <div className='flex-1'>
                          <div className='flex items-center justify-between mb-2'>
                            <label className='text-xs opacity-60'>Substituição Rápida</label>
                            <span className='text-xs opacity-40'>
                              {subsUsed}/5 • {subWindowsUsed}/3 janelas
                            </span>
                          </div>
                          
                          {(() => {
                            const fieldPlayerIds = slots.map(s => s.playerId).filter((id): id is string => id !== null)
                            const fieldPlayers = squad.filter(p => fieldPlayerIds.includes(p.id))
                            const benchPlayerIds = benchSlots.map(b => b.playerId).filter((id): id is string => id !== null)
                            const benchPlayers = squad.filter(p => benchPlayerIds.includes(p.id))
                            
                            const canSubstitute = subsUsed < 5 && (subWindowsUsed < 3 || subsInCurrentPause > 0)
                            
                            if (!canSubstitute) {
                              return (
                                <div className='text-xs opacity-50 text-center py-3'>
                                  ❌ Substituições esgotadas
                                </div>
                              )
                            }
                            
                            return (
                              <div className='space-y-2'>
                                {/* Seleção: Quem sai */}
                                <div>
                                  <label className='text-[10px] opacity-50 mb-0.5 block'>Sai do campo</label>
                                  <select
                                    className='select select-xs select-bordered w-full'
                                    value={subOutSlotIdx !== null ? slots[subOutSlotIdx]?.playerId || '' : ''}
                                    onChange={(e) => {
                                      const playerId = e.target.value
                                      const slotIdx = slots.findIndex(s => s.playerId === playerId)
                                      setSubOutSlotIdx(slotIdx >= 0 ? slotIdx : null)
                                    }}
                                  >
                                    <option value=''>-- Selecione --</option>
                                    {fieldPlayers.map((player) => {
                                      const energy = playerEnergies[player.id] ?? 100
                                      const energyIcon = energy > 70 ? '🟢' : energy > 40 ? '🟡' : '🔴'
                                      return (
                                        <option key={player.id} value={player.id}>
                                          {energyIcon} {player.name}
                                        </option>
                                      )
                                    })}
                                  </select>
                                </div>

                                {/* Seleção: Quem entra */}
                                <div>
                                  <label className='text-[10px] opacity-50 mb-0.5 block'>Entra no campo</label>
                                  <select
                                    className='select select-xs select-bordered w-full'
                                    value={subInPlayerId}
                                    onChange={(e) => setSubInPlayerId(e.target.value)}
                                  >
                                    <option value=''>-- Selecione --</option>
                                    {benchPlayers.map((player) => (
                                      <option key={player.id} value={player.id}>
                                        {player.name} ({player.position})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Botão de substituição */}
                                <button
                                  type='button'
                                  className='btn btn-primary btn-xs w-full'
                                  disabled={subOutSlotIdx === null || !subInPlayerId}
                                  onClick={applySubstitution}
                                >
                                  🔄 Substituir
                                </button>

                                {/* Última substituição */}
                                {recentSubstitution && (
                                  <div className='text-[10px] opacity-50 text-center mt-1 p-1 bg-base-200 rounded'>
                                    {recentSubstitution.minute}&apos; {recentSubstitution.outPlayerName} ⇆ {recentSubstitution.inPlayerName}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Grid 3: Estatísticas da partida - altura 330px */}
                    {showLiveCard && focusMatch && (
                      <div className='bg-base-100 border border-base-content/10 rounded-lg p-3 h-[330px] overflow-y-auto'>
                        <div className='text-xs uppercase tracking-widest opacity-40 mb-3'>
                          Estatísticas da Partida
                        </div>
                        
                        {(() => {
                          // Contar eventos por tipo e time
                          const homeEvents = liveEvents.filter(e => e.teamSide === 'home')
                          const awayEvents = liveEvents.filter(e => e.teamSide === 'away')
                          
                          const homeShots = homeEvents.filter(e => ['nearMiss', 'save', 'goal'].includes(e.eventType)).length
                          const awayShots = awayEvents.filter(e => ['nearMiss', 'save', 'goal'].includes(e.eventType)).length
                          
                          const homeShotsOnTarget = homeEvents.filter(e => ['save', 'goal'].includes(e.eventType)).length
                          const awayShotsOnTarget = awayEvents.filter(e => ['save', 'goal'].includes(e.eventType)).length
                          
                          const homeCorners = homeEvents.filter(e => e.eventType === 'corner').length
                          const awayCorners = awayEvents.filter(e => e.eventType === 'corner').length
                          
                          const homeFouls = homeEvents.filter(e => e.eventType === 'foul').length
                          const awayFouls = awayEvents.filter(e => e.eventType === 'foul').length
                          
                          const homeYellows = homeEvents.filter(e => e.eventType === 'yellowCard').length
                          const awayYellows = awayEvents.filter(e => e.eventType === 'yellowCard').length
                          
                          const homeReds = homeEvents.filter(e => e.eventType === 'redCard').length
                          const awayReds = awayEvents.filter(e => e.eventType === 'redCard').length
                          
                          // Aproximar posse baseada na proporção de eventos ofensivos
                          const totalOffensiveEvents = homeShots + awayShots + homeCorners + awayCorners
                          const homePossession = totalOffensiveEvents > 0 
                            ? Math.round(((homeShots + homeCorners) / totalOffensiveEvents) * 100)
                            : 50
                          const awayPossession = 100 - homePossession
                          
                          const StatRow = ({ label, homeValue, awayValue, isPercentage = false }: { 
                            label: string, 
                            homeValue: number, 
                            awayValue: number,
                            isPercentage?: boolean 
                          }) => {
                            const total = homeValue + awayValue
                            const homePercent = total > 0 ? (homeValue / total) * 100 : 50
                            const awayPercent = total > 0 ? (awayValue / total) * 100 : 50
                            
                            return (
                              <div className='mb-2'>
                                <div className='flex items-center justify-between text-xs mb-1'>
                                  <span className='font-mono font-bold min-w-[30px] text-right'>
                                    {isPercentage ? `${homeValue}%` : homeValue}
                                  </span>
                                  <span className='text-[10px] opacity-60'>{label}</span>
                                  <span className='font-mono font-bold min-w-[30px]'>
                                    {isPercentage ? `${awayValue}%` : awayValue}
                                  </span>
                                </div>
                                {!isPercentage && (
                                  <div className='flex items-center gap-0.5 h-1.5'>
                                    <div 
                                      className='bg-primary/60 h-full rounded-l transition-all'
                                      style={{ width: `${homePercent}%` }}
                                    />
                                    <div 
                                      className='bg-secondary/60 h-full rounded-r transition-all'
                                      style={{ width: `${awayPercent}%` }}
                                    />
                                  </div>
                                )}
                                {isPercentage && (
                                  <div className='flex items-center gap-0.5 h-1.5'>
                                    <div 
                                      className='bg-primary/60 h-full rounded-l transition-all'
                                      style={{ width: `${homeValue}%` }}
                                    />
                                    <div 
                                      className='bg-secondary/60 h-full rounded-r transition-all'
                                      style={{ width: `${awayValue}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          }
                          
                          return (
                            <div>
                              <div className='flex items-center justify-between mb-3 text-xs font-semibold'>
                                <span className={playerTeamIsHome ? 'text-primary' : ''}>
                                  {focusMatch.homeTeamName}
                                </span>
                                <span className={!playerTeamIsHome ? 'text-primary' : ''}>
                                  {focusMatch.awayTeamName}
                                </span>
                              </div>
                              
                              <StatRow label='Posse de Bola' homeValue={homePossession} awayValue={awayPossession} isPercentage />
                              <StatRow label='Chutes' homeValue={homeShots} awayValue={awayShots} />
                              <StatRow label='Chutes no Gol' homeValue={homeShotsOnTarget} awayValue={awayShotsOnTarget} />
                              <StatRow label='Escanteios' homeValue={homeCorners} awayValue={awayCorners} />
                              <StatRow label='Faltas' homeValue={homeFouls} awayValue={awayFouls} />
                              {(homeYellows > 0 || awayYellows > 0) && (
                                <StatRow label='Cartões Amarelos' homeValue={homeYellows} awayValue={awayYellows} />
                              )}
                              {(homeReds > 0 || awayReds > 0) && (
                                <StatRow label='Cartões Vermelhos' homeValue={homeReds} awayValue={awayReds} />
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* Grid 2: Outras partidas - altura 330px */}
                    {bgEvents.length > 0 && (() => {
                      const matchMap = new Map<string, {
                        homeTeamName: string
                        awayTeamName: string
                        homeGoals: number
                        awayGoals: number
                        lastGoalMinute: number
                        lastGoalTeam: string
                      }>()

                      bgEvents
                        .filter((e) => e.minute <= liveMinute)
                        .forEach((e) => {
                          const key = `${e.homeTeamName}-${e.awayTeamName}`
                          matchMap.set(key, {
                            homeTeamName: e.homeTeamName,
                            awayTeamName: e.awayTeamName,
                            homeGoals: e.homeGoals,
                            awayGoals: e.awayGoals,
                            lastGoalMinute: e.minute,
                            lastGoalTeam: e.homeGoals > (matchMap.get(key)?.homeGoals ?? 0)
                              ? e.homeTeamName
                              : e.awayTeamName,
                          })
                        })

                      const allMatches = (currentResult?.matches ?? []).filter((match) => {
                        if (!focusMatch) return true
                        return !(
                          match.homeTeamId === focusMatch.homeTeamId &&
                          match.awayTeamId === focusMatch.awayTeamId
                        )
                      })

                      return (
                        <div className='bg-base-100 border border-base-content/10 rounded-lg p-3 flex flex-col h-[330px]'>
                          <div className='text-xs uppercase tracking-widest opacity-40 mb-2'>
                            Outras partidas
                          </div>
                          <div className='space-y-1 flex-1 overflow-y-auto'>
                            {allMatches.map((match) => {
                              const key = `${match.homeTeamName}-${match.awayTeamName}`
                              const live = matchMap.get(key)
                              const homeGoals = live?.homeGoals ?? 0
                              const awayGoals = live?.awayGoals ?? 0

                              return (
                                <div
                                  key={key}
                                  className='flex items-center justify-between text-sm gap-2'
                                >
                                  <div className='flex items-center gap-2 min-w-0'>
                                    <span className='truncate opacity-80'>{match.homeTeamName}</span>
                                    <span className='font-mono font-bold tabular-nums shrink-0'>
                                      {homeGoals} - {awayGoals}
                                    </span>
                                    <span className='truncate opacity-80'>{match.awayTeamName}</span>
                                  </div>
                                  {live && (
                                    <span className='shrink-0 text-xs opacity-50 whitespace-nowrap'>
                                      ⚽ {live.lastGoalTeam.split(' ')[0]} {live.lastGoalMinute}&apos;
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {showLiveCard && focusMatch && liveState === 'done' && snapshot && (() => {
                  const nextMatch = snapshot.nextRoundFixtures.find(
                    (f) => f.homeTeamId === snapshot.playerTeamId || f.awayTeamId === snapshot.playerTeamId
                  )
                  const isHome = nextMatch ? nextMatch.homeTeamId === snapshot.playerTeamId : false
                  
                  return (
                    <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)_minmax(18rem,0.72fr)]'>
                      <div className='flex min-h-0 flex-col gap-4'>
                        {/* Coluna 1A: Próxima partida */}
                        {nextMatch && (
                          <div className='w-full bg-base-100 border border-primary/30 rounded-lg p-4'>
                            <div className='flex items-center justify-between mb-3'>
                              <div>
                                <span className='text-xs uppercase tracking-widest opacity-40'>Proxima partida</span>
                                <div className='text-xs opacity-50 mt-0.5'>
                                  Rodada {snapshot.currentRound + 1}/{snapshot.totalRounds} · {snapshot.nextMatchDate}
                                </div>
                              </div>
                              <div className='text-right'>
                                <div className='text-xs opacity-40'>{isHome ? '🏠 Mandante' : '✈ Visitante'}</div>
                                <div className='text-xs opacity-50 mt-0.5'>{nextMatch.homeStadium}</div>
                              </div>
                            </div>

                            <div className='flex items-center justify-center gap-4'>
                              <div className={`flex-1 text-right ${isHome ? 'text-primary' : ''}`}>
                                <div className='text-base font-bold'>{nextMatch.homeTeamName}</div>
                                <div className='text-xs opacity-60 mt-0.5'>Técnico: {nextMatch.homeCoachName}</div>
                              </div>
                              <div className='text-xl font-mono opacity-30 px-2'>vs</div>
                              <div className={`flex-1 ${!isHome ? 'text-primary' : ''}`}>
                                <div className='text-base font-bold'>{nextMatch.awayTeamName}</div>
                                <div className='text-xs opacity-60 mt-0.5'>Técnico: {nextMatch.awayCoachName}</div>
                              </div>
                            </div>

                            <div className='mt-3 pt-2 border-t border-base-content/10 flex items-center justify-between text-xs opacity-50'>
                              <span>📊 {snapshot.playerPosition}º na classificacao</span>
                              <span>{snapshot.leagueId}</span>
                            </div>
                          </div>
                        )}

                        {/* Coluna 1B: Resultados da rodada */}
                        <div className='bg-base-100 border border-base-content/10 rounded-lg p-4 overflow-hidden flex h-[32rem] min-h-0 flex-col'>
                          <div className='text-xs uppercase tracking-widest opacity-40 mb-3'>
                            Todos os jogos - Rodada {playedRound}
                          </div>
                          <div className='min-h-0 space-y-2 overflow-y-auto pr-1 flex-1'>
                            {lastRoundMatches.map((match) => {
                              const matchKey = `${match.homeTeamId}-${match.awayTeamId}`
                              const isPlayerMatch = match.homeTeamId === focusMatch.homeTeamId && match.awayTeamId === focusMatch.awayTeamId
                              const isExpanded = expandedMatchKey === matchKey
                              const homeGoals = match.events.filter(e => e.eventType === 'goal' && e.teamSide === 'home')
                              const awayGoals = match.events.filter(e => e.eventType === 'goal' && e.teamSide === 'away')

                              return (
                                <div
                                  key={matchKey}
                                  className={`rounded overflow-hidden ${isPlayerMatch ? 'border-2 border-primary/40' : 'border border-base-content/10'}`}
                                >
                                  <button
                                    type='button'
                                    onClick={() => setExpandedMatchKey(isExpanded ? null : matchKey)}
                                    className={`w-full flex items-center justify-between text-sm p-2.5 transition-colors ${
                                      isPlayerMatch ? 'bg-primary/10 hover:bg-primary/15' : 'bg-base-200 hover:bg-base-300'
                                    }`}
                                  >
                                    <span className='truncate flex-1 opacity-80 text-left text-xs'>{match.homeTeamName}</span>
                                    <span className='font-mono font-bold mx-2 tabular-nums text-xs'>
                                      {match.homeGoals} - {match.awayGoals}
                                    </span>
                                    <span className='truncate flex-1 text-right opacity-80 text-xs'>{match.awayTeamName}</span>
                                    {(homeGoals.length > 0 || awayGoals.length > 0) && (
                                      <span className='ml-2 text-xs opacity-40'>
                                        {isExpanded ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>

                                  {isExpanded && (homeGoals.length > 0 || awayGoals.length > 0) && (
                                    <div className='bg-base-100/50 px-2.5 py-1.5 space-y-1'>
                                      {match.events
                                        .filter(e => e.eventType === 'goal')
                                        .map((event, idx) => {
                                          const isHomeGoal = event.teamSide === 'home'
                                          return (
                                            <div
                                              key={`${matchKey}-goal-${idx}`}
                                              className='flex items-center text-xs'
                                            >
                                              {isHomeGoal ? (
                                                <>
                                                  <span className='flex-1 text-left opacity-80'>
                                                    ⚽ {event.playerName || event.teamName}
                                                  </span>
                                                  <span className='opacity-40 text-[10px] mx-2'>{event.minute}&apos;</span>
                                                  <span className='flex-1'></span>
                                                </>
                                              ) : (
                                                <>
                                                  <span className='flex-1'></span>
                                                  <span className='opacity-40 text-[10px] mx-2'>{event.minute}&apos;</span>
                                                  <span className='flex-1 text-right opacity-80'>
                                                    ⚽ {event.playerName || event.teamName}
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          )
                                        })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Coluna 2: Classificação */}
                      <div className='bg-base-100 border border-base-content/10 rounded-lg p-4 flex h-[44rem] min-h-0 flex-col overflow-hidden'>
                        <div className='text-xs uppercase tracking-widest opacity-40 mb-3'>
                          Classificação
                        </div>
                        <div className='min-h-0 overflow-auto flex-1'>
                          <table className='w-full text-sm'>
                            <thead className='sticky top-0 bg-base-100'>
                              <tr className='border-b border-base-content/10'>
                                <th className='text-left py-2 pr-2 text-xs opacity-50'>#</th>
                                <th className='text-left py-2 pr-3 text-xs opacity-50'>Time</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>P</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>J</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>V</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>E</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>D</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>GP</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>GC</th>
                                <th className='text-center py-2 px-1 text-xs opacity-50'>SG</th>
                              </tr>
                            </thead>
                            <tbody>
                              {snapshot.table.map((entry, idx) => {
                                const isPlayerTeam = entry.teamId === snapshot.playerTeamId
                                const totalTeams = snapshot.table.length
                                const isRelegation = idx >= totalTeams - 4
                                const isPromotion = idx < 4 && snapshot.leagueDivisionLevel > 1
                                
                                const zoneClass = isRelegation 
                                  ? 'bg-error/10' 
                                  : isPromotion 
                                  ? 'bg-success/10' 
                                  : ''
                                
                                return (
                                  <tr
                                    key={entry.teamId}
                                    className={`border-b border-base-content/5 ${isPlayerTeam ? 'font-semibold' : ''} ${zoneClass}`}
                                  >
                                    <td className='py-1.5 pr-2 text-xs opacity-60'>{idx + 1}</td>
                                    <td className={`py-1.5 pr-3 truncate max-w-[100px] text-xs ${isPlayerTeam ? 'text-primary' : ''}`}>
                                      {entry.teamName}
                                    </td>
                                    <td className='text-center py-1.5 px-1 font-bold text-xs'>{entry.points}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.played}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.wins}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.draws}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.losses}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.goalsFor}</td>
                                    <td className='text-center py-1.5 px-1 opacity-70 text-xs'>{entry.goalsAgainst}</td>
                                    <td className={`text-center py-1.5 px-1 font-semibold text-xs ${entry.goalDiff > 0 ? 'text-success' : entry.goalDiff < 0 ? 'text-error' : 'opacity-50'}`}>
                                      {entry.goalDiff > 0 ? '+' : ''}{entry.goalDiff}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                      </div>

                      {/* Coluna 3: Artilheiros */}
                      <div className='bg-base-100 border border-base-content/10 rounded-lg p-4 flex h-[32rem] min-h-0 flex-col overflow-hidden'>
                        <div className='text-xs uppercase tracking-widest opacity-40 mb-3'>
                          Artilheiros
                        </div>
                        <div className='min-h-0 overflow-auto flex-1'>
                          <table className='w-full text-sm'>
                            <thead className='sticky top-0 bg-base-100'>
                              <tr className='border-b border-base-content/10'>
                                <th className='text-left py-2 pr-3 text-xs opacity-50'>Nome</th>
                                <th className='text-left py-2 pr-3 text-xs opacity-50'>Time</th>
                                <th className='text-right py-2 text-xs opacity-50'>Gols</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentLeagueTopScorers.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className='py-4 text-center text-xs opacity-60'>Sem gols registrados</td>
                                </tr>
                              ) : (
                                currentLeagueTopScorers.map((scorer, idx) => (
                                  <tr key={`${scorer.playerId ?? scorer.playerName}-${idx}`} className='border-b border-base-content/5'>
                                    <td className='py-1.5 pr-3 text-xs font-medium'>{scorer.playerName}</td>
                                    <td className='py-1.5 pr-3 text-xs opacity-70'>{scorer.teamName}</td>
                                    <td className='py-1.5 text-right text-xs font-bold'>{scorer.goals}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {isLivePaused && (
                  <div className='bg-base-100 border border-base-content/20 rounded-sm p-4 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-sm font-semibold uppercase tracking-widest opacity-70'>
                        Pausado: substituicoes
                      </h3>
                      <button type='button' className='btn btn-primary btn-xs' onClick={resumeLive}>
                        Retomar partida
                      </button>
                    </div>

                    <div className='text-xs opacity-65'>
                      Regras FIFA: ate 5 atletas e no maximo 3 janelas.
                      <span className='ml-2'>Usadas: {subsUsed}/5 atletas</span>
                      <span className='ml-2'>{subWindowsUsed}/3 janelas</span>
                      <span className='ml-2 opacity-70'>Intervalo nao conta janela.</span>
                    </div>

                    {recentSubstitution && (
                      <div className='rounded border border-success/30 bg-success/10 px-3 py-2 text-xs'>
                        <span className='font-semibold text-success'>Substituicao</span>
                        <span className='ml-2 opacity-80'>
                          {recentSubstitution.minute}&apos; · {recentSubstitution.zone} · Saiu {recentSubstitution.outPlayerName.split(' ')[0]} · Entrou {recentSubstitution.inPlayerName.split(' ')[0]}
                        </span>
                      </div>
                    )}

                    <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                      <select
                        className='select select-bordered w-full select-sm'
                        value={formation}
                        onChange={(event) => handleFormationChange(event.target.value as Formation)}
                        disabled={busy}
                      >
                        {FORMATIONS.map((item) => (
                          <option key={item} value={item}>Formacao {item}</option>
                        ))}
                      </select>
                      <select
                        className='select select-bordered w-full select-sm'
                        value={playStyle}
                        onChange={(event) => setPlayStyle(event.target.value as PlayStyle)}
                        disabled={busy}
                      >
                        {PLAY_STYLES.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>

                    <div className='grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]'>
                      <div className='rounded-md border border-base-content/10 bg-base-200/60 p-3'>
                        <div className='mb-2 text-[10px] uppercase tracking-widest opacity-45'>
                          Mini escalacao em campo · clique para escolher quem sai
                        </div>
                        <div className='space-y-2'>
                          {slotsByZone.map(({ zone, entries }) => (
                            <div key={`pause-${zone}`} className='space-y-1'>
                              <div className='text-[10px] uppercase tracking-wider opacity-40'>{zone}</div>
                              <div className='flex flex-wrap gap-1.5'>
                                {entries.map(({ slot, idx }) => {
                                  const player = squad.find((p) => p.id === slot.playerId)
                                  const isOpen = subOutSlotIdx === idx
                                  const isFilled = slot.playerId !== null

                                  return (
                                    <button
                                      key={idx}
                                      type='button'
                                      onClick={() => {
                                        if (justDroppedRef.current) return
                                        const nextIdx = isOpen ? null : idx
                                        setSelectedSlotIdx(nextIdx)
                                        setSubOutSlotIdx(nextIdx)
                                      }}
                                      onPointerDown={(e) => {
                                        if (!isFilled) return
                                        startDrag({ type: 'slot', idx, playerId: slot.playerId ?? '' }, e.clientX, e.clientY)
                                      }}
                                      className={[
                                        'min-w-[5.25rem] rounded border px-2 py-1 text-left text-[11px] transition-all border-2',
                                        isFilled ? 'cursor-move' : '',
                                        isOpen
                                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-100 shadow-lg shadow-yellow-400/20'
                                          : isFilled
                                          ? 'border-green-400/60 bg-green-900/70 text-green-100 hover:border-green-300'
                                          : 'border-green-600/40 bg-green-900/20 text-green-500 border-dashed hover:border-green-500',
                                      ].join(' ')}
                                    >
                                      <div className='font-bold text-[8px] opacity-50 mb-0.5'>{zone}</div>
                                      <div className='font-semibold truncate leading-tight text-[11px]'>
                                        {player ? abbrevName(player.name) : 'Vazio'}
                                      </div>
                                      {player && (() => {
                                        const e = playerEnergies[player.id] ?? 100
                                        const ec = e >= 70 ? 'bg-success' : e >= 40 ? 'bg-warning' : 'bg-error'
                                        return (
                                          <>
                                            <div className='font-mono text-[9px] opacity-60 mt-0.5'>{computeBaseOvr(player)}</div>
                                            <div className='mt-1 h-1 w-full rounded-full bg-black/30 overflow-hidden'>
                                              <div className={`h-full rounded-full ${ec}`} style={{ width: `${Math.round(e)}%` }} />
                                            </div>
                                          </>
                                        )
                                      })()}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className='rounded-md border border-base-content/10 bg-base-200/60 p-3'>
                        <div className='mb-2 text-[10px] uppercase tracking-widest opacity-45'>
                          Banco · clique para escolher quem entra
                        </div>
                        <div className='max-h-52 space-y-1 overflow-y-auto pr-1'>
                          {eligibleBenchPlayers.map((player) => {
                            const selected = subInPlayerId === player.id
                            const energy = playerEnergies[player.id] ?? 100
                            const energyColor =
                              energy >= 70 ? 'bg-success' : energy >= 40 ? 'bg-warning' : 'bg-error'
                            return (
                              <button
                                key={`pause-bench-${player.id}`}
                                type='button'
                                onClick={() => setSubInPlayerId(player.id)}
                                disabled={busy || substitutionLocked}
                                className={[
                                  'flex w-full items-center justify-between rounded border px-2 py-1.5 text-xs transition-colors',
                                  selected
                                    ? 'border-primary/60 bg-primary/20'
                                    : 'border-base-content/15 bg-base-100 hover:border-primary/40',
                                ].join(' ')}
                              >
                                <div className='min-w-0 flex-1 text-left'>
                                  <div className='truncate'>{abbrevName(player.name)} ({player.position})</div>
                                  <div className='mt-0.5 h-1 w-full rounded-full bg-base-300 overflow-hidden'>
                                    <div
                                      className={`h-full rounded-full ${energyColor}`}
                                      style={{ width: `${Math.round(energy)}%` }}
                                    />
                                  </div>
                                  <div className='text-[9px] opacity-50 mt-0.5'>{Math.round(energy)}% nrg</div>
                                </div>
                                <span className='ml-2 shrink-0 font-mono font-bold'>OVR {computeBaseOvr(player)}</span>
                              </button>
                            )
                          })}
                          {eligibleBenchPlayers.length === 0 && (
                            <p className='text-xs opacity-45'>Sem reservas elegiveis. Configure no menu Elenco.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                      <button
                        type='button'
                        className='btn btn-primary btn-sm'
                        onClick={handleInMatchSubstitution}
                        disabled={busy || substitutionLocked || subOutSlotIdx === null || !subInPlayerId}
                      >
                        Confirmar substituicao
                      </button>
                      <button
                        type='button'
                        className='btn btn-ghost btn-sm'
                        onClick={() => {
                          setSubOutSlotIdx(null)
                          setSubInPlayerId('')
                        }}
                        disabled={busy || (subOutSlotIdx === null && !subInPlayerId)}
                      >
                        Limpar selecao
                      </button>

                      <span className='text-xs opacity-60'>
                        Sai: {subOutSlotIdx !== null ? `slot ${subOutSlotIdx + 1}` : '-'} · Entra:{' '}
                        {subInPlayerId ? (squad.find((p) => p.id === subInPlayerId)?.name ?? '-') : '-'}
                      </span>
                    </div>

                    <p className='text-[11px] opacity-55'>
                      Apos o fim da partida, a escalação volta para a que estava salva antes do jogo.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'escalacao' && (
              <div className='bg-base-100 border border-base-content/20 rounded-sm p-4'>
                <div className='grid grid-cols-2 gap-3 mb-4'>
                  <select
                    className='select select-bordered w-full'
                    value={formation}
                    onChange={(event) => handleFormationChange(event.target.value as Formation)}
                    disabled={busy}
                  >
                    {FORMATIONS.map((item) => (
                      <option key={item} value={item}>Formacao {item}</option>
                    ))}
                  </select>
                  <select
                    className='select select-bordered w-full'
                    value={playStyle}
                    onChange={(event) => setPlayStyle(event.target.value as PlayStyle)}
                    disabled={busy}
                  >
                    {PLAY_STYLES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                <div className='mb-4 flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    className='btn btn-primary btn-sm'
                    onClick={handleAutoLineup}
                    disabled={busy || squad.length === 0}
                  >
                    Escalacao automatica
                  </button>
                  <button
                    type='button'
                    className='btn btn-ghost btn-sm'
                    onClick={handleClearLineup}
                    disabled={busy}
                  >
                    Limpar escalacao
                  </button>
                </div>

                <div className='flex items-center justify-between mb-3'>
                  <h2 className='text-xl font-semibold'>Elenco</h2>
                  <span className={`text-sm font-semibold ${
                    titularesCount >= 11 ? 'text-success' : titularesCount >= 7 ? 'text-warning' : 'text-error'
                  }`}>
                    {titularesCount}/11
                  </span>
                </div>

                <div className='grid grid-cols-1 gap-4 xl:grid-cols-[26rem_minmax(0,1fr)] 2xl:grid-cols-[28rem_minmax(0,1fr)]'>
                  <div className='min-w-0 flex flex-col gap-3'>
                    {/* Campo visual */}
                    <div
                      className='min-w-0 bg-green-800 rounded-lg p-3 flex flex-col gap-2 transition-shadow'
                    >
                    {slotsByZone.map(({ zone, entries }, zoneIdx) => (
                      <div
                        key={zone}
                        className={`flex flex-col gap-1.5 ${zoneIdx < slotsByZone.length - 1 ? 'border-b border-white/10 pb-2' : ''}`}
                      >
                        <span className='text-green-300/40 text-[9px] font-bold uppercase tracking-widest text-center'>
                          {zone === 'ATA' ? 'Ataque' : zone === 'MEI' ? 'Meio-Campo' : zone === 'DEF' ? 'Defesa' : 'Goleiro'}
                        </span>
                        <div className='flex justify-center gap-1.5 flex-wrap'>
                          {entries.map(({ slot, idx }) => {
                            const player = playerById.get(slot.playerId ?? '')
                            const isOpen = selectedSlotIdx === idx
                            const isFilled = slot.playerId !== null
                            const slotOptions = slotDropdownOptionsByIndex[idx]
                            const compatible = slotOptions?.compatible ?? []
                            const others = slotOptions?.others ?? []
                            const sortedPlayers = slotOptions?.sortedPlayers ?? []
                            const slotLabel = slotOptions?.slotLabel ?? getSlotLabelForIndex(formation, idx, zone)
                            const positionCompatibility = player ? getPositionCompatibility(player.position, zone) : null

                            return (
                              <div
                                key={idx}
                                className='relative'
                                ref={(el) => {
                                  if (el) slotRefs.current.set(idx, el)
                                  else slotRefs.current.delete(idx)
                                }}
                              >
                                <button
                                  type='button'
                                  onPointerDown={(e) => {
                                    if (!isFilled) return
                                    startDrag({ type: 'slot', idx, playerId: slot.playerId ?? '' }, e.clientX, e.clientY)
                                  }}
                                  onClick={() => {
                                    if (justDroppedRef.current) return
                                    setSelectedSlotIdx(isOpen ? null : idx)
                                  }}
                                  className={[
                                    'rounded-md px-2 py-1 text-left w-[5.9rem] text-xs border-2',
                                    isFilled ? 'cursor-move' : '',
                                    isOpen
                                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-100 shadow-lg shadow-yellow-400/20'
                                      : isFilled
                                      ? 'border-green-400/60 bg-green-900/70 text-green-100 hover:border-green-300'
                                      : 'border-green-600/40 bg-green-900/20 text-green-500 border-dashed hover:border-green-500',
                                  ].join(' ')}
                                >
                                  <div className='flex items-center justify-between gap-1 leading-none'>
                                    <span className='truncate font-semibold text-[11px]'>
                                      {player ? abbrevName(player.name) : 'Vazio'}
                                    </span>
                                    <span className='shrink-0 font-mono text-[10px] font-bold opacity-80'>
                                      {player ? computeBaseOvr(player) : '--'}
                                    </span>
                                  </div>
                                  <div className='mt-0.5 flex items-center justify-between gap-1 text-[9px]'>
                                    <span className='font-semibold tracking-wide opacity-70'>{UI_SLOT_LABEL_PT[slotLabel]}</span>
                                    <span className={player ? compatibilityClass(positionCompatibility ?? 'mismatch') : 'opacity-50'}>
                                      {player ? player.position : UI_SLOT_LABEL_PT[slotLabel]}
                                    </span>
                                  </div>
                                  {(() => {
                                    const e = player ? (energyById.get(player.id) ?? 100) : 0
                                    const ec = e >= 70 ? 'bg-success' : e >= 40 ? 'bg-warning' : 'bg-error'
                                    return (
                                      <div className='mt-1 h-1 w-full rounded-full bg-black/30 overflow-hidden'>
                                        {player && <div className={`h-full rounded-full ${ec}`} style={{ width: `${Math.round(e)}%` }} />}
                                      </div>
                                    )
                                  })()}
                                </button>

                                {/* Dropdown do slot */}
                                {isOpen && (
                                  <div className='absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 w-44 bg-base-100 border border-base-content/20 rounded-lg shadow-xl overflow-hidden'>
                                    <div className='px-2 py-1.5 text-[10px] uppercase tracking-widest opacity-40 border-b border-base-content/10'>
                                      Slot {zone}
                                    </div>
                                    <div className='max-h-48 overflow-y-auto'>
                                      {isFilled && (
                                        <button
                                          type='button'
                                          className='w-full text-left px-3 py-1.5 text-xs hover:bg-error/20 text-error'
                                          onClick={() => {
                                            setSlots((curr) => curr.map((s, i) => i === idx ? { ...s, playerId: null } : s))
                                            setSelectedSlotIdx(null)
                                          }}
                                        >
                                          Remover jogador
                                        </button>
                                      )}
                                      {sortedPlayers.length === 0 && (
                                        <p className='px-3 py-2 text-xs opacity-40'>Nenhum disponivel</p>
                                      )}
                                      {compatible.length > 0 && (
                                        <div className='px-2 py-1 text-[10px] opacity-30 uppercase tracking-widest'>
                                          Posicao ideal
                                        </div>
                                      )}
                                      {compatible.map((p) => (
                                        <button
                                          key={p.id}
                                          type='button'
                                          className='w-full text-left px-3 py-1.5 text-xs hover:bg-primary/20 flex items-center justify-between gap-2'
                                          onClick={() => {
                                            setSlots((curr) => {
                                              const next = [...curr]
                                              const existingIdx = next.findIndex((s) => s.playerId === p.id)
                                              if (existingIdx !== -1) {
                                                next[existingIdx] = { ...next[existingIdx], playerId: next[idx].playerId }
                                              }
                                              next[idx] = { ...next[idx], playerId: p.id }
                                              return next
                                            })
                                            setSelectedSlotIdx(null)
                                          }}
                                        >
                                          <div className='min-w-0'>
                                            <div className='font-semibold truncate'>{abbrevName(p.name)}</div>
                                            <div className='opacity-40'>{p.position}</div>
                                          </div>
                                          <span className='font-mono font-bold shrink-0'>{computeBaseOvr(p)}</span>
                                        </button>
                                      ))}
                                      {others.length > 0 && compatible.length > 0 && (
                                        <div className='px-2 py-1 text-[10px] opacity-30 uppercase tracking-widest border-t border-base-content/10'>
                                          Outros
                                        </div>
                                      )}
                                      {others.map((p) => (
                                        <button
                                          key={p.id}
                                          type='button'
                                          className='w-full text-left px-3 py-1.5 text-xs hover:bg-base-300 flex items-center justify-between gap-2 opacity-60'
                                          onClick={() => {
                                            setSlots((curr) => {
                                              const next = [...curr]
                                              const existingIdx = next.findIndex((s) => s.playerId === p.id)
                                              if (existingIdx !== -1) {
                                                next[existingIdx] = {
                                                  ...next[existingIdx],
                                                  playerId: next[idx].playerId,
                                                }
                                              }
                                              next[idx] = { ...next[idx], playerId: p.id }
                                              return next
                                            })
                                            setSelectedSlotIdx(null)
                                          }}
                                        >
                                          <div className='min-w-0'>
                                            <div className='font-semibold truncate'>{abbrevName(p.name)}</div>
                                            <div className='opacity-40'>{p.position}</div>
                                          </div>
                                          <span className='font-mono font-bold shrink-0'>{computeBaseOvr(p)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    </div>

                    <div className='w-full overflow-hidden rounded-lg border border-slate-500/40 bg-slate-900/85 p-3'>
                      <div className='mb-2 flex items-center justify-between'>
                        <h3 className='text-xs font-semibold uppercase tracking-widest text-slate-200/90'>Reservas</h3>
                        <span className='text-[10px] text-slate-300/70'>
                          {benchSelectionIds.length}/{BENCH_SLOT_COUNT}
                        </span>
                      </div>

                      <div className='grid grid-cols-4 gap-1'>
                        {benchSlots.map((benchSlot, benchIdx) => {
                          const player = playerById.get(benchSlot.playerId ?? '')
                          const energy = player ? (energyById.get(player.id) ?? 100) : 0
                          const baseOvr = player ? (baseOvrById.get(player.id) ?? 0) : 0
                          return (
                            <BenchSlotCard
                              key={`bench-slot-${benchIdx}`}
                              benchIdx={benchIdx}
                              player={player}
                              energy={energy}
                              baseOvr={baseOvr}
                              onPointerDown={(ev) => {
                                if (!player) return
                                startDrag({ type: 'bench', idx: benchIdx, playerId: player.id }, ev.clientX, ev.clientY)
                              }}
                              onClick={() => {
                                if (!player) return
                                if (justDroppedRef.current) return
                                setBenchSlots((curr) => {
                                  const next = curr.map((slot) => ({ ...slot }))
                                  next[benchIdx] = { playerId: null }
                                  return next
                                })
                              }}
                              refCallback={(el) => {
                                if (el) benchRefs.current.set(benchIdx, el)
                                else benchRefs.current.delete(benchIdx)
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Lista de jogadores expandida com atributos */}
                  <div className='min-w-0 flex flex-col gap-2'>
                    {/* Filtros */}
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                      <select
                        className='select select-bordered select-sm flex-1'
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value)}
                      >
                        <option value='all'>Todas posicoes</option>
                        <option value='GOL'>Goleiros</option>
                        <option value='ZAG'>Zagueiros</option>
                        <option value='LAT'>Laterais</option>
                        <option value='VOL'>Volantes</option>
                        <option value='MEI'>Meias</option>
                        <option value='ATA'>Atacantes</option>
                      </select>
                      <select
                        className='select select-bordered select-sm flex-1'
                        value={filterEnergy}
                        onChange={(e) => setFilterEnergy(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                      >
                        <option value='all'>Qualquer energia</option>
                        <option value='high'>≥ 70% energia</option>
                        <option value='medium'>40-69% energia</option>
                        <option value='low'>&lt; 40% energia</option>
                      </select>
                    </div>

                    {/* Lista de jogadores em tabela ordenavel */}
                    <div className='min-w-0 flex-1 rounded-lg border border-base-content/10 bg-base-200/35'>
                      {!shouldVirtualizeSquad ? (
                        <div className='min-w-0 overflow-y-auto' style={{ maxHeight: '540px' }}>
                          <Table
                            size='xs'
                            zebra
                            pinRows
                            wrapperClassName='min-w-0'
                            className='w-full table-fixed'
                          >
                            <colgroup>
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '20%' }} />
                            </colgroup>
                            <thead className='bg-base-200/95 text-[11px] uppercase tracking-wide'>
                              <tr>
                                {[
                                  ['name', 'Nome'],
                                  ['age', 'Idade'],
                                  ['position', 'Pos'],
                                  ['energy', 'EN%'],
                                  ['overall', 'OVR'],
                                  ['speed', 'SPD'],
                                  ['shooting', 'Fin'],
                                  ['passing', 'Pas'],
                                  ['dribbling', 'Dri'],
                                  ['defense', 'Def'],
                                  ['stamina', 'Res'],
                                  ['nationality', 'Pais'],
                                  ['marketValue', 'Valor'],
                                ].map(([column, label]) => (
                                  <th
                                    key={column}
                                    className={[
                                      column === 'marketValue' ? 'text-right pr-2' : '',
                                      column === 'age' || column === 'stamina' ? 'pr-2' : '',
                                      column === 'position' || column === 'nationality' ? 'pl-1' : '',
                                    ].join(' ').trim() || undefined}
                                  >
                                    <button
                                      type='button'
                                      className={`flex items-center gap-1 font-semibold${column === 'marketValue' ? ' w-full justify-end' : ''}`}
                                      onClick={() => handleSquadSort(column as SquadSortColumn)}
                                    >
                                      <span>{label}</span>
                                      <span className='opacity-50'>{sortMarker(column as SquadSortColumn)}</span>
                                    </button>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSquad.map((player) => {
                                const isStarter = starterIds.has(player.id)
                                const isBench = benchIds.has(player.id)
                                const energy = energyById.get(player.id) ?? 100
                                const baseOvr = baseOvrById.get(player.id) ?? 0

                                return (
                                  <SquadTableRow
                                    key={player.id}
                                    player={player}
                                    isStarter={isStarter}
                                    isBench={isBench}
                                    energy={energy}
                                    baseOvr={baseOvr}
                                    onPointerDown={(e) => {
                                      if (isStarter || isBench) return
                                      e.preventDefault()
                                      startDrag({ type: 'list', idx: -1, playerId: player.id }, e.clientX, e.clientY)
                                    }}
                                    onClick={() => {
                                      if (!isStarter && !isBench) return
                                      if (isStarter) {
                                        setSlots((curr) => curr.map((slot) => slot.playerId === player.id ? { ...slot, playerId: null } : slot))
                                      } else if (isBench) {
                                        setBenchSlots((curr) => curr.map((slot) => slot.playerId === player.id ? { playerId: null } : slot))
                                      }
                                    }}
                                  />
                                )
                              })}
                            </tbody>
                          </Table>
                        </div>
                      ) : (
                        <div className='min-w-0'>
                          <div
                            className='grid items-center border-b border-base-content/10 bg-base-200/95 px-2 py-1 text-[11px] uppercase tracking-wide'
                            style={{ gridTemplateColumns: SQUAD_GRID_TEMPLATE }}
                          >
                            {[
                              ['name', 'Nome'],
                              ['age', 'Idade'],
                              ['position', 'Pos'],
                              ['energy', 'EN%'],
                              ['overall', 'OVR'],
                              ['speed', 'SPD'],
                              ['shooting', 'Fin'],
                              ['passing', 'Pas'],
                              ['dribbling', 'Dri'],
                              ['defense', 'Def'],
                              ['stamina', 'Res'],
                              ['nationality', 'Pais'],
                              ['marketValue', 'Valor'],
                            ].map(([column, label]) => (
                              <button
                                key={column}
                                type='button'
                                className={[
                                  'flex items-center gap-1 text-left font-semibold',
                                  column === 'marketValue' ? 'justify-end pr-1' : '',
                                  column === 'age' || column === 'stamina' ? 'pr-2' : '',
                                  column === 'position' || column === 'nationality' ? 'pl-1' : '',
                                ].join(' ')}
                                onClick={() => handleSquadSort(column as SquadSortColumn)}
                              >
                                <span>{label}</span>
                                <span className='opacity-50'>{sortMarker(column as SquadSortColumn)}</span>
                              </button>
                            ))}
                          </div>

                          <div
                            ref={squadScrollRef}
                            className='min-w-0 overflow-y-auto'
                            style={{ maxHeight: '540px' }}
                          >
                            <div className='relative' style={{ height: `${squadVirtualizer.getTotalSize()}px` }}>
                              {squadVirtualizer.getVirtualItems().map((virtualRow) => {
                                const player = filteredSquad[virtualRow.index]
                                const isStarter = starterIds.has(player.id)
                                const isBench = benchIds.has(player.id)
                                const isAssigned = isStarter || isBench
                                const energy = energyById.get(player.id) ?? 100
                                const baseOvr = baseOvrById.get(player.id) ?? 0

                                // Classes pré-construídas (evita .join() inline)
                                const bgClass = virtualRow.index % 2 === 0 ? 'bg-base-100/10' : 'bg-transparent'
                                const assignedClass = isStarter 
                                  ? 'bg-success/15 text-base-content hover:bg-success/25' 
                                  : isBench 
                                  ? 'bg-base-content/8 text-base-content hover:bg-base-content/14' 
                                  : 'hover:bg-primary/10'
                                const cursorClass = isAssigned ? 'cursor-pointer' : 'cursor-grab'
                                const className = `absolute left-0 top-0 grid w-full items-center px-2 text-xs ${bgClass} ${cursorClass} ${assignedClass}`

                                return (
                                  <div
                                    key={player.id}
                                    className={className}
                                    style={{
                                      height: `${virtualRow.size}px`,
                                      transform: `translateY(${virtualRow.start}px)`,
                                      gridTemplateColumns: SQUAD_GRID_TEMPLATE,
                                      contentVisibility: 'auto',
                                      willChange: 'transform',
                                    }}
                                    onPointerDown={(e) => {
                                      if (isAssigned) return
                                      e.preventDefault()
                                      startDrag({ type: 'list', idx: -1, playerId: player.id }, e.clientX, e.clientY)
                                    }}
                                    onClick={() => handleRemovePlayerFromLineup(player.id, isStarter, isBench)}
                                    title={player.name}
                                  >
                                    <div className='truncate font-semibold'>{player.name}</div>
                                    <div className='text-right pr-2'>{player.age ?? '-'}</div>
                                    <div className='pl-1'>{player.position}</div>
                                    <div className='text-right font-mono'>{Math.round(energy)}%</div>
                                    <div className='text-right font-mono font-bold'>{baseOvr}</div>
                                    <div className='text-right'>{player.speed}</div>
                                    <div className='text-right'>{player.shooting}</div>
                                    <div className='text-right'>{player.passing}</div>
                                    <div className='text-right'>{player.dribbling}</div>
                                    <div className='text-right'>{player.defense}</div>
                                    <div className='text-right pr-2'>{player.stamina}</div>
                                    <div className='truncate pl-1 pr-2'>{player.nationality ?? '-'}</div>
                                    <div className='text-right font-mono pr-2'>{formatMarketValue(player.marketValue)}</div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fechar dropdown ao clicar fora */}
                {selectedSlotIdx !== null && (
                  <div
                    className='fixed inset-0 z-40'
                    onClick={() => setSelectedSlotIdx(null)}
                  />
                )}

                <div className='mt-4 flex items-center gap-3'>
                  <button
                    type='button'
                    className='btn btn-primary btn-sm'
                    onClick={() => void handleSaveLineup()}
                    disabled={busy || titularesCount < 7}
                  >
                    Salvar Elenco
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'calendario' && <Calendar />}

            {activeTab === 'estatisticas' && (
              <div className='flex flex-col gap-4'>
                <h2 className='text-xl font-bold'>Estatisticas</h2>

                {!snapshot ? (
                  <div className='rounded-lg border border-base-content/10 bg-base-300 p-4 text-sm opacity-70'>
                    Carregando estatisticas...
                  </div>
                ) : (
                  <>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2'>
                      <div className='rounded-lg border border-base-content/10 bg-base-100 p-4'>
                        <div className='text-xs uppercase tracking-widest opacity-50'>Posição atual</div>
                        <div className='mt-2 text-2xl font-bold'>{snapshot.playerPosition}º</div>
                        <div className='mt-1 text-xs opacity-60'>Rodada {snapshot.currentRound}/{snapshot.totalRounds}</div>
                      </div>
                      <div className='rounded-lg border border-base-content/10 bg-base-100 p-4'>
                        <div className='text-xs uppercase tracking-widest opacity-50'>Aproveitamento</div>
                        <div className='mt-2 text-2xl font-bold'>
                          {playerTeamTableEntry?.played
                            ? `${Math.round((playerTeamTableEntry.points / (playerTeamTableEntry.played * 3)) * 100)}%`
                            : '0%'}
                        </div>
                        <div className='mt-1 text-xs opacity-60'>
                          V {playerTeamTableEntry?.wins ?? 0} · E {playerTeamTableEntry?.draws ?? 0} · D {playerTeamTableEntry?.losses ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
                      <div className='rounded-lg border border-base-content/10 bg-base-100 p-4'>
                        <h3 className='text-sm font-semibold uppercase tracking-widest opacity-60'>Raio-X do elenco</h3>
                        {squadInsights ? (
                          <div className='mt-3 space-y-2 text-sm'>
                            <div className='flex items-center justify-between'>
                              <span className='opacity-70'>Total de atletas</span>
                              <span className='font-semibold'>{squadInsights.totalPlayers}</span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='opacity-70'>OVR médio</span>
                              <span className='font-semibold'>{squadInsights.averageOverall}</span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='opacity-70'>Idade média</span>
                              <span className='font-semibold'>{squadInsights.averageAge} anos</span>
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='opacity-70'>Valor médio</span>
                              <span className='font-semibold'>{formatTransferMoney(squadInsights.averageMarketValue)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className='mt-3 text-sm opacity-60'>Sem dados do elenco.</div>
                        )}
                      </div>

                      <div className='rounded-lg border border-base-content/10 bg-base-100 p-4'>
                        <h3 className='text-sm font-semibold uppercase tracking-widest opacity-60'>Destaques do elenco</h3>
                        {squadInsights ? (
                          <div className='mt-3 space-y-3 text-sm'>
                            <div>
                              <div className='text-xs uppercase opacity-50'>Maior OVR</div>
                              <div className='font-semibold'>
                                {squadInsights.bestOverallPlayer.name} · OVR {computeBaseOvr(squadInsights.bestOverallPlayer)}
                              </div>
                            </div>
                            <div>
                              <div className='text-xs uppercase opacity-50'>Maior valor de mercado</div>
                              <div className='font-semibold'>
                                {squadInsights.highestValuePlayer
                                  ? `${squadInsights.highestValuePlayer.name} · ${formatTransferMoney(squadInsights.highestValuePlayer.marketValue ?? 0)}`
                                  : 'Sem atleta avaliado'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className='mt-3 text-sm opacity-60'>Sem dados do elenco.</div>
                        )}
                      </div>
                    </div>

                    <div className='rounded-lg border border-base-content/10 bg-base-100 p-4'>
                      <div className='mb-3 flex flex-wrap items-center gap-3'>
                        <h3 className='text-sm font-semibold uppercase tracking-widest opacity-60'>Histórico por temporada</h3>
                        <select
                          className='select select-sm select-bordered'
                          value={selectedStatsSeason ?? ''}
                          onChange={(e) => setSelectedStatsSeason(Number(e.target.value))}
                          disabled={seasonStatsLoading || seasonStatsHistory.length === 0}
                        >
                          {seasonStatsHistory.length === 0 ? (
                            <option value=''>Sem temporadas fechadas</option>
                          ) : (
                            seasonStatsHistory.map((item) => (
                              <option key={item.season} value={item.season}>
                                {2025 + item.season}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {seasonStatsLoading ? (
                        <div className='text-sm opacity-60'>Carregando histórico da temporada...</div>
                      ) : !selectedSeasonStats ? (
                        <div className='text-sm opacity-60'>Ainda não há temporada encerrada para consulta.</div>
                      ) : (
                        <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'>
                          <div className='rounded-lg border border-base-content/10 bg-base-200 p-3'>
                            <h4 className='text-xs font-semibold uppercase tracking-widest opacity-60 mb-2'>Campeões das ligas</h4>
                            <div className='overflow-x-auto'>
                              <table className='table table-xs w-full'>
                                <thead>
                                  <tr className='uppercase opacity-60'>
                                    <th>Liga</th>
                                    <th>Campeão</th>
                                    <th className='text-right'>Pts</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedSeasonStats.leagueChampions.length === 0 ? (
                                    <tr><td colSpan={3} className='text-center opacity-60'>Sem dados</td></tr>
                                  ) : (
                                    selectedSeasonStats.leagueChampions.map((champ) => (
                                      <tr key={champ.leagueId}>
                                        <td>{champ.leagueName}</td>
                                        <td>{champ.championTeamName}</td>
                                        <td className='text-right'>{champ.points}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className='rounded-lg border border-base-content/10 bg-base-200 p-3'>
                            <h4 className='text-xs font-semibold uppercase tracking-widest opacity-60 mb-2'>Artilheiros</h4>
                            <div className='overflow-x-auto'>
                              <table className='table table-xs w-full'>
                                <thead>
                                  <tr className='uppercase opacity-60'>
                                    <th>Liga</th>
                                    <th>Atleta</th>
                                    <th className='text-right'>Gols</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedSeasonStats.topScorers.length === 0 ? (
                                    <tr><td colSpan={3} className='text-center opacity-60'>Sem dados</td></tr>
                                  ) : (
                                    selectedSeasonStats.topScorers.map((scorer) => (
                                      <tr key={`${scorer.leagueId}-${scorer.playerName}`}>
                                        <td>{scorer.leagueName}</td>
                                        <td>{scorer.playerName} <span className='opacity-60'>({scorer.teamName})</span></td>
                                        <td className='text-right'>{scorer.goals}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className='rounded-lg border border-base-content/10 bg-base-200 p-3'>
                            <h4 className='text-xs font-semibold uppercase tracking-widest opacity-60 mb-2'>Transferências do mundo</h4>
                            <div className='overflow-x-auto'>
                              <table className='table table-xs w-full'>
                                <thead>
                                  <tr className='uppercase opacity-60'>
                                    <th>Jogador</th>
                                    <th>Movimentação</th>
                                    <th className='text-right'>Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedSeasonStats.worldTransfers.length === 0 ? (
                                    <tr><td colSpan={3} className='text-center opacity-60'>Sem dados</td></tr>
                                  ) : (
                                    selectedSeasonStats.worldTransfers.slice(0, 25).map((transfer, idx) => (
                                      <tr key={`${transfer.playerName}-${idx}`}>
                                        <td>{transfer.playerName}</td>
                                        <td>
                                          <span className='opacity-60'>{transfer.leagueName}</span>
                                          <span> · {transfer.sellerTeamName} → {transfer.buyerTeamName}</span>
                                        </td>
                                        <td className='text-right'>{formatTransferMoney(transfer.offerValue)}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'mercado' && (
              <div className='flex flex-col gap-4'>
                <h2 className='text-xl font-bold'>Mercado de Transferências</h2>

                {/* Painel de propostas recebidas pelo clube do jogador */}
                {tmAiOffers.length > 0 && (
                  <div className='rounded-lg border border-warning/40 bg-warning/10 p-4'>
                    <h3 className='font-semibold text-warning mb-3 flex items-center gap-2'>
                      📬 Propostas recebidas pelo seu clube
                      <span className='badge badge-warning badge-sm'>{tmAiOffers.length}</span>
                    </h3>
                    <div className='flex flex-col gap-2'>
                      {tmAiOffers.map((offer) => (
                        <div key={offer.playerId} className='flex items-center gap-3 rounded-md bg-base-200 p-3 text-sm'>
                          <div className='flex-1'>
                            <span className='font-semibold'>{offer.playerName}</span>
                            <span className='opacity-60 ml-2'>← {offer.offeringTeamName}</span>
                            <div className='mt-1 flex flex-wrap items-center gap-2 text-xs opacity-80'>
                              <span className='badge badge-outline badge-xs'>
                                OVR {offer.playerOverall ?? '—'}
                              </span>
                              <span>
                                Valor de mercado: {offer.playerMarketValue ? formatTransferMoney(offer.playerMarketValue) : '—'}
                              </span>
                            </div>
                          </div>
                          <span className='font-mono text-success'>
                            {formatTransferMoney(offer.offerValue)}
                          </span>
                          <button
                            type='button'
                            className='btn btn-xs btn-success'
                            disabled={tmRespondBusy === offer.playerId}
                            onClick={() => void handleRespondAiOffer(offer.playerId, true)}
                          >
                            Aceitar
                          </button>
                          <button
                            type='button'
                            className='btn btn-xs btn-error'
                            disabled={tmRespondBusy === offer.playerId}
                            onClick={() => void handleRespondAiOffer(offer.playerId, false)}
                          >
                            Recusar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtros */}
                <div className='rounded-lg border border-base-content/10 bg-base-300 p-4 flex flex-col gap-3'>
                  <div className='flex flex-wrap gap-3 items-center'>
                    <select
                      className='select select-sm select-bordered w-40'
                      value={tmFilterCountry}
                      onChange={(e) => {
                        setTmFilterCountry(e.target.value)
                        setTmFilterLeague('')
                        setTmFilterClub('')
                      }}
                    >
                      <option value=''>Todos os países</option>
                      {(tmCatalog?.countries ?? []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      className='select select-sm select-bordered w-48'
                      value={tmFilterLeague}
                      onChange={(e) => {
                        setTmFilterLeague(e.target.value)
                        setTmFilterClub('')
                      }}
                      disabled={!tmFilterCountry}
                    >
                      <option value=''>Todas as ligas</option>
                      {tmLeagueOptions.map((l) => (
                        <option key={l.leagueId} value={l.leagueId}>{l.leagueName}</option>
                      ))}
                    </select>
                    <select
                      className='select select-sm select-bordered w-48'
                      value={tmFilterClub}
                      onChange={(e) => setTmFilterClub(e.target.value)}
                      disabled={!tmFilterLeague}
                    >
                      <option value=''>Todos os clubes</option>
                      {tmTeamOptions.map((t) => (
                        <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                      ))}
                    </select>
                    <input
                      type='text'
                      className='input input-sm input-bordered w-48'
                      placeholder='Buscar por nome...'
                      value={tmFilterName}
                      onChange={(e) => setTmFilterName(e.target.value)}
                    />
                    <button
                      type='button'
                      className='btn btn-sm btn-primary'
                      disabled={tmLoading}
                      onClick={handleApplyTransferMarketFilters}
                    >
                      Pesquisar
                    </button>
                    <button
                      type='button'
                      className='btn btn-sm btn-ghost'
                      onClick={() => setTmShowAdvanced((v) => !v)}
                    >
                      {tmShowAdvanced ? '▲' : '▼'} Filtros avançados
                    </button>
                  </div>
                  {tmShowAdvanced && (
                    <div className='flex flex-wrap gap-3 pt-2 border-t border-base-content/10 items-center'>
                      <select
                        className='select select-sm select-bordered w-36'
                        value={tmFilterPos}
                        onChange={(e) => setTmFilterPos(e.target.value)}
                      >
                        <option value=''>Posição</option>
                        {['GOL', 'ZAG', 'LAT-E', 'LAT-D', 'VOL', 'MEI', 'MEI-A', 'PNT-E', 'PNT-D', 'SA', 'ATA'].map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='OVR mín' value={tmFilterOvrMin} onChange={(e) => setTmFilterOvrMin(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='OVR máx' value={tmFilterOvrMax} onChange={(e) => setTmFilterOvrMax(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Idade mín' value={tmFilterAgeMin} onChange={(e) => setTmFilterAgeMin(e.target.value)} min={15} max={45} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Idade máx' value={tmFilterAgeMax} onChange={(e) => setTmFilterAgeMax(e.target.value)} min={15} max={45} />
                      <input type='number' className='input input-sm input-bordered w-32' placeholder='Valor mín (M)' value={tmFilterValMin} onChange={(e) => setTmFilterValMin(e.target.value)} min={0} />
                      <input type='number' className='input input-sm input-bordered w-32' placeholder='Valor máx (M)' value={tmFilterValMax} onChange={(e) => setTmFilterValMax(e.target.value)} min={0} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Vel mín' value={tmFilterSpeedMin} onChange={(e) => setTmFilterSpeedMin(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Vel máx' value={tmFilterSpeedMax} onChange={(e) => setTmFilterSpeedMax(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Fin mín' value={tmFilterShootingMin} onChange={(e) => setTmFilterShootingMin(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Fin máx' value={tmFilterShootingMax} onChange={(e) => setTmFilterShootingMax(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Pas mín' value={tmFilterPassingMin} onChange={(e) => setTmFilterPassingMin(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Pas máx' value={tmFilterPassingMax} onChange={(e) => setTmFilterPassingMax(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Dri mín' value={tmFilterDribblingMin} onChange={(e) => setTmFilterDribblingMin(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Dri máx' value={tmFilterDribblingMax} onChange={(e) => setTmFilterDribblingMax(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Def mín' value={tmFilterDefenseMin} onChange={(e) => setTmFilterDefenseMin(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Def máx' value={tmFilterDefenseMax} onChange={(e) => setTmFilterDefenseMax(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Sta mín' value={tmFilterStaminaMin} onChange={(e) => setTmFilterStaminaMin(e.target.value)} min={0} max={99} />
                      <input type='number' className='input input-sm input-bordered w-24' placeholder='Sta máx' value={tmFilterStaminaMax} onChange={(e) => setTmFilterStaminaMax(e.target.value)} min={0} max={99} />
                      <button
                        type='button'
                        className='btn btn-sm btn-ghost'
                        onClick={() => {
                          setTmFilterPos('')
                          setTmFilterOvrMin('')
                          setTmFilterOvrMax('')
                          setTmFilterAgeMin('')
                          setTmFilterAgeMax('')
                          setTmFilterValMin('')
                          setTmFilterValMax('')
                          setTmFilterSpeedMin('')
                          setTmFilterSpeedMax('')
                          setTmFilterShootingMin('')
                          setTmFilterShootingMax('')
                          setTmFilterPassingMin('')
                          setTmFilterPassingMax('')
                          setTmFilterDribblingMin('')
                          setTmFilterDribblingMax('')
                          setTmFilterDefenseMin('')
                          setTmFilterDefenseMax('')
                          setTmFilterStaminaMin('')
                          setTmFilterStaminaMax('')
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>

                {/* Tabela de jogadores */}
                {tmLoading ? (
                  <div className='text-center py-8 opacity-60'>Carregando mercado...</div>
                ) : (
                  <div className='overflow-x-auto rounded-lg border border-base-content/10'>
                    <table className='table table-sm w-full'>
                      <thead>
                        <tr className='bg-base-300 text-xs uppercase opacity-70'>
                          <th>Nome</th>
                          <th>Pos</th>
                          <th>OVR</th>
                          <th>Idade</th>
                          <th>Nac</th>
                          <th>Clube</th>
                          <th>Liga</th>
                          <th>Valor</th>
                          <th>Tent.</th>
                          <th>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tmPlayers.length === 0 ? (
                          <tr>
                            <td colSpan={10} className='text-center py-8 opacity-50'>Nenhum jogador encontrado.</td>
                          </tr>
                        ) : (
                          tmPlayers.map((player) => (
                            <tr key={player.playerId} className={player.isBlocked ? 'opacity-40' : 'hover:bg-base-200'}>
                              <td className='font-medium'>
                                {player.playerName}
                                {player.isBlocked && (
                                  <span className='ml-2 badge badge-xs badge-neutral'>🔒</span>
                                )}
                              </td>
                              <td className='font-mono text-xs'>{player.position}</td>
                              <td className='font-bold text-primary'>{player.overall}</td>
                              <td>{player.age ?? '—'}</td>
                              <td className='text-xs opacity-70'>{player.nationality ?? '—'}</td>
                              <td className='text-xs'>{player.teamName}</td>
                              <td className='text-xs opacity-60'>{player.leagueName}</td>
                              <td className='font-mono text-xs'>{formatTransferMoney(player.marketValue)}</td>
                              <td className='text-center'>
                                <span className={player.attemptsUsed >= 3 ? 'text-error' : 'opacity-70'}>
                                  {player.attemptsUsed}/3
                                </span>
                              </td>
                              <td>
                                <button
                                  type='button'
                                  className='btn btn-xs btn-primary'
                                  disabled={player.isBlocked}
                                  onClick={() => {
                                    setTmOfferPlayer(player)
                                    setTmOfferAmount(String(Math.round(player.marketValue * 1.1 / 100_000) / 10))
                                    setTmOfferFeedback(null)
                                  }}
                                >
                                  Oferta
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-base-content/10 bg-base-300 px-3 py-2 text-sm'>
                  <span className='opacity-70'>
                    {tmTotalPlayers} atletas encontrados · página {tmPage}/{tmTotalPages}
                  </span>
                  <div className='join'>
                    <button
                      type='button'
                      className='btn btn-sm join-item'
                      disabled={tmPage <= 1 || tmLoading}
                      onClick={() => setTmPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </button>
                    <button
                      type='button'
                      className='btn btn-sm join-item'
                      disabled={tmPage >= tmTotalPages || tmLoading}
                      onClick={() => setTmPage((p) => Math.min(tmTotalPages, p + 1))}
                    >
                      Próxima
                    </button>
                  </div>
                </div>

                {/* Movimentações IA da rodada */}
                {tmAiActivity.length > 0 && (
                  <div className='rounded-lg border border-base-content/10 bg-base-300 p-4'>
                    <h3 className='font-semibold mb-3 opacity-70 text-sm'>📰 Movimentações do mercado nesta rodada</h3>
                    <div className='flex flex-col gap-1'>
                      {tmAiActivity.map((act, i) => (
                        <div key={i} className='text-xs opacity-70'>
                          <span className='text-info'>{act.buyerTeamName}</span>
                          {' contratou '}
                          <span className='font-semibold'>{act.playerName}</span>
                          {' de '}
                          <span className='text-error'>{act.sellerTeamName}</span>
                          {' por '}
                          <span className='font-mono text-success'>{formatTransferMoney(act.offerValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal de oferta */}
                {tmOfferPlayer && (
                  <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50'>
                    <div className='bg-base-100 rounded-lg shadow-2xl p-8 w-full max-w-md'>
                      <h2 className='text-2xl font-bold mb-2'>Fazer Oferta</h2>
                      <p className='text-sm opacity-70 mb-4'>
                        {tmOfferPlayer.playerName} · {tmOfferPlayer.position} · OVR {tmOfferPlayer.overall}
                        {tmOfferPlayer.age ? ` · ${tmOfferPlayer.age} anos` : ''}
                      </p>
                      <div className='flex justify-between text-sm mb-4 gap-4'>
                        <span className='opacity-60'>
                          Valor de mercado: <span className='font-mono'>{formatTransferMoney(tmOfferPlayer.marketValue)}</span>
                        </span>
                        <span className='opacity-60'>
                          Orçamento: <span className='font-mono text-success'>{snapshot ? formatTransferMoney(snapshot.playerTeamBudget) : '—'}</span>
                        </span>
                      </div>
                      <div className='form-control mb-4'>
                        <label className='label'>
                          <span className='label-text'>Valor da oferta (EUR milhões)</span>
                        </label>
                        <input
                          type='number'
                          className='input input-bordered w-full'
                          value={tmOfferAmount}
                          min={0}
                          step={0.1}
                          onChange={(e) => {
                            setTmOfferAmount(e.target.value)
                            setTmOfferFeedback(null)
                          }}
                        />
                      </div>
                      {tmOfferFeedback && (
                        <div className={`alert mb-4 text-sm ${
                          tmOfferFeedback.result === 'accepted' ? 'alert-success' :
                          tmOfferFeedback.result === 'refused' ? 'alert-error' :
                          tmOfferFeedback.result === 'blocked' ? 'alert-neutral' :
                          'alert-warning'
                        }`}>
                          {tmOfferFeedback.result === 'accepted' && '✅ Oferta aceita! O jogador foi contratado.'}
                          {tmOfferFeedback.result === 'refused' && `❌ Oferta recusada. Tentativas usadas: ${tmOfferFeedback.attemptsUsed}/3. Tente um valor maior.`}
                          {tmOfferFeedback.result === 'blocked' && '🔒 Jogador bloqueado após 3 tentativas.'}
                          {tmOfferFeedback.result === 'insufficient_budget' && '⚠️ Orçamento insuficiente para esta oferta.'}
                        </div>
                      )}
                      <div className='flex justify-end gap-3 mt-2'>
                        <button
                          type='button'
                          className='btn btn-ghost'
                          onClick={() => {
                            const wasAccepted = tmOfferFeedback?.result === 'accepted'
                            setTmOfferPlayer(null)
                            setTmOfferFeedback(null)
                            if (wasAccepted) {
                              void Promise.all([
                                listTransferMarket(buildTransferMarketQuery()),
                                listAiPlayerTransferOffers(),
                              ]).then(([page, offers]) => {
                                setTmPlayers(page.items)
                                setTmTotalPages(page.totalPages)
                                setTmTotalPlayers(page.total)
                                setTmAiOffers(offers)
                              })
                            }
                          }}
                        >
                          Fechar
                        </button>
                        {(!tmOfferFeedback || tmOfferFeedback.result === 'refused') && (
                          <button
                            type='button'
                            className='btn btn-primary'
                            disabled={tmOfferBusy || !tmOfferAmount || Number(tmOfferAmount) <= 0}
                            onClick={() => void handleSubmitOffer()}
                          >
                            {tmOfferBusy ? 'Enviando...' : 'Enviar Oferta'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        </main>

        {dragSource && (
          <DragPreviewContainer
            dragSource={dragSource}
            playerName={playerById.get(dragSource.playerId)?.name ?? ''}
          />
        )}

        {/* Modal de Save Game */}
        {showSaveModal && (
          <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50'>
            <div className='bg-base-100 rounded-lg shadow-2xl p-8 w-full max-w-md'>
              <h2 className='text-3xl font-bold mb-6 text-center'>Salvar Jogo</h2>

              <div className='form-control mb-4'>
                <label className='label'>
                  <span className='label-text'>Nome do Save</span>
                </label>
                <input
                  type='text'
                  placeholder='Minha Carreira no Flamengo'
                  className='input input-bordered w-full'
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void (async () => {
                        if (!saveName.trim()) {
                          setSaveStatus('Digite um nome para o save')
                          return
                        }

                        setSaving(true)
                        setSaveStatus('')

                        try {
                          const filename = await saveCareer(saveName.trim())
                          setSaveStatus(`Jogo salvo com sucesso! (${filename})`)
                          setTimeout(() => {
                            setShowSaveModal(false)
                            setSaveName('')
                            setSaveStatus('')
                          }, 1500)
                        } catch (error) {
                          setSaveStatus(`Erro ao salvar: ${error instanceof Error ? error.message : String(error)}`)
                        } finally {
                          setSaving(false)
                        }
                      })()
                    } else if (e.key === 'Escape') {
                      setShowSaveModal(false)
                      setSaveName('')
                      setSaveStatus('')
                    }
                  }}
                  autoFocus
                  maxLength={50}
                />
              </div>

              {saveStatus && (
                <div className={`alert ${saveStatus.includes('Erro') ? 'alert-error' : 'alert-success'} mb-4`}>
                  {saveStatus}
                </div>
              )}

              <div className='flex gap-3'>
                <button
                  type='button'
                  className='btn btn-primary flex-1'
                  onClick={async () => {
                    if (!saveName.trim()) {
                      setSaveStatus('Digite um nome para o save')
                      return
                    }

                    setSaving(true)
                    setSaveStatus('')

                    try {
                      const filename = await saveCareer(saveName.trim())
                      setSaveStatus(`Jogo salvo com sucesso! (${filename})`)
                      setTimeout(() => {
                        setShowSaveModal(false)
                        setSaveName('')
                        setSaveStatus('')
                      }, 1500)
                    } catch (error) {
                      setSaveStatus(`Erro ao salvar: ${error instanceof Error ? error.message : String(error)}`)
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving || !saveName.trim()}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type='button'
                  className='btn btn-ghost'
                  onClick={() => {
                    setShowSaveModal(false)
                    setSaveName('')
                    setSaveStatus('')
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrapper component que fornece DragContext
const CareerWithDragContext = () => {
  const dragPosRef = useRef<{ x: number; y: number } | null>(null)
  
  const dragContextValue: DragContextType = {
    dragPosRef,
    forceUpdateTrigger: 0, // Não usado aqui, apenas placeholder
  }

  return (
    <DragContext.Provider value={dragContextValue}>
      <Career />
    </DragContext.Provider>
  )
}

export default CareerWithDragContext
