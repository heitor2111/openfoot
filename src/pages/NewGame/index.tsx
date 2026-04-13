import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { fetchLeagues, startNewCareerMulti, type LeagueOption } from '@/libs/tauri/career'

type Step = 1 | 2 | 3

const STEP_LABELS = ['País', 'Time', 'Confirmar']

const StepIndicator = ({ current }: { current: Step }) => (
  <div className='flex items-center gap-2 text-sm mb-6'>
    {STEP_LABELS.map((label, i) => {
      const num = (i + 1) as Step
      const active = num === current
      const done = num < current
      return (
        <span key={label} className='flex items-center gap-2'>
          {i > 0 && <span className='opacity-30'>→</span>}
          <span
            className={
              active
                ? 'text-success font-semibold'
                : done
                  ? 'text-success/60'
                  : 'opacity-40'
            }
          >
            {active || done ? '●' : '○'} {label}
          </span>
        </span>
      )
    })}
  </div>
)

const NewGame = () => {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [leagues, setLeagues] = useState<LeagueOption[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [mainLeagueId, setMainLeagueId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchLeagues()
        setLeagues(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao carregar ligas')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // Países únicos disponíveis
  const countries = useMemo(
    () => [...new Set(leagues.map((l) => l.country).filter(Boolean))].sort(),
    [leagues],
  )

  // Ligas derivadas dos países selecionados
  const selectedLeagueIds = useMemo(
    () => leagues.filter((l) => selectedCountries.includes(l.country)).map((l) => l.id),
    [leagues, selectedCountries],
  )

  const mainLeague = useMemo(
    () => leagues.find((l) => l.id === mainLeagueId) ?? null,
    [leagues, mainLeagueId],
  )

  // Reset team when main league changes
  useEffect(() => {
    if (!mainLeague) return
    if (!mainLeague.teams.some((t) => t.id === teamId)) {
      setTeamId(mainLeague.teams[0]?.id ?? '')
    }
  }, [mainLeagueId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCountry = (country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country],
    )
  }

  const goToStep2 = () => {
    if (selectedLeagueIds.length === 0) return
    const newMain =
      mainLeagueId && selectedLeagueIds.includes(mainLeagueId)
        ? mainLeagueId
        : selectedLeagueIds[0]
    setMainLeagueId(newMain)
    setStep(2)
  }

  const goToStep3 = () => {
    if (!mainLeagueId || !teamId) return
    setStep(3)
  }

  const handleStart = async () => {
    if (!mainLeagueId || !teamId) return
    setBusy(true)
    setError(null)
    try {
      const allIds = selectedLeagueIds.includes(mainLeagueId)
        ? selectedLeagueIds
        : [...selectedLeagueIds, mainLeagueId]
      await startNewCareerMulti(mainLeagueId, teamId, allIds)
      navigate('/career', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao iniciar carreira')
    } finally {
      setBusy(false)
    }
  }

  const selectedTeamName = mainLeague?.teams.find((t) => t.id === teamId)?.name ?? ''
  const backgroundLeagues = leagues.filter(
    (l) => l.id !== mainLeagueId && selectedLeagueIds.includes(l.id),
  )

  const cardBase =
    'rounded-md border-2 p-4 text-left transition-colors cursor-pointer bg-base-100'
  const cardSelected = 'border-success text-success'
  const cardIdle = 'border-base-content/20 hover:border-base-content/40'

  return (
    <div className='min-h-svh bg-base-200 text-base-content flex flex-col'>
      <div className='flex-1 p-6 max-w-4xl mx-auto w-full flex flex-col'>
        <h1 className='text-3xl font-bold mb-4'>Novo Jogo</h1>

        {loading ? (
          <p className='text-sm opacity-70'>Carregando ligas...</p>
        ) : error && step !== 3 ? (
          <p className='text-sm text-error'>{error}</p>
        ) : (
          <>
            <StepIndicator current={step} />

            {/* ── Passo 1: Escolher países ── */}
            {step === 1 && (
              <div className='flex flex-col gap-4'>
                <p className='text-sm opacity-70'>
                  Selecione os países. Todas as ligas de cada país serão incluídas na simulação.
                </p>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                  {countries.map((country) => {
                    const selected = selectedCountries.includes(country)
                    const leagueCount = leagues.filter((l) => l.country === country).length
                    return (
                      <button
                        key={country}
                        type='button'
                        onClick={() => toggleCountry(country)}
                        className={`${cardBase} ${selected ? cardSelected : cardIdle}`}
                      >
                        <div className='font-semibold text-sm'>{country}</div>
                        <div className='text-xs opacity-60 mt-1'>
                          {leagueCount} {leagueCount === 1 ? 'liga' : 'ligas'}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Passo 2: Escolher time ── */}
            {step === 2 && (
              <div className='flex flex-col gap-4'>
                <p className='text-sm opacity-70'>
                  Escolha sua liga principal e o time que você vai gerenciar.
                </p>

                <div>
                  <label className='text-xs opacity-60 uppercase tracking-wide mb-1 block'>
                    Liga principal
                  </label>
                  <select
                    className='select select-bordered w-full max-w-xs'
                    value={mainLeagueId}
                    onChange={(e) => setMainLeagueId(e.target.value)}
                  >
                    {leagues
                      .filter((l) => selectedLeagueIds.includes(l.id))
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
                  {(mainLeague?.teams ?? []).map((team) => {
                    const selected = team.id === teamId
                    return (
                      <button
                        key={team.id}
                        type='button'
                        onClick={() => setTeamId(team.id)}
                        className={`${cardBase} ${selected ? cardSelected : cardIdle}`}
                      >
                        <div className='font-semibold text-sm'>{team.name}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Passo 3: Confirmar ── */}
            {step === 3 && (
              <div className='flex flex-col gap-4'>
                <p className='text-sm opacity-70'>
                  Confirme os dados antes de iniciar sua carreira.
                </p>

                <div className='bg-base-100 border border-base-content/20 rounded-md p-5 flex flex-col gap-5'>
                  <div>
                    <div className='text-xs opacity-60 uppercase tracking-wide mb-1'>
                      Liga principal
                    </div>
                    <div className='text-lg font-semibold text-success'>{mainLeague?.name}</div>
                    {mainLeague?.country && (
                      <div className='text-sm opacity-60'>{mainLeague.country}</div>
                    )}
                  </div>

                  <div>
                    <div className='text-xs opacity-60 uppercase tracking-wide mb-1'>Seu time</div>
                    <div className='text-lg font-semibold'>{selectedTeamName}</div>
                  </div>

                  <div>
                    <div className='text-xs opacity-60 uppercase tracking-wide mb-2'>
                      Países selecionados
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {selectedCountries.map((c) => (
                        <span
                          key={c}
                          className='text-xs bg-base-300 rounded-sm px-2 py-1 border border-base-content/15'
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {backgroundLeagues.length > 0 && (
                    <div>
                      <div className='text-xs opacity-60 uppercase tracking-wide mb-2'>
                        Ligas em background
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {backgroundLeagues.map((l) => (
                          <span
                            key={l.id}
                            className='text-xs bg-base-300 rounded-sm px-2 py-1 border border-base-content/15'
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {error && <p className='text-sm text-error'>{error}</p>}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Rodapé com navegação ── */}
      {!loading && (
        <div className='sticky bottom-0 bg-base-300 border-t border-base-content/15 px-6 py-4 flex justify-between items-center'>
          <div>
            {step > 1 && (
              <button
                type='button'
                className='btn btn-ghost'
                onClick={() => setStep((step - 1) as Step)}
                disabled={busy}
              >
                ← Voltar
              </button>
            )}
          </div>

          <div>
            {step === 1 && (
              <button
                type='button'
                className='btn btn-primary'
                onClick={goToStep2}
                disabled={selectedLeagueIds.length === 0}
              >
                Próximo →
              </button>
            )}

            {step === 2 && (
              <button
                type='button'
                className='btn btn-primary'
                onClick={goToStep3}
                disabled={!mainLeagueId || !teamId}
              >
                Próximo →
              </button>
            )}

            {step === 3 && (
              <button
                type='button'
                className='btn btn-success'
                onClick={() => void handleStart()}
                disabled={busy}
              >
                {busy ? (
                  <span className='loading loading-spinner loading-sm' />
                ) : (
                  '✅ Iniciar Carreira'
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NewGame
