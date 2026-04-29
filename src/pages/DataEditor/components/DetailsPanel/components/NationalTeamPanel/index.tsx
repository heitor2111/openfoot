import type { NationalTeamDetails } from '../../types'
import TeamHeader from '../TeamHeader'
import IconStadium from '~icons/mdi/stadium-variant'
import IconWhistle from '~icons/mdi/whistle'
import IconShirt from '~icons/streamline-flex/shirt-solid'

import KitSlot from '@/components/KitSlot'
import { useIntl } from '@/hooks/useIntl'
import { useTheme } from '@/hooks/useTheme'

interface NationalTeamPanelProps {
  nationalTeam: NationalTeamDetails
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className='flex justify-between items-center py-1 gap-4'>
    <span className='text-xs text-base-content/50'>{label}</span>
    <span className='text-xs font-medium text-base-content truncate'>{value}</span>
  </div>
)

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className='flex items-center gap-2 mb-2'>
    <Icon className='text-primary text-sm' />
    <h3 className='text-xs font-bold tracking-widest text-base-content uppercase m-0'>{title}</h3>
  </div>
)

const NationalTeamPanel = ({ nationalTeam }: NationalTeamPanelProps) => {
  const { t, td } = useIntl()
  const theme = useTheme({
    primary: nationalTeam.primaryColor,
    secondary: nationalTeam.secondaryColor,
    tertiary: nationalTeam.tertiaryColor,
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
            logoRef={nationalTeam.logoRef}
            primaryColor={nationalTeam.primaryColor}
            secondaryColor={nationalTeam.secondaryColor}
            tertiaryColor={nationalTeam.tertiaryColor}
            name={nationalTeam.name}
            shortName={nationalTeam.shortName}
            abbrName={nationalTeam.abbrName}
          />
        </div>

        {/* Flag */}
        <div className='flex items-center justify-end'>
          {nationalTeam.flagRef ? (
            <div className='h-24 rounded-sm overflow-hidden border border-base-content/10 shadow-sm'>
              <img
                src={nationalTeam.flagRef}
                alt={nationalTeam.country}
                className='h-full w-auto object-cover'
              />
            </div>
          ) : (
            <div
              className='h-16 w-24 rounded-sm flex items-center justify-center border-2 border-base-content/25'
              style={{ backgroundColor: nationalTeam.primaryColor }}
            >
              <span className='text-sm font-black' style={{ color: nationalTeam.secondaryColor }}>
                {nationalTeam.abbrName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Coach, Stadium & Uniforms ── */}
      <div className='grid grid-cols-11 gap-2 px-5 pb-5'>
        <div className='bg-base-100 rounded-sm p-3 border border-base-content/5 col-span-3 2xl:col-span-4'>
          <SectionHeader
            icon={IconWhistle}
            title={t('dataEditor.detailsPanel.nationalTeamPanel.coachSection')}
          />

          {nationalTeam.coach ? (
            <div className='flex flex-col gap-0.5 mt-1'>
              <InfoRow
                label={t('dataEditor.detailsPanel.nationalTeamPanel.coachName')}
                value={nationalTeam.coach.name}
              />

              <InfoRow
                label={t('dataEditor.detailsPanel.nationalTeamPanel.coachCountry')}
                value={td(`static.countries.${nationalTeam.coach.country}.countryName`)}
              />

              {nationalTeam.coach.favoriteTactic && (
                <InfoRow
                  label={t('dataEditor.detailsPanel.nationalTeamPanel.coachTactic')}
                  value={nationalTeam.coach.favoriteTactic}
                />
              )}
            </div>
          ) : (
            <p className='text-xs text-base-content/40 italic m-0 mt-2'>
              {t('dataEditor.detailsPanel.nationalTeamPanel.noCoach')}
            </p>
          )}
        </div>

        <div className='bg-base-100 rounded-sm p-3 border border-base-content/5 col-span-4'>
          <SectionHeader
            icon={IconStadium}
            title={t('dataEditor.detailsPanel.nationalTeamPanel.stadiumSection')}
          />

          <div className='flex flex-col gap-0.5 mt-1'>
            <InfoRow
              label={t('dataEditor.detailsPanel.nationalTeamPanel.stadiumName')}
              value={nationalTeam.stadium.name}
            />

            {nationalTeam.stadium.nickname && (
              <InfoRow
                label={t('dataEditor.detailsPanel.nationalTeamPanel.stadiumNickname')}
                value={nationalTeam.stadium.nickname}
              />
            )}

            <InfoRow
              label={t('dataEditor.detailsPanel.nationalTeamPanel.stadiumCapacity')}
              value={nationalTeam.stadium.capacity.toLocaleString('pt-BR')}
            />
          </div>
        </div>

        <div className='bg-base-100 flex flex-col rounded-sm p-3 border border-base-content/5 col-span-4 2xl:col-span-3'>
          <SectionHeader
            icon={IconShirt}
            title={t('dataEditor.detailsPanel.nationalTeamPanel.uniformsSection')}
          />

          <div className='flex-1 flex items-center justify-center gap-4'>
            <KitSlot
              label={t('dataEditor.detailsPanel.nationalTeamPanel.primaryKit')}
              imageRef={nationalTeam.primaryKitRef}
              fallbackColor={nationalTeam.primaryColor}
            />

            <KitSlot
              label={t('dataEditor.detailsPanel.nationalTeamPanel.secondaryKit')}
              imageRef={nationalTeam.secondaryKitRef}
              fallbackColor={nationalTeam.secondaryColor}
            />

            {nationalTeam.tertiaryKitRef || nationalTeam.tertiaryColor ? (
              <KitSlot
                label={t('dataEditor.detailsPanel.nationalTeamPanel.tertiaryKit')}
                imageRef={nationalTeam.tertiaryKitRef}
                fallbackColor={nationalTeam.tertiaryColor}
              />
            ) : null}

            <KitSlot
              label={t('dataEditor.detailsPanel.nationalTeamPanel.goalkeeperKit')}
              imageRef={nationalTeam.goalkeeperKitRef}
              fallbackColor='gray'
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default NationalTeamPanel
