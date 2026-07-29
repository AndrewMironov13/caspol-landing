import { useEffect, useRef, useState } from 'react'

const N = 150
const BASE = import.meta.env.BASE_URL
const SRC = (i: number) => `${BASE}video/frames/f_${String(i).padStart(3, '0')}.webp`
const RUNWAY = 460 // vh: 360 прокат + 100 удержание последнего кадра

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}
// плавное окно: появление → удержание → уход
const band = (p: number, a: number, b: number) =>
  smooth(a - 0.045, a + 0.035, p) * (1 - smooth(b - 0.03, b + 0.045, p))

type Cap = { a: number; b: number; t: string; s: string }
const CAPS: Cap[] = [
  { a: 0.21, b: 0.43, t: 'Детские площадки', s: 'CASPUR 4000 · связующее для резиновой крошки' },
  { a: 0.52, b: 0.73, t: 'Стадионы и футбольные поля', s: 'CASPOL 140 2-К · клей для искусственной травы' },
  { a: 0.8, b: 0.882, t: 'Спортивные залы', s: 'CASPOL 144 2-К · клей для рулонных покрытий' },
  { a: 0.915, b: 0.997, t: 'Резиновая плитка и уличные зоны', s: 'CASPUR 4000 · связующее' },
]

export default function VideoHero() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const capRefs = useRef<(HTMLDivElement | null)[]>([])
  const hintRef = useRef<HTMLDivElement>(null)
  const imgs = useRef<HTMLImageElement[]>([])
  const [ready, setReady] = useState(0)

  useEffect(() => {
    let done = 0
    imgs.current = Array.from({ length: N }, (_, i) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = SRC(i)
      const bump = () => { done++; if (done % 8 === 0 || done === N) setReady(done) }
      img.onload = bump
      img.onerror = bump
      return img
    })

    // заранее распаковываем кадры: без этого первый проход по ролику
    // упирался в декодирование WebP и терял до 20 FPS
    let stop = false
    ;(async () => {
      for (const img of imgs.current) {
        if (stop) return
        try { await img.decode() } catch { /* кадр ещё грузится — не страшно */ }
      }
    })()
    return () => { stop = true }
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d', { alpha: false })!
    let W = 0, H = 0
    // 1.5 вместо 2 — вдвое меньше пикселей на отрисовку, разницы на глаз нет
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      if (Math.abs(r.width - W) < 0.5 && Math.abs(r.height - H) < 0.5) return
      W = r.width; H = r.height
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    // размеры могут стать финальными позже (шрифты, svh) — следим постоянно
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    window.addEventListener('resize', resize)

    const cover = (img: HTMLImageElement, alpha: number) => {
      if (!img?.complete || !img.naturalWidth) return
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
      const w = img.naturalWidth * s, h = img.naturalHeight * s
      ctx.globalAlpha = alpha
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
      ctx.globalAlpha = 1
    }

    // спринг: сглаживает рывки колеса, но должен успевать за рукой.
    // 32/24/0.7 давали ~3 с догона после остановки — это и читалось как лаги
    let value = 0, target = 0, vel = 0
    const stiffness = 180, damping = 26, mass = 0.5
    let raf = 0, last = performance.now()
    let lastFrame = ''
    const memo = { title: -1, hint: -1, caps: CAPS.map(() => -1) }

    // служебное: ?p=0.6 фиксирует позицию ролика для проверок без прокрутки
    const forced = new URLSearchParams(location.search).get('p')
    const pin = forced === null ? null : clamp(+forced)

    const readTarget = () => {
      if (pin !== null) { target = pin; return }
      // последний экран проката — «удержание»: ролик доигран и стоит закреплённым,
      // а поверх него уже въезжают панели (у них margin-top: -100svh)
      const vh = window.innerHeight
      const span = wrap.offsetHeight - vh - vh
      target = clamp((window.scrollY - wrap.offsetTop) / (span || 1))
    }
    readTarget(); value = target

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now

      // секция далеко за кадром — ничего не считаем и не рисуем
      const vr = wrap.getBoundingClientRect()
      const vh = window.innerHeight || 1
      if (vr.bottom < -vh * 0.3 || vr.top > vh * 1.3) {
        raf = requestAnimationFrame(tick)
        return
      }

      resize() // страховка: подхватываем финальные размеры
      vel += ((stiffness * (target - value) - damping * vel) / mass) * dt
      value += vel * dt
      const p = clamp(value)

      // кадр + блендинг соседнего = плавность без рывков.
      // Если кадр не изменился — не перерисовываем: в зоне удержания поверх нас
      // уже едут панели, и лишний полноэкранный холст стоил ~10 FPS
      const f = p * (N - 1)
      const i0 = Math.floor(f), frac = f - i0
      const stamp = `${i0}|${Math.round(frac * 40)}|${W}x${H}`
      if (stamp !== lastFrame) {
        ctx.clearRect(0, 0, W, H)
        cover(imgs.current[i0], 1)
        if (frac > 0.004 && i0 + 1 < N) cover(imgs.current[i0 + 1], frac)
        lastFrame = stamp
      }

      // заголовок держится в начале
      const tv = Math.round((1 - smooth(0.045, 0.14, p)) * 200) / 200
      if (tv !== memo.title && titleRef.current) {
        titleRef.current.style.opacity = String(tv)
        titleRef.current.style.transform = `translate3d(0,${((1 - tv) * -26).toFixed(1)}px,0)`
        memo.title = tv
      }

      CAPS.forEach((c, i) => {
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

      // подсказка «листайте» — только в начале
      const hv = Math.round((1 - smooth(0.02, 0.1, p)) * 200) / 200
      if (hv !== memo.hint && hintRef.current) {
        hintRef.current.style.opacity = String(hv)
        memo.hint = hv
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onScroll = () => readTarget()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const pct = Math.round((ready / N) * 100)

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

        {CAPS.map((c, i) => (
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
