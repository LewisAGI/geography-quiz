import { useCallback, useMemo, useRef, useState } from 'react'
import { QuizPlay } from './components/QuizPlay'
import { IconButton } from './components/IconButton'
import { Popout } from './components/Popout'
import {
  BarsIcon,
  BetaIcon,
  BookmarkIcon,
  CheckIcon,
  FlameIcon,
  GlobeIcon,
  PinIcon,
  PlayIcon,
  PracticeIcon,
  SlidersIcon,
  SunIcon,
  TrashIcon,
} from './icons'
import { CONTINENTS, playable, questionById } from './lib/catalog'
import { dailyQuestions } from './lib/daily'
import { formatDate, todayISO } from './lib/date'
import { clearMistakes, ensureDaily, loadProgress, patchSettings, saveProgress } from './lib/storage'
import { breakdown } from './lib/stats'
import type { ContinentFilter, DifficultyFilter, PlayMode, Progress } from './lib/types'

const BETA = 'Beta'

const TYPE_LABEL: Record<string, string> = {
  capital: 'Capital',
  capital_reverse: 'Reverse',
  map_click: 'Map',
  flag: 'Flag',
  border: 'Border',
  border_count: 'Borders',
  population_compare: 'Population',
  population_band: 'Scale',
  highest_point: 'Summit',
  river: 'River',
}

type Route =
  | { name: 'today' }
  | { name: 'review' }
  | { name: 'stats' }
  | { name: 'play'; mode: PlayMode; nonce: number }

function loadInitial(): Progress {
  const loaded = loadProgress(localStorage)
  const today = todayISO()
  const next = ensureDaily(
    loaded,
    today,
    dailyQuestions(playable, today).map((question) => question.id),
  )
  if (next !== loaded) saveProgress(localStorage, next)
  return next
}

