import { useIntl as vanillaUseIntl } from 'react-intl'

import type { MessageId } from '@/libs/intl/types'
import { useLocaleStore } from '@/stores/LocaleStore'

type FormatValues = Record<string, string | number>

/**
 * Typed wrapper around react-intl's `useIntl`.
 *
 * - `t(id)` — statically-typed key with full autocomplete.
 * - `td(id)` — escape hatch for dynamically-built keys (e.g. enum lookups).
 *    Prefer `t()` whenever possible; use `td()` only when the key is built at runtime.
 * - `locale` — current active locale.
 * - `setLocale(locale)` — switch locale (persisted to localStorage).
 */
export function useIntl() {
  const intl = vanillaUseIntl()
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  return {
    intl,
    locale,
    setLocale,
    t: (id: MessageId, values?: FormatValues) => intl.formatMessage({ id }, values),
    td: (id: string, values?: FormatValues) => intl.formatMessage({ id: id as MessageId }, values),
  }
}
