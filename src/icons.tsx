import type { ReactNode, SVGProps } from 'react'

function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function SunIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3.2" {...stroke} />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6" {...stroke} />
    </Svg>
  )
}

export function PinIcon() {
  return (
    <Svg>
      <path d="M12 21s6.2-5.4 6.2-10.2a6.2 6.2 0 1 0-12.4 0C5.8 15.6 12 21 12 21z" {...stroke} />
      <circle cx="12" cy="10.6" r="1.7" {...stroke} />
    </Svg>
  )
}

export function PracticeIcon() {
  return (
    <Svg>
      <path d="M5 8h14M5 12h14M5 16h9" {...stroke} />
    </Svg>
  )
}

export function BookmarkIcon() {
  return (
    <Svg>
      <path d="M7 4.5h10v15l-5-2.8-5 2.8v-15z" {...stroke} />
    </Svg>
  )
}

export function BarsIcon() {
  return (
    <Svg>
      <path d="M6 19V10M12 19V5M18 19v-7" {...stroke} />
    </Svg>
  )
}

export function FlameIcon() {
  return (
    <Svg>
      <path d="M12 3.5c.6 2.6-1.4 3.6-1.4 6 0 1.2.6 2 1.4 2.4.8-.4 1.4-1.2 1.4-2.4 1.6.8 3.1 2.4 3.1 4.6A4.5 4.5 0 0 1 12 18.6a4.5 4.5 0 0 1-4.5-4.5c0-2.4 1.6-3.8 2.6-5.2.6-1 .9-2.2 1.9-5.4z" {...stroke} />
    </Svg>
  )
}

export function BetaIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8.2" {...stroke} />
      <path d="M9.2 16.2V7.8h3.1a2.7 2.7 0 0 1 0 5.4H9.2" {...stroke} />
      <path d="M11.4 13.2h2.2L16 16.2" {...stroke} />
    </Svg>
  )
}

export function PlayIcon() {
  return (
    <Svg>
      <path d="M8 5.5v13l10-6.5-10-6.5z" {...stroke} />
    </Svg>
  )
}

export function CheckIcon() {
  return (
    <Svg>
      <path d="M5 12.5l4.2 4.2L19 7.5" {...stroke} />
    </Svg>
  )
}

export function CloseIcon() {
  return (
    <Svg>
      <path d="M7 7l10 10M17 7L7 17" {...stroke} />
    </Svg>
  )
}

export function ArrowIcon() {
  return (
    <Svg>
      <path d="M5 12h14M13 6l6 6-6 6" {...stroke} />
    </Svg>
  )
}

export function SlidersIcon() {
  return (
    <Svg>
      <path d="M4 8h16M4 16h16" {...stroke} />
      <circle cx="9" cy="8" r="2.1" {...stroke} />
      <circle cx="15" cy="16" r="2.1" {...stroke} />
    </Svg>
  )
}

export function GlobeIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8.2" {...stroke} />
      <path d="M4 12h16M12 3.8c2.2 2.3 3.3 5 3.3 8.2s-1.1 5.9-3.3 8.2c-2.2-2.3-3.3-5-3.3-8.2s1.1-5.9 3.3-8.2z" {...stroke} />
    </Svg>
  )
}

export function BookIcon() {
  return (
    <Svg>
      <path d="M5 5.5h6.2A2.8 2.8 0 0 1 14 8.3V19a2.4 2.4 0 0 0-2.4-1.6H5zM19 5.5h-6.2A2.8 2.8 0 0 0 10 8.3V19a2.4 2.4 0 0 1 2.4-1.6H19z" {...stroke} />
    </Svg>
  )
}

export function ShareIcon() {
  return (
    <Svg>
      <path d="M12 13.5V4.5M8.5 7.5L12 4l3.5 3.5M6 12.5v6h12v-6" {...stroke} />
    </Svg>
  )
}

export function TrashIcon() {
  return (
    <Svg>
      <path d="M5.5 7.5h13M9 7.5V5.5h6v2M8 7.5l.7 11h6.6l.7-11" {...stroke} />
    </Svg>
  )
}

export function TimerIcon() {
  return (
    <Svg>
      <circle cx="12" cy="13" r="7" {...stroke} />
      <path d="M12 13V9.5M9.5 4.5h5" {...stroke} />
    </Svg>
  )
}
