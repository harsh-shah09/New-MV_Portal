import dayjs from "dayjs"

export interface LeaveDateInput {
  date: string
  isLeaveDay?: boolean
  isHalfDay?: boolean
  leaveType?: string
  leaveCategory?: string
  isPublicHoliday?: boolean
  isWeekend?: boolean
}

export interface NonWorkingBlockAnalysis {
  startDate: string
  endDate: string
  dates: string[]
  applied: boolean
  reason: "standard-sandwich" | "not-sandwiched"
}

export interface LeavePolicyResult {
  totalLeaveDays: number
  countedLeaveDates: string[]
  sandwichApplied: boolean
  sandwichDates: string[]
  standardSandwichDates: string[]
  customOverrideDates: string[]
  nonWorkingBlocks: NonWorkingBlockAnalysis[]
}

export interface LeavePolicyOptions {
  allowedLeaveTypes?: string[]
  allowedLeaveCategories?: string[]
}

interface NormalizedEntry {
  date: string
  isLeaveDay: boolean
  isHalfDay: boolean
  leaveType?: string
  leaveCategory?: string
  isPublicHoliday: boolean
  isWeekend: boolean
}

const DEFAULT_ALLOWED_LEAVE_TYPES = ["planned leave"]
const DEFAULT_ALLOWED_LEAVE_CATEGORIES = ["loss of pay", "loss-of-pay"]

function normalizeDateKey(value: string): string {
  return dayjs(value).format("YYYY-MM-DD")
}

function sortDateStrings(dates: Iterable<string>): string[] {
  return [...dates].sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf())
}

function normalizeEntries(dateList: LeaveDateInput[]): Map<string, NormalizedEntry> {
  const byDate = new Map<string, NormalizedEntry>()

  for (const item of dateList) {
    if (!item?.date) {
      continue
    }

    const date = normalizeDateKey(item.date)
    const parsed = dayjs(date)

    const normalized: NormalizedEntry = {
      date,
      isLeaveDay: item.isLeaveDay === true,
      isHalfDay: item.isHalfDay === true,
      leaveType: item.leaveType,
      leaveCategory: item.leaveCategory,
      isPublicHoliday: item.isPublicHoliday === true,
      isWeekend: item.isWeekend ?? (parsed.day() === 0 || parsed.day() === 6),
    }

    byDate.set(date, normalized)
  }

  return byDate
}

function isAllowedLeaveType(leaveType: string | undefined, allowedLeaveTypes: Set<string>): boolean {
  if (allowedLeaveTypes.size === 0) {
    return true
  }

  const normalizedType = (leaveType || "").trim().toLowerCase()
  return allowedLeaveTypes.has(normalizedType)
}

function isAllowedLeaveCategory(
  leaveCategory: string | undefined,
  allowedLeaveCategories: Set<string>
): boolean {
  if (allowedLeaveCategories.size === 0) {
    return true
  }

  const normalizedCategory = (leaveCategory || "").trim().toLowerCase()
  return allowedLeaveCategories.has(normalizedCategory)
}

function isNonWorkingDay(entry: NormalizedEntry): boolean {
  return entry.isWeekend || entry.isPublicHoliday
}

function isSandwichTriggerLeaveDay(
  entry: NormalizedEntry,
  allowedLeaveTypes: Set<string>,
  allowedLeaveCategories: Set<string>
): boolean {
  return (
    entry.isLeaveDay &&
    !entry.isHalfDay &&
    isAllowedLeaveType(entry.leaveType, allowedLeaveTypes) &&
    isAllowedLeaveCategory(entry.leaveCategory, allowedLeaveCategories)
  )
}

function buildCalendarWindow(entries: Map<string, NormalizedEntry>): NormalizedEntry[] {
  const sortedKeys = sortDateStrings(entries.keys())
  if (sortedKeys.length === 0) {
    return []
  }

  const start = dayjs(sortedKeys[0])
  const end = dayjs(sortedKeys[sortedKeys.length - 1])

  const days: NormalizedEntry[] = []
  let cursor = start.clone()

  while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
    const date = cursor.format("YYYY-MM-DD")
    const existing = entries.get(date)

    if (existing) {
      days.push(existing)
    } else {
      days.push({
        date,
        isLeaveDay: false,
        isHalfDay: false,
        isPublicHoliday: false,
        isWeekend: cursor.day() === 0 || cursor.day() === 6,
      })
    }

    cursor = cursor.add(1, "day")
  }

  return days
}

