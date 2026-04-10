import { useEffect, useState } from 'react'

import type { TabType } from '../../labels'
import { TABS } from '../../labels'

import Input from '@/components/Input'
import { useIntl } from '@/hooks/useIntl'
import type { Club } from '@/types/entities/club'
import type { Coach } from '@/types/entities/coach'
import type { Competition } from '@/types/entities/competition'
import type { NationalTeam } from '@/types/entities/nationalTeam'
import type { Player } from '@/types/entities/player'
import type { Stadium } from '@/types/entities/stadium'
import { cn } from '@/utils/styles'

import ClubItem from './components/ClubItem'
import { CLUB_LIST } from './mocks/club.mock'

interface ListPanelProps {
  activeTab: TabType | null
  search: string
  onSearchChange: React.Dispatch<React.SetStateAction<string>>
  selectedId: string | null
  onSelectedIdChange: React.Dispatch<React.SetStateAction<string | null>>
}

type ListType = Club[] | NationalTeam[] | Player[] | Coach[] | Stadium[] | Competition[]
type ItemType = Club | NationalTeam | Player | Coach | Stadium | Competition

const ListPanel = ({
  activeTab,
  search,
  onSearchChange,
  selectedId,
  onSelectedIdChange,
}: ListPanelProps) => {
  const { t } = useIntl()

  const [list, setList] = useState<ListType>([])

  const fetchList = () => {
    if (activeTab === 'club') {
      const items = CLUB_LIST.filter(
        (club) =>
          club.name.toLowerCase().includes(search.toLowerCase()) ||
          club.shortName.toLowerCase().includes(search.toLowerCase()) ||
          club.abbrName.toLowerCase().includes(search.toLowerCase())
      )

      setList(items)
    }
  }

  const getItemComponent = (item: ItemType) => {
    if (activeTab === 'club') {
      return <ClubItem club={item as Club} />
    }
  }

  useEffect(() => {
    fetchList()
  }, [activeTab, search])

  if (!activeTab) {
    return (
      <aside className='w-72 min-w-72 flex flex-col items-center justify-center h-full overflow-hidden border-r border-base-300 bg-base-200'>
        <h2 className='text-xs font-bold tracking-widest text-base-content uppercase m-0'>
          {t('dataEditor.listPanel.noSelectionTitle')}
        </h2>

        <span className='text-xs text-base-content/50'>
          {t('dataEditor.listPanel.noSelectionSubtitle')}
        </span>
      </aside>
    )
  }

  const TAB_CONFIG = TABS[activeTab]

  return (
    <aside className='w-72 min-w-72 flex flex-col h-full overflow-hidden border-r border-base-300 bg-base-200'>
      {/* List Header */}
      <div className='p-4 pb-2 flex justify-between'>
        <h2 className='text-xs font-bold tracking-widest text-base-content uppercase m-0'>
          {t(TAB_CONFIG.listHeaderId)}
        </h2>

        <span className='text-xs text-base-content/50'>
          {t('dataEditor.listPanel.entries', { count: list.length })}
        </span>
      </div>

      {/* Search bar */}
      <div className='px-4 pb-2 border-b border-base-300'>
        <Input
          size='xs'
          placeholder={t('dataEditor.listPanel.searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* List content */}
      <div className='flex flex-1 flex-col gap-1 overflow-y-auto p-2'>
        {list.map((item) => (
          <div
            className={cn(
              'rounded p-2 cursor-pointer transition-colors border-l-4 border-transparent',
              selectedId === item.id
                ? 'bg-primary/15 border-primary'
                : 'text-base-content/70 hover:bg-base-300 hover:text-base-content'
            )}
            key={item.id}
            onClick={() => onSelectedIdChange(item.id)}
          >
            {getItemComponent(item)}
          </div>
        ))}
      </div>
    </aside>
  )
}

export default ListPanel
