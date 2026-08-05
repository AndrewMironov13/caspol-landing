import { useEffect, useRef, useState } from 'react'

const BASE = import.meta.env.BASE_URL
const RUNWAY = 460 // vh: 360 прокат + 100 удержание последнего кадра
const MOBILE_MAX = 760

type Cap = { a: number; b: number; t: string; s: string }

/* Два набора кадров. Вертикальный собран перекадрированием того же ролика,
   но из него вырезано окно 11.35–12.65 с (брак дорисовки на переходе
   зал → плитка), поэтому тайминг подписей у него свой. */
const SETS = {
  desktop: {
    dir: 'video/frames/f_', n: 150,
    caps: [
      { a: 0.21, b: 0.43, t: 'Детские площадки', s: 'CASPUR 4000 · связующее для резиновой крошки' },
      { a: 0.52, b: 0.73, t: 'Стадионы и футбольные поля', s: 'CASPOL 140 2-К · клей для искусственной травы' },
      { a: 0.8, b: 0.882, t: 'Спортивные залы', s: 'CASPOL 144 2-К · клей для рулонных покрытий' },
      { a: 0.915, b: 0.997, t: 'Резиновая плитка и уличные зоны', s: 'CASPUR 4000 · связующее' },
    ] as Cap[],
  },
  mobile: {
    dir: 'video/frames-mobile/m_', n: 150,
    caps: [
      { a: 0.19, b: 0.39, t: 'Детские площадки', s: 'CASPUR 4000 · связующее' },
      { a: 0.47, b: 0.655, t: 'Стадионы и поля', s: 'CASPOL 140 2-К · клей' },
      { a: 0.7, b: 0.768, t: 'Спортивные залы', s: 'CASPOL 144 2-К · клей' },
      { a: 0.8, b: 0.995, t: 'Резиновая плитка', s: 'CASPUR 4000 · связующее' },
    ] as Cap[],
  },
}

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
const band = (p: number, a: number, b: number) =>
  smooth(a - 0.045, a + 0.035, p) * (1 - smooth(b - 0.03, b + 0.045, p))

const pickSet = () => (window.innerWidth <= MOBILE_MAX ? 'mobile' : 'desktop')

