import { useMemo, useState } from 'react'
import type { Prefill } from './LeadForm'

type ProdKey = 'caspur' | 'g140' | 'g144'
const PRODUCTS: { key: ProdKey; label: string; full: string }[] = [
  { key: 'caspur', label: 'CASPUR 4000', full: 'CASPUR 4000 · связующее для резиновой крошки' },
  { key: 'g140', label: 'CASPOL 140', full: 'CASPOL 140 2-К · клей для швов искусственного газона' },
  { key: 'g144', label: 'CASPOL 144', full: 'CASPOL 144 2-К · клей для рулонных покрытий' },
]

/* Нормы расхода — из технических описаний (ТУ 20.52.10-003 и -002-40544164-2019):
   CASPUR 4000 — % от массы крошки: базовый слой 14–18 %, лицевой 19–24 %
   CASPOL 140  — 300–350 г на погонный метр шва (зубчатый шпатель В2)
   CASPOL 144  — 800–1000 г/м² (шпатель В2–В3)                                */
type Preset = { key: string; label: string; thickness: number; rate: number }
const PRESETS: Preset[] = [
  { key: 'kids', label: 'Детская площадка', thickness: 30, rate: 20 },
  { key: 'sport', label: 'Спортплощадка', thickness: 20, rate: 20 },
  { key: 'track', label: 'Беговая дорожка', thickness: 13, rate: 22 },
]
// насыпная плотность резиновой крошки ~500 кг/м³ → 0,5 кг на (м²·мм)
const KG_PER_M2_MM = 0.5

const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: n < 100 ? 1 : 0 })

