export const BADGES = [
  {
    id: 'first-game',
    icon: '🌟',
    label: 'Primo passo',
    description: 'Gioca la tua prima partita.',
  },
  {
    id: 'combo-10',
    icon: '🔥',
    label: 'Combo 10',
    description: 'Raggiungi 10 risposte corrette di fila.',
  },
  {
    id: 'correct-100',
    icon: '💯',
    label: 'Cento giuste',
    description: 'Accumula 100 risposte corrette totali.',
  },
  {
    id: 'record-hunter',
    icon: '🏅',
    label: 'Record hunter',
    description: 'Batti un tuo record personale.',
  },
  {
    id: 'all-chains',
    icon: '🧠',
    label: 'Catene complete',
    description: 'Completa almeno una volta tutte le catene da 1 a 10.',
  },
]

const LEVEL_XP_STEP = 120

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value))
}

function getAccuracy(score) {
  if (score.total === 0) {
    return 0
  }

  return Math.round((score.correct / score.total) * 100)
}

function getClassicTarget(duration) {
  if (duration >= 300) {
    return 24
  }

  if (duration >= 180) {
    return 18
  }

  if (duration >= 120) {
    return 12
  }

  return 8
}

function getTableMissionTarget(duration) {
  if (duration >= 180) {
    return 4
  }

  return 3
}

function getClassicMissionPool(config) {
  const tableTarget = config.tables[Math.floor(Math.random() * config.tables.length)]

  return [
    {
      id: `correct-total-${getClassicTarget(config.duration)}`,
      type: 'correctTotal',
      label: `Fai ${getClassicTarget(config.duration)} risposte giuste`,
      target: getClassicTarget(config.duration),
      rewardXp: 30,
    },
    {
      id: 'combo-5',
      type: 'combo',
      label: 'Raggiungi combo 5',
      target: 5,
      rewardXp: 35,
    },
    {
      id: `table-hits-${tableTarget}`,
      type: 'tableHits',
      label: `Fai ${getTableMissionTarget(config.duration)} giuste nella tabellina del ${tableTarget}`,
      target: getTableMissionTarget(config.duration),
      table: tableTarget,
      rewardXp: 40,
    },
  ]
}

function getChainMissionPool() {
  return [
    {
      id: 'chain-correct-8',
      type: 'correctTotal',
      label: 'Porta a casa almeno 8 risposte giuste',
      target: 8,
      rewardXp: 35,
    },
    {
      id: 'chain-combo-4',
      type: 'combo',
      label: 'Raggiungi combo 4',
      target: 4,
      rewardXp: 30,
    },
    {
      id: 'perfect-chain',
      type: 'perfectChain',
      label: 'Chiudi la catena senza errori',
      target: 10,
      rewardXp: 50,
    },
  ]
}

function shuffle(items) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function addBadge(nextProfile, badgeId, newBadges) {
  if (!nextProfile.unlockedBadges.includes(badgeId)) {
    nextProfile.unlockedBadges = [...nextProfile.unlockedBadges, badgeId]
    const badge = BADGES.find((entry) => entry.id === badgeId)

    if (badge) {
      newBadges.push(badge)
    }
  }
}

function updateStreak(nextProfile) {
  const today = new Date().toISOString().slice(0, 10)

  if (nextProfile.lastPlayedOn === today) {
    return
  }

  if (!nextProfile.lastPlayedOn) {
    nextProfile.streakDays = 1
    nextProfile.lastPlayedOn = today
    return
  }

  const lastPlayedDate = new Date(`${nextProfile.lastPlayedOn}T00:00:00`)
  const todayDate = new Date(`${today}T00:00:00`)
  const diffInDays = Math.round((todayDate - lastPlayedDate) / 86400000)

  nextProfile.streakDays = diffInDays === 1 ? nextProfile.streakDays + 1 : 1
  nextProfile.lastPlayedOn = today
}

function createProfileCopy(profile) {
  return {
    ...profile,
    unlockedBadges: [...profile.unlockedBadges],
    completedChains: { ...profile.completedChains },
    records: {
      classic: { ...profile.records.classic },
      chain: { ...profile.records.chain },
    },
  }
}

function getClassicRecordKey(config) {
  return `${config.duration}:${config.tables.join('-')}`
}

function getChainRecordKey(config) {
  return String(config.chain)
}

