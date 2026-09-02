/**
 * ScrollExpand — vendored from React Bits (JavaScript + CSS variant).
 * https://reactbits.dev
 *
 * LOCAL MODIFICATION (one, deliberate):
 *   Added `anchorX` / `anchorY` (0..1). Upstream always centres the resting
 *   frame — `ix = (100 - w) / 2`. Our art direction needs the resting frame
 *   pushed hard right so the photograph sits flush to the viewport edge while
 *   the headline holds the left. Both default to 0.5, i.e. upstream behaviour.
 *   The overlay also gets `pointer-events` gated on progress so its links are
 *   not clickable while it is still invisible.
 *
 * Everything else is upstream. Visual changes (radius, scrim, typography) live
 * in `src/styles/reactbits-overrides.css`, not here, so this file stays
 * diffable against the original.
 */

import { useCallback, useEffect, useRef } from 'react'

import './ScrollExpand.css'

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

const ScrollExpand = ({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  scrollHint = '',
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  anchorX = 0.5,
  anchorY = 0.5,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  useWindowScroll = false,
  enabled = true,
  children,
  className = '',
  style,
  ...rest
}) => {
  const rootRef = useRef(null)
  const trackRef = useRef(null)
  const stageRef = useRef(null)
  const frameRef = useRef(null)
  const mediaRef = useRef(null)
  const titleRef = useRef(null)
  const overlayRef = useRef(null)
  const scrimRef = useRef(null)
  const hintRef = useRef(null)

  const propsRef = useRef({})
  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    anchorX,
    anchorY,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  }

  const applyProgress = useCallback((p) => {
    const frame = frameRef.current
    const media = mediaRef.current
    if (!frame || !media) return
    const c = propsRef.current

    const e = smoothstep(0, 1, p)

    const w = c.startWidth + (100 - c.startWidth) * e
    const h = c.startHeight + (100 - c.startHeight) * e

    /* MODIFIED — anchored insets instead of always-centred. */
    const freeX = Math.max(0, 100 - w)
    const freeY = Math.max(0, 100 - h)
    const left = freeX * clamp(c.anchorX, 0, 1)
    const top = freeY * clamp(c.anchorY, 0, 1)
    const right = Math.max(0, freeX - left)
    const bottom = Math.max(0, freeY - top)

    const r = c.startRadius + (c.endRadius - c.startRadius) * e
    frame.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}% round ${r}px)`

    media.style.transform = `scale(${c.mediaZoom + (1 - c.mediaZoom) * e})`

    if (scrimRef.current) scrimRef.current.style.opacity = `${c.overlayScrim * e}`

    if (titleRef.current) {
      const out = smoothstep(0.4, 0.88, p)
      titleRef.current.style.opacity = `${1 - out}`
      titleRef.current.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`
      /* MODIFIED - inline value is authoritative so faded controls go inert. */
      titleRef.current.style.pointerEvents = out > 0.5 ? 'none' : 'auto'
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, p)
      hintRef.current.style.opacity = `${1 - gone}`
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`
    }

    if (overlayRef.current) {
      const inn = smoothstep(0.68, 1, p)
      overlayRef.current.style.opacity = `${inn}`
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`
      /* MODIFIED — do not let invisible overlay links swallow clicks. */
      overlayRef.current.style.pointerEvents = inn > 0.85 ? 'auto' : 'none'
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    const stage = stageRef.current
    if (!root || !track || !stage) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let current = 0
    let target = 0
    let stageH = 0
    let running = false

    const measure = () => {
      const c = propsRef.current
      stageH = c.useWindowScroll ? window.innerHeight : root.clientHeight
      if (stageH <= 0) return
      stage.style.height = `${stageH}px`
      track.style.height = `${
        stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance))
      }px`

      const w = root.clientWidth || stageH
      stage.style.setProperty('--se-title-size', `${clamp(w * 0.075, 20, 84)}px`)
    }

    const readProgress = () => {
      const c = propsRef.current
      if (!c.enabled) return 1
      const span = stageH * Math.max(0.01, c.scrollDistance)
      if (c.useWindowScroll) {
        const top = track.getBoundingClientRect().top
        return clamp(-top / span, 0, 1)
      }
      return clamp(root.scrollTop / span, 0, 1)
    }

    const tick = () => {
      const c = propsRef.current
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing))
      current += (target - current) * k
      if (Math.abs(target - current) < 0.0004) {
        current = target
        running = false
      }
      applyProgress(current)
      raf = running ? requestAnimationFrame(tick) : 0
    }

    const kick = () => {
      if (running) return
      running = true
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      target = readProgress()
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target
        applyProgress(current)
        return
      }
      kick()
    }

    const onResize = () => {
      measure()
      target = readProgress()
      current = target
      applyProgress(current)
    }

    measure()
    target = readProgress()
    current = target
    applyProgress(current)

    const scroller = useWindowScroll ? window : root
    scroller.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(root)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
    }
  }, [applyProgress, useWindowScroll])

  const media =
    mediaType === 'video' ? (
      <video
        ref={mediaRef}
        className="scroll-expand__media"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : (
      <img ref={mediaRef} className="scroll-expand__media" src={src} alt={alt} draggable={false} />
    )

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${useWindowScroll ? '' : 'scroll-expand--scroller'} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="scroll-expand__track">
        <div ref={stageRef} className="scroll-expand__stage">
          <div ref={frameRef} className="scroll-expand__frame">
            {media}
            <div ref={scrimRef} className="scroll-expand__scrim" />
            {children ? (
              <div ref={overlayRef} className="scroll-expand__overlay">
                {children}
              </div>
            ) : null}
          </div>
          {title ? (
            <div ref={titleRef} className="scroll-expand__title">
              {title}
            </div>
          ) : null}
          {scrollHint ? (
            <div ref={hintRef} className="scroll-expand__hint">
              {scrollHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ScrollExpand
