import { useEffect, useRef, useState } from 'react'
import { whenScrolled } from '../lib/deferLoad'

export type Scene = {
  id: string; num: string; side: 'left' | 'right'; title: string; product: string;
  text: string; img: string; short: string; facts: [string, string][]
  /* Куда смотреть при кадрировании в портрет (0 — левый край, 1 — правый).
     Кадр 16:9 в вертикальную полосу влезает примерно на 58% ширины, и при
     кропе по центру продукт — бочка или ведро — уезжал за край. */
  focus: number
}

export const SCENES: Scene[] = [
  {
    id: 'obj-1', num: 'ОБЪЕКТ 01', side: 'left', short: 'Детские площадки',
    title: 'Покрытие, на котором не страшно упасть',
    product: 'CASPUR 4000 · связующее',
    text: 'Связующее превращает резиновую крошку в цельный упругий монолит — без швов и расслоений. Это основа травмобезопасных покрытий для детских и спортивных площадок.',
    img: '/img/p1-caspur-playground.webp', focus: 0.78,
    facts: [['14–24 %', 'расход от массы крошки'], ['24 ч', 'до пешеходной нагрузки'], ['1-К', 'не нужно смешивать']],
  },
  {
    id: 'obj-2', num: 'ОБЪЕКТ 02', side: 'right', short: 'Искусственный газон',
    title: 'Шов, который не разойдётся',
    product: 'CASPOL 140 2-К · клей',
    text: 'Двухкомпонентный полиуретановый клей для проклейки швов искусственного газона на соединительную ленту. Эластичный шов без усадки и деформации: зимой и летом не отклеится.',
    img: '/img/p2-grass.webp', focus: 0.24,
    facts: [['300–350 г', 'на погонный метр шва'], ['8 : 1', 'соотношение А : Б'], ['24 ч', 'до отверждения']],
  },
  {
    id: 'obj-3', num: 'ОБЪЕКТ 03', side: 'left', short: 'Рулонные покрытия',
    title: 'Пол не «поедет» под игровой нагрузкой',
    product: 'CASPOL 144 2-К · клей',
    text: 'Двухкомпонентный клей для рулонных резиново-полиуретановых покрытий и матов. Без запаха и без усадки, не боится влаги, масел и растворителей. Сохраняет прочность при высоких нагрузках — там, где по полу играют и бегают каждый день.',
    img: '/img/p3-rolled.webp', focus: 0.7,
    facts: [['800–1000 г/м²', 'расход'], ['≥ 2 Н/мм²', 'прочность на сдвиг'], ['24 ч', 'до отверждения']],
  },
  {
    id: 'obj-4', num: 'ОБЪЕКТ 04', side: 'right', short: 'Резиновая плитка',
    title: 'Плитка и бесшовные зоны — одним материалом',
    product: 'CASPUR 4000 · связующее',
    text: 'Универсальное связующее работает и в прессовке резиновой плитки, и в бесшовной укладке уличных зон. Без растворителей, под ручную и механизированную укладку.',
    img: '/img/p4-tiles.webp', focus: 0.26,
    facts: [['≥ 99 %', 'нелетучих веществ'], ['Бочка 200 кг', 'заводская фасовка'], ['Ручная и мех.', 'способ укладки']],
  },
]

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

const N = SCENES.length
const RUNWAY = 150 // vh на сцену (было 105 — заказчик просил спокойнее)

