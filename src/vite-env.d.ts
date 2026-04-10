/// <reference types="vite/client" />
import type { MessageId } from '@/libs/intl/types'

declare global {
  const __APP_VERSION__: string

  namespace FormatjsIntl {
    interface Message {
      ids: MessageId
    }
  }
}
