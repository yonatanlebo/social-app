/**
 * Hooks for date-fns localized formatters.
 *
 * Our app supports some languages that are not included in date-fns by
 * default, in which case it will fall back to English.
 *
 * {@link http://192.168.0.49:8085/repository/github/date-fns/date-fns/blob/main/docs/i18n.md}
 */

import {useCallback} from 'react'
import {formatDistance} from 'date-fns'

import {useDateLocale} from '#/locale/i18nProvider'

/**
 * Returns a localized `formatDistance` function.
 * {@link formatDistance}
 */
export function useFormatDistance() {
  const locale = useDateLocale()
  return useCallback<typeof formatDistance>(
    (date, baseDate, options) => {
      return formatDistance(date, baseDate, {...options, locale})
    },
    [locale],
  )
}
