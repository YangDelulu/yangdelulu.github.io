import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './StarForce.css'

interface RateEntry {
  success: number
  maintain: number
  destruction: number
  recover: number
}

interface LogEntry {
  attempt: number
  from: number
  result: 'success' | 'maintain' | 'destroyed' | 'protected'
  to: number
}

// Mulberry32 seeded PRNG — returns a function that produces 0-1 floats
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Simple string hash to number
function hashSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

export default function StarForce() {
  const [rates, setRates] = useState<RateEntry[] | null>(null)
  const [start, setStart] = useState(15)
  const [target, setTarget] = useState(22)
  const [itemLevel, setItemLevel] = useState(250)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState<{
    attempts: number
    successes: number
    maintains: number
    destructions: number
    protections: number
    finalStar: number
    totalCost: number
  } | null>(null)
  const [starCatch, setStarCatch] = useState(true)
  const [safeguard, setSafeguard] = useState(true)
  const [eventDiscount, setEventDiscount] = useState(false)
  const [mvpDiscount, setMvpDiscount] = useState<0 | 3 | 5 | 10>(0)
  const [instant, setInstant] = useState(false)
  const [rollDelay, setRollDelay] = useState(88)
  const [lessBoom, setLessBoom] = useState(true)
  const [seed, setSeed] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef(false)
  const logScrollRef = useRef<HTMLDivElement>(null)
  const tapRngRef = useRef<(() => number) | null>(null)
  const tapStarRef = useRef(0)
  const tapCountsRef = useRef({ attempts: 0, successes: 0, maintains: 0, destructions: 0, protections: 0, totalCost: 0 })

  // Load rates on first use
  const loadRates = useCallback(async () => {
    if (rates) return rates
    const res = await fetch(import.meta.env.BASE_URL + 'data/rates.json')
    const data: RateEntry[] = await res.json()
    setRates(data)
    return data
  }, [rates])

  // Meso cost per attempt: 1000 + floor(L^3 * f(S))
  const divisors: Record<number, number> = {
    10: 400, 11: 220, 12: 150, 13: 110, 14: 75,
    15: 200, 16: 200, 17: 150, 18: 70, 19: 45,
    20: 200, 21: 125,
  }

  const getCost = (L: number, S: number): number => {
    const L3 = L * L * L
    if (S <= 9) {
      return 1000 + Math.floor(L3 * (S + 1) / 25)
    }
    const div = divisors[S] ?? 200 // 22-29 all use 200
    return 1000 + Math.floor(L3 * Math.pow(S + 1, 2.7) / div)
  }

  const validate = (): string => {
    if (start < 0 || start > 29) return 'Start must be between 0 and 29.'
    if (target < 1 || target > 30) return 'Target must be between 1 and 30.'
    if (target <= start) return 'Target must be higher than start.'
    if (itemLevel < 1) return 'Item level must be at least 1.'
    return ''
  }

  const simulate = async () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setLog([])
    setSummary(null)

    tapRngRef.current = null
    setRunning(true)
    abortRef.current = false

    const r = await loadRates()
    if (!r) return

    let star = start
    let attempt = 0
    let successes = 0
    let maintains = 0
    let destructions = 0
    let protections = 0
    let totalCost = 0
    const LOG_CAP = 10000
    // Seeded or random PRNG
    const seedNum = seed ? hashSeed(seed) : Math.floor(Math.random() * 2147483647)
    const random = mulberry32(seedNum)
    const delay = instant ? 0 : rollDelay

    const scrollToBottom = () => {
      const el = logScrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }

    const appendLog = (entry: LogEntry) => {
      setLog((prev) => {
        if (prev.length >= LOG_CAP) return prev
        return [...prev, entry]
      })
    }

    // Batched flush for instant mode
    const buffer: LogEntry[] = []
    const flush = () => {
      if (buffer.length === 0) return
      const batch = [...buffer]
      buffer.length = 0
      setLog((prev) => {
        if (prev.length >= LOG_CAP) return prev
        const combined = [...prev, ...batch]
        return combined.length > LOG_CAP ? combined.slice(0, LOG_CAP) : combined
      })
    }

    while (star < target && !abortRef.current) {
      attempt++
      const rate = r[star]
      const roll = random()

      // Cost modifiers (additive)
      const useSafeguard = safeguard && star >= 15 && star <= 17
      let costMult = 1
      if (useSafeguard) costMult += 2
      if (eventDiscount && star <= 21) costMult -= 0.3
      if (mvpDiscount > 0 && star <= 16) costMult -= mvpDiscount / 100
      totalCost += Math.floor(getCost(itemLevel, star) * Math.max(0, costMult))

      // Less Boom: 0.7x destruction
      const destructionRate = lessBoom ? rate.destruction * 0.7 : rate.destruction
      // Star catch: +5% multiplicative success, taken from maintain
      const successRate = starCatch ? rate.success * 1.05 : rate.success

      let result: 'success' | 'maintain' | 'destroyed' | 'protected'
      let newStar: number

      if (roll < destructionRate) {
        if (useSafeguard) {
          result = 'protected'
          newStar = star
          protections++
        } else {
          result = 'destroyed'
          newStar = rate.recover
          destructions++
        }
      } else if (roll < destructionRate + successRate) {
        result = 'success'
        newStar = star + 1
        successes++
      } else {
        result = 'maintain'
        newStar = star
        maintains++
      }

      const entry: LogEntry = { attempt, from: star, result, to: newStar }
      star = newStar

      if (delay > 0) {
        // Real-time mode: append one at a time, sleep, auto-scroll
        if (attempt <= LOG_CAP) {
          appendLog(entry)
          await new Promise((resolve) => setTimeout(resolve, delay))
          scrollToBottom()
        }
      } else {
        // Instant mode: batch for performance
        if (attempt <= LOG_CAP) buffer.push(entry)
        if (attempt % 50000 === 0) {
          flush()
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }
    }

    flush()
    scrollToBottom()
    setSummary({ attempts: attempt, successes, maintains, destructions, protections, finalStar: star, totalCost })

    // Persist state so Tap can continue from here
    tapRngRef.current = random
    tapStarRef.current = star
    tapCountsRef.current = { attempts: attempt, successes, maintains, destructions, protections, totalCost }


    setRunning(false)
  }

  const initTap = async () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError('')
    const r = await loadRates()
    if (!r) return

    const seedNum = seed ? hashSeed(seed) : Math.floor(Math.random() * 2147483647)
    tapRngRef.current = mulberry32(seedNum)
    tapStarRef.current = start
    tapCountsRef.current = { attempts: 0, successes: 0, maintains: 0, destructions: 0, protections: 0, totalCost: 0 }
    setLog([])
    setSummary(null)

  }

  const tap = async () => {
    const r = await loadRates()
    if (!r || !tapRngRef.current) {
      await initTap()
      return
    }

    const star = tapStarRef.current
    if (star >= 30) return

    const rate = r[star]
    const roll = tapRngRef.current()
    const counts = tapCountsRef.current

    const useSafeguard = safeguard && star >= 15 && star <= 17
    let costMult = 1
    if (useSafeguard) costMult += 2
    if (eventDiscount && star <= 21) costMult -= 0.3
    if (mvpDiscount > 0 && star <= 16) costMult -= mvpDiscount / 100
    counts.totalCost += Math.floor(getCost(itemLevel, star) * Math.max(0, costMult))

    const destructionRate = lessBoom ? rate.destruction * 0.7 : rate.destruction
    const successRate = starCatch ? rate.success * 1.05 : rate.success

    let result: 'success' | 'maintain' | 'destroyed' | 'protected'
    let newStar: number

    if (roll < destructionRate) {
      if (useSafeguard) {
        result = 'protected'
        newStar = star
        counts.protections++
      } else {
        result = 'destroyed'
        newStar = rate.recover
        counts.destructions++
      }
    } else if (roll < destructionRate + successRate) {
      result = 'success'
      newStar = star + 1
      counts.successes++
    } else {
      result = 'maintain'
      newStar = star
      counts.maintains++
    }

    counts.attempts++
    tapStarRef.current = newStar

    setLog((prev) => [...prev, { attempt: counts.attempts, from: star, result, to: newStar }])
    setSummary({ ...counts, finalStar: newStar })



    // Auto-scroll
    setTimeout(() => {
      const el = logScrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 0)
  }

  const stop = () => {
    abortRef.current = true
  }

  return (
    <div className="sf-page">
      <Link to="/" className="back-link">&larr; Home</Link>

      <h1 className="sf-title">Star Force Simulator</h1>
      <p className="sf-desc">
        Simulate star force enhancement attempts. Set a starting star and a target, then watch it run.
      </p>

      <div className="sf-layout">
      {/* Controls */}
      <div className="sf-controls">
        <div className="sf-speed-row">
          <label htmlFor="sf-seed">Seed</label>
          <input
            id="sf-seed"
            type="text"
            placeholder="random"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            disabled={running}
          />
        </div>
        <div className="sf-input-row">
          <div className="sf-field">
            <label htmlFor="sf-start">Start</label>
            <input
              id="sf-start"
              type="number"
              min={0}
              max={29}
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              disabled={running}
            />
          </div>
          <span className="sf-arrow">&rarr;</span>
          <div className="sf-field">
            <label htmlFor="sf-target">Target</label>
            <input
              id="sf-target"
              type="number"
              min={1}
              max={30}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              disabled={running}
            />
          </div>
          <div className="sf-field">
            <label htmlFor="sf-level">Item Level</label>
            <input
              id="sf-level"
              type="number"
              min={1}
              value={itemLevel}
              onChange={(e) => setItemLevel(Number(e.target.value))}
              disabled={running}
            />
          </div>
        </div>

        <label className="sf-checkbox">
          <input
            type="checkbox"
            checked={starCatch}
            onChange={(e) => setStarCatch(e.target.checked)}
            disabled={running}
          />
          <span>Star Catch (1.05x success rate)</span>
        </label>
        <label className="sf-checkbox">
          <input
            type="checkbox"
            checked={safeguard}
            onChange={(e) => setSafeguard(e.target.checked)}
            disabled={running}
          />
          <span>Safeguard (15-17 only, +200% cost, prevents destruction)</span>
        </label>
        <label className="sf-checkbox">
          <input
            type="checkbox"
            checked={eventDiscount}
            onChange={(e) => setEventDiscount(e.target.checked)}
            disabled={running}
          />
          <span>Event: -30% cost (&le;21&#9733;)</span>
        </label>
        <label className="sf-checkbox">
          <input
            type="checkbox"
            checked={lessBoom}
            onChange={(e) => setLessBoom(e.target.checked)}
            disabled={running}
          />
          <span>Event: -30% destruction rate</span>
        </label>
        <div className="sf-select-row">
          <label htmlFor="sf-mvp">MVP Discount (&le;16&#9733;)</label>
          <select
            id="sf-mvp"
            value={mvpDiscount}
            onChange={(e) => setMvpDiscount(Number(e.target.value) as 0 | 3 | 5 | 10)}
            disabled={running}
          >
            <option value={0}>None</option>
            <option value={3}>Silver / Gold — 3%</option>
            <option value={5}>Gold / Diamond — 5%</option>
            <option value={10}>Diamond+ / Royal+ — 10%</option>
          </select>
        </div>

        <div className="sf-instant-row">
          <label className="sf-checkbox">
            <input
              type="checkbox"
              checked={instant}
              onChange={(e) => setInstant(e.target.checked)}
              disabled={running}
            />
            <span>Instant results</span>
          </label>
          {!instant && (
            <div className="sf-speed-row">
              <label htmlFor="sf-delay">Roll delay</label>
              <input
                id="sf-delay"
                type="number"
                min={1}
                value={rollDelay}
                onChange={(e) => setRollDelay(Math.max(1, Number(e.target.value)))}
                disabled={running}
              />
              <span className="sf-speed-unit">ms</span>
            </div>
          )}
        </div>

        {error && <p className="sf-error">{error}</p>}

        <div className="sf-buttons">
          {!running ? (
            <>
              <button className="sf-run" onClick={simulate}>
                Simulate
              </button>
              <button className="sf-tap" onClick={tap}>
                Tap
              </button>
            </>
          ) : (
            <button className="sf-stop" onClick={stop}>
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Log */}
      <div className="sf-log">
        <h2 className="sf-log-title">
          {log.length > 0
            ? `Log (${log.length >= 10000 ? 'first 10,000 of ' : ''}${summary?.attempts.toLocaleString() ?? log.length} attempts)`
            : 'Log'}
        </h2>
        <div className="sf-log-scroll" ref={logScrollRef}>
          {log.map((entry) => (
            <div key={entry.attempt} className={`sf-log-entry sf-log-entry--${entry.result}`}>
              <span className="sf-log-num">#{entry.attempt}</span>
              <span className="sf-log-stars">{entry.from}&#9733;</span>
              <span className="sf-log-result">{entry.result === 'maintain' ? 'failed' : entry.result}</span>
              <span className="sf-log-arrow">&rarr;</span>
              <span className="sf-log-stars">{entry.to}&#9733;</span>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="sf-summary">
          <div className="sf-stat">
            <span className="sf-stat-label">Final Star</span>
            <span className="sf-stat-value">{summary.finalStar}</span>
          </div>
          <div className="sf-stat">
            <span className="sf-stat-label">Attempts</span>
            <span className="sf-stat-value">{summary.attempts}</span>
          </div>
          <div className="sf-stat sf-stat--success">
            <span className="sf-stat-label">Successes</span>
            <span className="sf-stat-value">{summary.successes}</span>
          </div>
          <div className="sf-stat sf-stat--maintain">
            <span className="sf-stat-label">Failed</span>
            <span className="sf-stat-value">{summary.maintains}</span>
          </div>
          <div className="sf-stat sf-stat--destroyed">
            <span className="sf-stat-label">Destroyed</span>
            <span className="sf-stat-value">{summary.destructions}</span>
          </div>
          {summary.protections > 0 && (
            <div className="sf-stat sf-stat--protected">
              <span className="sf-stat-label">Protected</span>
              <span className="sf-stat-value">{summary.protections}</span>
            </div>
          )}
          <div className="sf-stat sf-stat--cost">
            <span className="sf-stat-label">Total Mesos</span>
            <span className="sf-stat-value">{summary.totalCost.toLocaleString()}</span>
          </div>
        </div>
      )}

    </div>
  )
}
