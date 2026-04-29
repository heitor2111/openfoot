import InfoRow from '../InfoRow'
import IconWhistle from '~icons/mdi/whistle'

import { useIntl } from '@/hooks/useIntl'
import type { Coach } from '@/types/entities/coach'

interface CoachCardProps {
  coach: Coach | null
}

const CoachCard = ({ coach }: CoachCardProps) => {
  const { t, td } = useIntl()

  return (
    <div className='bg-base-100 rounded-sm p-3 border border-base-content/5 col-span-3 2xl:col-span-4'>
      <div className='flex items-center gap-2 mb-2'>
        <IconWhistle className='text-primary text-sm' />

        <h3 className='text-xs font-bold tracking-widest text-base-content uppercase m-0'>
          {t('dataEditor.detailsPanel.nationalTeamPanel.coachSection')}
        </h3>
      </div>

      {coach ? (
        <div className='flex flex-col gap-0.5 mt-1'>
          <InfoRow
            label={t('dataEditor.detailsPanel.nationalTeamPanel.coachName')}
            value={coach.name}
          />

          <InfoRow
            label={t('dataEditor.detailsPanel.nationalTeamPanel.coachCountry')}
            value={td(`static.countries.${coach.country}.countryName`)}
          />

          {coach.favoriteTactic && (
            <InfoRow
              label={t('dataEditor.detailsPanel.nationalTeamPanel.coachTactic')}
              value={coach.favoriteTactic}
            />
          )}
        </div>
      ) : (
        <p className='text-xs text-base-content/40 italic m-0 mt-2'>
          {t('dataEditor.detailsPanel.nationalTeamPanel.noCoach')}
        </p>
      )}
    </div>
  )
}

export default CoachCard
