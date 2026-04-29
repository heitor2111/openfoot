import ColorSwatch from '@/components/ColorSwatch'
import { useIntl } from '@/hooks/useIntl'
import { cn } from '@/utils/styles'

interface TeamHeaderProps {
  logoRef: string | null
  primaryColor: string
  secondaryColor: string
  tertiaryColor: string | null
  name: string
  shortName: string
  abbrName: string
  state?: string | null
  country?: string | null
}

const TeamHeader = ({
  logoRef,
  primaryColor,
  secondaryColor,
  tertiaryColor,
  name,
  shortName,
  abbrName,
  state,
  country,
}: TeamHeaderProps) => {
  const { t, td } = useIntl()

  return (
    <div className='flex items-center gap-4'>
      <div
        className={cn('size-24 rounded-sm flex items-center justify-center shrink-0', {
          'border-2 border-base-content/25': !logoRef,
        })}
        style={!logoRef ? { backgroundColor: primaryColor } : undefined}
      >
        {logoRef ? (
          <img src={logoRef} alt={shortName} className='size-full object-contain' />
        ) : (
          <span className='text-2xl font-black' style={{ color: secondaryColor }}>
            {abbrName}
          </span>
        )}
      </div>

      <div className='flex-2 min-w-0'>
        <h2 className='text-lg font-bold text-base-content m-0 leading-tight uppercase'>{name}</h2>

        <div className='flex items-center gap-2 mt-1'>
          <span className='text-xs text-base-content/50'>{shortName}</span>

          {state && (
            <>
              <span className='text-base-content/20'>·</span>

              <span className='text-xs text-base-content/50'>
                {td(`static.brazilianStates.${state}.name`)}
              </span>
            </>
          )}

          {country && (
            <>
              <span className='text-base-content/20'>·</span>

              <span className='text-xs text-base-content/50'>
                {td(`static.countries.${country}.countryName`)}
              </span>
            </>
          )}
        </div>

        <div className='flex items-center gap-3 mt-2'>
          <ColorSwatch
            color={primaryColor}
            label={t('dataEditor.detailsPanel.clubPanel.primaryColor')}
          />

          <ColorSwatch
            color={secondaryColor}
            label={t('dataEditor.detailsPanel.clubPanel.secondaryColor')}
          />

          {tertiaryColor && (
            <ColorSwatch
              color={tertiaryColor}
              label={t('dataEditor.detailsPanel.clubPanel.tertiaryColor')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default TeamHeader
