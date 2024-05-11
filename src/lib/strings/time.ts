const NOW = 5
const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24
const MONTH = DAY * 28
const YEAR = DAY * 365
export function ago(date: number | string | Date): string {
  let ts: number
  if (typeof date === 'string') {
    ts = Number(new Date(date))
  } else if (date instanceof Date) {
    ts = Number(date)
  } else {
    ts = date
  }
  const diffSeconds = Math.floor((Date.now() - ts) / 1e3)
  if (diffSeconds < NOW) {
    return `עכשיו`
  } else if (diffSeconds < MINUTE) {
    return `${diffSeconds}שניות`
  } else if (diffSeconds < HOUR) {
    return `${Math.floor(diffSeconds / MINUTE)}דקות`
  } else if (diffSeconds < DAY) {
    return `${Math.floor(diffSeconds / HOUR)}שעות`
  } else if (diffSeconds < MONTH) {
    return `${Math.round(diffSeconds / DAY)}ימים`
  } else if (diffSeconds < YEAR) {
    return `${Math.floor(diffSeconds / MONTH)}חודשים`
  } else {
    return new Date(ts).toLocaleDateString()
  }
}

export function niceDate(date: number | string | Date) {
  const d = new Date(date)
  return `${d.toLocaleDateString('he-il', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })} at ${d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

export function getAge(birthDate: Date): number {
  var today = new Date()
  var age = today.getFullYear() - birthDate.getFullYear()
  var m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
