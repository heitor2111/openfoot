import { useEffect } from 'react'
import { Outlet } from 'react-router'

import ThemeToggle from '@/components/ThemeToggle'
import useThemeStore from '@/stores/ThemeStore'

export default function AppLayout() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      <Outlet />
      <ThemeToggle />
    </>
  )
}
