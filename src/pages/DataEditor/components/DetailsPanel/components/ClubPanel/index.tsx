import type { ClubDetails } from '../../types'
import TeamHeader from '../TeamHeader'
import dayjs from 'dayjs'
import IconStadium from '~icons/mdi/stadium-variant'
import IconWhistle from '~icons/mdi/whistle'
import IconShirt from '~icons/streamline-flex/shirt-solid'

import KitSlot from '@/components/KitSlot'
import RatingBar from '@/components/RatingBar'
import Table from '@/components/Table'
import Tooltip from '@/components/Tooltip'
import { useIntl } from '@/hooks/useIntl'
import { useTheme } from '@/hooks/useTheme'
import type { Player } from '@/types/entities/player'
import { PlayerPosition } from '@/types/enums/player'
import { cn } from '@/utils/styles'

interface ClubPanelProps {
  club: ClubDetails
}

const POSITION_COLOR: Record<PlayerPosition, string> = {
  [PlayerPosition.GOALKEEPER]: 'bg-warning/20 text-warning',
  [PlayerPosition.DEFENDER]: 'bg-info/20 text-info',
  [PlayerPosition.SIDE_BACK]: 'bg-info/20 text-info',
  [PlayerPosition.MIDFIELDER]: 'bg-success/20 text-success',
  [PlayerPosition.FORWARD]: 'bg-error/20 text-error',
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='flex justify-between items-center py-1 gap-4'>
    <span className='text-xs text-base-content/50'>{label}</span>
    <span className='text-xs font-medium text-base-content truncate'>{value}</span>
  </div>
)

const SectionHeader = ({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType
  title: string
  badge?: string
}) => (
  <div className='flex items-center gap-2 mb-2'>
    <Icon className='text-primary text-sm' />

    <h3 className='text-xs font-bold tracking-widest text-base-content uppercase m-0'>{title}</h3>

    {badge && (
      <span className='ml-auto text-[10px] font-medium text-base-content/50 bg-base-300 px-1.5 py-0.5 rounded-sm'>
        {badge}
      </span>
    )}
  </div>
)

