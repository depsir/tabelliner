import { useEffect, useRef, useState } from 'react'
import './App.css'

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

function shuffle(arr) {
  const next = [...arr]

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
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

function SetupScreen({ onStart }) {
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
      <h1 className="title">🔢 Tabelline</h1>

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

function ExerciseHeader({ score, timeLeft, label, onStop }) {
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
      <div className="score-badge">
        ✅ {score.correct} / {score.total}
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
  const { tables, duration } = config
  const [timeLeft, setTimeLeft] = useState(duration)
  const [question, setQuestion] = useState(() => randomQuestion(tables))
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const feedbackTimer = useRef(null)
  const scoreRef = useRef({ correct: 0, total: 0 })

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeLeft((value) => (value > 0 ? value - 1 : 0))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (timeLeft === 0) {
      clearTimeout(feedbackTimer.current)
      onFinish(scoreRef.current)
    }
  }, [timeLeft, onFinish])

  function handleSubmit() {
    if (!input || feedback) {
      return
    }

    const isCorrect = Number.parseInt(input, 10) === question.answer

    setScore((prev) => {
      const next = {
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }
      scoreRef.current = next
      return next
    })

    setFeedback(isCorrect ? 'correct' : 'wrong')
    setCorrectAnswer(question.answer)
    clearTimeout(feedbackTimer.current)

    feedbackTimer.current = setTimeout(() => {
      setFeedback(null)
      setCorrectAnswer(null)
      setInput('')
      setQuestion(randomQuestion(tables))
    }, FEEDBACK_DURATION)
  }

  useEffect(() => {
    const handler = (event) => {
      if (feedback) {
        return
      }

      if (event.key >= '0' && event.key <= '9') {
        setInput((value) => (value.length < 4 ? value + event.key : value))
      } else if (event.key === 'Backspace') {
        setInput((value) => value.slice(0, -1))
      } else if (event.key === 'Enter' && input.length > 0) {
        const isCorrect = Number.parseInt(input, 10) === question.answer

        setScore((prev) => {
          const next = {
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
          }
          scoreRef.current = next
          return next
        })

        setFeedback(isCorrect ? 'correct' : 'wrong')
        setCorrectAnswer(question.answer)
        clearTimeout(feedbackTimer.current)

        feedbackTimer.current = setTimeout(() => {
          setFeedback(null)
          setCorrectAnswer(null)
          setInput('')
          setQuestion(randomQuestion(tables))
        }, FEEDBACK_DURATION)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [feedback, input, question.answer, tables])

  return (
    <div className="screen exercise-screen">
      <ExerciseHeader
        score={score}
        timeLeft={timeLeft}
        onStop={() => {
          clearTimeout(feedbackTimer.current)
          onFinish(scoreRef.current)
        }}
      />

      <div className="question-area">
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
  const { chain } = config
  const [step, setStep] = useState(0)
  const [choices, setChoices] = useState(() => getChainChoices(chain, 0))
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const feedbackTimer = useRef(null)
  const scoreRef = useRef({ correct: 0, total: 0 })

  function handleChoice(choice) {
    if (feedback) {
      return
    }

    const correctValue = chain * (step + 1)
    const isCorrect = choice === correctValue

    setScore((prev) => {
      const next = {
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }
      scoreRef.current = next
      return next
    })

    setFeedback({ selected: choice, correct: correctValue })
    clearTimeout(feedbackTimer.current)

    feedbackTimer.current = setTimeout(() => {
      const isLastStep = step === CHAIN_STEPS - 1
      if (isLastStep) {
        onFinish(scoreRef.current)
        return
      }

      const nextStep = step + 1
      setStep(nextStep)
      setChoices(getChainChoices(chain, nextStep))
      setFeedback(null)
    }, FEEDBACK_DURATION)
  }

  useEffect(() => {
    const handler = (event) => {
      if (feedback) {
        return
      }

      if (event.key >= '1' && event.key <= String(choices.length)) {
        const index = Number.parseInt(event.key, 10) - 1
        const choice = choices[index]

        if (choice !== undefined) {
          const correctValue = chain * (step + 1)
          const isCorrect = choice === correctValue

          setScore((prev) => {
            const next = {
              correct: prev.correct + (isCorrect ? 1 : 0),
              total: prev.total + 1,
            }
            scoreRef.current = next
            return next
          })

          setFeedback({ selected: choice, correct: correctValue })
          clearTimeout(feedbackTimer.current)

          feedbackTimer.current = setTimeout(() => {
            const isLastStep = step === CHAIN_STEPS - 1

            if (isLastStep) {
              onFinish(scoreRef.current)
              return
            }

            const nextStep = step + 1
            setStep(nextStep)
            setChoices(getChainChoices(chain, nextStep))
            setFeedback(null)
          }, FEEDBACK_DURATION)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [chain, choices, feedback, onFinish, step])

  const currentValues = Array.from({ length: step + 1 }, (_, index) => index * chain)

  return (
    <div className="screen exercise-screen">
      <ExerciseHeader
        score={score}
        label={`Catena del ${chain}`}
        onStop={() => {
          clearTimeout(feedbackTimer.current)
          onFinish(scoreRef.current)
        }}
      />

      <div className="question-area">
        <p className="mode-label">Catena del {chain}</p>
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

function ResultsScreen({ score, config, onReplay, onHome }) {
  const pct = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100)
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '⭐' : pct >= 50 ? '👍' : '💪'
  const title =
    config.mode === 'chain'
      ? score.total === CHAIN_STEPS
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

      <div className="results-score">
        <div className="score-big">
          {score.correct}
          <span className="score-total">/{score.total}</span>
        </div>
        <div className="score-label">risposte corrette</div>
      </div>

      <div className="pct-bar-wrap">
        <div className="pct-bar" style={{ width: `${pct}%` }} />
      </div>
      <div className="pct-label">{pct}%</div>

      <div className="results-actions">
        <button className="start-btn" onClick={onReplay}>🔄 Rigioca</button>
        <button className="secondary-btn" onClick={onHome}>🏠 Home</button>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [config, setConfig] = useState(null)
  const [finalScore, setFinalScore] = useState(null)
  const [playKey, setPlayKey] = useState(0)

  const handleStart = (nextConfig) => {
    setConfig(nextConfig)
    setFinalScore(null)
    setPlayKey((value) => value + 1)
    setScreen('playing')
  }

  const handleReplay = () => {
    setFinalScore(null)
    setPlayKey((value) => value + 1)
    setScreen('playing')
  }

  return (
    <div className="app">
      {screen === 'setup' && <SetupScreen onStart={handleStart} />}
      {screen === 'playing' && config && (
        <ExerciseScreen
          key={playKey}
          config={config}
          onFinish={(score) => {
            setFinalScore(score)
            setScreen('results')
          }}
        />
      )}
      {screen === 'results' && config && finalScore && (
        <ResultsScreen
          score={finalScore}
          config={config}
          onReplay={handleReplay}
          onHome={() => setScreen('setup')}
        />
      )}
    </div>
  )
}