function updateClassicRecord(nextProfile, config, score, totalXp) {
  const recordKey = getClassicRecordKey(config)
  const previousRecord = nextProfile.records.classic[recordKey]
  const accuracy = getAccuracy(score)
  const recordMessages = []
  let improvedExistingRecord = false

  if (!previousRecord) {
    recordMessages.push('Primo record salvato per questa sfida.')
  } else {
    if (score.correct > previousRecord.bestCorrect) {
      recordMessages.push(`Nuovo record di corrette: ${score.correct}.`)
      improvedExistingRecord = true
    }

    if (accuracy > previousRecord.bestAccuracy) {
      recordMessages.push(`Nuova precisione top: ${accuracy}%.`)
      improvedExistingRecord = true
    }

    if (totalXp > previousRecord.bestXp) {
      recordMessages.push(`Run piu ricca di XP: +${totalXp}.`)
      improvedExistingRecord = true
    }
  }

  nextProfile.records.classic[recordKey] = {
    bestCorrect: Math.max(previousRecord?.bestCorrect ?? 0, score.correct),
    bestAccuracy: Math.max(previousRecord?.bestAccuracy ?? 0, accuracy),
    bestXp: Math.max(previousRecord?.bestXp ?? 0, totalXp),
  }

  return { recordMessages, improvedExistingRecord }
}

function updateChainRecord(nextProfile, config, score, totalXp) {
  const recordKey = getChainRecordKey(config)
  const previousRecord = nextProfile.records.chain[recordKey]
  const accuracy = getAccuracy(score)
  const recordMessages = []
  let improvedExistingRecord = false
  const didCompleteChain = score.total === 10
  const didPerfectChain = score.total === 10 && score.correct === 10

  if (!previousRecord) {
    recordMessages.push('Prima catena salvata nei record.')
  } else {
    if (score.correct > previousRecord.bestCorrect) {
      recordMessages.push(`Nuovo record sulla catena del ${config.chain}: ${score.correct} giuste.`)
      improvedExistingRecord = true
    }

    if (accuracy > previousRecord.bestAccuracy) {
      recordMessages.push(`Precisione record sulla catena del ${config.chain}: ${accuracy}%.`)
      improvedExistingRecord = true
    }

    if (totalXp > previousRecord.bestXp) {
      recordMessages.push(`XP record sulla catena del ${config.chain}: +${totalXp}.`)
      improvedExistingRecord = true
    }
  }

  nextProfile.records.chain[recordKey] = {
    bestCorrect: Math.max(previousRecord?.bestCorrect ?? 0, score.correct),
    bestAccuracy: Math.max(previousRecord?.bestAccuracy ?? 0, accuracy),
    bestXp: Math.max(previousRecord?.bestXp ?? 0, totalXp),
    completions: (previousRecord?.completions ?? 0) + (didCompleteChain ? 1 : 0),
    perfectRuns: (previousRecord?.perfectRuns ?? 0) + (didPerfectChain ? 1 : 0),
  }

  if (didCompleteChain) {
    nextProfile.completedChains[config.chain] = true
  }

  return { recordMessages, improvedExistingRecord }
}

export function getLevelInfo(xp) {
  const level = Math.floor(xp / LEVEL_XP_STEP) + 1
  const currentLevelFloor = (level - 1) * LEVEL_XP_STEP
  const nextLevelXp = level * LEVEL_XP_STEP

  return {
    level,
    xpIntoLevel: xp - currentLevelFloor,
    xpForNextLevel: LEVEL_XP_STEP,
    progressPercent: clampPercentage(((xp - currentLevelFloor) / LEVEL_XP_STEP) * 100),
    remainingXp: Math.max(0, nextLevelXp - xp),
  }
}

export function getComboTier(combo) {
  if (combo >= 8) {
    return {
      label: 'Leggenda',
      multiplier: 2,
      bonusXp: 40,
    }
  }

  if (combo >= 5) {
    return {
      label: 'On fire',
      multiplier: 1.5,
      bonusXp: 20,
    }
  }

  if (combo >= 3) {
    return {
      label: 'In ritmo',
      multiplier: 1.2,
      bonusXp: 10,
    }
  }

  return {
    label: 'Pronto',
    multiplier: 1,
    bonusXp: 0,
  }
}

export function createMissions(config) {
  const pool = config.mode === 'classic' ? getClassicMissionPool(config) : getChainMissionPool(config)
  return shuffle(pool).slice(0, 2)
}

