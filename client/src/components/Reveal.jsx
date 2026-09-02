import { useEffect, useRef, useState } from 'react'

/** How long we let the observer do its job before showing the content anyway. */
const FAILSAFE_MS = 1200

/**
 * Fades a block up once as it enters the viewport. Motion is the only "depth"
 * device available here — the art direction rules out shadows — so it stays
 * small and runs a single time per element.
 *
 * The content starts at opacity 0, which makes this a load-bearing effect: if
 * the observer never fires the section would simply be blank. So there are two
 * escape hatches — no IntersectionObserver support, and a timeout — and the
 * reduced-motion path skips the animation entirely.
 */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', ...rest }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    )
    io.observe(el)

    // Never leave a section invisible because the observer didn't fire.
    const failsafe = setTimeout(() => {
      setSeen(true)
      io.disconnect()
    }, FAILSAFE_MS)

    return () => {
      clearTimeout(failsafe)
      io.disconnect()
    }
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal${seen ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: seen ? `${delay}ms` : '0ms' }}
      {...rest}
    />
  )
}
