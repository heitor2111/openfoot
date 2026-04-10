import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { SupportedLocale } from '@/libs/intl/config'
import { resolveLocale } from '@/libs/intl/config'

const STORAGE_KEY = 'openfoot-locale'

interface LocaleState {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

/**
 * Resolves the initial locale synchronously (no flicker):
 * 1. localStorage (user's saved preference)
 * 2. navigator.language (browser default)
 * 3. pt-BR (fallback)
 */
function getInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as { state?: { locale?: string } }
      if (parsed.state?.locale) {
        return resolveLocale(parsed.state.locale)
      }
    }
  } catch {
    // Corrupted or unavailable localStorage — fall through
  }

  return resolveLocale(navigator.language)
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: getInitialLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    { name: STORAGE_KEY }
  )
)
