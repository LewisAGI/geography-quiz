import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { entityFor, sourceById } from '../lib/catalog'
import { explanationFor } from '../lib/explain'
import { mapScore } from '../lib/geo'
import { gradeQuestion } from '../lib/grade'
import { statusNoteFor } from '../lib/recognition'
import { seededOrder } from '../lib/hash'
import { buildQuestions } from '../lib/select'
import { shareCard } from '../lib/share'
import { applyAnswer, recordBlitz } from '../lib/storage'
import { TYPED_TYPES, type Difficulty, type PlayMode, type Progress, type Question, type Settings } from '../lib/types'
import { ArrowIcon, BookIcon, CheckIcon, CloseIcon, PlayIcon, ShareIcon } from '../icons'
import { IconButton } from './IconButton'
import { MapPane } from './MapPane'
import { StatusNote } from './StatusNote'

const TYPED = new Set<string>(TYPED_TYPES)
type Phase = 'ask' | 'reveal' | 'done' | 'handoff'

function kindFor(mode: PlayMode, question: Question): 'map' | 'choice' | 'typed' {
  if (question.type === 'map_click') return 'map'
  if (mode === 'choices') return 'choice'
  if ((mode === 'review' || mode === 'spaced') && !TYPED.has(question.type)) return 'choice'
  return 'typed'
}

/** Bring the revealed answer above the sticky actions. Leave the card alone when it already fits. */
function scrollRevealAnswerIntoView(card: HTMLElement) {
  const answer = card.querySelector<HTMLElement>('[data-testid="reveal-answer"]')
  if (!answer) return
  const actions = card.querySelector<HTMLElement>('.reveal-actions')
  const cardRect = card.getBoundingClientRect()
  const answerRect = answer.getBoundingClientRect()
  const visibleBottom = actions ? actions.getBoundingClientRect().top : cardRect.bottom
  if (answerRect.top >= cardRect.top - 1 && answerRect.bottom <= visibleBottom + 1) return
  if (answerRect.bottom > visibleBottom) card.scrollTop += answerRect.bottom - visibleBottom
  const nextRect = answer.getBoundingClientRect()
  if (nextRect.top < cardRect.top) card.scrollTop -= cardRect.top - nextRect.top
}

function DiffMarks({ level }: { level: Difficulty }) {
  const filled = level === 'easy' ? 1 : level === 'medium' ? 2 : 3
  return (
    <span className="diff" aria-label={level}>
      {[0, 1, 2].map((mark) => (
        <i key={mark} className={mark < filled ? 'on' : ''} />
      ))}
    </span>
  )
}

