import { useEffect, useMemo, useRef, useState } from 'react'

import {
  fetchLeague,
  getLineup,
  getCareerSnapshot,
  saveLineup,
  simulateCareerRound,
  type CareerSnapshot,
  type MatchEvent,
  type RoundMatch,
  type SimulateRoundResult,
  type SquadPlayer,
} from '@/libs/tauri/career'

type TabKey = 'partida' | 'escalacao'
type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2' | '4-5-1' | '3-4-3'
type PlayStyle =
  | 'Pressing Alto'
  | 'Posse de Bola'
  | 'Contra-ataque'
  | 'Bola Direta'
  | 'Jogo Aereo'
type SpeedKey = 'devagar' | 'normal' | 'rapido' | 'instantaneo'
type LiveState = 'idle' | 'running' | 'done'
type SquadStatus = 'Titular' | 'Reserva'

type SquadRow = SquadPlayer & {
  status: SquadStatus
}

const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1', '3-4-3']
const PLAY_STYLES: PlayStyle[] = [
  'Pressing Alto',
  'Posse de Bola',
  'Contra-ataque',
  'Bola Direta',
  'Jogo Aereo',
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
  shot: { label: 'Chute', cls: 'bg-warning/30 text-warning-content' },
  dangerous: { label: 'Perigo', cls: 'bg-base-300 text-base-content' },
}

type MenuItem = {
  key: TabKey | null
  label: string
  icon: string
  comingSoon?: boolean
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'partida', label: 'Partida', icon: '▶' },
  { key: 'escalacao', label: 'Escalacao', icon: '👥' },
  { key: null, label: 'Calendario', icon: '📅', comingSoon: true },
  { key: null, label: 'Transferencias', icon: '💸', comingSoon: true },
  { key: null, label: 'Departamentos', icon: '🏢', comingSoon: true },
  { key: null, label: 'Estatisticas', icon: '📊', comingSoon: true },
]

const computeOvr = (player: SquadPlayer) => {
  const total =
    player.speed +
    player.shooting +
    player.passing +
    player.dribbling +
    player.defense +
    player.stamina
  return Math.round(total / 6)
}

type SlotZone = 'GOL' | 'DEF' | 'MEI' | 'ATA'

type FieldSlot = {
  zone: SlotZone
  playerId: string | null
}

