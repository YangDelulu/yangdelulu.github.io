import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import './UnitConverter.css'

interface Unit {
  name: string
  symbol: string
  toBase: (v: number) => number   // convert to base unit
  fromBase: (v: number) => number // convert from base unit
}

// Helper for simple ratio-based units
const ratio = (name: string, symbol: string, factor: number): Unit => ({
  name,
  symbol,
  toBase: (v) => v * factor,
  fromBase: (v) => v / factor,
})

// Categories and their units — base unit is always first
const categories: Record<string, Unit[]> = {
  Length: [
    ratio('Metre', 'm', 1),
    ratio('Kilometre', 'km', 1000),
    ratio('Centimetre', 'cm', 0.01),
    ratio('Millimetre', 'mm', 0.001),
    ratio('Ångström', 'Å', 1e-10),
    ratio('Inch', 'in', 0.0254),
    ratio('Foot', 'ft', 0.3048),
    ratio('Yard', 'yd', 0.9144),
    ratio('Mile', 'mi', 1609.344),
    ratio('Nautical Mile', 'nmi', 1852),
    ratio('Astronomical Unit', 'AU', 1.495978707e11),
    ratio('Light-Year', 'ly', 9.4607304725808e15),
    ratio('Parsec', 'pc', 3.0856775814913673e16),
    ratio('Planck Length', 'ℓP', 1.616255e-35),
    ratio('Fermi', 'fm', 1e-15),
  ],
  Mass: [
    ratio('Kilogram', 'kg', 1),
    ratio('Gram', 'g', 0.001),
    ratio('Milligram', 'mg', 1e-6),
    ratio('Metric Ton', 't', 1000),
    ratio('Pound', 'lb', 0.45359237),
    ratio('Ounce', 'oz', 0.028349523125),
    ratio('Stone', 'st', 6.35029318),
    ratio('Short Ton', 'US ton', 907.18474),
    ratio('Long Ton', 'UK ton', 1016.0469088),
    ratio('Grain', 'gr', 6.479891e-5),
    ratio('Carat', 'ct', 0.0002),
    ratio('Slug', 'slug', 14.593903),
    ratio('Atomic Mass Unit', 'u', 1.66053906660e-27),
    ratio('Planck Mass', 'mP', 2.176434e-8),
    ratio('Solar Mass', 'M☉', 1.989e30),
  ],
  Time: [
    ratio('Second', 's', 1),
    ratio('Millisecond', 'ms', 0.001),
    ratio('Minute', 'min', 60),
    ratio('Hour', 'hr', 3600),
    ratio('Day', 'day', 86400),
    ratio('Week', 'wk', 604800),
    ratio('Month (avg)', 'mo', 2629746),
    ratio('Year (avg)', 'yr', 31556952),
    ratio('Century', 'century', 3155695200),
    ratio('Planck Time', 'tP', 5.391247e-44),
  ],
  Temperature: [
    { name: 'Celsius', symbol: '°C', toBase: (v) => v, fromBase: (v) => v },
    { name: 'Fahrenheit', symbol: '°F', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
    { name: 'Kelvin', symbol: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    { name: 'Rankine', symbol: '°R', toBase: (v) => (v - 491.67) * 5 / 9, fromBase: (v) => v * 9 / 5 + 491.67 },
  ],
  Speed: [
    ratio('Metre/second', 'm/s', 1),
    ratio('Kilometre/hour', 'km/h', 1 / 3.6),
    ratio('Mile/hour', 'mph', 0.44704),
    ratio('Foot/second', 'ft/s', 0.3048),
    ratio('Knot', 'kn', 0.514444),
    ratio('Speed of Light', 'c', 299792458),
    ratio('Mach (sea level)', 'Mach', 343),
  ],
  Area: [
    ratio('Square Metre', 'm²', 1),
    ratio('Square Kilometre', 'km²', 1e6),
    ratio('Hectare', 'ha', 1e4),
    ratio('Acre', 'ac', 4046.8564224),
    ratio('Square Mile', 'mi²', 2589988.110336),
    ratio('Square Foot', 'ft²', 0.09290304),
    ratio('Square Inch', 'in²', 6.4516e-4),
    ratio('Square Yard', 'yd²', 0.83612736),
    ratio('Barn', 'b', 1e-28),
  ],
  Volume: [
    ratio('Litre', 'L', 1),
    ratio('Millilitre', 'mL', 0.001),
    ratio('Cubic Metre', 'm³', 1000),
    ratio('Cubic Foot', 'ft³', 28.316846592),
    ratio('Cubic Inch', 'in³', 0.016387064),
    ratio('US Gallon', 'gal', 3.785411784),
    ratio('US Quart', 'qt', 0.946352946),
    ratio('US Pint', 'pt', 0.473176473),
    ratio('US Cup', 'cup', 0.2365882365),
    ratio('US Fluid Ounce', 'fl oz', 0.029573529563),
    ratio('US Tablespoon', 'tbsp', 0.014786764782),
    ratio('US Teaspoon', 'tsp', 0.004928921594),
    ratio('Imperial Gallon', 'imp gal', 4.54609),
    ratio('Imperial Pint', 'imp pt', 0.56826125),
  ],
  Energy: [
    ratio('Joule', 'J', 1),
    ratio('Calorie', 'cal', 4.184),
    ratio('Kilocalorie', 'kcal', 4184),
    ratio('Kilowatt-Hour', 'kWh', 3.6e6),
    ratio('Electronvolt', 'eV', 1.602176634e-19),
    ratio('British Thermal Unit', 'BTU', 1055.06),
    ratio('Therm', 'therm', 1.055e8),
    ratio('Erg', 'erg', 1e-7),
    ratio('Foot-Pound', 'ft·lbf', 1.3558179483),
    ratio('Hartree', 'Eₕ', 4.3597447222071e-18),
    ratio('Rydberg', 'Ry', 2.1798723611035e-18),
  ],
  Force: [
    ratio('Newton', 'N', 1),
    ratio('Dyne', 'dyn', 1e-5),
    ratio('Pound-Force', 'lbf', 4.4482216152605),
    ratio('Kilogram-Force', 'kgf', 9.80665),
    ratio('Poundal', 'pdl', 0.138254954376),
  ],
  Pressure: [
    ratio('Pascal', 'Pa', 1),
    ratio('Atmosphere', 'atm', 101325),
    ratio('Bar', 'bar', 1e5),
    ratio('PSI', 'psi', 6894.757293168),
    ratio('Torr', 'Torr', 133.32236842),
    ratio('mmHg', 'mmHg', 133.322),
    ratio('inHg', 'inHg', 3386.389),
  ],
  Power: [
    ratio('Watt', 'W', 1),
    ratio('Horsepower (mech)', 'hp', 745.69987158227),
    ratio('Metric Horsepower', 'PS', 735.49875),
    ratio('BTU/hour', 'BTU/h', 0.29307107),
    ratio('Erg/second', 'erg/s', 1e-7),
  ],
  Frequency: [
    ratio('Hertz', 'Hz', 1),
    ratio('RPM', 'rpm', 1 / 60),
    ratio('Radians/second', 'rad/s', 1 / (2 * Math.PI)),
  ],
  'Data Storage': [
    ratio('Byte', 'B', 1),
    ratio('Bit', 'bit', 0.125),
    ratio('Kilobyte', 'KB', 1e3),
    ratio('Megabyte', 'MB', 1e6),
    ratio('Gigabyte', 'GB', 1e9),
    ratio('Terabyte', 'TB', 1e12),
    ratio('Petabyte', 'PB', 1e15),
    ratio('Kibibyte', 'KiB', 1024),
    ratio('Mebibyte', 'MiB', 1048576),
    ratio('Gibibyte', 'GiB', 1073741824),
    ratio('Tebibyte', 'TiB', 1099511627776),
  ],
  Angle: [
    ratio('Degree', '°', 1),
    ratio('Radian', 'rad', 180 / Math.PI),
    ratio('Gradian', 'grad', 0.9),
    ratio('Arcminute', '′', 1 / 60),
    ratio('Arcsecond', '″', 1 / 3600),
    ratio('Turn', 'turn', 360),
  ],
  'Electric Charge': [
    ratio('Coulomb', 'C', 1),
    ratio('Ampere-Hour', 'Ah', 3600),
    ratio('Milliampere-Hour', 'mAh', 3.6),
    ratio('Elementary Charge', 'e', 1.602176634e-19),
  ],
  'Magnetic Field': [
    ratio('Tesla', 'T', 1),
    ratio('Gauss', 'G', 1e-4),
  ],
  Radioactivity: [
    ratio('Becquerel', 'Bq', 1),
    ratio('Curie', 'Ci', 3.7e10),
    ratio('Rutherford', 'Rd', 1e6),
  ],
  'Radiation Dose': [
    ratio('Gray', 'Gy', 1),
    ratio('Sievert', 'Sv', 1),
    ratio('Rad', 'rad (dose)', 0.01),
    ratio('Rem', 'rem', 0.01),
  ],
}

const categoryNames = Object.keys(categories)

// SI prefixes for smart scaling
const siPrefixes = [
  { prefix: 'q', factor: 1e-30 },
  { prefix: 'r', factor: 1e-27 },
  { prefix: 'y', factor: 1e-24 },
  { prefix: 'z', factor: 1e-21 },
  { prefix: 'a', factor: 1e-18 },
  { prefix: 'f', factor: 1e-15 },
  { prefix: 'p', factor: 1e-12 },
  { prefix: 'n', factor: 1e-9 },
  { prefix: 'μ', factor: 1e-6 },
  { prefix: 'm', factor: 1e-3 },
  { prefix: '', factor: 1 },
  { prefix: 'k', factor: 1e3 },
  { prefix: 'M', factor: 1e6 },
  { prefix: 'G', factor: 1e9 },
  { prefix: 'T', factor: 1e12 },
  { prefix: 'P', factor: 1e15 },
  { prefix: 'E', factor: 1e18 },
]

interface SmartPrefix {
  scaled: number
  label: string // e.g. "16.67 MHz"
}

// Given a value and its unit symbol, find the SI prefix that gives the nicest number (1-999)
// Returns null if the base value is already in a nice range or the prefixed form already exists
function findSmartPrefix(value: number, symbol: string, existingSymbols: Set<string>): SmartPrefix | null {
  if (value === 0) return null
  const abs = Math.abs(value)
  // Only suggest if the value is outside a comfortable range
  if (abs >= 0.1 && abs < 1000) return null

  let best: { prefix: string; factor: number; scaled: number } | null = null
  let bestScore = Infinity

  for (const { prefix, factor } of siPrefixes) {
    if (prefix === '') continue // skip base, that's already shown
    const scaled = value / factor
    const absScaled = Math.abs(scaled)
    if (absScaled >= 1 && absScaled < 1000) {
      // Prefer values closest to the middle of 1-999 on a log scale
      const score = Math.abs(Math.log10(absScaled) - 1.5)
      if (score < bestScore) {
        bestScore = score
        best = { prefix, factor, scaled }
      }
    }
  }

  if (!best) return null

  // Check if this prefixed symbol already exists in the list
  const prefixedSymbol = best.prefix + symbol
  if (existingSymbols.has(prefixedSymbol)) return null

  return {
    scaled: best.scaled,
    label: `${formatNumber(best.scaled)} ${prefixedSymbol}`,
  }
}

function formatNumber(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || (abs > 0 && abs < 1e-6)) {
    return n.toExponential(6)
  }
  // Use enough precision to be useful
  if (abs >= 1) return n.toLocaleString(undefined, { maximumSignificantDigits: 10 })
  return n.toPrecision(8)
}

export default function UnitConverter() {
  const [category, setCategory] = useState(categoryNames[0])
  const [fromUnit, setFromUnit] = useState(0)
  const [inputValue, setInputValue] = useState('1')
  const [cascade, setCascade] = useState(false)

  const units = categories[category]
  const parsed = parseFloat(inputValue)
  const hasValue = inputValue !== '' && !isNaN(parsed)

  const results = useMemo(() => {
    if (!hasValue) return []
    const baseValue = units[fromUnit].toBase(parsed)
    const existingSymbols = new Set(units.map((u) => u.symbol))
    const list = units.map((unit, i) => {
      const value = i === fromUnit ? parsed : unit.fromBase(baseValue)
      return {
        unit,
        value,
        isSelf: i === fromUnit,
        smartPrefix: findSmartPrefix(value, unit.symbol, existingSymbols),
      }
    })
    if (cascade) list.sort((a, b) => b.value - a.value)
    return list
  }, [category, fromUnit, parsed, hasValue, units, cascade])

  const switchCategory = (cat: string) => {
    setCategory(cat)
    setFromUnit(0)
    setInputValue('1')
  }

  return (
    <div className="uc-page">
      <Link to="/" className="back-link">&larr; Home</Link>

      <h1 className="uc-title">Unit Converter</h1>
      <p className="uc-desc">Convert between units across {categoryNames.length} categories.</p>

      {/* Category picker */}
      <div className="uc-categories">
        {categoryNames.map((cat) => (
          <button
            key={cat}
            className={`uc-cat ${cat === category ? 'uc-cat--active' : ''}`}
            onClick={() => switchCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="uc-input-row">
        <input
          type="number"
          className="uc-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter value"
        />
        <select
          className="uc-select"
          value={fromUnit}
          onChange={(e) => setFromUnit(Number(e.target.value))}
        >
          {units.map((u, i) => (
            <option key={i} value={i}>{u.name} ({u.symbol})</option>
          ))}
        </select>
      </div>

      <label className="uc-toggle">
        <input
          type="checkbox"
          checked={cascade}
          onChange={(e) => setCascade(e.target.checked)}
        />
        <span>Cascade (sort by size)</span>
      </label>

      {/* Results */}
      {hasValue && (
        <div className="uc-results">
          {results.map(({ unit, value, isSelf, smartPrefix }, i) => (
            <div key={i} className={`uc-result ${isSelf ? 'uc-result--self' : ''}`}>
              <span className="uc-result-value">{formatNumber(value)}</span>
              <span className="uc-result-unit">{unit.symbol}</span>
              <span className="uc-result-name">{unit.name}</span>
              {smartPrefix && (
                <span className="uc-result-smart">{smartPrefix.label}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
