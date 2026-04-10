import type { RouteObject } from 'react-router'

import DataEditor from '@/pages/DataEditor'
import MainMenu from '@/pages/MainMenu'

const rootRoutes: RouteObject[] = [
  {
    path: '/',
    element: <MainMenu />,
  },
  {
    path: '/data-editor',
    element: <DataEditor />,
  },
]

export default rootRoutes
