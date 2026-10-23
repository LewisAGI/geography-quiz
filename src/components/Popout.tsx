import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconButton } from './IconButton'

export function Popout({
  label,
  icon,
  children,
  testId,
  place = 'below',
  align = 'down',
  pressed,
}: {
  label: string
  icon: ReactNode
  children: ReactNode
  testId?: string
  place?: 'above' | 'below'
  align?: 'down' | 'up'
  pressed?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`pop pop-${align}`} ref={ref}>
      <IconButton
        label={label}
        testId={testId}
        pressed={open || pressed}
        place={place}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
      </IconButton>
      {open ? (
        <div
          role="menu"
          id={menuId}
          className="pop-panel"
          onClick={(event) => {
            const item = (event.target as HTMLElement).closest('[role="menuitem"], [role="menuitemradio"]')
            if (item) setOpen(false)
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
