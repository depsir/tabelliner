import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

// ─── helpers ───────────────────────────────────────────────────────────────

function randomQuestion(tables) {
  const a = tables[Math.floor(Math.random() * tables.length)]
  const b = Math.floor(Math.random() * 10) + 1
  return { a, b, answer: a * b }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── screens ───────────────────────────────────────────────────────────────

function SetupScreen({ onStart }) {
  const [tables, setTables] = useState([2, 3, 4, 5, 6, 7, 8, 9, 10])
  const [duration, setDuration] = useState(60)

  const toggle = (n) =>
    setTables(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    )

  const allSelected = tables.length === 10
  const toggleAll = () => setTables(allSelected ? [] : [1,2,3,4,5,6,7,8,9,10])

  const DURATIONS = [
    { label: '1 min', value: 60 },
    { label: '2 min', value: 120 },
    { label: '3 min', value: 180 },
    { label: '5 min', value: 300 },
  ]

  return (
    <div className="screen setup-screen">
      <h1 className="title">🔢 Tabelline</h1>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Quali tabelline?</h2>
          <button className="link-btn" onClick={toggleAll}>
            {allSelected ? 'Nessuna' : 'Tutte'}
          </button>
        </div>
        <div className="table-grid">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              className={`table-btn ${tables.includes(n) ? 'active' : ''}`}
              onClick={() => toggle(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Per quanto tempo?</h2>
        <div className="duration-grid">
          {DURATIONS.map(d => (
            <button
              key={d.value}
              className={`duration-btn ${duration === d.value ? 'active' : ''}`}
              onClick={() => setDuration(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      <button
        className="start-btn"
        disabled={tables.length === 0}
        onClick={() => onStart({ tables, duration })}
      >
        Inizia!
      </button>
    </div>
  )
}

// ─── Numpad ────────────────────────────────────────────────────────────────

function Numpad({ value, onChange, onSubmit, disabled }) {
  const press = (key) => {
    if (disabled) return
    if (key === '⌫') {
      onChange(value.slice(0, -1))
    } else if (key === '✓') {
      if (value.length > 0) onSubmit()
    } else {
      if (value.length < 4) onChange(value + key)
    }
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓']

  return (
    <div className="numpad">
      {KEYS.map(k => (
        <button
          key={k}
          className={`numpad-key ${k === '✓' ? 'confirm' : ''} ${k === '⌫' ? 'back' : ''}`}
          onPointerDown={(e) => { e.preventDefault(); press(k) }}
          disabled={disabled && k !== '⌫'}
        >
          {k}
        </button>
      ))}
    </div>
  )
}

// ─── ExerciseScreen ────────────────────────────────────────────────────────

const FEEDBACK_DURATION = 900 // ms

function ExerciseScreen({ config, onFinish }) {
  const { tables, duration } = config
  const [timeLeft, setTimeLeft] = useState(duration)
  const [question, setQuestion] = useState(() => randomQuestion(tables))
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const feedbackTimer = useRef(null)

  // countdown
  useEffect(() => {
    if (feedback) return // pause timer during feedback? No — keep running
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [feedback])

  // time up → finish
  useEffect(() => {
    if (timeLeft === 0) {
      clearTimeout(feedbackTimer.current)
      onFinish(score)
    }
  }, [timeLeft])

  // physical keyboard support
  useEffect(() => {
    const handler = (e) => {
      if (feedback) return
      if (e.key >= '0' && e.key <= '9') {
        setInput(v => v.length < 4 ? v + e.key : v)
      } else if (e.key === 'Backspace') {
        setInput(v => v.slice(0, -1))
      } else if (e.key === 'Enter' && input.length > 0) {
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [feedback, input])

  const handleSubmit = useCallback(() => {
    if (!input || feedback) return
    const isCorrect = parseInt(input, 10) === question.answer
    const newScore = {
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    }
    setScore(newScore)
    setFeedback(isCorrect ? 'correct' : 'wrong')
    setCorrectAnswer(question.answer)

    feedbackTimer.current = setTimeout(() => {
      setFeedback(null)
      setCorrectAnswer(null)
      setInput('')
      setQuestion(randomQuestion(tables))
    }, FEEDBACK_DURATION)
  }, [input, feedback, question, score, tables])

  // allow submitting via numpad
  const handleNumpadSubmit = () => handleSubmit()

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const timerWarning = timeLeft <= 10

  return (
    <div className="screen exercise-screen">
      <div className="exercise-header">
        <div className={`timer ${timerWarning ? 'warning' : ''}`}>
          {mins}:{secs}
        </div>
        <div className="score-badge">
          ✅ {score.correct} / {score.total}
        </div>
      </div>

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

      <Numpad
        value={input}
        onChange={setInput}
        onSubmit={handleNumpadSubmit}
        disabled={!!feedback}
      />
    </div>
  )
}

// ─── ResultsScreen ─────────────────────────────────────────────────────────

function ResultsScreen({ score, config, onReplay, onHome }) {
  const pct = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100)

  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '⭐' : pct >= 50 ? '👍' : '💪'

  return (
    <div className="screen results-screen">
      <div className="results-emoji">{emoji}</div>
      <h1 className="results-title">Tempo scaduto!</h1>

      <div className="results-score">
        <div className="score-big">{score.correct}<span className="score-total">/{score.total}</span></div>
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

// ─── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('setup') // setup | playing | results
  const [config, setConfig] = useState(null)
  const [finalScore, setFinalScore] = useState(null)

  const handleStart = (cfg) => {
    setConfig(cfg)
    setScreen('playing')
  }

  const handleFinish = (score) => {
    setFinalScore(score)
    setScreen('results')
  }

  return (
    <div className="app">
      {screen === 'setup' && <SetupScreen onStart={handleStart} />}
      {screen === 'playing' && config && (
        <ExerciseScreen key={Date.now()} config={config} onFinish={handleFinish} />
      )}
      {screen === 'results' && (
        <ResultsScreen
          score={finalScore}
          config={config}
          onReplay={() => setScreen('playing')}
          onHome={() => setScreen('setup')}
        />
      )}
    </div>
  )
}