const PlayerRow = ({ player, td }: { player: Player; td: (id: string) => string }) => {
  const age = player.birthdate ? dayjs().startOf('year').diff(dayjs(player.birthdate), 'year') : '—'

  return (
    <tr>
      <td>
        <div className='flex justify-between items-center'>
          <span className='font-medium'>{player.name}</span>

          {player.specialSkills.length > 0 && (
            <div className='flex gap-0.5 mt-0.5'>
              {player.specialSkills.map((skill) => (
                <span
                  key={skill}
                  className='text-[9px] bg-accent/15 text-accent px-1 py-px rounded-sm font-medium'
                >
                  {td(`dataEditor.detailsPanel.clubPanel.specialSkills.${skill}`)}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className='text-center'>
        <span
          className={cn(
            'text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm',
            POSITION_COLOR[player.position]
          )}
        >
          {player.position}
        </span>
      </td>
      <td className='text-center'>{age}</td>
      <td className='text-center'>{td(`static.countries.${player.country}.countryName`)}</td>
      <td className='text-center'>
        {td(`dataEditor.detailsPanel.clubPanel.feet.${player.dominantFoot}`)}
      </td>
    </tr>
  )
}

const ClubPanel = ({ club }: ClubPanelProps) => {
  const { t, td } = useIntl()
  const theme = useTheme({
    primary: club.primaryColor,
    secondary: club.secondaryColor,
    tertiary: club.tertiaryColor,
  })

  return (
    <div
      className='flex-1 flex flex-col overflow-hidden bg-linear-to-tl from-base-100 to-base-300'
      style={theme}
    >
      {/* ── Header ── */}
      <div className='p-5 flex items-center gap-4'>
        <div className='flex-1'>
          <TeamHeader
            logoRef={club.logoRef}
            primaryColor={club.primaryColor}
            secondaryColor={club.secondaryColor}
            tertiaryColor={club.tertiaryColor}
            name={club.name}
            shortName={club.shortName}
            abbrName={club.abbrName}
            state={club.state}
            country={club.country}
          />
        </div>

        {/* ── Ratings ── */}
        <div className='min-w-sm flex flex-col gap-2'>
          <RatingBar
            label={t('dataEditor.detailsPanel.clubPanel.reputation')}
            value={club.reputation}
            max={5}
            displayValue={td(
              `dataEditor.detailsPanel.clubPanel.reputationLevels.${club.reputation}`
            )}
          />

          <RatingBar
            label={t('dataEditor.detailsPanel.clubPanel.competitivePower')}
            value={club.competitivePower}
            max={25}
          />

          <RatingBar
            label={t('dataEditor.detailsPanel.clubPanel.financialPower')}
            value={club.financialPower}
            max={25}
          />
        </div>
      </div>

      {/* ── Stadium & Coach ── */}
      <div className='grid grid-cols-11 gap-2 px-5 pb-5'>
        <div className='bg-base-100 rounded-sm p-3 border border-base-content/5 col-span-3 2xl:col-span-4'>
          <SectionHeader
            icon={IconWhistle}
            title={t('dataEditor.detailsPanel.clubPanel.coachSection')}
          />

          {club.coach ? (
            <div className='flex flex-col gap-0.5 mt-1'>
              <InfoRow
                label={t('dataEditor.detailsPanel.clubPanel.coachName')}
                value={club.coach.name}
              />

              <InfoRow
                label={t('dataEditor.detailsPanel.clubPanel.coachCountry')}
                value={td(`static.countries.${club.coach.country}.countryName`)}
              />

              {club.coach.favoriteTactic && (
                <InfoRow
                  label={t('dataEditor.detailsPanel.clubPanel.coachTactic')}
                  value={club.coach.favoriteTactic}
                />
              )}
            </div>
          ) : (
            <p className='text-xs text-base-content/40 italic m-0 mt-2'>
              {t('dataEditor.detailsPanel.clubPanel.noCoach')}
            </p>
          )}
        </div>

        <div className='bg-base-100 rounded-sm p-3 border border-base-content/5 col-span-4'>
          <SectionHeader
            icon={IconStadium}
            title={t('dataEditor.detailsPanel.clubPanel.stadiumSection')}
          />
          <div className='flex flex-col gap-0.5 mt-1'>
            <InfoRow
              label={t('dataEditor.detailsPanel.clubPanel.stadiumName')}
              value={club.stadium.name}
            />
            {club.stadium.nickname && (
              <InfoRow
                label={t('dataEditor.detailsPanel.clubPanel.stadiumNickname')}
                value={club.stadium.nickname}
              />
            )}
            <InfoRow
              label={t('dataEditor.detailsPanel.clubPanel.stadiumCapacity')}
              value={club.stadium.capacity.toLocaleString('pt-BR')}
            />
          </div>
        </div>

        <div className='bg-base-100 flex flex-col rounded-sm p-3 border border-base-content/5 col-span-4 2xl:col-span-3'>
          <SectionHeader
            icon={IconShirt}
            title={t('dataEditor.detailsPanel.clubPanel.uniformsSection')}
          />

          <div className='flex-1 flex items-center justify-center gap-4'>
            <KitSlot
              label={t('dataEditor.detailsPanel.clubPanel.primaryKit')}
              imageRef={club.primaryKitRef}
              fallbackColor={club.primaryColor}
            />

            <KitSlot
              label={t('dataEditor.detailsPanel.clubPanel.secondaryKit')}
              imageRef={club.secondaryKitRef}
              fallbackColor={club.secondaryColor}
            />

            {club.tertiaryKitRef || club.tertiaryColor ? (
              <KitSlot
                label={t('dataEditor.detailsPanel.clubPanel.tertiaryKit')}
                imageRef={club.tertiaryKitRef}
                fallbackColor={club.tertiaryColor}
              />
            ) : null}

            <KitSlot
              label={t('dataEditor.detailsPanel.clubPanel.goalkeeperKit')}
              imageRef={club.goalkeeperKitRef}
              fallbackColor='gray'
            />
          </div>
        </div>
      </div>

      {/* ── Players ── */}
      <div className='px-5 pb-5 flex-1 flex flex-col min-h-0'>
        <SectionHeader
          icon={IconShirt}
          title={t('dataEditor.detailsPanel.clubPanel.playersSection')}
          badge={t('dataEditor.detailsPanel.clubPanel.playersCount', {
            count: club.players.length,
          })}
        />

        {club.players.length === 0 ? (
          <div className='flex items-center justify-center py-8'>
            <p className='text-xs text-base-content/40 italic m-0'>
              {t('dataEditor.detailsPanel.clubPanel.noPlayers')}
            </p>
          </div>
        ) : (
          <Table
            size='xs'
            pinRows
            wrapperClassName='rounded-sm border border-base-content/5 bg-base-100 flex-1 overflow-y-auto'
          >
            <thead>
              <tr>
                <th>{t('dataEditor.detailsPanel.clubPanel.playerName')}</th>

                <th className='text-center'>
                  {t('dataEditor.detailsPanel.clubPanel.playerPosition')}
                </th>

                <th className='text-center'>
                  <Tooltip
                    tip={t('dataEditor.detailsPanel.clubPanel.playerAgeDisclaimer')}
                    placement='bottom'
                  >
                    {t('dataEditor.detailsPanel.clubPanel.playerAge')}
                  </Tooltip>
                </th>

                <th className='text-center'>
                  {t('dataEditor.detailsPanel.clubPanel.playerCountry')}
                </th>

                <th className='text-center'>{t('dataEditor.detailsPanel.clubPanel.playerFoot')}</th>
              </tr>
            </thead>

            <tbody>
              {club.players.map((player) => (
                <PlayerRow key={player.id} player={player} td={td} />
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  )
}

export default ClubPanel
