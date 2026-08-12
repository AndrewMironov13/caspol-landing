import { useEffect, useState } from 'react'
import VideoHero from './components/VideoHero'
import HeroPanels from './components/HeroPanels'
import Cinema from './components/Cinema'
import Calculator from './components/Calculator'
import LeadForm, { type Prefill } from './components/LeadForm'

/* ---- КОНТАКТЫ: подтвердить у заказчика ---- */
const EMAIL = 'info@caspol.ru'
const PHONE_1 = '+7 (950) 347-01-96'
const PHONE_2 = '+7 (904) 040-85-55'
const HOURS = 'Пн–Чт 8:00–17:00, Пт 8:00–16:00'
const ADDRESS = '606002, Нижегородская обл., г. Дзержинск, ул. Красноармейская, д. 15, корп. А'
const MAP_SRC = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent('Дзержинск, улица Красноармейская, 15 корпус А')}&z=16`

/* Блок про доверие, а не про характеристики: обещания касаются всей линейки,
   а цифры неизбежно относятся к одному продукту и сужают смысл. Поэтому
   утверждения — крупно, а характеристики бегут технической лентой снизу. */
const TRUST_ITEMS: [string, string][] = [
  ['Пройдёте приёмку', 'ТУ, паспорт качества и сертификаты — в комплекте с партией'],
  ['Отвечаем за партию', 'гарантия на материал прописана в договоре поставки'],
  ['Технолог на связи', 'подберёт норму расхода и подскажет по укладке на объекте'],
  ['Свой завод в России', 'Дзержинск — без валютных скачков и ожидания контейнера'],
]

/* Цифры — из технических описаний, присланных заказчиком
   (ТУ 20.52.10-003-40544164-2019 и ТУ 20.52.10-002-40544164-2019),
   а не с этикеток на сгенерированных фото. */
const TICKER_ITEMS = [
  '≥ 99 % нелетучих веществ',
  '24 ч до пешеходной нагрузки',
  '≥ 2 Н/мм² прочность шва на сдвиг',
  'бочка 200 кг — отгрузка со склада',
  'Шор Д 60',
  'соотношение А : Б = 8 : 1',
  'расчёт материала под объект',
]
const TickerRow = () => (
  <p>{TICKER_ITEMS.map((t) => <span key={t}>{t}<s>◆</s></span>)}</p>
)

const I = {
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  factory: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20" /><path d="M4 20V9l6 4V9l6 4V6l4 2v12" /></svg>,
  pin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  phone: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>,
  mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
}

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    let raf = 0
    const check = () => {
      const h = window.innerHeight
      for (const el of els) {
        if (el.classList.contains('in')) continue
        if (el.getBoundingClientRect().top < h * 0.88) el.classList.add('in')
      }
    }
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check) }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
}

const NAV = [
  ['#obj-1', 'Линейка'],
  ['#calc', 'Калькулятор'],
  ['#contacts', 'Контакты'],
]

function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > window.innerHeight * 0.75)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // пока меню открыто, страница под ним не прокручивается
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  return (
    <>
      <header className={`header ${scrolled ? 'header--scrolled' : ''} ${open ? 'header--open' : ''}`}>
        <a className="header__logo" href="#top" onClick={() => setOpen(false)}>CAS<b>POL</b></a>
        <nav className="header__nav">
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="header__act">
          {/* звонок — второе действие рядом с формой: подрядчику часто быстрее
              спросить голосом, чем заполнять поля */}
          <a
            className="header__tel"
            href={`tel:${PHONE_1.replace(/[^\d+]/g, '')}`}
            aria-label={`Позвонить ${PHONE_1}`}
          >{I.phone}<span>{PHONE_1}</span></a>
          <a href="#contacts" className="btn btn--primary header__cta" onClick={() => setOpen(false)}>
            <span className="full">Получить прайс</span><span className="short">Прайс</span>
          </a>
          <button
            className={`burger ${open ? 'is-open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
          ><i /><i /><i /></button>
        </div>
      </header>

      <div className={`mmenu ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)}>
        <nav className="mmenu__inner" onClick={(e) => e.stopPropagation()}>
          {NAV.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
          <a className="mmenu__phone" href={`tel:${PHONE_1.replace(/[^\d+]/g, '')}`}>{PHONE_1}</a>
          <a href="#contacts" className="btn btn--primary btn--wide btn--lg" onClick={() => setOpen(false)}>
            Получить прайс
          </a>
        </nav>
      </div>
    </>
  )
}


export default function App() {
  useReveal()
  const [prefill, setPrefill] = useState<Prefill | undefined>()
  // на телефоне карта перехватывает свайп — включаем её только по тапу
  const [mapLive, setMapLive] = useState(false)

  // служебный режим для скриншотов: ?h=760 фиксирует высоту полноэкранных секций, ?y=605 — прокрутка
  useEffect(() => {
    const qs = new URLSearchParams(location.search)
    const h = qs.get('h')
    if (h) {
      document.documentElement.dataset.shot = h
      document.documentElement.style.setProperty('--shotH', `${h}px`)
    }
    const y = qs.get('y')
    if (y) {
      const go = () => window.scrollTo({ top: +y, behavior: 'instant' as ScrollBehavior })
      go(); setTimeout(go, 300); setTimeout(go, 900)
    }
  }, [])

  return (
    <div>
      <Header />
      <VideoHero />
      <HeroPanels />

      {/* кино: одна камера через 4 сцены */}
      <Cinema />

      {/* доверие: цифры из техописаний, обещания — бегущей строкой */}
      <section className="trust">
        <div className="trust__row">
          {TRUST_ITEMS.map(([title, note], i) => (
            <div className="trust__n" key={title}>
              <em>{String(i + 1).padStart(2, '0')}</em>
              <b>{title}</b>
              <span>{note}</span>
            </div>
          ))}
        </div>
        <div className="trust__tick" aria-hidden="true">
          <div><TickerRow /><TickerRow /></div>
        </div>
      </section>

      {/* калькулятор */}
      <section className="section section--soft">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Калькулятор расхода</span>
            <h2 className="h-sec">Посчитайте объём до того, как поедете на объект</h2>
            <p className="lead">
              Выберите материал, задайте площадь и толщину. Покажем, сколько нужно,
              и передадим расчёт технологу вместе с заявкой.
            </p>
          </div>
          <div className="reveal"><Calculator onRequest={setPrefill} /></div>
        </div>
      </section>

      {/* заявка */}
      <section className="section section--dark" id="contacts">
        <div className="container">
          <div className="leadwrap">
            <div className="lead__copy reveal">
              <span className="eyebrow">Заявка</span>
              <h2 style={{ marginTop: 16 }}>Пришлём прайс и расчёт в течение рабочего дня</h2>
              <p>Напишите площадь и тип объекта — технолог подберёт материал, посчитает объём и стоимость, подскажет по укладке.</p>
              <ul className="lead__pts">
                <li><span className="ck">{I.check}</span>Актуальный прайс на всю линейку</li>
                <li><span className="ck">{I.check}</span>ТУ, паспорт качества и сертификаты</li>
                <li><span className="ck">{I.check}</span>Расчёт материала под ваш объект</li>
                <li><span className="ck">{I.check}</span>Отгрузка со склада в Дзержинске</li>
              </ul>
            </div>
            <div className="reveal"><LeadForm prefill={prefill} /></div>
          </div>
        </div>
      </section>

      {/* карта */}
      <section className="section section--soft">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Как нас найти</span>
            <h2 className="h-sec">Производим и отгружаем сами</h2>
          </div>
          <div className="mapgrid">
            <div className="contacts reveal">
              <div className="contact">
                <span className="ic">{I.pin}</span>
                <div><b>Адрес</b><p>{ADDRESS}</p></div>
              </div>
              <div className="contact">
                <span className="ic">{I.phone}</span>
                <div>
                  <b>Телефоны</b>
                  <a href={`tel:${PHONE_1.replace(/[^\d+]/g, '')}`}>{PHONE_1}</a><br />
                  <a href={`tel:${PHONE_2.replace(/[^\d+]/g, '')}`}>{PHONE_2}</a>
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>{HOURS}</p>
                </div>
              </div>
              <div className="contact">
                <span className="ic">{I.mail}</span>
                <div><b>Почта</b><a href={`mailto:${EMAIL}`}>{EMAIL}</a></div>
              </div>
              <div className="contact">
                <span className="ic">{I.factory}</span>
                <div><b>Компания</b><p>ООО «Каспол» — полиуретановые системы</p></div>
              </div>
            </div>
            <div className={`map reveal${mapLive ? ' is-live' : ''}`}>
              <iframe src={MAP_SRC} title="Каспол на карте — Дзержинск" loading="lazy" allowFullScreen />
              {!mapLive && (
                <button type="button" className="map__lock" onClick={() => setMapLive(true)}>
                  <span>Нажмите, чтобы двигать карту</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div>
              <div className="footer__logo">CAS<b>POL</b></div>
              <p style={{ marginTop: 12, maxWidth: 330, fontSize: 14.5 }}>
                Полиуретановые связующие и клеи для спортивных и детских покрытий.
                Собственное производство в России.
              </p>
            </div>
            <div>
              <h4>Разделы</h4>
              <a href="#obj-1">Линейка</a><br />
              <a href="#calc">Калькулятор</a><br />
              <a href="#contacts">Контакты</a>
            </div>
            <div>
              <h4>Контакты</h4>
              <a href="https://caspol.ru" target="_blank" rel="noopener">caspol.ru</a><br />
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a><br />
              <a href={`tel:${PHONE_1.replace(/[^\d+]/g, '')}`}>{PHONE_1}</a><br />
              <span style={{ fontSize: 14.5, lineHeight: 2 }}>{ADDRESS}</span>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© {new Date().getFullYear()} ООО «Каспол». CASPOL · CASPUR.</span>
            <span>Информация на сайте не является публичной офертой.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
