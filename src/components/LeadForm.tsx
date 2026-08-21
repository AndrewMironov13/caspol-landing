import { useEffect, useState } from 'react'
import { reachGoal } from '../lib/metrika'

export type Prefill = { object?: string; area?: string; note?: string }

const MAIL_TO = 'info@caspol.ru'
/* Заявка уходит через сервис форм: браузер отправляет запрос, сервис шлёт письмо
   на MAIL_TO. Так доставка не зависит от того, настроена ли почта у клиента.
   Разовая настройка: после первой отправки на MAIL_TO придёт письмо-подтверждение,
   по ссылке в нём адрес активируется. Заменить на свой эндпоинт можно здесь. */
const ENDPOINT = `https://formsubmit.co/ajax/${MAIL_TO}`

type State = 'idle' | 'sending' | 'ok' | 'error'

export default function LeadForm({ prefill }: { prefill?: Prefill }) {
  const [state, setState] = useState<State>('idle')
  const [f, setF] = useState({ name: '', phone: '', email: '', object: '', area: '', note: '', trap: '' })

  useEffect(() => {
    if (!prefill) return
    setF((s) => ({
      ...s,
      object: prefill.object ?? s.object,
      area: prefill.area ?? s.area,
      note: prefill.note ?? s.note,
    }))
  }, [prefill])

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))

  const letter = () => [
    `Имя: ${f.name}`,
    `Телефон: ${f.phone}`,
    f.email && `E-mail: ${f.email}`,
    f.object && `Тип объекта: ${f.object}`,
    f.area && `Площадь: ${f.area} м²`,
    f.note && `Комментарий: ${f.note}`,
  ].filter(Boolean).join('\n')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (f.trap) return // ловушка для ботов
    setState('sending')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Заявка с сайта CASPOL — ${f.name || 'без имени'}`,
          _template: 'table',
          _captcha: 'false',
          Имя: f.name,
          Телефон: f.phone,
          'E-mail': f.email || '—',
          'Тип объекта': f.object || '—',
          'Площадь, м²': f.area || '—',
          Комментарий: f.note || '—',
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState('ok'); reachGoal('form_submit')
    } catch {
      setState('error')
    }
  }

  if (state === 'ok') {
    return (
      <div className="form">
        <div className="form__ok">
          <div className="ic">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h3>Заявка отправлена</h3>
          <p>Менеджер свяжется с вами в течение рабочего дня и пришлёт прайс с расчётом</p>
          <button className="btn btn--brand" style={{ marginTop: 20 }} onClick={() => { setState('idle'); setF({ name: '', phone: '', email: '', object: '', area: '', note: '', trap: '' }) }}>
            Отправить ещё одну
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form__row">
        <div className="inp">
          <label htmlFor="lf-name">Имя *</label>
          <input id="lf-name" required value={f.name} onChange={set('name')} placeholder="Как к вам обращаться" autoComplete="name" />
        </div>
        <div className="inp">
          <label htmlFor="lf-phone">Телефон *</label>
          <input id="lf-phone" required type="tel" value={f.phone} onChange={set('phone')} placeholder="+7 ___ ___-__-__" autoComplete="tel" />
        </div>
      </div>

      <div className="form__row">
        <div className="inp">
          <label htmlFor="lf-object">Тип объекта</label>
          <input id="lf-object" value={f.object} onChange={set('object')} placeholder="Детская площадка, стадион…" />
        </div>
        <div className="inp">
          <label htmlFor="lf-area">Площадь, м²</label>
          <input id="lf-area" inputMode="numeric" value={f.area} onChange={set('area')} placeholder="300" />
        </div>
      </div>

      <div className="inp">
        <label htmlFor="lf-note">Комментарий</label>
        <textarea id="lf-note" value={f.note} onChange={set('note')} placeholder="Какой материал интересует, сроки, объём" />
      </div>

      {/* ловушка для ботов —человек её не видит */}
      <input type="text" value={f.trap} onChange={set('trap')} tabIndex={-1} autoComplete="off"
        aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

      <button type="submit" className="btn btn--primary btn--wide btn--lg" disabled={state === 'sending'}>
        {state === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
      </button>

      {state === 'error' && (
        <p className="form__note" style={{ color: '#c0392b' }}>
          Не удалось отправить — возможно, пропала связь.{' '}
          <a href={`mailto:${MAIL_TO}?subject=${encodeURIComponent('Заявка с сайта CASPOL')}&body=${encodeURIComponent(letter())}`}
            style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
            Отправить письмом
          </a>{' '}или позвоните нам.
        </p>
      )}

      <p className="form__note">
        Нажимая кнопку, вы соглашаетесь на обработку персональных данных.
      </p>
    </form>
  )
}