const FORMATION_SLOTS: Record<Formation, SlotZone[]> = {
  '4-4-2': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-3-3': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
  '3-5-2': ['GOL', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '5-3-2': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
  '4-5-1': ['GOL', 'DEF', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA'],
  '3-4-3': ['GOL', 'DEF', 'DEF', 'DEF', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
}

const buildSlotsWithLineup = (formation: Formation, lineupIds: string[]): FieldSlot[] =>
  FORMATION_SLOTS[formation].map((zone, i) => ({
    zone,
    playerId: lineupIds[i] ?? null,
  }))

const Career = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('partida')
  const [snapshot, setSnapshot] = useState<CareerSnapshot | null>(null)
  const [lastRoundMatches, setLastRoundMatches] = useState<RoundMatch[]>([])
  const [squad, setSquad] = useState<SquadRow[]>([])
  const [formation, setFormation] = useState<Formation>('4-4-2')
  const [playStyle, setPlayStyle] = useState<PlayStyle>('Pressing Alto')
  const [simSpeed, setSimSpeed] = useState<SpeedKey>('normal')
  const [liveState, setLiveState] = useState<LiveState>('idle')
  const [liveMinute, setLiveMinute] = useState(0)
  const [liveHomeGoals, setLiveHomeGoals] = useState(0)
  const [liveAwayGoals, setLiveAwayGoals] = useState(0)
  const [liveEvents, setLiveEvents] = useState<MatchEvent[]>([])
  const [focusMatch, setFocusMatch] = useState<RoundMatch | null>(null)
  const [playedRound, setPlayedRound] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Carregando carreira...')
  const [slots, setSlots] = useState<FieldSlot[]>(() => buildSlotsWithLineup('4-4-2', []))
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null)

  const pendingResult = useRef<SimulateRoundResult | null>(null)

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

  useEffect(() => {
    const loadCareer = async () => {
      setBusy(true)

      try {
        const cached = await getCareerSnapshot()
        setSnapshot(cached)

        const league = await fetchLeague(cached.leagueId)
        const playerTeam = league.teams.find((team) => team.id === cached.playerTeamId)

        if (playerTeam) {
          const savedLineup = await getLineup().catch(() => [])

          setSquad(
            [...playerTeam.squad]
              .map((player) => ({ ...player, status: 'Reserva' as SquadStatus }))
              .sort((a, b) => computeOvr(b) - computeOvr(a))
          )
          setSlots(buildSlotsWithLineup(formation, savedLineup))
        }

        setStatus(`Carreira carregada: rodada ${cached.currentRound}/${cached.totalRounds}`)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Nenhuma carreira ativa')
      } finally {
        setBusy(false)
      }
    }

    void loadCareer()
  }, [])

  useEffect(() => {
    const loadSavedLineupOnTabOpen = async () => {
      if (activeTab !== 'escalacao' || squad.length === 0) return

      try {
        const savedLineup = await getLineup()
        setSlots(buildSlotsWithLineup(formation, savedLineup))
      } catch {
        // noop: mantem estado atual da escalacao
      }
    }

    void loadSavedLineupOnTabOpen()
  }, [activeTab, formation, squad.length])

  useEffect(() => {
    if (liveState !== 'running') return

    if (liveMinute >= 90) {
      setLiveState('done')
      return
    }

    const timer = setTimeout(() => {
      setLiveMinute((current) => current + 1)
    }, SPEED_DELAYS[simSpeed])

    return () => clearTimeout(timer)
  }, [liveMinute, liveState, simSpeed])

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
    setStatus(`Rodada ${result.playedRound} concluida.`)
    setBusy(false)
    pendingResult.current = null
  }, [liveState])

  const handleSlotClick = (idx: number) => {
    setSelectedSlotIdx((current) => (current === idx ? null : idx))
  }

  const handlePlayerClick = (playerId: string) => {
    if (selectedSlotIdx === null) {
      setSlots((current) =>
        current.map((slot) => (slot.playerId === playerId ? { ...slot, playerId: null } : slot))
      )
      return
    }

    setSlots((current) => {
      const next = [...current]
      const existingIdx = next.findIndex((slot) => slot.playerId === playerId)

      if (existingIdx !== -1 && existingIdx !== selectedSlotIdx) {
        next[existingIdx] = { ...next[existingIdx], playerId: next[selectedSlotIdx].playerId }
      }

      next[selectedSlotIdx] = { ...next[selectedSlotIdx], playerId }
      return next
    })
    setSelectedSlotIdx(null)
  }

  const skipLive = () => {
    if (!focusMatch) return

    setLiveEvents(focusMatch.events)
    setLiveHomeGoals(focusMatch.homeGoals)
    setLiveAwayGoals(focusMatch.awayGoals)
    setLiveMinute(90)
    setLiveState('done')
  }

  const handleSaveLineup = async () => {
    const titularIds = slots
      .map((slot) => slot.playerId)
      .filter((id): id is string => id !== null)

    if (titularIds.length !== 11) {
      setStatus('Aloque exatamente 11 jogadores nos slots antes de salvar.')
      return
    }

    setBusy(true)

    try {
      await saveLineup(titularIds)
      setStatus('Escalacao salva com sucesso.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao salvar escalacao')
    } finally {
      setBusy(false)
    }
  }

  const handleSimulateRound = async () => {
    if (!snapshot) return

    setBusy(true)
    setLiveMinute(0)
    setLiveEvents([])
    setLiveHomeGoals(0)
    setLiveAwayGoals(0)
    setLiveState('idle')

    try {
      const result = await simulateCareerRound()
      pendingResult.current = result
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
        setLiveState('done')
        return
      }

      setStatus(`Rodada ${result.playedRound} em andamento...`)
      setBusy(false)
      setLiveState('running')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao simular rodada')
      setBusy(false)
    }
  }

  const isLiveRunning = liveState === 'running'
  const showLiveCard = focusMatch && (liveState === 'running' || liveState === 'done')
  const playerTeamIsHome = focusMatch?.homeTeamId === snapshot?.playerTeamId

  return (
    <div className='min-h-svh bg-base-200 text-base-content'>
      <div className='flex min-h-svh'>
        <aside className='sticky top-0 h-svh w-[180px] shrink-0 border-r border-base-content/10 bg-base-300 px-3 py-6'>
          <h1 className='mb-6 px-2 text-2xl font-bold'>Carreira</h1>

          <nav className='flex flex-col gap-2'>
            {MENU_ITEMS.map((item) => {
              const isActive = item.key !== null && activeTab === item.key

              return (
                <button
                  key={item.label}
                  type='button'
                  className={[
                    'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors',
                    item.comingSoon
                      ? 'cursor-not-allowed bg-base-200/50 opacity-45'
                      : isActive
                      ? 'bg-green-800 text-green-50'
                      : 'bg-base-200/70 hover:bg-base-100',
                  ].join(' ')}
                  onClick={item.key ? () => setActiveTab(item.key) : undefined}
                  disabled={item.comingSoon}
                >
                  <span className='text-base leading-none'>{item.icon}</span>
                  <span className='flex-1'>
                    {item.label}
                    {item.comingSoon ? ' (em breve)' : ''}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className='min-w-0 flex-1 p-6'>
          <div className='mx-auto flex max-w-6xl flex-col gap-4'>
            <p className='rounded-sm border border-base-content/20 bg-base-300 p-3 text-sm'>{status}</p>

            {activeTab === 'partida' && (
              <>
            <div className='flex flex-wrap items-center gap-3'>
              <button
                type='button'
                className='btn btn-accent'
                onClick={() => void handleSimulateRound()}
                disabled={busy || !snapshot || snapshot.currentRound >= snapshot.totalRounds || isLiveRunning}
              >
                Simular proxima rodada
              </button>

              <div className='flex items-center gap-1 ml-auto'>
                <span className='text-xs opacity-60 mr-1'>Vel:</span>
                {(['devagar', 'normal', 'rapido', 'instantaneo'] as SpeedKey[]).map((speed) => (
                  <button
                    key={speed}
                    type='button'
                    className={`btn btn-xs ${simSpeed === speed ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSimSpeed(speed)}
                    disabled={isLiveRunning}
                  >
                    {SPEED_LABELS[speed]}
                  </button>
                ))}
              </div>
            </div>

            {showLiveCard && focusMatch && (
              <div className='bg-base-100 border-2 border-primary/50 rounded-lg p-5'>
                <div className='flex items-center justify-between mb-4'>
                  <span className='text-xs uppercase tracking-widest opacity-50'>
                    {isLiveRunning ? 'Partida em andamento' : `Resultado - Rodada ${playedRound}`}
                  </span>
                  <div className='flex items-center gap-3'>
                    {isLiveRunning && (
                      <button type='button' className='btn btn-ghost btn-xs' onClick={skipLive}>
                        Pular
                      </button>
                    )}
                    <span className='font-mono text-3xl font-bold text-primary tabular-nums'>
                      {String(liveMinute).padStart(2, '0')}&apos;
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-center gap-6 mb-4'>
                  <div
                    className={`flex-1 text-right text-lg font-semibold leading-tight ${
                      playerTeamIsHome ? 'text-primary' : ''
                    }`}
                  >
                    {focusMatch.homeTeamName}
                  </div>
                  <div className='text-5xl font-mono font-bold text-primary min-w-[7rem] text-center tabular-nums'>
                    {liveHomeGoals} - {liveAwayGoals}
                  </div>
                  <div
                    className={`flex-1 text-lg font-semibold leading-tight ${
                      playerTeamIsHome ? '' : 'text-primary'
                    }`}
                  >
                    {focusMatch.awayTeamName}
                  </div>
                </div>

                <div className='w-full bg-base-300 rounded-full h-2 mb-1'>
                  <div
                    className='bg-primary h-2 rounded-full transition-all duration-100'
                    style={{ width: `${(liveMinute / 90) * 100}%` }}
                  />
                </div>
                <div className='flex justify-between text-xs opacity-30 mb-4'>
                  <span>0&apos;</span>
                  <span>45&apos;</span>
                  <span>90&apos;</span>
                </div>

                <div className='bg-base-200 rounded p-3 h-44 overflow-y-auto'>
                  {liveEvents.length === 0 && (
                    <p className='text-xs opacity-30 text-center mt-8'>Aguardando lances...</p>
                  )}

                  {liveEvents.map((event, index) => {
                    const isHome = event.teamSide === 'home'
                    const eventStyle = EVENT_STYLES[event.eventType] ?? {
                      label: event.eventType,
                      cls: 'bg-base-300 text-base-content',
                    }

                    return (
                      <div
                        key={`${event.minute}-${event.eventType}-${index}`}
                        className={`flex items-center gap-2 py-0.5 text-sm font-mono ${
                          isHome ? '' : 'flex-row-reverse'
                        }`}
                      >
                        <span className='text-xs opacity-40 w-7 shrink-0 text-right'>
                          {event.minute}&apos;
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${eventStyle.cls}`}>
                          {eventStyle.label}
                        </span>
                        <span className={event.eventType === 'goal' ? 'font-bold text-primary' : 'opacity-70'}>
                          {event.teamName}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {snapshot && snapshot.nextRoundFixtures.length > 0 && !isLiveRunning && (
              <div className='bg-base-100 border border-base-content/20 rounded-sm p-4'>
                <h3 className='text-lg font-semibold mb-2'>Proximas partidas</h3>
                <ul className='text-sm space-y-1'>
                  {snapshot.nextRoundFixtures.map((fixture) => {
                    const isPlayerGame =
                      fixture.homeTeamId === snapshot.playerTeamId ||
                      fixture.awayTeamId === snapshot.playerTeamId

                    return (
                      <li
                        key={`${fixture.homeTeamId}-${fixture.awayTeamId}`}
                        className={isPlayerGame ? 'font-semibold text-primary' : ''}
                      >
                        {fixture.homeTeamName} x {fixture.awayTeamName}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {lastRoundMatches.length > 0 && !isLiveRunning && (
              <div className='bg-base-100 border border-base-content/20 rounded-sm p-4'>
                <h3 className='text-lg font-semibold mb-2'>Resultados da rodada {playedRound}</h3>
                <div className='space-y-1'>
                  {lastRoundMatches.map((match) => {
                    const isPlayerGame =
                      match.homeTeamId === snapshot?.playerTeamId ||
                      match.awayTeamId === snapshot?.playerTeamId

                    return (
                      <div
                        key={`${match.homeTeamId}-${match.awayTeamId}`}
                        className={`flex items-center px-3 py-1.5 rounded text-sm ${
                          isPlayerGame
                            ? 'bg-primary/15 border border-primary/40 font-semibold'
                            : 'bg-base-200/50'
                        }`}
                      >
                        <span className={`flex-1 text-right ${isPlayerGame ? 'text-primary' : ''}`}>
                          {match.homeTeamName}
                        </span>
                        <span className='mx-4 font-mono tabular-nums'>
                          {match.homeGoals} - {match.awayGoals}
                        </span>
                        <span className={`flex-1 ${isPlayerGame ? 'text-primary' : ''}`}>
                          {match.awayTeamName}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {snapshot && (
              <div className='bg-base-100 border border-base-content/20 rounded-sm p-4'>
                <h2 className='text-xl font-semibold mb-3'>
                  Classificacao - Rodada {snapshot.currentRound}/{snapshot.totalRounds}
                </h2>

                <div className='overflow-x-auto'>
                  <table className='table table-zebra'>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Pts</th>
                        <th>J</th>
                        <th>V</th>
                        <th>E</th>
                        <th>D</th>
                        <th>SG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.table.map((entry, index) => (
                        <tr
                          key={entry.teamId}
                          className={entry.teamId === snapshot.playerTeamId ? 'font-bold text-primary' : ''}
                        >
                          <td>{index + 1}</td>
                          <td>{entry.teamName}</td>
                          <td>{entry.points}</td>
                          <td>{entry.played}</td>
                          <td>{entry.wins}</td>
                          <td>{entry.draws}</td>
                          <td>{entry.losses}</td>
                          <td>{entry.goalDiff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                onChange={(event) => {
                  const f = event.target.value as Formation
                  setFormation(f)
                  setSlots(buildSlotsWithLineup(f, []))
                  setSelectedSlotIdx(null)
                }}
                disabled={busy}
              >
                {FORMATIONS.map((item) => (
                  <option key={item} value={item}>
                    Formacao {item}
                  </option>
                ))}
              </select>

              <select
                className='select select-bordered w-full'
                value={playStyle}
                onChange={(event) => setPlayStyle(event.target.value as PlayStyle)}
                disabled={busy}
              >
                {PLAY_STYLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className='flex items-center justify-between mb-3'>
              <h2 className='text-xl font-semibold'>Escalacao</h2>
              <span className={`text-sm font-semibold ${titularesCount === 11 ? 'text-success' : 'text-warning'}`}>
                {titularesCount}/11
              </span>
            </div>

            <div className='flex flex-col lg:flex-row gap-4'>
              {/* Campo visual */}
              <div className='flex-1 bg-green-800 rounded-lg p-4 flex flex-col gap-3'>
                {slotsByZone.map(({ zone, entries }, zoneIdx) => (
                  <div
                    key={zone}
                    className={`flex flex-col gap-1.5 ${
                      zoneIdx < slotsByZone.length - 1 ? 'border-b border-white/10 pb-3' : ''
                    }`}
                  >
                    <span className='text-green-300/40 text-[10px] font-bold uppercase tracking-widest text-center'>
                      {zone === 'ATA'
                        ? 'Ataque'
                        : zone === 'MEI'
                        ? 'Meio-Campo'
                        : zone === 'DEF'
                        ? 'Defesa'
                        : 'Goleiro'}
                    </span>
                    <div className='flex justify-center gap-2 flex-wrap'>
                      {entries.map(({ slot, idx }) => {
                        const player = squad.find((p) => p.id === slot.playerId)
                        const isSelected = selectedSlotIdx === idx
                        const isFilled = slot.playerId !== null
                        return (
                          <button
                            key={idx}
                            type='button'
                            onClick={() => handleSlotClick(idx)}
                            className={[
                              'rounded-md px-2 py-1.5 text-center w-[4.5rem] text-xs transition-all border-2',
                              isSelected
                                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-100 shadow-lg shadow-yellow-400/20'
                                : isFilled
                                ? 'border-green-400/60 bg-green-900/70 text-green-100 hover:border-green-300'
                                : 'border-green-600/40 bg-green-900/20 text-green-500 border-dashed hover:border-green-500',
                            ].join(' ')}
                          >
                            <div className='font-bold text-[9px] opacity-50 mb-0.5'>{zone}</div>
                            <div className='font-semibold truncate leading-tight'>
                              {player ? player.name.split(' ')[0] : 'Vazio'}
                            </div>
                            {player && (
                              <div className='font-mono text-[10px] opacity-60'>
                                {computeOvr(player)}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lista de jogadores */}
              <div className='w-full lg:w-52 flex-shrink-0 flex flex-col gap-2'>
                <p className='text-xs opacity-50 min-h-[2rem]'>
                  {selectedSlotIdx !== null
                    ? `Slot (${slots[selectedSlotIdx]?.zone}) selecionado — clique num jogador`
                    : 'Clique num slot para selecionar'}
                </p>
                <div className='overflow-y-auto max-h-80 space-y-0.5 pr-1'>
                  {squad.map((player) => {
                    const isAssigned = slots.some((s) => s.playerId === player.id)
                    return (
                      <button
                        key={player.id}
                        type='button'
                        onClick={() => handlePlayerClick(player.id)}
                        className={[
                          'w-full text-left rounded px-2 py-1 text-xs flex items-center justify-between gap-1 transition-colors',
                          isAssigned
                            ? 'opacity-40 hover:opacity-70'
                            : selectedSlotIdx !== null
                            ? 'hover:bg-primary/20'
                            : 'hover:bg-base-300',
                        ].join(' ')}
                      >
                        <div className='min-w-0'>
                          <span className='font-semibold truncate block'>{player.name}</span>
                          <span className='opacity-50'>{player.position}</span>
                        </div>
                        <span className='font-mono font-bold shrink-0'>{computeOvr(player)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className='mt-4 flex items-center gap-3'>
              <button
                type='button'
                className='btn btn-primary btn-sm'
                onClick={() => void handleSaveLineup()}
                disabled={busy || titularesCount !== 11}
              >
                Salvar Escalacao
              </button>
              {selectedSlotIdx !== null && (
                <button
                  type='button'
                  className='btn btn-ghost btn-xs opacity-50'
                  onClick={() => setSelectedSlotIdx(null)}
                >
                  Cancelar selecao
                </button>
              )}
            </div>
          </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Career