export function getMissionStatus(mission, stats) {
  switch (mission.type) {
    case 'correctTotal': {
      const value = stats.correct
      return {
        value,
        target: mission.target,
        progressText: `${Math.min(value, mission.target)}/${mission.target}`,
        completed: value >= mission.target,
        failed: false,
      }
    }
    case 'combo': {
      const value = stats.maxCombo
      return {
        value,
        target: mission.target,
        progressText: `${Math.min(value, mission.target)}/${mission.target}`,
        completed: value >= mission.target,
        failed: false,
      }
    }
    case 'tableHits': {
      const value = stats.correctByTable[mission.table] ?? 0
      return {
        value,
        target: mission.target,
        progressText: `${Math.min(value, mission.target)}/${mission.target}`,
        completed: value >= mission.target,
        failed: false,
      }
    }
    case 'perfectChain': {
      const completed = stats.total === mission.target && stats.correct === mission.target
      const failed = stats.total > stats.correct

      return {
        value: stats.correct,
        target: mission.target,
        progressText: failed ? 'saltata' : `${stats.correct}/${mission.target}`,
        completed,
        failed,
      }
    }
    default:
      return {
        value: 0,
        target: mission.target ?? 0,
        progressText: '0/0',
        completed: false,
        failed: false,
      }
  }
}

export function evaluateMissions(missions, stats) {
  return missions.map((mission) => ({
    ...mission,
    status: getMissionStatus(mission, stats),
  }))
}

export function applyRunResult(profile, { config, score, maxCombo, missions, correctByTable }) {
  const missionResults = evaluateMissions(missions, {
    correct: score.correct,
    total: score.total,
    maxCombo,
    correctByTable,
  })
  const completedMissions = missionResults.filter((mission) => mission.status.completed)
  const missionXp = completedMissions.reduce((total, mission) => total + mission.rewardXp, 0)
  const comboTier = getComboTier(maxCombo)
  const baseXp = score.correct * (config.mode === 'classic' ? 6 : 8)
  const perfectChainXp = config.mode === 'chain' && score.total === 10 && score.correct === 10 ? 20 : 0
  const totalXp = baseXp + comboTier.bonusXp + missionXp + perfectChainXp
  const nextProfile = createProfileCopy(profile)
  const previousLevel = getLevelInfo(profile.xp)

  nextProfile.gamesPlayed += 1
  nextProfile.totalCorrect += score.correct
  nextProfile.totalAnswers += score.total
  nextProfile.bestCombo = Math.max(nextProfile.bestCombo, maxCombo)
  nextProfile.xp += totalXp
  updateStreak(nextProfile)

  let recordUpdate

  if (config.mode === 'classic') {
    recordUpdate = updateClassicRecord(nextProfile, config, score, totalXp)
  } else {
    recordUpdate = updateChainRecord(nextProfile, config, score, totalXp)
  }

  const newBadges = []

  addBadge(nextProfile, 'first-game', newBadges)

  if (nextProfile.bestCombo >= 10) {
    addBadge(nextProfile, 'combo-10', newBadges)
  }

  if (nextProfile.totalCorrect >= 100) {
    addBadge(nextProfile, 'correct-100', newBadges)
  }

  if (recordUpdate.improvedExistingRecord) {
    addBadge(nextProfile, 'record-hunter', newBadges)
  }

  const completedChainsCount = Object.keys(nextProfile.completedChains).length

  if (completedChainsCount >= 10) {
    addBadge(nextProfile, 'all-chains', newBadges)
  }

  const levelInfo = getLevelInfo(nextProfile.xp)

  return {
    profile: nextProfile,
    levelInfo,
    didLevelUp: levelInfo.level > previousLevel.level,
    rewards: {
      baseXp,
      comboXp: comboTier.bonusXp,
      missionXp,
      perfectChainXp,
      totalXp,
      comboTier,
    },
    completedMissions,
    missionResults,
    recordMessages: recordUpdate.recordMessages,
    improvedExistingRecord: recordUpdate.improvedExistingRecord,
    newBadges,
  }
}

export function getProfileStats(profile) {
  const accuracy = profile.totalAnswers === 0 ? 0 : Math.round((profile.totalCorrect / profile.totalAnswers) * 100)

  return {
    accuracy,
    completedChains: Object.keys(profile.completedChains).length,
  }
}