export function calculateLeaveDays(
  dateList: LeaveDateInput[],
  options: LeavePolicyOptions = {}
): LeavePolicyResult {
  if (!Array.isArray(dateList) || dateList.length === 0) {
    return {
      totalLeaveDays: 0,
      countedLeaveDates: [],
      sandwichApplied: false,
      sandwichDates: [],
      standardSandwichDates: [],
      customOverrideDates: [],
      nonWorkingBlocks: [],
    }
  }

  const allowedLeaveTypes = new Set(
    (options.allowedLeaveTypes ?? DEFAULT_ALLOWED_LEAVE_TYPES).map((value) => value.trim().toLowerCase())
  )
  const allowedLeaveCategories = new Set(
    (options.allowedLeaveCategories ?? DEFAULT_ALLOWED_LEAVE_CATEGORIES).map((value) => value.trim().toLowerCase())
  )

  const entriesByDate = normalizeEntries(dateList)
  const calendarDays = buildCalendarWindow(entriesByDate)
  const dayMap = new Map(calendarDays.map((entry) => [entry.date, entry]))

  let totalLeaveDays = 0
  const countedLeaveDates = new Set<string>()

  for (const day of calendarDays) {
    if (!day.isLeaveDay) {
      continue
    }

    countedLeaveDates.add(day.date)
    totalLeaveDays += day.isHalfDay ? 0.5 : 1
  }

  const nonWorkingBlocks: NonWorkingBlockAnalysis[] = []
  const standardSandwichDates = new Set<string>()

  let index = 0
  while (index < calendarDays.length) {
    const current = calendarDays[index]

    if (!isNonWorkingDay(current) || current.isLeaveDay) {
      index += 1
      continue
    }

    const blockDates: string[] = []
    let cursor = index

    while (
      cursor < calendarDays.length &&
      isNonWorkingDay(calendarDays[cursor]) &&
      !calendarDays[cursor].isLeaveDay
    ) {
      blockDates.push(calendarDays[cursor].date)
      cursor += 1
    }

    const prevDay = calendarDays[index - 1]
    const nextDay = calendarDays[cursor]

    const hasLeaveBefore =
      !!prevDay && isSandwichTriggerLeaveDay(prevDay, allowedLeaveTypes, allowedLeaveCategories)
    const hasLeaveAfter =
      !!nextDay && isSandwichTriggerLeaveDay(nextDay, allowedLeaveTypes, allowedLeaveCategories)

    const applied = hasLeaveBefore && hasLeaveAfter

    if (applied) {
      blockDates.forEach((date) => standardSandwichDates.add(date))
    }

    nonWorkingBlocks.push({
      startDate: blockDates[0],
      endDate: blockDates[blockDates.length - 1],
      dates: blockDates,
      applied,
      reason: applied ? "standard-sandwich" : "not-sandwiched",
    })

    index = cursor
  }

  const customOverrideDates = new Set<string>()

  for (const day of calendarDays) {
    if (!isSandwichTriggerLeaveDay(day, allowedLeaveTypes, allowedLeaveCategories)) {
      continue
    }

    const leaveDate = dayjs(day.date)
    if (leaveDate.day() !== 5) {
      continue
    }

    const saturday = dayMap.get(leaveDate.add(1, "day").format("YYYY-MM-DD"))
    const sunday = dayMap.get(leaveDate.add(2, "day").format("YYYY-MM-DD"))
    const monday = dayMap.get(leaveDate.add(3, "day").format("YYYY-MM-DD"))

    const hasWeekendAfterFriday =
      !!saturday &&
      !!sunday &&
      saturday.isWeekend &&
      sunday.isWeekend &&
      !saturday.isLeaveDay &&
      !sunday.isLeaveDay

    const hasMondayHoliday = !!monday && monday.isPublicHoliday && !monday.isLeaveDay

    if (hasWeekendAfterFriday && hasMondayHoliday) {
      customOverrideDates.add(saturday.date)
      customOverrideDates.add(sunday.date)
      customOverrideDates.add(monday.date)
    }
  }

  const sandwichDates = new Set<string>([
    ...standardSandwichDates,
    ...customOverrideDates,
  ])

  for (const sandwichDate of sandwichDates) {
    if (!countedLeaveDates.has(sandwichDate)) {
      countedLeaveDates.add(sandwichDate)
      totalLeaveDays += 1
    }
  }

  return {
    totalLeaveDays,
    countedLeaveDates: sortDateStrings(countedLeaveDates),
    sandwichApplied: sandwichDates.size > 0,
    sandwichDates: sortDateStrings(sandwichDates),
    standardSandwichDates: sortDateStrings(standardSandwichDates),
    customOverrideDates: sortDateStrings(customOverrideDates),
    nonWorkingBlocks,
  }
}