export function QuizPlay({
  mode,
  settings,
  today,
  seed,
  progress,
  update,
}: {
  mode: PlayMode
  settings: Settings
  today: string
  seed: string
  progress: Progress
  update: (recipe: (progress: Progress) => Progress) => void
}) {
  const daily = progress.daily[today]
  const [questions, setQuestions] = useState(() =>
    buildQuestions({
      mode,
      settings,
      today,
      seed,
      dailyIds: daily?.questionIds,
      mistakeIds: progress.mistakes,
      stats: progress.stats,
    }),
  )
  const alreadyDone =
    mode === 'daily' &&
    questions.length > 0 &&
    Boolean(daily?.completed || (daily?.answers.length ?? 0) >= questions.length)
  const [index, setIndex] = useState(() =>
    mode === 'daily' ? Math.min(daily?.answers.length ?? 0, Math.max(questions.length - 1, 0)) : 0,
  )
  const [phase, setPhase] = useState<Phase>(alreadyDone ? 'done' : 'ask')
  const [guess, setGuess] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [lastCorrect, setLastCorrect] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [player, setPlayer] = useState<0 | 1>(0)
  const [scores, setScores] = useState<[number, number]>([0, 0])
  const [runCorrect, setRunCorrect] = useState(0)
  const [left, setLeft] = useState(90)
  const runRef = useRef(0)
  const lock = useRef(false)
  const mapCardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const card = mapCardRef.current
    if (!card) return
    if (phase !== 'reveal') {
      card.scrollTop = 0
      return
    }
    scrollRevealAnswerIntoView(card)
    const observer = new ResizeObserver(() => scrollRevealAnswerIntoView(card))
    observer.observe(card)
    const answer = card.querySelector('[data-testid="reveal-answer"]')
    if (answer) observer.observe(answer)
    return () => observer.disconnect()
  }, [phase, index])

  useEffect(() => {
    if (mode !== 'blitz') return
    const deadline = Date.now() + 90_000
    setLeft(90)
    const timer = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setLeft(remain)
      if (remain <= 0) {
        window.clearInterval(timer)
        setPhase('done')
        update((current) => recordBlitz(current, runRef.current))
      }
    }, 200)
    return () => window.clearInterval(timer)
  }, [mode, update])

  const question = questions[index]
  const entity = question ? entityFor(question) : undefined
  const explanation = question ? explanationFor(question, entity) : ''
  const options = useMemo(() => {
    if (!question) return []
    return seededOrder([...new Set([question.answer, ...(question.distractors ?? [])])], `${seed}:${question.id}`, (item) => item)
  }, [question, seed])
  const linked = (question?.sources ?? [])
    .map((id) => sourceById.get(id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source))

  function bump(correct: boolean) {
    setRunCorrect((count) => {
      const next = count + (correct ? 1 : 0)
      runRef.current = next
      return next
    })
    if (mode === 'duel') {
      setScores((current) => {
        const copy: [number, number] = [current[0], current[1]]
        if (correct) copy[player] += 1
        return copy
      })
    }
  }

  function resetAsk() {
    lock.current = false
    setPhase('ask')
    setGuess('')
    setPicked(null)
    setPin(null)
    setDistance(null)
    setSourcesOpen(false)
    setLastCorrect(false)
  }

  function commit(correct: boolean, text: string) {
    if (!question || phase !== 'ask' || lock.current) return
    lock.current = true
    setLastCorrect(correct)
    setPhase('reveal')
    bump(correct)
    update((current) =>
      applyAnswer(current, { question, correct, guess: text, date: today, mode }),
    )
  }

  function submitTyped() {
    if (!question) return
    const text = guess.trim()
    if (!text) return
    commit(gradeQuestion(question, text), text)
  }

  function submitChoice(option: string) {
    if (!question || phase !== 'ask') return
    setPicked(option)
    commit(option === question.answer, option)
  }

  function submitMap(lat: number, lon: number) {
    if (!question || phase !== 'ask') return
    const result = mapScore(lat, lon, question)
    setPin({ lat, lon })
    setDistance(result.km)
    commit(result.correct, `${result.km} km`)
  }

  function extend(nextMode: PlayMode): Question[] {
    return buildQuestions({
      mode: nextMode,
      settings,
      today,
      seed: `${seed}-more-${questions.length}-${index}`,
      exclude: new Set(questions.map((item) => item.id)),
    })
  }

  function next() {
    if (mode === 'duel' && player === 0 && index + 1 >= questions.length) {
      setPhase('handoff')
      setSourcesOpen(false)
      return
    }
    if (index + 1 >= questions.length) {
      if (mode === 'endless' || mode === 'blitz') {
        const extra = extend(mode)
        if (extra.length > 0) {
          setQuestions((current) => [...current, ...extra])
          setIndex((value) => value + 1)
          resetAsk()
          return
        }
      }
      if (mode === 'blitz') update((current) => recordBlitz(current, runRef.current))
      setPhase('done')
      setSourcesOpen(false)
      return
    }
    setIndex((value) => value + 1)
    resetAsk()
  }

  if (questions.length === 0 || !question) {
    return (
      <div className="empty" data-testid="empty">
        0
      </div>
    )
  }

  if (phase === 'handoff') {
    return (
      <section className="handoff">
        <p className="player-mark">II</p>
        <IconButton
          label="Player two"
          className="primary"
          onClick={() => {
            setPlayer(1)
            setIndex(0)
            resetAsk()
          }}
        >
          <PlayIcon />
        </IconButton>
      </section>
    )
  }

  if (phase === 'done') {
    if (mode === 'daily') {
      const record = progress.daily[today]
      const correct = record?.answers.filter((answer) => answer.correct).length ?? 0
      const total = record?.questionIds.length ?? questions.length
      return (
        <section className="card-result" data-testid="daily-result">
          <p className="today-date">{today}</p>
          <p className="score">
            {correct}/{total}
          </p>
          <p className="streak-figure" data-testid="result-streak">
            {progress.streak.count}
          </p>
          <IconButton
            label="Share"
            className="primary"
            onClick={() => void shareCard(today, correct, total, progress.streak.count)}
          >
            <ShareIcon />
          </IconButton>
        </section>
      )
    }
    if (mode === 'duel') {
      return (
        <section className="card-result" data-testid="duel-result">
          <p className="score">I {scores[0]}</p>
          <p className="score">II {scores[1]}</p>
        </section>
      )
    }
    return (
      <section className="card-result" data-testid="session-result">
        <p className="score">
          {mode === 'blitz' ? runCorrect : `${runCorrect}/${questions.length}`}
        </p>
      </section>
    )
  }

  const kind = kindFor(mode, question)
  const showFlag = question.type === 'flag'
  const iso = (question.answer_iso2 ?? question.country_iso2 ?? '').toLowerCase()

  return (
    <section className={kind === 'map' ? 'quiz quiz-map' : 'quiz'} data-testid="quiz" data-mode={mode}>
      {kind === 'map' ? (
        <>
          <div className="map-wrap">
            <div className="map-card" ref={mapCardRef}>
              <div className="q-top">
                <DiffMarks level={question.difficulty} />
                <span className="q-index">
                  {index + 1}/{questions.length}
                </span>
                {mode === 'blitz' ? (
                  <span className="timer" data-testid="timer">
                    {left}
                  </span>
                ) : null}
                {mode === 'duel' ? (
                  <span className="timer" data-testid="duel-player">
                    {player === 0 ? 'I' : 'II'} {scores[0]}·{scores[1]}
                  </span>
                ) : null}
              </div>
              <h1 className="prompt" data-testid="prompt">
                {question.prompt}
              </h1>
              {phase === 'reveal' ? (
                <div className={`reveal ${lastCorrect ? 'good' : 'bad'}`} data-testid="reveal" data-correct={String(lastCorrect)}>
                  <div className="reveal-body">
                    <p className="distance" data-testid="distance">
                      {distance} km
                    </p>
                    <p className="reveal-answer" data-testid="reveal-answer">
                      {question.answer}
                    </p>
                    <p className="reveal-explain" data-testid="explanation">
                      {explanation}
                    </p>
                    <StatusNote question={question} />
                  </div>
                  <div className="reveal-actions">
                    <IconButton label="Sources" onClick={() => setSourcesOpen(true)}>
                      <BookIcon />
                    </IconButton>
                    <IconButton label="Next" testId="next" onClick={next}>
                      <ArrowIcon />
                    </IconButton>
                  </div>
                </div>
              ) : null}
            </div>
            <MapPane
              question={question}
              revealed={phase === 'reveal'}
              guessLat={pin?.lat ?? null}
              guessLon={pin?.lon ?? null}
              onGuess={submitMap}
            />
          </div>
        </>
      ) : (
        <>
          <div className="quiz-body">
            <div className="q-top">
              <DiffMarks level={question.difficulty} />
              <span className="q-index">
                {index + 1}/{questions.length}
              </span>
              {mode === 'blitz' ? (
                <span className="timer" data-testid="timer">
                  {left}
                </span>
              ) : null}
              {mode === 'duel' ? (
                <span className="timer" data-testid="duel-player">
                  {player === 0 ? 'I' : 'II'} {scores[0]}·{scores[1]}
                </span>
              ) : null}
            </div>
            {showFlag && iso ? <span className={`fi fi-${iso} flag-xl`} role="img" aria-label="Flag" /> : null}
            <h1 className={showFlag && mode === 'flags' ? 'prompt sr-only' : 'prompt'} data-testid="prompt">
              {question.prompt}
            </h1>
            {kind === 'choice' ? (
              <div className="choices">
                {options.map((option) => {
                  const marked = phase === 'reveal' && (option === question.answer || option === picked)
                  const className = !marked ? 'choice' : option === question.answer ? 'choice right' : 'choice wrong'
                  return (
                    <button
                      key={option}
                      type="button"
                      className={className}
                      data-testid="choice"
                      disabled={phase === 'reveal'}
                      onClick={() => submitChoice(option)}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            ) : (
              <form
                className="answer-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (phase === 'reveal') next()
                  else submitTyped()
                }}
              >
                <input
                  className="guess"
                  data-testid="guess"
                  aria-label="Answer"
                  value={guess}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode={question.type === 'border_count' ? 'numeric' : 'text'}
                  disabled={phase === 'reveal'}
                  onChange={(event) => setGuess(event.target.value)}
                />
                {phase === 'ask' ? (
                  <IconButton label="Check" type="submit" testId="submit">
                    <CheckIcon />
                  </IconButton>
                ) : null}
              </form>
            )}
          </div>
          {phase === 'reveal' ? (
            <div className={`reveal ${lastCorrect ? 'good' : 'bad'}`} data-testid="reveal" data-correct={String(lastCorrect)} aria-live="polite">
              <p className="reveal-answer" data-testid="reveal-answer">
                {question.answer}
              </p>
              <p className="reveal-explain" data-testid="explanation">
                {explanation}
              </p>
              <StatusNote question={question} />
              {question.note && !statusNoteFor(question) ? <p className="reveal-note">{question.note}</p> : null}
              <div className="reveal-actions">
                <IconButton label="Sources" onClick={() => setSourcesOpen(true)}>
                  <BookIcon />
                </IconButton>
                <IconButton label="Next" testId="next" onClick={next}>
                  <ArrowIcon />
                </IconButton>
              </div>
            </div>
          ) : null}
        </>
      )}
      {sourcesOpen ? (
        <>
          <button className="scrim" aria-label="Close" onClick={() => setSourcesOpen(false)} />
          <aside className="drawer" role="dialog">
            <IconButton label="Close" onClick={() => setSourcesOpen(false)}>
              <CloseIcon />
            </IconButton>
            {question.note ? <p className="reveal-note">{question.note}</p> : null}
            <ul className="sources">
              {linked.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </>
      ) : null}
    </section>
  )
}
