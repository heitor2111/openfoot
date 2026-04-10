import { useLocaleStore } from '@/stores/LocaleStore'

export const getDayJsLocale = (): string => {
  const locale = useLocaleStore((s) => s.locale)

  return locale.toLowerCase().replace('_', '-')
}
