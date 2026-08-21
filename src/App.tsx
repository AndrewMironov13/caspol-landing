import { useEffect, useState } from 'react'
import VideoHero from './components/VideoHero'
import HeroPanels from './components/HeroPanels'
import Cinema from './components/Cinema'
import Calculator from './components/Calculator'
import LeadForm, { type Prefill } from './components/LeadForm'

/* ---- КОНТАКТЫ: подтвердить у заказчика ---- */
const EMAIL = 'info@caspol.ru'
const PHONE_1 = '+7 (950) 347-01-96'
const PHONE_2 = '+7 (904) 786-94-30'
const HOURS = 'Пн–Чт 8:00–17:00, Пт 8:00–16:00'
const ADDRESS = '606002, Нижегородская обл., г. Дзержинск, ул. Красноармейская, д. 15, корп. А'
const MAP_SRC = `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent('Дзержинск, улица Красноармейская, 15 корпус А')}&z=16`

/* Мессенджеры — все на основной номер +7 (950) 347-01-96.
   WhatsApp и Telegram открывают чат прямо по номеру (t.me/+7… проверено:
   отдаёт «Chat with +7 950 347 01 96»). У MAX по номеру не работает —
   max.ru/+7… отвечает «не нашли чат», поэтому здесь профильная ссылка,
   присланная заказчиком. Пустой url не рендерится: битая кнопка в эфир
   не уйдёт, если ссылку понадобится временно убрать. */
const MESSENGERS: { id: string; label: string; url: string }[] = [
  { id: 'wa', label: 'Написать в WhatsApp', url: 'https://wa.me/79503470196' },
  { id: 'tg', label: 'Написать в Telegram', url: 'https://t.me/+79503470196' },
  { id: 'max', label: 'Написать в MAX', url: 'https://web.max.ru/151605660' },
].filter((m) => m.url)

const MSG_ICON: Record<string, JSX.Element> = {
  wa: <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.1-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3Z" /></svg>,
  tg: <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 19 20.1c-.2 1-.8 1.2-1.6.8l-4.5-3.3-2.2 2.1c-.2.2-.5.5-1 .5l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.4 13.3l-4.5-1.4c-1-.3-1-1 .2-1.4l17.6-6.8c.8-.3 1.5.2 1.2 1.6Z" /></svg>,
  // у MAX нет общеизвестного знака — ставим текстовый бейдж, а не выдуманный логотип
  max: <b className="msg__max">MAX</b>,
}

const Messengers = ({ className = '' }: { className?: string }) =>
  MESSENGERS.length === 0 ? null : (
    <span className={`msgs ${className}`}>
      {MESSENGERS.map((m) => (
        <a
          key={m.id} href={m.url} data-goal={`msg_${m.id}`} className={`msg msg--${m.id}`}
          target="_blank" rel="noopener noreferrer"
          aria-label={m.label} title={m.label}
        >{MSG_ICON[m.id]}</a>
      ))}
    </span>
  )

const I = {
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
  ['#obj-1', 'Каталог'],
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
          <Messengers className="msgs--head" />
          {/* звонок — второе действие рядом с формой: подрядчику часто быстрее
              спросить голосом, чем заполнять поля */}
          <a
            className="header__tel" data-goal="call_header"
            href={`tel:${PHONE_1.replace(/[^\d+]/g, '')}`}
            aria-label={`Позвонить ${PHONE_1}`}
          >{I.phone}<span>{PHONE_1}</span></a>
          <a href="#contacts" data-goal="price_header" className="btn btn--primary header__cta" onClick={() => setOpen(false)}>
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
          <a className="mmenu__phone" data-goal="call_menu" href={`tel:${PHONE_1.replace(/[^\d+]/g, '')}`}>{PHONE_1}</a>
          <Messengers className="msgs--menu" />
          <a href="#contacts" data-goal="price_menu" className="btn btn--primary btn--wide btn--lg" onClick={() => setOpen(false)}>
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

      {/* калькулятор */}
      <section className="section section--soft">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow eyebrow--lg">Калькулятор расхода</span>
            <p className="lead">
              Выберите материал, задайте площадь и толщину. Покажем, сколько нужно,
              и передадим расчёт менеджеру вместе с заявкой
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
              <span className="eyebrow eyebrow--lg">Заявка</span>
              <h2 style={{ marginTop: 16 }}>Заполните заявку — и мы договоримся</h2>
              <p>Напишите площадь и тип объекта — менеджер свяжется в ближайшее время, подберёт материал, посчитает объём и стоимость и подскажет по укладке</p>
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
            <h2 className="h-sec">С производства — прямо на ваш объект</h2>
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
                Собственное производство в России
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
