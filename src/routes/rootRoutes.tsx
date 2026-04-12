import type { RouteObject } from 'react-router'

import Career from '@/pages/Career'
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
    path: '/career',
    element: <Career />,
  },
  {
    path: '/data-editor',
    element: <DataEditor />,
  },
]

export default rootRoutes