export default function Cinema() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrimL = useRef<HTMLDivElement>(null)
  const scrimR = useRef<HTMLDivElement>(null)
  const contentRefs = useRef<(HTMLDivElement | null)[]>([])
  const imgs = useRef<HTMLImageElement[]>([])
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  useEffect(() => {
    imgs.current = SCENES.map(() => {
      const img = new Image()
      img.decoding = 'async'
      return img
    })
    // сцены на 5 экранов ниже — не отбираем канал у ролика героя
    return whenScrolled(() => {
      imgs.current.forEach((img, i) => {
        img.src = import.meta.env.BASE_URL + SCENES[i].img.replace(/^\//, '')
      })
    })
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(1.25, window.devicePixelRatio || 1)
    let W = 0, H = 0

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      if (Math.abs(r.width - W) < 0.5 && Math.abs(r.height - H) < 0.5) return
      W = r.width; H = r.height
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(() => { resize(); measure(); onScroll() })
    ro.observe(canvas)

    /* Без пружины: позиция сцены — чистая функция от скролла.
       Любое сглаживание отстаёт от руки и читается как лаг. */
    let raf = 0
    const memoC = SCENES.map(() => -1)
    const memoS = { l: -1, r: -1 }

    // геометрия измеряется редко, а не каждый кадр
    const geo = { top: 0, height: 0 }
    const measure = () => { geo.top = wrap.offsetTop; geo.height = wrap.offsetHeight }
    measure()

    const progress = () => {
      const span = geo.height - window.innerHeight
      return clamp((window.scrollY - geo.top) / (span || 1))
    }

    // геометрия может сдвинуться, когда догрузятся шрифты и картинки
    window.addEventListener('load', measure)
    const remeasure = [setTimeout(measure, 400), setTimeout(measure, 1500)]


    const render = () => {
      const local = progress() * N
      ctx.clearRect(0, 0, W, H)

      // веса слоёв как при реальном наложении (снизу вверх)
      const vis: number[] = []
      for (let i = 0; i < N; i++) vis[i] = i === 0 ? smooth(-0.12, 0, local) : smooth(0, 0.1, local - i)

      let wL = 0, wR = 0, remaining = 1
      for (let i = N - 1; i >= 0; i--) {
        const w = vis[i] * remaining
        remaining *= 1 - vis[i]
        if (SCENES[i].side === 'left') wL += w; else wR += w
      }

      /* Фоны — один слой вместо четырёх DOM-слоёв.
         На узком экране широкий кадр 16:9 при заливке в портрет показывает
         всего 26% своей ширины — картинка выглядит просто увеличенной.
         Поэтому в портрете отдаём фото верхнюю полосу, где оно почти не
         обрезается, а текст живёт под ней на тёмном. */
      const portrait = W <= 760 || H > W
      // 30% — столько остаётся над текстовым блоком (565px + отступ) на 844px.
      // При заливке в такую полосу кадр 16:9 показывает ~87% своей ширины
      // вместо 26% при полноэкранной обрезке.
      const bandH = portrait ? H * 0.3 : H
      if (portrait) {
        ctx.fillStyle = '#070f16'
        ctx.fillRect(0, 0, W, H)
      }
      for (let i = 0; i < N; i++) {
        if (vis[i] <= 0.004) continue
        const img = imgs.current[i]
        if (!img?.complete || !img.naturalWidth) continue
        const p = local - i
        const sc = (portrait ? 1.1 : 1.18) - (portrait ? 0.12 : 0.24) * clamp((p + 0.4) / 1.7)
        const s = Math.max(W / img.naturalWidth, bandH / img.naturalHeight) * sc
        const w = img.naturalWidth * s, h = img.naturalHeight * s
        ctx.globalAlpha = vis[i]
        if (portrait) {
          ctx.save()
          ctx.beginPath(); ctx.rect(0, 0, W, bandH); ctx.clip()
          // кадрируем не по центру, а по продукту — см. Scene.focus
          ctx.drawImage(img, (W - w) * SCENES[i].focus, (bandH - h) / 2, w, h)
          ctx.restore()
        } else {
          ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
        }
      }
      ctx.globalAlpha = 1

      const lR = Math.round(clamp(wL) * 100) / 100
      const rR = Math.round(clamp(wR) * 100) / 100
      if (lR !== memoS.l) { if (scrimL.current) scrimL.current.style.opacity = String(lR); memoS.l = lR }
      if (rR !== memoS.r) { if (scrimR.current) scrimR.current.style.opacity = String(rR); memoS.r = rR }

      /* Первая сцена проявляется уже на въезде секции, а не после того, как та
         прилипла: до прилипания прогресс зажат в ноль, и полэкрана под
         фотополосой оставалось пустым — на мобильном это читалось как провал
         между секциями (фото занимает лишь верхние 30%). */
      const arrive = smooth(0.85, 0.25, (geo.top - window.scrollY) / (window.innerHeight || 1))

      for (let i = 0; i < N; i++) {
        const p = local - i
        const isLast = i === N - 1
        const on = i === 0 ? Math.max(smooth(0.04, 0.24, p), arrive) : smooth(0.04, 0.24, p)
        const cIn = Math.round(on * (1 - (isLast ? 0 : smooth(0.8, 0.99, p))) * 200) / 200
        if (cIn !== memoC[i]) {
          const el = contentRefs.current[i]
          if (el) {
            el.style.opacity = String(cIn)
            el.style.transform = `translate3d(0,${((1 - cIn) * 34).toFixed(0)}px,0)`
            el.style.visibility = cIn < 0.005 ? 'hidden' : 'visible'
          }
          memoC[i] = cIn
        }
      }

      const idx = clamp(Math.floor(local + 0.35), 0, N - 1)
      if (idx !== activeRef.current) { activeRef.current = idx; setActive(idx) }
    }

    // рисуем по событию, а не крутим цикл вхолостую
    const draw = () => {
      const vh = window.innerHeight || 1
      const top = geo.top - window.scrollY
      if (top + geo.height < -vh * 0.3 || top > vh * 1.3) return
      render()
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; draw() })
    }
    draw()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      remeasure.forEach(clearTimeout)
      window.removeEventListener('load', measure)
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const goTo = (i: number) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const span = wrap.offsetHeight - window.innerHeight
    window.scrollTo({ top: wrap.offsetTop + (span * (i + 0.45)) / N, behavior: 'smooth' })
  }

  return (
    <div className="cinema" ref={wrapRef} style={{ height: `${N * RUNWAY}vh` }} id="objects">
      <div className="cinema__stage">
        <canvas className="cinema__canvas" ref={canvasRef} />
        <div className="cscene__scrim cscene__scrim--left" ref={scrimL} />
        <div className="cscene__scrim cscene__scrim--right" ref={scrimR} />

        {SCENES.map((s, i) => (
          <div className={`cscene cscene--${s.side}`} id={s.id} key={s.id}>
            <div className="cscene__wrap">
              <div className="cscene__inner">
                <div className="cscene__content" ref={(el) => { contentRefs.current[i] = el }}>
                  <div className="cscene__num">{s.num}</div>
                  <h2>{s.title}</h2>
                  <div className="cscene__prod">{s.product}</div>
                  <p>{s.text}</p>
                  <div className="cscene__facts">
                    {s.facts.map(([b, sub]) => (
                      <div className="fact" key={b}><b>{b}</b><span>{sub}</span></div>
                    ))}
                  </div>
                  <div className="cscene__cta">
                    <a href="#contacts" className="btn btn--primary">Запросить цену</a>
                    <a href="#calc" className="btn btn--glass">Рассчитать материал</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <nav className="cdots" aria-label="Объекты">
          {SCENES.map((s, i) => (
            <button key={s.id} className={`cdot ${i === active ? 'is-on' : ''}`}
              onClick={() => goTo(i)} aria-label={s.short}>
              <i /><span>{s.short}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
