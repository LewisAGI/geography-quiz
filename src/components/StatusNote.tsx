import { statusNoteFor } from '../lib/recognition'
import type { Question } from '../lib/types'

export function StatusNote({ question }: { question: Pick<Question, 'id' | 'country_iso2'> }) {
  const note = statusNoteFor(question)
  if (!note) return null
  return (
    <p className="status-note" data-testid="status-note">
      {note}
    </p>
  )
}
