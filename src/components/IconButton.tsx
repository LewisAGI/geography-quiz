import { useId, useRef, useState, type ReactNode } from 'react'

export function IconButton({
  label,
  children,
  onClick,
  pressed,
  testId,
  className,
  type = 'button',
  place = 'above',
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  pressed?: boolean
  testId?: string
  className?: string
  type?: 'button' | 'submit'
  place?: 'above' | 'below'
}) {
  const tipId = useId()
  const [held, setHeld] = useState(false)
  const timer = useRef<number | null>(null)

  function clearTimer() {
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  return (
    <div className={`tip-wrap ${held ? 'show-tip' : ''}`} data-place={place}>
      <button
        type={type}
        className={`icon-btn ${className ?? ''}`}
        aria-label={label}
        aria-describedby={tipId}
        aria-pressed={pressed}
        data-testid={testId}
        onClick={onClick}
        onContextMenu={(event) => {
          event.preventDefault()
          setHeld(true)
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch') return
          clearTimer()
          timer.current = window.setTimeout(() => setHeld(true), 420)
        }}
        onPointerUp={clearTimer}
        onPointerCancel={clearTimer}
        onBlur={() => setHeld(false)}
      >
        {children}
      </button>
      <span role="tooltip" id={tipId} className="tip">
        {label}
      </span>
    </div>
  )
}
