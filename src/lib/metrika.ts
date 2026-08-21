/* Яндекс.Метрика.
   Номер счётчика живёт в .env (VITE_METRIKA_ID). Пусто — счётчик просто не
   подключается: так в эфир не уйдёт запрос к несуществующему номеру.

   Подключаем ПОСЛЕ полной загрузки страницы и в первую же паузу браузера.
   Причина: tag.js весит около 50 КБ и на старте конкурировал бы с кадрами
   ролика, а именно первые секунды на телефоне и без того самые тяжёлые.
   Визит при этом не теряется — счётчик инициализируется на той же странице. */

const ID = (import.meta.env.VITE_METRIKA_ID || '').trim()

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }
  }
}

const SRC = 'https://mc.yandex.ru/metrika/tag.js'

function boot() {
  if (!ID || document.querySelector(`script[src="${SRC}"]`)) return

  window.ym = window.ym || function (...args: unknown[]) {
    ;(window.ym!.a = window.ym!.a || []).push(args)
  }
  window.ym.l = Date.now()

  const s = document.createElement('script')
  s.async = true
  s.src = SRC
  document.head.appendChild(s)

  window.ym(Number(ID), 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
  })
}

export function initMetrika() {
  if (!ID) return
  const start = () => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void
    }).requestIdleCallback
    if (ric) ric(boot, { timeout: 3000 })
    else setTimeout(boot, 1200)
  }
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