export function App() {
  const [today] = useState(todayISO)
  const [progress, setProgress] = useState(loadInitial)
  const [route, setRoute] = useState<Route>({ name: 'today' })
  const nonce = useRef(1)

  const update = useCallback((recipe: (current: Progress) => Progress) => {
    setProgress((current) => {
      const next = recipe(current)
      saveProgress(localStorage, next)
      return next
    })
  }, [])

  function start(mode: PlayMode) {
    nonce.current += 1
    setRoute({ name: 'play', mode, nonce: nonce.current })
  }

  const daily = progress.daily[today]
  const answered = daily?.answers.length ?? 0
  const total = daily?.questionIds.length || 10
  const correct = daily?.answers.filter((answer) => answer.correct).length ?? 0
  const completed = Boolean(daily?.completed)
  const ring = completed ? correct / total : answered / total
  const mistakes = progress.mistakes
    .map((id) => questionById.get(id))
    .filter((question): question is NonNullable<typeof question> => Boolean(question))
  const attempts = Object.values(progress.stats).reduce((sum, stat) => sum + stat.correct + stat.wrong, 0)
  const hits = Object.values(progress.stats).reduce((sum, stat) => sum + stat.correct, 0)
  const accuracy = attempts ? Math.round((100 * hits) / attempts) : 0
  const byType = useMemo(() => breakdown(progress, playable, 'type'), [progress])
  const byPlace = useMemo(() => breakdown(progress, playable, 'continent'), [progress])
  const practiceOn = route.name === 'play' && !['daily', 'map', 'review'].includes(route.mode)
  const placeLabel = CONTINENTS.find((item) => item.id === progress.settings.continent)?.label ?? 'World'

  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          Meri<span>dian</span>
        </div>
        <div className="header-actions">
          <Popout label="Difficulty" icon={<SlidersIcon />} testId="difficulty" place="below" align="down">
            {(['all', 'easy', 'medium', 'hard'] as DifficultyFilter[]).map((level) => (
              <button
                key={level}
                type="button"
                role="menuitemradio"
                aria-checked={progress.settings.difficulty === level}
                onClick={() => update((current) => patchSettings(current, { difficulty: level }))}
              >
                {level === 'all' ? 'All' : level[0].toUpperCase() + level.slice(1)}
              </button>
            ))}
          </Popout>
          <Popout label="Continent" icon={<GlobeIcon />} testId="continent" place="below" align="down">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={progress.settings.continent === 'all'}
              onClick={() => update((current) => patchSettings(current, { continent: 'all' }))}
            >
              All
            </button>
            {CONTINENTS.map((continent) => (
              <button
                key={continent.id}
                type="button"
                role="menuitemradio"
                aria-checked={progress.settings.continent === continent.id}
                onClick={() =>
                  update((current) => patchSettings(current, { continent: continent.id as ContinentFilter }))
                }
              >
                {continent.label}
              </button>
            ))}
          </Popout>
          <IconButton label={BETA} testId="beta" place="below">
            <BetaIcon />
          </IconButton>
          <IconButton label={`Streak ${progress.streak.count}`} testId="streak" place="below">
            <FlameIcon />
            <span className="badge" data-testid="streak-count">
              {progress.streak.count}
            </span>
          </IconButton>
        </div>
      </header>
      <main className="stage">
        {route.name === 'today' ? (
          <section className="today">
            <p className="today-date">{formatDate(today)}</p>
            <div className="ring-wrap" data-testid="daily-progress" aria-label={`${answered}/${total}`}>
              <svg viewBox="0 0 120 120" className="ring-svg" aria-hidden="true">
                <circle cx="60" cy="60" r="52" className="ring-track" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  className="ring-value"
                  pathLength={100}
                  strokeDasharray={`${Math.max(0, Math.min(100, ring * 100))} 100`}
                />
              </svg>
              <div className="ring-label">
                <strong>{completed ? correct : answered}</strong>
                <small>/{total}</small>
              </div>
            </div>
            <IconButton
              label={completed ? 'Result' : 'Daily'}
              className="primary"
              testId="start-daily"
              onClick={() => start('daily')}
            >
              {completed ? <CheckIcon /> : <PlayIcon />}
            </IconButton>
          </section>
        ) : null}
        {route.name === 'review' ? (
          <section className="review">
            <div className="review-tools">
              <IconButton label="Review" className="primary" onClick={() => start('review')} testId="start-review">
                <PlayIcon />
              </IconButton>
              <IconButton label="Clear" onClick={() => update(clearMistakes)} testId="clear-review">
                <TrashIcon />
              </IconButton>
            </div>
            {mistakes.length === 0 ? (
              <div className="empty" data-testid="empty">
                0
              </div>
            ) : (
              <ul className="review-list" data-testid="review-list">
                {mistakes.map((question) => (
                  <li key={question.id}>
                    <button type="button" onClick={() => start('review')}>
                      {question.prompt}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
        {route.name === 'stats' ? (
          <section className="stats">
            <div className="stat-grid">
              <article className="stat">
                <span>Streak</span>
                <strong>{progress.streak.count}</strong>
              </article>
              <article className="stat">
                <span>Best</span>
                <strong>{progress.streak.best}</strong>
              </article>
              <article className="stat">
                <span>Answered</span>
                <strong>{attempts}</strong>
              </article>
              <article className="stat">
                <span>Accuracy</span>
                <strong>{accuracy}</strong>
              </article>
              <article className="stat">
                <span>Blitz</span>
                <strong>{progress.blitzBest}</strong>
              </article>
            </div>
            <Breakdown title="Kinds" rows={byType} label={(key) => TYPE_LABEL[key] ?? key} />
            <Breakdown
              title="Places"
              rows={byPlace}
              label={(key) => CONTINENTS.find((item) => item.id === key)?.label ?? key}
            />
          </section>
        ) : null}
        {route.name === 'play' ? (
          <QuizPlay
            key={`${route.mode}-${route.nonce}`}
            mode={route.mode}
            settings={progress.settings}
            today={today}
            seed={route.mode === 'daily' ? today : String(route.nonce)}
            progress={progress}
            update={update}
          />
        ) : null}
      </main>
      <nav className="nav">
        <IconButton
          label="Today"
          testId="nav-today"
          pressed={route.name === 'today' || (route.name === 'play' && route.mode === 'daily')}
          onClick={() => setRoute({ name: 'today' })}
        >
          <SunIcon />
        </IconButton>
        <IconButton
          label="Map"
          testId="nav-map"
          pressed={route.name === 'play' && route.mode === 'map'}
          onClick={() => start('map')}
        >
          <PinIcon />
        </IconButton>
        <Popout label="Practice" testId="nav-practice" place="above" align="up" pressed={practiceOn} icon={<PracticeIcon />}>
          <button type="button" role="menuitem" onClick={() => start('endless')}>
            Endless
          </button>
          <button type="button" role="menuitem" onClick={() => start('blitz')}>
            Blitz
          </button>
          <button type="button" role="menuitem" onClick={() => start('flags')}>
            Flags
          </button>
          <button type="button" role="menuitem" onClick={() => start('choices')}>
            Choices
          </button>
          <button type="button" role="menuitem" onClick={() => start('spaced')}>
            Spaced
          </button>
          <button type="button" role="menuitem" onClick={() => start('pack')}>
            {placeLabel}
          </button>
          <button type="button" role="menuitem" onClick={() => start('duel')}>
            Duel
          </button>
        </Popout>
        <IconButton
          label="Review"
          testId="nav-review"
          pressed={route.name === 'review' || (route.name === 'play' && route.mode === 'review')}
          onClick={() => setRoute({ name: 'review' })}
        >
          <BookmarkIcon />
        </IconButton>
        <IconButton label="Stats" testId="nav-stats" pressed={route.name === 'stats'} onClick={() => setRoute({ name: 'stats' })}>
          <BarsIcon />
        </IconButton>
      </nav>
    </div>
  )
}

function Breakdown({
  title,
  rows,
  label,
}: {
  title: string
  rows: { key: string; pct: number }[]
  label: (key: string) => string
}) {
  if (rows.length === 0) return null
  return (
    <section className="weak">
      <h2>{title}</h2>
      <ul>
        {rows.map((row) => (
          <li key={row.key}>
            <span>{label(row.key)}</span>
            <span className="track">
              <span className="fill" style={{ width: `${row.pct}%` }} />
            </span>
            <span>{row.pct}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
