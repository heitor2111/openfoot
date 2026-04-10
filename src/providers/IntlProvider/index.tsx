import { IntlProvider as ReactIntlProvider } from 'react-intl'

import { defaultLocale, messagesByLocale } from '@/libs/intl/config'
import { useLocaleStore } from '@/stores/LocaleStore'

const IntlProvider = ({ children }: { children: React.ReactNode }) => {
  const locale = useLocaleStore((s) => s.locale)

  return (
    <ReactIntlProvider
      locale={locale}
      defaultLocale={defaultLocale}
      messages={messagesByLocale[locale]}
    >
      {children}
    </ReactIntlProvider>
  )
}

export default IntlProvider
