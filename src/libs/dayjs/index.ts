import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import calendar from 'dayjs/plugin/calendar'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetween from 'dayjs/plugin/isBetween'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isToday from 'dayjs/plugin/isToday'
import isTomorrow from 'dayjs/plugin/isTomorrow'
import isYesterday from 'dayjs/plugin/isYesterday'
import minMax from 'dayjs/plugin/minMax'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { getDayJsLocale } from '@/utils/locale'

dayjs.extend(advancedFormat)
dayjs.extend(calendar)
dayjs.extend(customParseFormat)
dayjs.extend(isBetween)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.extend(isToday)
dayjs.extend(isTomorrow)
dayjs.extend(isYesterday)
dayjs.extend(minMax)
dayjs.extend(relativeTime)
dayjs.extend(timezone)
dayjs.extend(utc)

dayjs.locale(getDayJsLocale())
dayjs.tz.setDefault('America/Sao_Paulo')

export default dayjs
