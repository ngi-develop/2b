/**
 * Line icons drawn inline. Square caps and joins, 1.5px strokes — they have
 * to sit in the same visual language as the hairline rules, and the art
 * direction rules out emoji entirely.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
  'aria-hidden': true,
  focusable: false,
}

export function Arrow({ className = 'arrow' }) {
  return (
    <svg className={className} viewBox="0 0 15 10" width="15" height="10" {...base}>
      <path d="M0 5h13.4M9.4 1l4 4-4 4" />
    </svg>
  )
}

export function ArrowLeft({ size = 15 }) {
  return (
    <svg viewBox="0 0 15 10" width={size} height={(size * 10) / 15} {...base}>
      <path d="M15 5H1.6M5.6 1l-4 4 4 4" />
    </svg>
  )
}

export function ArrowDown({ size = 14 }) {
  return (
    <svg viewBox="0 0 10 15" width={(size * 10) / 15} height={size} {...base}>
      <path d="M5 0v13.4M1 9.4l4 4 4-4" />
    </svg>
  )
}

export function Check({ size = 18 }) {
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} {...base} strokeWidth={2}>
      <path d="M2 9.5l4.6 4.6L16 4.5" />
    </svg>
  )
}

export function Search({ size = 15 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} {...base}>
      <circle cx="6.8" cy="6.8" r="5.3" />
      <path d="M10.8 10.8L15 15" />
    </svg>
  )
}

export function Pin({ size = 16 }) {
  return (
    <svg viewBox="0 0 16 18" width={size} height={size} {...base}>
      <path d="M8 17c4-4.6 6-8 6-10.5A6 6 0 002 6.5C2 9 4 12.4 8 17z" />
      <circle cx="8" cy="6.6" r="2.1" />
    </svg>
  )
}

export function Phone({ size = 16 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} {...base}>
      <path d="M1 2.5L4 1l2 3.5-1.8 1.4a10 10 0 004.9 4.9L10.5 9l3.5 2-1.5 3c-4.4.5-11-6.1-11.5-11.5z" />
    </svg>
  )
}

export function Mail({ size = 16 }) {
  return (
    <svg viewBox="0 0 18 14" width={size} height={size} {...base}>
      <path d="M1 1h16v12H1z" />
      <path d="M1 1l8 6.5L17 1" />
    </svg>
  )
}

export function Gear({ size = 16 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} {...base}>
      <path d="M3 1v14M8 1v14M13 1v6M1 8h14" />
    </svg>
  )
}

export function Seats({ size = 16 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} {...base}>
      <path d="M3 1h7v9H3zM1 10h14v5H1z" />
    </svg>
  )
}

export function Fuel({ size = 16 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} {...base}>
      <path d="M1 15V2a1 1 0 011-1h6a1 1 0 011 1v13M1 7h8M9 5h3l2 2v6a1.5 1.5 0 01-3 0V9H9" />
    </svg>
  )
}

export function Doc({ size = 16 }) {
  return (
    <svg viewBox="0 0 14 17" width={size} height={size} {...base}>
      <path d="M1 1h8l4 4v11H1z" />
      <path d="M9 1v4h4M4 9h6M4 12h6" />
    </svg>
  )
}

export function Shield({ size = 16 }) {
  return (
    <svg viewBox="0 0 16 18" width={size} height={size} {...base}>
      <path d="M8 1l7 2.5V9c0 4-3 6.6-7 8-4-1.4-7-4-7-8V3.5z" />
      <path d="M5 8.8l2.2 2.2L11 7" />
    </svg>
  )
}

export function Headset({ size = 16 }) {
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} {...base}>
      <path d="M2 11V9a7 7 0 0114 0v2" />
      <path d="M1 11h3v5H2a1 1 0 01-1-1zM14 11h3v4a1 1 0 01-1 1h-2z" />
      <path d="M17 15v1a2 2 0 01-2 2H9" />
    </svg>
  )
}

export function Tag({ size = 16 }) {
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} {...base}>
      <path d="M1 1h7.5L17 9.5 9.5 17 1 8.5z" />
      <path d="M5 5h.01" />
    </svg>
  )
}

export function Truck({ size = 16 }) {
  return (
    <svg viewBox="0 0 20 16" width={size} height={size} {...base}>
      <path d="M1 1h11v10H1zM12 4h3.5L19 7.5V11h-7z" />
      <circle cx="5" cy="13" r="1.8" />
      <circle cx="15" cy="13" r="1.8" />
    </svg>
  )
}
