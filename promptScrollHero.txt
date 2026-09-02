## Integrate the <ScrollExpand /> component from React Bits

You are helping integrate an open-source React component into an existing application.

### Component: ScrollExpand
### Variant: JavaScript + CSS


---

### Usage Example
```jsx
import ScrollExpand from './ScrollExpand';

<ScrollExpand
  src="/hero.jpg"
  alt="Product hero"
  title="Built to scale"
  scrollHint="Scroll"
  useWindowScroll
>
  <h2>Every pixel, everywhere</h2>
  <p>The frame opens up as you scroll and hands the whole stage to your media.</p>
</ScrollExpand>

<div style={{ height: '520px' }}>
  <ScrollExpand src="/hero.jpg" title="Built to scale" mediaZoom={1.35} />
</div>
```

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| src | string | '' | Image or video URL shown inside the frame. |
| mediaType | "image" | "video" | "image" | Whether the source is an image or a looping muted video. |
| poster | string | '' | Poster frame used while a video loads. |
| alt | string | '' | Alt text for the image. |
| title | string | '' | Headline held over the frame that lifts away as the media takes over. |
| scrollHint | string | '' | Small cue shown under the resting frame that fades away as soon as the scroll begins. |
| startWidth | number | 42 | Frame width before expanding, as a percentage of the stage. |
| startHeight | number | 58 | Frame height before expanding, as a percentage of the stage. |
| startRadius | number | 24 | Corner radius of the resting frame, in px. |
| endRadius | number | 0 | Corner radius once fully expanded, in px. |
| mediaZoom | number | 1.35 | How far the media is zoomed in at rest. It eases back to 1 as the frame opens up. |
| scrollDistance | number | 1.2 | Scroll length of the expansion, in multiples of the stage height. |
| holdDistance | number | 0.35 | Extra scroll the frame stays pinned at full bleed before releasing. |
| smoothing | number | 0.1 | Follow time in seconds. 0 locks the frame exactly to the scrollbar. |
| overlayScrim | number | 0.45 | Strength of the gradient scrim that fades in to keep overlay content readable. |
| useWindowScroll | boolean | false | Drive the expansion from the page scroll instead of the component’s own scroller. |
| enabled | boolean | true | Enable or disable the expansion. |
| children | React.ReactNode | — | Content that fades in over the media once it reaches full bleed. |
| className | string | '' | Additional class names for the container. |
| style | object | — | Inline styles for the container. |

### Full Component Source
```jsx
import { useCallback, useEffect, useRef } from 'react';

import './ScrollExpand.css';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

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
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const mediaRef = useRef(null);
  const titleRef = useRef(null);
  const overlayRef = useRef(null);
  const scrimRef = useRef(null);
  const hintRef = useRef(null);

  const propsRef = useRef({});
  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled
  };

  const applyProgress = useCallback(p => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;
    const c = propsRef.current;

    const e = smoothstep(0, 1, p);

    const w = c.startWidth + (100 - c.startWidth) * e;
    const h = c.startHeight + (100 - c.startHeight) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = c.startRadius + (c.endRadius - c.startRadius) * e;
    frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;

    media.style.transform = `scale(${c.mediaZoom + (1 - c.mediaZoom) * e})`;

    if (scrimRef.current) scrimRef.current.style.opacity = `${c.overlayScrim * e}`;

    if (titleRef.current) {
      const out = smoothstep(0.4, 0.88, p);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`;
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, p);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      const inn = smoothstep(0.68, 1, p);
      overlayRef.current.style.opacity = `${inn}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`;
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;
    let running = false;

    const measure = () => {
      const c = propsRef.current;
      stageH = c.useWindowScroll ? window.innerHeight : root.clientHeight;
      if (stageH <= 0) return;
      stage.style.height = `${stageH}px`;
      track.style.height = `${stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance))}px`;

      const w = root.clientWidth || stageH;
      stage.style.setProperty('--se-title-size', `${clamp(w * 0.075, 20, 84)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 1;
      const span = stageH * Math.max(0.01, c.scrollDistance);
      if (c.useWindowScroll) {
        const top = track.getBoundingClientRect().top;
        return clamp(-top / span, 0, 1);
      }
      return clamp(root.scrollTop / span, 0, 1);
    };

    const tick = () => {
      const c = propsRef.current;
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing));
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      raf = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    target = readProgress();
    current = target;
    applyProgress(current);

    const scroller = useWindowScroll ? window : root;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

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
    );

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
  );
};

export default ScrollExpand;

```

### Component CSS
```css
.scroll-expand {
  position: relative;
  width: 100%;
  height: 100%;
}

.scroll-expand--scroller {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  overscroll-behavior: contain;
}

.scroll-expand--scroller::-webkit-scrollbar {
  display: none;
}

.scroll-expand__track {
  position: relative;
  width: 100%;
}

.scroll-expand__stage {
  position: sticky;
  top: 0;
  width: 100%;
  overflow: hidden;
  --se-title-size: 4rem;
}

.scroll-expand__frame {
  position: absolute;
  inset: 0;
  clip-path: inset(21% 29% 21% 29% round 24px);
  will-change: clip-path;
}

.scroll-expand__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
  transform-origin: center;
  user-select: none;
  -webkit-user-drag: none;
}

.scroll-expand__scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.1) 45%, rgba(0, 0, 0, 0.35));
  opacity: 0;
}

.scroll-expand__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6%;
  opacity: 0;
  will-change: opacity, transform;
}

.scroll-expand__title {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 6%;
  text-align: center;
  font-size: var(--se-title-size);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: #fff;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  will-change: opacity, transform;
}

.scroll-expand__hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 1.25rem;
  text-align: center;
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.55);
  pointer-events: none;
  will-change: opacity, transform;
}

```

### Integration Instructions
1. Install any listed dependencies.
2. Copy the component source into the appropriate directory in the project.
3. Import the CSS file alongside the component.
4. Import and render the component using the usage example above as a starting point.
5. Adjust props as needed for the specific use case — refer to the props table for all available options.

### More from React Bits
The full library index, including everything reactbits.dev offers, is at https://reactbits.dev/llms.txt — fetch it if this component is not the right fit or the project needs more pieces.
