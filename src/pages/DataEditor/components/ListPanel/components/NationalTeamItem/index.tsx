import type { NationalTeam } from '@/types/entities/nationalTeam'

interface NationalTeamItemProps {
  nationalTeam: NationalTeam
}

const NationalTeamItem = ({ nationalTeam }: NationalTeamItemProps) => {
  return (
    <div className='flex items-center justify-between'>
      <span className='font-medium text-sm'>{nationalTeam.shortName}</span>
    </div>
  )
}

export default NationalTeamItem
