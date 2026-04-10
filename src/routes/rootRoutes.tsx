import type { RouteObject } from 'react-router'

import DataEditor from '@/pages/DataEditor'
import LoadGame from '@/pages/LoadGame'
import MainMenu from '@/pages/MainMenu'
import NewGame from '@/pages/NewGame'

const rootRoutes: RouteObject[] = [
  {
    path: '/',
    element: <MainMenu />,
  },
  {
    path: '/new-game',
    element: <NewGame />,
  },
  {
    path: '/load-game',
    element: <LoadGame />,
  },
  {
    path: '/data-editor',
    element: <DataEditor />,
  },
]

export default rootRoutes
