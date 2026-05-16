import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { pickMessage } from './lib/copy'
import {
  BADGES,
  applyRunResult,
  createMissions,
  evaluateMissions,
  getComboTier,
  getLevelInfo,
  getProfileStats,
} from './lib/progression'
import { loadProfile, saveProfile } from './lib/storage'

const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const DURATIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
]
const FEEDBACK_DURATION = 900
const CHAIN_STEPS = 10

function randomQuestion(tables) {
  const a = tables[Math.floor(Math.random() * tables.length)]
  const b = Math.floor(Math.random() * 10) + 1
  return { a, b, answer: a * b }
}

function shuffle(items) {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function pickRandom(items, count) {
  return shuffle(items).slice(0, count)
}

function getChainChoices(chain, step) {
  const currentValue = chain * step
  const correctValue = chain * (step + 1)
  const maxValue = chain * CHAIN_STEPS
  const distractors = new Set()

  for (let value = Math.max(0, correctValue - 12); value <= Math.min(100, correctValue + 12); value += 1) {
    if (value !== currentValue && value !== correctValue) {
      distractors.add(value)
    }
  }

  TABLES.forEach((table) => {
    const value = table * (step + 1)
    if (value !== correctValue && value <= 100) {
      distractors.add(value)
    }
  })

  for (let value = 0; value <= maxValue; value += chain) {
    if (value !== currentValue && value !== correctValue) {
      distractors.add(value)
    }
  }

  return shuffle([correctValue, ...pickRandom([...distractors], 2)])
}

function createGameConfig(baseConfig) {
  return {
    ...baseConfig,
    missions: createMissions(baseConfig),
  }
}

function toBaseConfig(config) {
  return config.mode === 'classic'
    ? { mode: 'classic', duration: config.duration, tables: config.tables }
    : { mode: 'chain', chain: config.chain }
}

function getRunStats(runState) {
  return {
    correct: runState.score.correct,
    total: runState.score.total,
    maxCombo: runState.maxCombo,
    correctByTable: runState.correctByTable,
  }
}

function getResultEmoji(pct) {
  if (pct >= 90) {
    return '🏆'
  }

  if (pct >= 70) {
    return '⭐'
  }

  if (pct >= 50) {
    return '👍'
  }

  return '💪'
}

function getResultMessage(outcome) {
  const pct = outcome.score.total === 0 ? 0 : Math.round((outcome.score.correct / outcome.score.total) * 100)

  if (outcome.didLevelUp) {
    return pickMessage('levelUp', '', { level: outcome.levelInfo.level })
  }

  if (pct >= 90) {
    return pickMessage('finishGreat')
  }

  if (pct >= 70) {
    return pickMessage('finishGood')
  }

  return pickMessage('finishOk')
}

function ProfileCard({ profile }) {
  const levelInfo = getLevelInfo(profile.xp)
  const stats = getProfileStats(profile)
  const unlockedBadges = BADGES.filter((badge) => profile.unlockedBadges.includes(badge.id)).slice(-3)

  return (
    <section className="profile-card">
      <div className="profile-card-header">
        <div>
          <p className="profile-eyebrow">Progressi locali</p>
          <h2 className="profile-title">Livello {levelInfo.level}</h2>
        </div>
        <div className="profile-xp">{profile.xp} XP</div>
      </div>

      <div className="profile-progress-wrap">
        <div className="profile-progress-bar" style={{ width: `${levelInfo.progressPercent}%` }} />
      </div>
      <p className="profile-progress-label">{levelInfo.remainingXp} XP al prossimo livello</p>

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{profile.gamesPlayed}</span>
          <span className="profile-stat-label">partite</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{stats.accuracy}%</span>
          <span className="profile-stat-label">precisione</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{profile.bestCombo}</span>
          <span className="profile-stat-label">best combo</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value">{profile.streakDays}</span>
          <span className="profile-stat-label">giorni di fila</span>
        </div>
      </div>

      <div className="profile-footer">
        <p className="profile-footer-text">{stats.completedChains}/10 catene completate almeno una volta</p>
        {unlockedBadges.length > 0 ? (
          <div className="badge-row">
            {unlockedBadges.map((badge) => (
              <span key={badge.id} className="badge-chip">
                <span>{badge.icon}</span>
                {badge.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="profile-footer-text muted">Gioca qualche run per iniziare a sbloccare badge.</p>
        )}
      </div>
    </section>
  )
}

function SetupScreen({ onStart, profile }) {
  const [mode, setMode] = useState('classic')
  const [tables, setTables] = useState([])
  const [chain, setChain] = useState(null)
  const [duration, setDuration] = useState(60)

  const toggleTable = (table) => {
    setTables((prev) =>
      prev.includes(table) ? prev.filter((value) => value !== table) : [...prev, table].sort((a, b) => a - b),
    )
  }

  const allSelected = tables.length === TABLES.length
  const canStart = mode === 'classic' ? tables.length > 0 : chain !== null

  const handleStart = () => {
    if (!canStart) {
      return
    }

    onStart(
      mode === 'classic'
        ? { mode, duration, tables }
        : { mode, chain },
    )
  }

  return (
    <div className="screen setup-screen">
      <h1 className="title">🔢 Tabelliner</h1>
      <p className="mode-hint">Più combo, più missioni, più motivi per tornare.</p>

      <ProfileCard profile={profile} />

      <div className="mode-switch" role="tablist" aria-label="Modalita di gioco">
        <button
          className={`mode-switch-btn ${mode === 'classic' ? 'active' : ''}`}
          onClick={() => setMode('classic')}
        >
          Tabelline
        </button>
        <button
          className={`mode-switch-btn ${mode === 'chain' ? 'active' : ''}`}
          onClick={() => setMode('chain')}
        >
          Catene
        </button>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            {mode === 'classic' ? 'Quali tabelline?' : 'Quale catena?'}
          </h2>
          {mode === 'classic' && (
            <button className="link-btn" onClick={() => setTables(allSelected ? [] : TABLES)}>
              {allSelected ? 'Nessuna' : 'Tutte'}
            </button>
          )}
        </div>
        <div className="table-grid">
          {TABLES.map((table) => {
            const isActive = mode === 'classic' ? tables.includes(table) : chain === table

            return (
              <button
                key={table}
                className={`table-btn ${isActive ? 'active' : ''}`}
                onClick={() => (mode === 'classic' ? toggleTable(table) : setChain(table))}
              >
                {table}
              </button>
            )
          })}
        </div>
      </section>

      {mode === 'classic' && (
        <section className="section">
          <h2 className="section-title">Per quanto tempo?</h2>
          <div className="duration-grid">
            {DURATIONS.map((item) => (
              <button
                key={item.value}
                className={`duration-btn ${duration === item.value ? 'active' : ''}`}
                onClick={() => setDuration(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'chain' && chain !== null && (
        <p className="mode-hint">Catena del {chain}: 0, {chain}, {chain * 2}, ... {chain * 10}</p>
      )}

      <button className="start-btn" disabled={!canStart} onClick={handleStart}>
        Inizia!
      </button>
    </div>
  )
}

function MissionList({ missionResults }) {
  return (
    <div className="mission-panel">
      <p className="mission-panel-title">Mini missioni</p>
      <div className="mission-list">
        {missionResults.map((mission) => (
          <div
            key={mission.id}
            className={`mission-item ${mission.status.completed ? 'done' : ''} ${mission.status.failed ? 'failed' : ''}`}
          >
            <div>
              <p className="mission-label">{mission.label}</p>
              <p className="mission-progress">{mission.status.progressText} · +{mission.rewardXp} XP</p>
            </div>
            <span className="mission-icon">
              {mission.status.completed ? '✓' : mission.status.failed ? '✕' : '•'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FunBanner({ message, tone }) {
  return <div className={`fun-banner ${tone}`}>{message}</div>
}

function Numpad({ value, onChange, onSubmit, disabled }) {
  const press = (key) => {
    if (disabled) {
      return
    }

    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }

    if (key === '✓') {
      if (value.length > 0) {
        onSubmit()
      }
      return
    }

    if (value.length < 4) {
      onChange(value + key)
    }
  }

  return (
    <div className="numpad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map((key) => (
        <button
          key={key}
          className={`numpad-key ${key === '✓' ? 'confirm' : ''} ${key === '⌫' ? 'back' : ''}`}
          onPointerDown={(event) => {
            event.preventDefault()
            press(key)
          }}
          disabled={disabled && key !== '⌫'}
        >
          {key}
        </button>
      ))}
    </div>
  )
}

function ExerciseHeader({ score, timeLeft, label, onStop, combo, comboTier }) {
  return (
    <div className="exercise-header">
      {timeLeft === undefined ? (
        <div className="header-label">{label}</div>
      ) : (
        <div className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
          {String(timeLeft % 60).padStart(2, '0')}
        </div>
      )}

      <div className="header-badges">
        <div className="score-badge">
          ✅ {score.correct} / {score.total}
        </div>
        <div className={`combo-badge ${combo >= 3 ? 'hot' : ''}`}>
          🔥 {combo} · x{comboTier.multiplier}
        </div>
      </div>

      <button
        className="stop-btn"
        onPointerDown={(event) => {
          event.preventDefault()
          onStop()
        }}
      >
        ■
      </button>
    </div>
  )
}

function ClassicExerciseScreen({ config, onFinish }) {
  const [timeLeft, setTimeLeft] = useState(config.duration)
  const [question, setQuestion] = useState(() => randomQuestion(config.tables))
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [funMessage, setFunMessage] = useState('Prima missione: entrare in ritmo.')
  const [funTone, setFunTone] = useState('neutral')
  const [runState, setRunState] = useState({
    score: { correct: 0, total: 0 },
    currentCombo: 0,
    maxCombo: 0,
    correctByTable: {},
  })
  const [missionResults, setMissionResults] = useState(() =>
    evaluateMissions(config.missions, {
      correct: 0,
      total: 0,
      maxCombo: 0,
      correctByTable: {},
    }),
  )
  const feedbackTimer = useRef(null)
  const runStateRef = useRef(runState)
  const completedMissionIdsRef = useRef(new Set())
  const finishedRef = useRef(false)
  const lastMessageRef = useRef('')

  const updateMessage = useCallback((category, context, tone) => {
    const message = pickMessage(category, lastMessageRef.current, context)
    lastMessageRef.current = message
    setFunMessage(message)
    setFunTone(tone)
  }, [])

  const syncMissions = useCallback((nextState) => {
    const nextMissionResults = evaluateMissions(config.missions, getRunStats(nextState))
    let newlyCompletedMission = null

    nextMissionResults.forEach((mission) => {
      if (mission.status.completed && !completedMissionIdsRef.current.has(mission.id)) {
        completedMissionIdsRef.current.add(mission.id)
        newlyCompletedMission = mission
      }
    })

    setMissionResults(nextMissionResults)
    return newlyCompletedMission
  }, [config.missions])

  const finishRun = useCallback(() => {
    if (finishedRef.current) {
      return
    }

    finishedRef.current = true
    clearTimeout(feedbackTimer.current)
    onFinish({
      score: runStateRef.current.score,
      maxCombo: runStateRef.current.maxCombo,
      correctByTable: runStateRef.current.correctByTable,
    })
  }, [onFinish])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((value) => (value > 0 ? value - 1 : 0))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (timeLeft === 0) {
      finishRun()
    }
  }, [finishRun, timeLeft])

  useEffect(
    () => () => {
      clearTimeout(feedbackTimer.current)
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    if (!input || feedback || timeLeft === 0) {
      return
    }

    const isCorrect = Number.parseInt(input, 10) === question.answer
    const previousState = runStateRef.current
    const nextCombo = isCorrect ? previousState.currentCombo + 1 : 0
    const nextState = {
      score: {
        correct: previousState.score.correct + (isCorrect ? 1 : 0),
        total: previousState.score.total + 1,
      },
      currentCombo: nextCombo,
      maxCombo: Math.max(previousState.maxCombo, nextCombo),
      correctByTable: isCorrect
        ? {
            ...previousState.correctByTable,
            [question.a]: (previousState.correctByTable[question.a] ?? 0) + 1,
          }
        : previousState.correctByTable,
    }

    runStateRef.current = nextState
    setRunState(nextState)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    setCorrectAnswer(question.answer)

    const newlyCompletedMission = syncMissions(nextState)

    if (newlyCompletedMission) {
      updateMessage('mission', { mission: newlyCompletedMission.label }, 'celebrate')
    } else if (isCorrect && nextState.currentCombo >= 3) {
      updateMessage('combo', { combo: nextState.currentCombo }, 'celebrate')
    } else if (isCorrect) {
      updateMessage('correct', {}, 'success')
    } else {
      updateMessage('wrong', {}, 'danger')
    }

    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null)
      setCorrectAnswer(null)
      setInput('')
      setQuestion(randomQuestion(config.tables))
    }, FEEDBACK_DURATION)
  }, [config.tables, feedback, input, question.a, question.answer, syncMissions, timeLeft, updateMessage])

  useEffect(() => {
    const handler = (event) => {
      if (feedback) {
        return
      }

      if (event.key >= '0' && event.key <= '9') {
        setInput((value) => (value.length < 4 ? value + event.key : value))
      } else if (event.key === 'Backspace') {
        setInput((value) => value.slice(0, -1))
      } else if (event.key === 'Enter') {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [feedback, handleSubmit])

  const comboTier = getComboTier(runState.currentCombo)

  return (
    <div className="screen exercise-screen">
      <ExerciseHeader
        score={runState.score}
        timeLeft={timeLeft}
        combo={runState.currentCombo}
        comboTier={comboTier}
        onStop={finishRun}
      />

      <MissionList missionResults={missionResults} />

      <div className="question-area">
        <FunBanner message={funMessage} tone={funTone} />
        <div className="question">
          {question.a} × {question.b} =
        </div>

        <div className={`answer-display ${feedback === 'correct' ? 'correct' : feedback === 'wrong' ? 'wrong' : ''}`}>
          {feedback === 'correct' && <span className="feedback-icon">✓</span>}
          {feedback === 'wrong' && (
            <span className="wrong-answer">
              <span className="your-answer">{input}</span>
              <span className="right-answer">→ {correctAnswer}</span>
            </span>
          )}
          {!feedback && (
            <span className="input-value">{input || <span className="placeholder">?</span>}</span>
          )}
        </div>
      </div>

      <Numpad value={input} onChange={setInput} onSubmit={handleSubmit} disabled={Boolean(feedback)} />
    </div>
  )
}

function ChainExerciseScreen({ config, onFinish }) {
  const [step, setStep] = useState(0)
  const [choices, setChoices] = useState(() => getChainChoices(config.chain, 0))
  const [feedback, setFeedback] = useState(null)
  const [funMessage, setFunMessage] = useState('Catena pronta. Facciamola filare liscia.')
  const [funTone, setFunTone] = useState('neutral')
  const [runState, setRunState] = useState({
    score: { correct: 0, total: 0 },
    currentCombo: 0,
    maxCombo: 0,
    correctByTable: {},
  })
  const [missionResults, setMissionResults] = useState(() =>
    evaluateMissions(config.missions, {
      correct: 0,
      total: 0,
      maxCombo: 0,
      correctByTable: {},
    }),
  )
  const feedbackTimer = useRef(null)
  const runStateRef = useRef(runState)
  const completedMissionIdsRef = useRef(new Set())
  const finishedRef = useRef(false)
  const lastMessageRef = useRef('')

  const updateMessage = useCallback((category, context, tone) => {
    const message = pickMessage(category, lastMessageRef.current, context)
    lastMessageRef.current = message
    setFunMessage(message)
    setFunTone(tone)
  }, [])

  const syncMissions = useCallback((nextState) => {
    const nextMissionResults = evaluateMissions(config.missions, getRunStats(nextState))
    let newlyCompletedMission = null

    nextMissionResults.forEach((mission) => {
      if (mission.status.completed && !completedMissionIdsRef.current.has(mission.id)) {
        completedMissionIdsRef.current.add(mission.id)
        newlyCompletedMission = mission
      }
    })

    setMissionResults(nextMissionResults)
    return newlyCompletedMission
  }, [config.missions])

  const finishRun = useCallback(() => {
    if (finishedRef.current) {
      return
    }

    finishedRef.current = true
    clearTimeout(feedbackTimer.current)
    onFinish({
      score: runStateRef.current.score,
      maxCombo: runStateRef.current.maxCombo,
      correctByTable: runStateRef.current.correctByTable,
    })
  }, [onFinish])

  useEffect(
    () => () => {
      clearTimeout(feedbackTimer.current)
    },
    [],
  )

  const handleChoice = useCallback((choice) => {
    if (feedback) {
      return
    }

    const correctValue = config.chain * (step + 1)
    const isCorrect = choice === correctValue
    const previousState = runStateRef.current
    const nextCombo = isCorrect ? previousState.currentCombo + 1 : 0
    const nextState = {
      score: {
        correct: previousState.score.correct + (isCorrect ? 1 : 0),
        total: previousState.score.total + 1,
      },
      currentCombo: nextCombo,
      maxCombo: Math.max(previousState.maxCombo, nextCombo),
      correctByTable: previousState.correctByTable,
    }

    runStateRef.current = nextState
    setRunState(nextState)
    setFeedback({ selected: choice, correct: correctValue })

    const newlyCompletedMission = syncMissions(nextState)

    if (newlyCompletedMission) {
      updateMessage('mission', { mission: newlyCompletedMission.label }, 'celebrate')
    } else if (isCorrect && nextState.currentCombo >= 3) {
      updateMessage('combo', { combo: nextState.currentCombo }, 'celebrate')
    } else if (isCorrect) {
      updateMessage('correct', {}, 'success')
    } else {
      updateMessage('wrong', {}, 'danger')
    }

    clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => {
      const isLastStep = step === CHAIN_STEPS - 1

      if (isLastStep) {
        finishRun()
        return
      }

      const nextStep = step + 1
      setStep(nextStep)
      setChoices(getChainChoices(config.chain, nextStep))
      setFeedback(null)
    }, FEEDBACK_DURATION)
  }, [config.chain, feedback, finishRun, step, syncMissions, updateMessage])

  useEffect(() => {
    const handler = (event) => {
      if (feedback) {
        return
      }

      if (event.key >= '1' && event.key <= String(choices.length)) {
        const index = Number.parseInt(event.key, 10) - 1
        const choice = choices[index]

        if (choice !== undefined) {
          handleChoice(choice)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [choices, feedback, handleChoice])

  const comboTier = getComboTier(runState.currentCombo)
  const currentValues = Array.from({ length: step + 1 }, (_, index) => index * config.chain)

  return (
    <div className="screen exercise-screen">
      <ExerciseHeader
        score={runState.score}
        label={`Catena del ${config.chain}`}
        combo={runState.currentCombo}
        comboTier={comboTier}
        onStop={finishRun}
      />

      <MissionList missionResults={missionResults} />

      <div className="question-area">
        <FunBanner message={funMessage} tone={funTone} />
        <p className="mode-label">Catena del {config.chain}</p>
        <div className="chain-progress">{currentValues.join(' · ')}</div>
        <p className="chain-question">Scegli il prossimo numero</p>
        <div className="chain-choices">
          {choices.map((choice, index) => {
            const isCorrect = feedback?.correct === choice
            const isWrongPick = feedback?.selected === choice && feedback.selected !== feedback.correct

            return (
              <button
                key={`${step}-${choice}`}
                className={`choice-btn ${isCorrect ? 'correct' : ''} ${isWrongPick ? 'wrong' : ''}`}
                disabled={Boolean(feedback)}
                onClick={() => handleChoice(choice)}
              >
                <span className="choice-index">{index + 1}</span>
                {choice}
              </button>
            )
          })}
        </div>
        <p className="chain-counter">Passo {step + 1} di {CHAIN_STEPS}</p>
      </div>
    </div>
  )
}

function ExerciseScreen({ config, onFinish }) {
  if (config.mode === 'chain') {
    return <ChainExerciseScreen config={config} onFinish={onFinish} />
  }

  return <ClassicExerciseScreen config={config} onFinish={onFinish} />
}

function ResultsScreen({ result, config, onReplay, onHome }) {
  const pct = result.score.total === 0 ? 0 : Math.round((result.score.correct / result.score.total) * 100)
  const emoji = getResultEmoji(pct)
  const title =
    config.mode === 'chain'
      ? result.score.total === CHAIN_STEPS
        ? 'Catena completata!'
        : 'Catena interrotta'
      : 'Tempo scaduto!'
  const summary =
    config.mode === 'chain'
      ? `Catena del ${config.chain}`
      : `Tabelline: ${config.tables.join(', ')}`

  return (
    <div className="screen results-screen">
      <div className="results-emoji">{emoji}</div>
      <h1 className="results-title">{title}</h1>
      <p className="results-subtitle">{summary}</p>
      <p className="results-fun">{result.finalMessage}</p>

      <div className="results-score">
        <div className="score-big">
          {result.score.correct}
          <span className="score-total">/{result.score.total}</span>
        </div>
        <div className="score-label">risposte corrette</div>
      </div>

      <div className="pct-bar-wrap">
        <div className="pct-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="pct-label">{pct}%</div>

      <section className="results-card">
        <div className="results-card-header">
          <h2 className="results-card-title">XP guadagnata</h2>
          <span className="results-card-pill">+{result.rewards.totalXp} XP</span>
        </div>
        <div className="reward-breakdown">
          <span>Base +{result.rewards.baseXp}</span>
          <span>Combo +{result.rewards.comboXp}</span>
          <span>Missioni +{result.rewards.missionXp}</span>
          {result.rewards.perfectChainXp > 0 && <span>Perfect chain +{result.rewards.perfectChainXp}</span>}
        </div>
        <p className="results-note">
          Combo max {result.maxCombo} · stato {result.rewards.comboTier.label} · livello {result.levelInfo.level}
        </p>
      </section>

      <section className="results-card">
        <div className="results-card-header">
          <h2 className="results-card-title">Missioni</h2>
          <span className="results-card-pill">{result.completedMissions.length}/{result.missionResults.length}</span>
        </div>
        <div className="mission-list compact">
          {result.missionResults.map((mission) => (
            <div
              key={mission.id}
              className={`mission-item ${mission.status.completed ? 'done' : ''} ${mission.status.failed ? 'failed' : ''}`}
            >
              <div>
                <p className="mission-label">{mission.label}</p>
                <p className="mission-progress">{mission.status.progressText} · +{mission.rewardXp} XP</p>
              </div>
              <span className="mission-icon">
                {mission.status.completed ? '✓' : mission.status.failed ? '✕' : '•'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {(result.newBadges.length > 0 || result.recordMessages.length > 0) && (
        <section className="results-card">
          {result.newBadges.length > 0 && (
            <>
              <div className="results-card-header">
                <h2 className="results-card-title">Nuovi badge</h2>
                <span className="results-card-pill">{result.newBadges.length}</span>
              </div>
              <div className="badge-row">
                {result.newBadges.map((badge) => (
                  <span key={badge.id} className="badge-chip big">
                    <span>{badge.icon}</span>
                    {badge.label}
                  </span>
                ))}
              </div>
            </>
          )}

          {result.recordMessages.length > 0 && (
            <div className="record-list">
              {result.recordMessages.map((message) => (
                <p key={message} className="results-note">
                  {message}
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="results-actions">
        <button className="start-btn" onClick={onReplay}>🔄 Rigioca</button>
        <button className="secondary-btn" onClick={onHome}>🏠 Home</button>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [profile, setProfile] = useState(() => loadProfile())
  const [config, setConfig] = useState(null)
  const [result, setResult] = useState(null)
  const [playKey, setPlayKey] = useState(0)

  const startRun = (baseConfig) => {
    setConfig(createGameConfig(baseConfig))
    setResult(null)
    setPlayKey((value) => value + 1)
    setScreen('playing')
  }

  const handleReplay = () => {
    startRun(toBaseConfig(config))
  }

  const handleFinish = (runResult) => {
    const outcome = applyRunResult(profile, {
      config,
      score: runResult.score,
      maxCombo: runResult.maxCombo,
      missions: config.missions,
      correctByTable: runResult.correctByTable,
    })

    saveProfile(outcome.profile)
    setProfile(outcome.profile)
    setResult({
      ...runResult,
      ...outcome,
      finalMessage: getResultMessage({
        ...outcome,
        score: runResult.score,
      }),
    })
    setScreen('results')
  }

  return (
    <div className="app">
      {screen === 'setup' && <SetupScreen onStart={startRun} profile={profile} />}
      {screen === 'playing' && config && (
        <ExerciseScreen
          key={playKey}
          config={config}
          onFinish={handleFinish}
        />
      )}
      {screen === 'results' && config && result && (
        <ResultsScreen
          result={result}
          config={config}
          onReplay={handleReplay}
          onHome={() => setScreen('setup')}
        />
      )}
    </div>
  )
}
