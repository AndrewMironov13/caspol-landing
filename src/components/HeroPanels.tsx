import { useEffect, useRef, useState } from 'react'

export const PANELS = [
  { id: 'pl', href: '#obj-1', title: 'Детские площадки', note: 'CASPUR 4000' },
  { id: 'gr', href: '#obj-2', title: 'Искусственная трава', note: 'CASPOL 140 2-К' },
  { id: 'rl', href: '#obj-3', title: 'Рулонные покрытия', note: 'CASPOL 144 2-К' },
  { id: 'tl', href: '#obj-4', title: 'Резиновая плитка', note: 'CASPUR 4000' },
]

const RUNWAY = 300 // vh (первая половина проходит поверх видео)
// исходный кадр композита и границы каждой панели внутри него (доли)
const ORIG_W = 1366, ORIG_H = 769
const BOXES = [
  { x: 0, y: 0, w: 0.29575, h: 1 },
  { x: 0.18082, y: 0, w: 0.39092, h: 1 },
  { x: 0.46047, y: 0, w: 0.36164, h: 1 },
  { x: 0.71303, y: 0, w: 0.28697, h: 1 },
]
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

export default function HeroPanels() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const imgs = useRef<HTMLImageElement[]>([])
  const hotRef = useRef<number | null>(null)
  const [, setHot] = useState<number | null>(null)

  // панели рисуем в один слой на canvas: четыре полноэкранных DOM-слоя
  // с прозрачностью роняли кадр до 24 мс, canvas держит 16.7
  useEffect(() => {
    imgs.current = PANELS.map((_, i) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = `${import.meta.env.BASE_URL}img/panels/c${i + 1}.webp`
      return img
    })
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(1.25, window.devicePixelRatio || 1)
    let W = 0, H = 0, raf = 0
    const memo = { content: -1 }
    const forced = new URLSearchParams(location.search).get('q')
    const pin = forced === null ? null : clamp(+forced)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      if (Math.abs(r.width - W) < 0.5 && Math.abs(r.height - H) < 0.5) return
      W = r.width; H = r.height
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (q: number) => {
      ctx.clearRect(0, 0, W, H)
      const out = smooth(0.88, 1, q)
      const fade = 1 // не гасим: чёрная пауза между секциями была лишней
      const hot = hotRef.current

      // подложка не нужна: секция наложена поверх видео (margin-top: -100vh),
      // и под панелями во время въезда виден живой последний кадр ролика

      for (let i = 0; i < PANELS.length; i++) {
        const img = imgs.current[i]
        if (!img?.complete || !img.naturalWidth) continue
        const dir = i % 2 === 0 ? -1 : 1
        const enter = smooth(0.02 + i * 0.06, 0.24 + i * 0.06, q) // все четыре — пока видео ещё под нами
        if (enter <= 0.001) continue

        const ty = (1 - enter) * dir * H * 1.04
        const tx = dir * out * 55
        const sc = 1.06 * (1 + out * 0.16)

        // панели обрезаны по своим границам — рисуем каждую на её месте
        // внутри общего кадра, иначе заливали бы экран четыре раза
        const s = Math.max(W / ORIG_W, H / ORIG_H) * sc
        const fw = ORIG_W * s, fh = ORIG_H * s
        const ox = (W - fw) / 2 + tx, oy = (H - fh) / 2 + ty
        const b = BOXES[i]

        ctx.save()
        ctx.globalAlpha = fade
        if (hot !== null) ctx.filter = hot === i ? 'brightness(1.12) saturate(1.12)' : 'brightness(0.42) saturate(0.7)'
        ctx.drawImage(img, ox + b.x * fw, oy + b.y * fh, b.w * fw, b.h * fh)
        ctx.restore()
      }
    }

    const apply = () => {
      const vh = window.innerHeight || 1
      const r = wrap.getBoundingClientRect()
      if (r.bottom < -vh * 0.4 || r.top > vh * 1.4) return

      resize()
      const span = wrap.offsetHeight - vh
      // служебное: ?q=0.5 фиксирует фазу секции для проверок без прокрутки
      const q = pin !== null ? pin : clamp((window.scrollY - wrap.offsetTop) / (span || 1))

      draw(q)

      // текст приходит после панелей и уходит перед следующей секцией
      const c = Math.round((smooth(0.5, 0.63, q) * (1 - smooth(0.9, 1, q))) * 200) / 200
      if (c !== memo.content) {
        if (contentRef.current) {
          contentRef.current.style.opacity = String(c)
          contentRef.current.style.transform = `translate3d(0,${((1 - c) * 26).toFixed(1)}px,0)`
        }
        memo.content = c
      }

      // скрим держим до конца — следующая секция начинается сразу, без темноты
    }

    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply) }
    apply()
    // дорисовываем, когда картинки догрузились
    imgs.current.forEach((im) => { im.onload = onScroll })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const setHover = (i: number | null) => {
    hotRef.current = i
    setHot(i)
    // перерисовать сразу, без ожидания скролла
    window.dispatchEvent(new Event('scroll'))
  }

  return (
    <div className="hero" ref={wrapRef} style={{ height: `${RUNWAY}vh` }} id="line">
      <div className="hero__stage" ref={stageRef}>
        <canvas className="hero__canvas" ref={canvasRef} />
        <div className="hero__scrim" ref={scrimRef} />

        <div className="hero__content" ref={contentRef}>
          <div className="hero__inner">
            <span className="eyebrow">Линейка CASPOL</span>
            <h2>Четыре объекта — <span className="accent">три материала</span></h2>
            <p className="hero__sub">
              Площадка, поле, зал и уличные зоны закрываются одной линейкой.
              Меньше поставщиков — меньше рисков на объекте.
            </p>

            <nav className="hero__legend" aria-label="Применение">
              {PANELS.map((p, i) => (
                <a
                  key={p.id}
                  href={p.href}
                  className="legchip"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                >
                  <b>{p.title}</b>
                  <span>{p.note}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

      </div>
    </div>
  )
}
