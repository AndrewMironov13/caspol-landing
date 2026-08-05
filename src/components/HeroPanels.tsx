import { useEffect, useRef, useState } from 'react'
import { whenScrolled } from '../lib/deferLoad'

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
/* Вписанный в параллелограмм прямоугольник каждой панели (доли ширины файла).
   Замерено по альфе: это готовый вертикальный кадр без прозрачных углов.
   Нужен для мобильной сетки — там панель кладётся в ячейку целиком. */
const CORES = [
  { x0: 0.000, x1: 0.616 },
  { x0: 0.290, x1: 0.721 },
  { x0: 0.302, x1: 0.702 },
  { x0: 0.375, x1: 1.000 },
]
const PORTRAIT_MAX = 760

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
    imgs.current = PANELS.map(() => {
      const img = new Image()
      img.decoding = 'async'
      return img
    })
    // src ставим не сразу: сперва пусть догрузится ролик героя
    return whenScrolled(() => {
      imgs.current.forEach((img, i) => {
        img.src = `${import.meta.env.BASE_URL}img/panels/c${i + 1}.webp`
      })
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
    const geo = { top: 0, height: 0 }
    const measure = () => { geo.top = wrap.offsetTop; geo.height = wrap.offsetHeight }
    resize(); measure()
    const ro = new ResizeObserver(() => { resize(); measure() })

    // геометрия может сдвинуться, когда догрузятся шрифты и картинки
    window.addEventListener('load', measure)
    const remeasure = [setTimeout(measure, 400), setTimeout(measure, 1500)]

    ro.observe(canvas)

    /* Мобильная раскладка. Четыре диагональные полосы в портрете обрезаются
       кадром так, что видно только две, — поэтому на узком экране кладём
       панели сеткой 2×2. Диагональ сохраняем своим клипом, а картинку берём
       по вписанному прямоугольнику (CORES), иначе в ячейку попали бы
       прозрачные углы параллелограмма. */
    const drawGrid = (q: number) => {
      ctx.clearRect(0, 0, W, H)
      const out = smooth(0.88, 1, q)
      const hot = hotRef.current
      /* Сетка занимает верхние 56% экрана, текст живёт под ней. Наложение
         текста поверх плиток топило нижний ряд в скриме — и четыре объекта
         снова читались как два. */
      const gap = 7, skew = 13
      const gridH = H * 0.56
      const cw = (W - gap) / 2, ch = (gridH - gap) / 2

      /* Тёмная основа под сеткой: иначе в зазоры между плитками просвечивает
         последний кадр ролика и вертикальный шов горит белой полосой.
         Alpha по фазе — чтобы не хлопнуть чёрным на стыке секций. */
      ctx.save()
      ctx.globalAlpha = smooth(0, 0.14, q)
      ctx.fillStyle = '#070f16'
      ctx.fillRect(0, 0, W, gridH + gap)
      ctx.restore()

      for (let i = 0; i < PANELS.length; i++) {
        const img = imgs.current[i]
        if (!img?.complete || !img.naturalWidth) continue
        const enter = smooth(0.03 + i * 0.055, 0.28 + i * 0.055, q)
        if (enter <= 0.001) continue

        const col = i % 2, row = (i / 2) | 0
        const dir = col === 0 ? -1 : 1
        const x = col * (cw + gap) + dir * ((1 - enter) * W * 0.75 + out * 30)
        const y = row * (ch + gap)

        ctx.save()
        ctx.globalAlpha = enter
        ctx.beginPath()
        ctx.moveTo(x + skew, y)
        ctx.lineTo(x + cw, y)
        ctx.lineTo(x + cw - skew, y + ch)
        ctx.lineTo(x, y + ch)
        ctx.closePath()
        ctx.clip()
        if (hot !== null) ctx.filter = hot === i ? 'brightness(1.12) saturate(1.12)' : 'brightness(0.42) saturate(0.7)'

        const c = CORES[i]
        const sx = c.x0 * img.naturalWidth
        const sw = (c.x1 - c.x0) * img.naturalWidth
        const sh = img.naturalHeight
        const s = Math.max(cw / sw, ch / sh) * (1 + out * 0.1)
        const dw = sw * s, dh = sh * s
        ctx.drawImage(img, sx, 0, sw, sh, x + (cw - dw) / 2, y + (ch - dh) / 2, dw, dh)
        ctx.restore()
      }
    }

    const draw = (q: number) => {
      if (W <= PORTRAIT_MAX || H > W) return drawGrid(q)
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
      // видимость и фаза — по закешированной геометрии, без пересчёта вёрстки
      const top = geo.top - window.scrollY
      if (top + geo.height < -vh * 0.4 || top > vh * 1.4) return

      const span = geo.height - vh
      // служебное: ?q=0.5 фиксирует фазу секции для проверок без прокрутки
      const q = pin !== null ? pin : clamp((window.scrollY - geo.top) / (span || 1))

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
      remeasure.forEach(clearTimeout)
      window.removeEventListener('load', measure)
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
