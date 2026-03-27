import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import './QrGenerator.css'

export default function QrGenerator() {
  const [text, setText] = useState('')
  const [size, setSize] = useState(300)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasQR, setHasQR] = useState(false)

  const generate = useCallback(() => {
    if (!text.trim() || !canvasRef.current) {
      setHasQR(false)
      return
    }
    QRCode.toCanvas(canvasRef.current, text, {
      width: size,
      margin: 2,
      color: { dark: fgColor, light: bgColor },
    }, (err) => {
      if (err) {
        setHasQR(false)
      } else {
        setHasQR(true)
      }
    })
  }, [text, size, fgColor, bgColor])

  // Regenerate on any change
  useEffect(() => {
    generate()
  }, [generate])

  const download = (format: 'png' | 'svg') => {
    if (!text.trim()) return

    if (format === 'svg') {
      QRCode.toString(text, {
        type: 'svg',
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
      }, (err, svg) => {
        if (err || !svg) return
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = 'qrcode.svg'
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      })
    } else {
      const canvas = canvasRef.current
      if (!canvas) return
      const link = document.createElement('a')
      link.download = 'qrcode.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  return (
    <div className="qr-page">
      <Link to="/" className="back-link">&larr; Home</Link>

      <h1 className="qr-title">QR Code Generator</h1>
      <p className="qr-desc">Type text or paste a URL, get a QR code instantly.</p>

      <div className="qr-layout">
        {/* Controls */}
        <div className="qr-controls">
          <textarea
            className="qr-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text or URL..."
            rows={4}
          />

          <div className="qr-options">
            <div className="qr-option">
              <label htmlFor="qr-size">Size</label>
              <input
                id="qr-size"
                type="number"
                min={100}
                max={1000}
                step={50}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <span className="qr-unit">px</span>
            </div>

            <div className="qr-option">
              <label htmlFor="qr-fg">Foreground</label>
              <input
                id="qr-fg"
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
              />
              <span className="qr-color-value">{fgColor}</span>
            </div>

            <div className="qr-option">
              <label htmlFor="qr-bg">Background</label>
              <input
                id="qr-bg"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
              />
              <span className="qr-color-value">{bgColor}</span>
            </div>
          </div>

          {hasQR && (
            <div className="qr-downloads">
              <button className="qr-download" onClick={() => download('png')}>
                Download PNG
              </button>
              <button className="qr-download qr-download--alt" onClick={() => download('svg')}>
                Download SVG
              </button>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="qr-preview">
          <canvas
            ref={canvasRef}
            style={{ display: hasQR ? 'block' : 'none' }}
          />
          {!hasQR && (
            <div className="qr-placeholder">
              QR code will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
