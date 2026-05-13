import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppTheme =
  | 'openfoot'
  | 'openfoot-dark'
  | 'openfoot-light'
  | 'openfoot-blue'
  | 'openfoot-red'

export const THEMES: { id: AppTheme; label: string; preview: string }[] = [
  { id: 'openfoot',       label: 'Verde',    preview: '#22c55e' },
  { id: 'openfoot-dark',  label: 'Escuro',   preview: '#6b7280' },
  { id: 'openfoot-light', label: 'Claro',    preview: '#d1fae5' },
  { id: 'openfoot-blue',  label: 'Azul',     preview: '#3b82f6' },
  { id: 'openfoot-red',   label: 'Vermelho', preview: '#ef4444' },
]

interface ThemeState {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'openfoot',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'openfoot-theme' },
  ),
)

export default useThemeStore