export default function Calculator({ onRequest }: { onRequest?: (p: Prefill) => void }) {
  const [prod, setProd] = useState<ProdKey>('caspur')
  const [preset, setPreset] = useState('kids')
  const [area, setArea] = useState(300)      // м² — для CASPUR и 144
  const [seam, setSeam] = useState(200)      // погонные метры шва — для 140
  const [thickness, setThickness] = useState(30)
  const [rate, setRate] = useState(20)       // % от массы крошки
  const [g144, setG144] = useState(900)      // г/м²
  const [g140, setG140] = useState(325)      // г/пог. м

  const isSeam = prod === 'g140'
  const isRoll = prod === 'g144'
  const isBinder = prod === 'caspur'

  const applyPreset = (p: Preset) => { setPreset(p.key); setThickness(p.thickness); setRate(p.rate) }

  const { crumbKg, kg } = useMemo(() => {
    if (isSeam) return { crumbKg: 0, kg: (seam * g140) / 1000 }
    if (isRoll) return { crumbKg: 0, kg: (area * g144) / 1000 }
    const crumbKg = area * thickness * KG_PER_M2_MM
    return { crumbKg, kg: (crumbKg * rate) / 100 }
  }, [isSeam, isRoll, area, seam, thickness, rate, g144, g140])

  const request = () => {
    const p = PRODUCTS.find((x) => x.key === prod)!
    const note = isSeam
      ? `Расчёт с сайта: ${p.label}, ${seam} пог. м шва, расход ${g140} г/пог. м — нужно ≈ ${fmt(kg)} кг.`
      : isRoll
        ? `Расчёт с сайта: ${p.label}, площадь ${area} м², расход ${g144} г/м² — нужно ≈ ${fmt(kg)} кг.`
        : `Расчёт с сайта: CASPUR 4000, ${area} м², слой ${thickness} мм, расход ${rate} % — нужно ≈ ${fmt(kg)} кг (крошка ≈ ${fmt(crumbKg)} кг).`
    onRequest?.({
      object: isBinder ? (PRESETS.find((x) => x.key === preset)?.label ?? '') : p.full,
      area: isSeam ? '' : String(area),
      note,
    })
    document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="calc" id="calc">
      <div className="calc__panel">
        <div className="field">
          <div className="field__top"><label>Материал</label></div>
          <div className="seg seg--prod">
            {PRODUCTS.map((p) => (
              <button key={p.key} type="button" className={prod === p.key ? 'is-on' : ''} onClick={() => setProd(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {isBinder && (
          <div className="field">
            <div className="field__top"><label>Тип покрытия</label></div>
            <div className="seg">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" className={preset === p.key ? 'is-on' : ''} onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSeam ? (
          <>
            <div className="field">
              <div className="field__top">
                <label htmlFor="seam">Длина швов</label>
                <span className="field__val">{fmt(seam)}<span>пог. м</span></span>
              </div>
              <input id="seam" type="range" min={10} max={3000} step={10} value={seam} onChange={(e) => setSeam(+e.target.value)} />
            </div>
            <div className="field">
              <div className="field__top">
                <label htmlFor="g140">Расход клея</label>
                <span className="field__val">{g140}<span>г/пог. м</span></span>
              </div>
              <input id="g140" type="range" min={300} max={350} step={5} value={g140} onChange={(e) => setG140(+e.target.value)} />
            </div>
          </>
        ) : (
          <div className="field">
            <div className="field__top">
              <label htmlFor="area">Площадь объекта</label>
              <span className="field__val">{fmt(area)}<span>м²</span></span>
            </div>
            <input id="area" type="range" min={20} max={5000} step={10} value={area} onChange={(e) => setArea(+e.target.value)} />
          </div>
        )}

        {isBinder && (
          <>
            <div className="field">
              <div className="field__top">
                <label htmlFor="thick">Толщина слоя</label>
                <span className="field__val">{thickness}<span>мм</span></span>
              </div>
              <input id="thick" type="range" min={8} max={40} step={1} value={thickness}
                onChange={(e) => { setThickness(+e.target.value); setPreset('') }} />
            </div>
            <div className="field">
              <div className="field__top">
                <label htmlFor="rate">Расход связующего</label>
                <span className="field__val">{rate}<span>% от массы крошки</span></span>
              </div>
              <input id="rate" type="range" min={14} max={24} step={1} value={rate}
                onChange={(e) => { setRate(+e.target.value); setPreset('') }} />
            </div>
          </>
        )}

        {isRoll && (
          <div className="field">
            <div className="field__top">
              <label htmlFor="g144">Расход клея</label>
              <span className="field__val">{g144}<span>г/м²</span></span>
            </div>
            <input id="g144" type="range" min={800} max={1000} step={20} value={g144} onChange={(e) => setG144(+e.target.value)} />
          </div>
        )}
      </div>

      <div className="calc__result">
        <span className="eyebrow">{isBinder ? 'Нужно связующего' : 'Нужно клея'}</span>
        <div className="calc__big">{fmt(kg)}<span className="u">кг</span></div>
        <div className="calc__rows">
          {isBinder && <div className="r"><span>Резиновая крошка</span><b>{fmt(crumbKg)} кг · {fmt(crumbKg / 1000)} т</b></div>}
          <div className="r">
            <span>{isSeam ? 'Длина швов' : 'Площадь'}{isBinder && ' · толщина'}</span>
            <b>{isSeam ? `${fmt(seam)} пог. м` : `${fmt(area)} м²`}{isBinder && ` · ${thickness} мм`}</b>
          </div>
          <div className="r">
            <span>Расход</span>
            <b>{isBinder ? `${rate} %` : isSeam ? `${g140} г/пог. м` : `${g144} г/м²`}</b>
          </div>
          <div className="r"><span>Материал</span><b>{PRODUCTS.find((p) => p.key === prod)!.label}</b></div>
        </div>
        <button type="button" className="btn btn--primary" onClick={request}>Получить расчёт стоимости</button>
        <p className="calc__note">
          {isBinder
            ? 'Нормы по техническому описанию: базовый слой 14–18 %, лицевой 19–24 % от массы крошки. Расчёт крошки — при насыпной плотности ~500 кг/м³.'
            : isSeam
              ? 'Норма по техническому описанию: 300–350 г на погонный метр шва при нанесении зубчатым шпателем В2.'
              : 'Норма по техническому описанию: 800–1000 г/м² при нанесении шпателем В2–В3.'}
        </p>
      </div>
    </div>
  )
}
