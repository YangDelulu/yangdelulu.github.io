import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './ColorPicker.css'

interface SavedColor {
  hex: string
  rgb: string
}

export default function ColorPicker() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasImage, setHasImage] = useState(false)
  const [hoveredColor, setHoveredColor] = useState<{ hex: string; rgb: string } | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [savedColors, setSavedColors] = useState<SavedColor[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  // Zoom lens
  const lensCanvasRef = useRef<HTMLCanvasElement>(null)
  const LENS_SIZE = 120
  const ZOOM = 8 // how many pixels to show across the lens
  const PIXEL_SIZE = LENS_SIZE / ZOOM

  const loadImage = useCallback((file: File) => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      setHasImage(true)
      setHoveredColor(null)
      setCursorPos(null)
      setSavedColors([])
    }
    img.src = URL.createObjectURL(file)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) loadImage(file)
  }

  const getPixelColor = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const px = Math.floor((clientX - rect.left) * scaleX)
    const py = Math.floor((clientY - rect.top) * scaleY)
    const ctx = canvas.getContext('2d')!
    const pixel = ctx.getImageData(px, py, 1, 1).data
    return { r: pixel[0], g: pixel[1], b: pixel[2], px, py }
  }

  const toHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

  const drawLens = (canvas: HTMLCanvasElement, px: number, py: number) => {
    const lens = lensCanvasRef.current
    if (!lens) return
    const lctx = lens.getContext('2d')!
    lens.width = LENS_SIZE
    lens.height = LENS_SIZE

    const ctx = canvas.getContext('2d')!
    const half = Math.floor(ZOOM / 2)

    // Draw zoomed pixels
    for (let dy = 0; dy < ZOOM; dy++) {
      for (let dx = 0; dx < ZOOM; dx++) {
        const sx = px - half + dx
        const sy = py - half + dy
        if (sx >= 0 && sx < canvas.width && sy >= 0 && sy < canvas.height) {
          const pixel = ctx.getImageData(sx, sy, 1, 1).data
          lctx.fillStyle = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`
        } else {
          lctx.fillStyle = '#1a1a2e'
        }
        lctx.fillRect(dx * PIXEL_SIZE, dy * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
      }
    }

    // Draw grid lines
    lctx.strokeStyle = 'rgba(255,255,255,0.15)'
    lctx.lineWidth = 0.5
    for (let i = 0; i <= ZOOM; i++) {
      lctx.beginPath()
      lctx.moveTo(i * PIXEL_SIZE, 0)
      lctx.lineTo(i * PIXEL_SIZE, LENS_SIZE)
      lctx.stroke()
      lctx.beginPath()
      lctx.moveTo(0, i * PIXEL_SIZE)
      lctx.lineTo(LENS_SIZE, i * PIXEL_SIZE)
      lctx.stroke()
    }

    // Highlight center pixel
    const cx = half * PIXEL_SIZE
    const cy = half * PIXEL_SIZE
    lctx.strokeStyle = '#fff'
    lctx.lineWidth = 2
    lctx.strokeRect(cx + 1, cy + 1, PIXEL_SIZE - 2, PIXEL_SIZE - 2)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !hasImage) return

    const { r, g, b, px, py } = getPixelColor(canvas, e.clientX, e.clientY)
    const hex = toHex(r, g, b)
    const rgb = `rgb(${r}, ${g}, ${b})`

    setHoveredColor({ hex, rgb })

    // Position cursor relative to canvas wrapper
    const rect = canvas.getBoundingClientRect()
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })

    drawLens(canvas, px, py)
  }

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !hasImage) return

    const { r, g, b } = getPixelColor(canvas, e.clientX, e.clientY)
    const hex = toHex(r, g, b)
    const rgb = `rgb(${r}, ${g}, ${b})`

    // Don't add duplicates
    if (!savedColors.some((c) => c.hex === hex)) {
      setSavedColors((prev) => [...prev, { hex, rgb }])
    }
  }

  const handleMouseLeave = () => {
    setCursorPos(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1200)
  }

  const removeColor = (hex: string) => {
    setSavedColors((prev) => prev.filter((c) => c.hex !== hex))
  }

  return (
    <div className="cp-page">
      <Link to="/" className="back-link">&larr; Home</Link>

      <h1 className="cp-title">Color Picker</h1>
      <p className="cp-desc">
        Upload an image and hover to inspect pixel colors. Click to save colors to your palette.
      </p>

      {/* Drop zone */}
      <div
        className="cp-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="cp-file-input"
          id="cp-upload"
        />
        <label htmlFor="cp-upload" className="cp-dropzone-label">
          {hasImage ? 'Drop or click to replace image' : 'Drop an image here or click to upload'}
        </label>
      </div>

      {/* Live color readout */}
      {hasImage && hoveredColor && (
        <div className="cp-readout">
          <div className="cp-swatch" style={{ background: hoveredColor.hex }} />
          <span className="cp-hex">{hoveredColor.hex}</span>
          <span className="cp-rgb">{hoveredColor.rgb}</span>
        </div>
      )}

      {/* Canvas with zoom lens */}
      <div
        className="cp-canvas-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ display: hasImage ? 'inline-block' : 'none' }}
      >
        <canvas ref={canvasRef} className="cp-canvas" />

          {/* Zoom lens follows cursor */}
          {cursorPos && (
            <div
              className="cp-lens"
              style={{
                left: cursorPos.x + 20,
                top: cursorPos.y - LENS_SIZE - 20,
              }}
            >
              <canvas ref={lensCanvasRef} width={LENS_SIZE} height={LENS_SIZE} />
              {hoveredColor && (
                <div
                  className="cp-lens-color-bar"
                  style={{ background: hoveredColor.hex }}
                />
              )}
            </div>
          )}
      </div>

      {/* Saved palette */}
      {savedColors.length > 0 && (
        <div className="cp-palette">
          <h2 className="cp-palette-title">Saved Colors</h2>
          <div className="cp-palette-grid">
            {savedColors.map((color) => (
              <div key={color.hex} className="cp-palette-item">
                <div className="cp-palette-swatch" style={{ background: color.hex }} />
                <div className="cp-palette-info">
                  <button
                    className={`cp-palette-value ${copied === color.hex ? 'cp-palette-value--copied' : ''}`}
                    onClick={() => copyToClipboard(color.hex)}
                    title="Copy hex"
                  >
                    {copied === color.hex ? 'Copied!' : color.hex}
                  </button>
                  <button
                    className={`cp-palette-value cp-palette-value--rgb ${copied === color.rgb ? 'cp-palette-value--copied' : ''}`}
                    onClick={() => copyToClipboard(color.rgb)}
                    title="Copy rgb"
                  >
                    {copied === color.rgb ? 'Copied!' : color.rgb}
                  </button>
                </div>
                <button
                  className="cp-palette-remove"
                  onClick={() => removeColor(color.hex)}
                  aria-label="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
