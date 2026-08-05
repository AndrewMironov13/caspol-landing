/* Панели и фоны сцен лежат на 2–5 экранов ниже героя, но их картинки (~1.4 МБ)
   грузились сразу при монтировании и отъедали канал у кадров ролика: на 4G
   грубый проход героя доезжал за 9.6 с вместо расчётных 2.5.

   Откладываем до первой прокрутки — к этому моменту герой уже листается.
   Таймер на 5 с — страховка для тех, кто открыл и не трогает страницу. */
export function whenScrolled(cb: () => void): () => void {
  let fired = false
  let timer = 0

  const go = () => {
    if (fired) return
    fired = true
    window.removeEventListener('scroll', onScroll)
    clearTimeout(timer)
    cb()
  }

  const onScroll = () => { if (window.scrollY > 300) go() }

  if (window.scrollY > 300) {
    go()
  } else {
    window.addEventListener('scroll', onScroll, { passive: true })
    timer = window.setTimeout(go, 5000)
  }

  return () => {
    window.removeEventListener('scroll', onScroll)
    clearTimeout(timer)
  }
}
