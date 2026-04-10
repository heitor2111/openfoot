import { useIntl } from '@/hooks/useIntl'
import type { Club } from '@/types/entities/club'

interface ClubItemProps {
  club: Club
}

const ClubItem = ({ club }: ClubItemProps) => {
  const { td } = useIntl()

  return (
    <div className='flex items-center justify-between'>
      <span className='font-medium text-sm'>{club.shortName}</span>

      <span className='text-xs text-base-content/50'>
        {td(`static.countries.${club.country}.countryName`)}
      </span>
    </div>
  )
}

export default ClubItem