export default function VideoHero() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const capRefs = useRef<(HTMLDivElement | null)[]>([])
  const hintRef = useRef<HTMLDivElement>(null)
  const imgs = useRef<HTMLImageElement[]>([])
  const [mode, setMode] = useState<'desktop' | 'mobile'>(() =>
    typeof window === 'undefined' ? 'desktop' : pickSet())
  const [ready, setReady] = useState(0)

  const set = SETS[mode]

  // при смене ориентации/ширины переключаем набор кадров
  useEffect(() => {
    const on = () => setMode(pickSet())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])

  useEffect(() => {
    let done = 0
    setReady(0)
    imgs.current = Array.from({ length: set.n }, (_, i) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = `${BASE}${set.dir}${String(i).padStart(3, '0')}.webp`
      const bump = () => { done++; if (done % 8 === 0 || done === set.n) setReady(done) }
      img.onload = bump
      img.onerror = bump
      return img
    })

    // заранее распаковываем кадры: иначе первый проход упирается в декодирование
    let stop = false
    ;(async () => {
      for (const img of imgs.current) {
        if (stop) return
        try { await img.decode() } catch { /* ещё грузится */ }
      }
    })()
    return () => { stop = true }
  }, [set])

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d', { alpha: false })!
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    let W = 0, H = 0
    let lastFrame = ''
    const memo = { title: -1, hint: -1, caps: set.caps.map(() => -1) }

    const geo = { top: 0, height: 0 }
    const measure = () => { geo.top = wrap.offsetTop; geo.height = wrap.offsetHeight }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return false
      if (Math.abs(r.width - W) < 0.5 && Math.abs(r.height - H) < 0.5) return false
      W = r.width; H = r.height
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lastFrame = '' // размер изменился — перерисовать обязательно
      return true
    }
    resize(); measure()

    const forced = new URLSearchParams(location.search).get('p')
    const pin = forced === null ? null : clamp(+forced)

    const cover = (img: HTMLImageElement, alpha: number) => {
      if (!img?.complete || !img.naturalWidth) return
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
      const w = img.naturalWidth * s, h = img.naturalHeight * s
      ctx.globalAlpha = alpha
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
      ctx.globalAlpha = 1
    }

    /* Кадр — чистая функция от позиции скролла, без сглаживания.
       Любая пружина по определению отстаёт от руки; здесь картинка
       прибита к скроллу один в один, поэтому ощущения лага нет. */
    const draw = () => {
      const vh = window.innerHeight || 1
      const top = geo.top - window.scrollY
      if (top + geo.height < -vh * 0.3 || top > vh * 1.3) return
      if (!W || !H) return

      const span = geo.height - vh - vh
      const p = pin !== null ? pin : clamp((window.scrollY - geo.top) / (span || 1))

      const f = p * (set.n - 1)
      const i0 = Math.floor(f), frac = f - i0
      const stamp = `${i0}|${Math.round(frac * 40)}`
      /* Метку ставим, только если кадр реально нарисован. Иначе на старте,
         пока картинки ещё грузятся, метка запирает холст чёрным навсегда:
         тот же stamp больше никогда не проходит проверку. */
      const base = imgs.current[i0]
      if (stamp !== lastFrame && base?.complete && base.naturalWidth) {
        ctx.clearRect(0, 0, W, H)
        cover(base, 1)
        if (frac > 0.004 && i0 + 1 < set.n) cover(imgs.current[i0 + 1], frac)
        lastFrame = stamp
      }

      const tv = Math.round((1 - smooth(0.045, 0.14, p)) * 200) / 200
      if (tv !== memo.title && titleRef.current) {
        titleRef.current.style.opacity = String(tv)
        titleRef.current.style.transform = `translate3d(0,${((1 - tv) * -26).toFixed(1)}px,0)`
        memo.title = tv
      }

      set.caps.forEach((c, i) => {
        const v = Math.round(band(p, c.a, c.b) * 200) / 200
        if (v !== memo.caps[i]) {
          const el = capRefs.current[i]
          if (el) {
            el.style.opacity = String(v)
            el.style.transform = `translate3d(0,${((1 - v) * 24).toFixed(1)}px,0)`
            el.style.visibility = v < 0.005 ? 'hidden' : 'visible'
          }
          memo.caps[i] = v
        }
      })

      const hv = Math.round((1 - smooth(0.02, 0.1, p)) * 200) / 200
      if (hv !== memo.hint && hintRef.current) {
        hintRef.current.style.opacity = String(hv)
        memo.hint = hv
      }
    }

    // рисуем только когда есть повод, а не крутим цикл вхолостую
    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; draw() })
    }
    const onResize = () => { resize(); measure(); schedule() }

    draw()
    // именно listener, а не onload: onload уже занят счётчиком загрузки
    const pool = imgs.current
    pool.forEach((im) => im.addEventListener('load', schedule))
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('load', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(canvas)
    const timers = [setTimeout(onResize, 400), setTimeout(onResize, 1500)]

    return () => {
      if (raf) cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      ro.disconnect()
      pool.forEach((im) => im.removeEventListener('load', schedule))
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onResize)
    }
  }, [set])

  const pct = Math.round((ready / set.n) * 100)

  return (
    <div className="vhero" ref={wrapRef} style={{ height: `${RUNWAY}vh` }} id="top">
      <div className="vhero__stage">
        <canvas className="vhero__canvas" ref={canvasRef} />
        <div className="vhero__scrim" />

        <div className="vhero__title" ref={titleRef}>
          <span className="eyebrow">CASPOL · связующие и клеи</span>
          <h1>То, на чём <span className="accent">держится покрытие</span></h1>
          <p>Полиуретановые связующие и клеи CASPOL — для детских площадок, стадионов и залов. Собственное производство в Дзержинске, отгрузка со склада.</p>
          <div className="vhero__actions">
            <a href="#calc" className="btn btn--primary btn--lg">Рассчитать материал</a>
            <a href="#contacts" className="btn btn--glass btn--lg">Получить прайс</a>
          </div>
        </div>

        {set.caps.map((c, i) => (
          <div className="vhero__cap" key={c.t} ref={(el) => { capRefs.current[i] = el }}>
            <h2>{c.t}</h2>
            <span>{c.s}</span>
          </div>
        ))}

        <div className="vhero__hint" ref={hintRef}>{pct < 100 ? `загрузка ${pct}%` : 'листайте'}<i /></div>
      </div>
    </div>
  )
}
