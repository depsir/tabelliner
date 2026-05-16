const STORAGE_KEY = 'tabelliner-profile-v1'

export function createDefaultProfile() {
  return {
    version: 1,
    xp: 0,
    gamesPlayed: 0,
    totalCorrect: 0,
    totalAnswers: 0,
    bestCombo: 0,
    streakDays: 0,
    lastPlayedOn: null,
    unlockedBadges: [],
    completedChains: {},
    records: {
      classic: {},
      chain: {},
    },
  }
}

function normalizeProfile(rawProfile) {
  const defaults = createDefaultProfile()
  const safeProfile = rawProfile && typeof rawProfile === 'object' ? rawProfile : {}
  const safeRecords = safeProfile.records && typeof safeProfile.records === 'object' ? safeProfile.records : {}

  return {
    ...defaults,
    ...safeProfile,
    unlockedBadges: Array.isArray(safeProfile.unlockedBadges) ? safeProfile.unlockedBadges : defaults.unlockedBadges,
    completedChains:
      safeProfile.completedChains && typeof safeProfile.completedChains === 'object'
        ? safeProfile.completedChains
        : defaults.completedChains,
    records: {
      classic:
        safeRecords.classic && typeof safeRecords.classic === 'object' ? safeRecords.classic : defaults.records.classic,
      chain: safeRecords.chain && typeof safeRecords.chain === 'object' ? safeRecords.chain : defaults.records.chain,
    },
  }
}

export function loadProfile() {
  if (typeof window === 'undefined') {
    return createDefaultProfile()
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)

    if (!rawValue) {
      return createDefaultProfile()
    }

    return normalizeProfile(JSON.parse(rawValue))
  } catch {
    return createDefaultProfile()
  }
}

export function saveProfile(profile) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProfile(profile)))
}
