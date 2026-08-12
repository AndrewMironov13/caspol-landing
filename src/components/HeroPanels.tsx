import { useEffect, useRef, useState } from 'react'
import { whenScrolled } from '../lib/deferLoad'

export const PANELS = [
  { id: 'pl', href: '#obj-1', title: 'Детские площадки', note: 'CASPUR 4000', shot: 'img/p1-caspur-playground.webp' },
  { id: 'gr', href: '#obj-2', title: 'Искусственная трава', note: 'CASPOL 140 2-К', shot: 'img/p2-grass.webp' },
  { id: 'rl', href: '#obj-3', title: 'Рулонные покрытия', note: 'CASPOL 144 2-К', shot: 'img/p3-rolled.webp' },
  { id: 'tl', href: '#obj-4', title: 'Резиновая плитка', note: 'CASPUR 4000', shot: 'img/p4-tiles.webp' },
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
const PORTRAIT_MAX = 760

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

const isPortrait = () =>
  window.innerWidth <= PORTRAIT_MAX || window.innerHeight > window.innerWidth

/* Мобильная раскладка секции — не сетка 2×2, а полосы во всю ширину.
   Причина техническая: исходный композит 1366×769, и на каждую диагональную
   панель в нём приходится всего 250–390 px ширины. Ячейка сетки на телефоне
   требует ~380×470 реальных пикселей, то есть картинку тянуло в 2.4 раза —
   резкости взять неоткуда ни при каком dpr. Полоса же берёт кадр сцены
   целиком (1366×769) и идёт на УМЕНЬШЕНИЕ, поэтому резкая на любом экране. */
function PanelStrips() {
  return (
    <section className="pstrips">
      {/* якорь на заголовке, а не на секции: у секции отрицательный отступ,
          и переход по «Линейке» из меню приводил бы на экран раньше */}
      <div className="pstrips__head" id="line">
        <span className="eyebrow">Линейка CASPOL</span>
        <h2>Четыре объекта — <span className="accent">три материала</span></h2>
        <p>
          Площадка, поле, зал и уличные зоны закрываются одной линейкой.
          Меньше поставщиков — меньше рисков на объекте.
        </p>
      </div>
      <div className="pstrips__list">
        {PANELS.map((p, i) => (
          <a className="pstrip" href={p.href} key={p.id}>
            <img src={import.meta.env.BASE_URL + p.shot} alt="" loading="lazy" decoding="async" />
            <span className="pstrip__no">{String(i + 1).padStart(2, '0')}</span>
            <span className="pstrip__tx">
              <b>{p.title}</b>
              <span>{p.note}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

export default function HeroPanels() {
  const [portrait, setPortrait] = useState(() =>
    typeof window === 'undefined' ? false : isPortrait())

  useEffect(() => {
    const on = () => setPortrait(isPortrait())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])

  return portrait ? <PanelStrips /> : <PanelCanvas />
}

function PanelCanvas() {
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
      // видимость и фаза — по закешированной геометрии, без пересчёта вёрстки
      const top = geo.top - window.scrollY
      if (top + geo.height < -vh * 0.4 || top > vh * 1.4) return

      const span = geo.height - vh
      // служебное: ?q=0.5 фиксирует фазу секции для проверок без прокрутки
      const q = pin !== null ? pin : clamp((window.scrollY - geo.top) / (span || 1))

      draw(q)

      /* Текст приходит после панелей и дальше НЕ гаснет. Гашение на q 0.9→1
         оставляло дыру: сцена липкая до q=1, а потом уезжает ещё целый экран,
         и всё это время нижняя половина кадра (где живёт текст) пустая.
         На мобильном это особенно заметно — там фото следующей секции
         занимает лишь 30% высоты, и стык читался как пропуск. */
      const c = Math.round(smooth(0.5, 0.63, q) * 200) / 200
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
