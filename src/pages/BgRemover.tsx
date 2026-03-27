import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './BgRemover.css'

type Tab = 'remove' | 'whiten'

export default function BgRemover() {
  const [tab, setTab] = useState<Tab>('remove')

  // Shared image state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [originalData, setOriginalData] = useState<ImageData | null>(null)
  const [tolerance, setTolerance] = useState(0)
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })
  const [hasImage, setHasImage] = useState(false)
  const [fileName, setFileName] = useState('')

  // Whiten tab: exclusion rectangle (normalized 0-1)
  const [excludeRect, setExcludeRect] = useState({ x: 0.3, y: 0.2, w: 0.4, h: 0.6 })
  const [dragging, setDragging] = useState<null | 'move' | 'nw' | 'ne' | 'sw' | 'se'>(null)
  const dragStart = useRef({ mx: 0, my: 0, rect: { x: 0, y: 0, w: 0, h: 0 } })
  const previewRef = useRef<HTMLDivElement>(null)

  const loadImage = useCallback((file: File) => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      canvas.width = img.width
      canvas.height = img.height
      setDimensions({ w: img.width, h: img.height })

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      setOriginalData(ctx.getImageData(0, 0, img.width, img.height))
      setHasImage(true)
      setFileName(file.name.replace(/\.[^.]+$/, ''))
    }
    img.src = URL.createObjectURL(file)
  }, [])

  // Remove tab: make white-ish pixels transparent
  const processRemove = useCallback((tol: number) => {
    if (!originalData || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const copy = new ImageData(
      new Uint8ClampedArray(originalData.data),
      originalData.width,
      originalData.height,
    )
    const d = copy.data
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      if (r >= 255 - tol && g >= 255 - tol && b >= 255 - tol) {
        d[i + 3] = 0
      }
    }
    ctx.clearRect(0, 0, copy.width, copy.height)
    ctx.putImageData(copy, 0, 0)
  }, [originalData])

  // Whiten tab: push light-ish pixels to white, but only outside the exclusion rect
  const processWhiten = useCallback((tol: number, rect: typeof excludeRect) => {
    if (!originalData || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    const copy = new ImageData(
      new Uint8ClampedArray(originalData.data),
      originalData.width,
      originalData.height,
    )
    const d = copy.data
    const imgW = originalData.width
    const imgH = originalData.height

    // Exclusion rect in pixel coords
    const ex = Math.round(rect.x * imgW)
    const ey = Math.round(rect.y * imgH)
    const ew = Math.round(rect.w * imgW)
    const eh = Math.round(rect.h * imgH)

    for (let py = 0; py < imgH; py++) {
      for (let px = 0; px < imgW; px++) {
        // Skip pixels inside exclusion rectangle
        if (px >= ex && px < ex + ew && py >= ey && py < ey + eh) continue

        const i = (py * imgW + px) * 4
        const r = d[i], g = d[i + 1], b = d[i + 2]
        if (r >= 255 - tol && g >= 255 - tol && b >= 255 - tol) {
          d[i] = 255
          d[i + 1] = 255
          d[i + 2] = 255
        }
      }
    }
    ctx.clearRect(0, 0, copy.width, copy.height)
    ctx.putImageData(copy, 0, 0)
  }, [originalData])

  const process = useCallback(() => {
    if (tab === 'remove') {
      processRemove(tolerance)
    } else {
      processWhiten(tolerance, excludeRect)
    }
  }, [tab, tolerance, excludeRect, processRemove, processWhiten])

  // Re-process when image loads or tab/tolerance/rect changes
  const prevOriginal = useRef<ImageData | null>(null)
  const prevTab = useRef<Tab>(tab)
  const prevTol = useRef(tolerance)
  const prevRect = useRef(excludeRect)

  useEffect(() => {
    if (!originalData) return
    const changed =
      originalData !== prevOriginal.current ||
      tab !== prevTab.current ||
      tolerance !== prevTol.current ||
      excludeRect !== prevRect.current
    if (changed) {
      prevOriginal.current = originalData
      prevTab.current = tab
      prevTol.current = tolerance
      prevRect.current = excludeRect
      process()
    }
  }, [originalData, tab, tolerance, excludeRect, process])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) loadImage(file)
  }

  const handleToleranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTolerance(Number(e.target.value))
  }

  // Reset tolerance when switching tabs
  const switchTab = (t: Tab) => {
    setTab(t)
    setTolerance(0)
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    const suffix = tab === 'remove' ? '-nobg' : '-whitened'
    link.download = `${fileName || 'image'}${suffix}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // --- Exclusion rectangle drag logic ---
  const getRelativePos = (e: React.MouseEvent | MouseEvent) => {
    const el = previewRef.current
    if (!el) return { rx: 0, ry: 0 }
    const canvas = canvasRef.current!
    const canvasRect = canvas.getBoundingClientRect()
    return {
      rx: (e.clientX - canvasRect.left) / canvasRect.width,
      ry: (e.clientY - canvasRect.top) / canvasRect.height,
    }
  }

  const HANDLE_SIZE = 0.03 // normalized handle hit area

  const getHitZone = (rx: number, ry: number): typeof dragging => {
    const r = excludeRect
    const nearLeft = Math.abs(rx - r.x) < HANDLE_SIZE
    const nearRight = Math.abs(rx - (r.x + r.w)) < HANDLE_SIZE
    const nearTop = Math.abs(ry - r.y) < HANDLE_SIZE
    const nearBottom = Math.abs(ry - (r.y + r.h)) < HANDLE_SIZE

    if (nearLeft && nearTop) return 'nw'
    if (nearRight && nearTop) return 'ne'
    if (nearLeft && nearBottom) return 'sw'
    if (nearRight && nearBottom) return 'se'
    if (rx > r.x && rx < r.x + r.w && ry > r.y && ry < r.y + r.h) return 'move'
    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tab !== 'whiten' || !hasImage) return
    const { rx, ry } = getRelativePos(e)
    const zone = getHitZone(rx, ry)
    if (!zone) return
    e.preventDefault()
    setDragging(zone)
    dragStart.current = { mx: rx, my: ry, rect: { ...excludeRect } }
  }

  useEffect(() => {
    if (!dragging) return

    const handleMove = (e: MouseEvent) => {
      const { rx, ry } = getRelativePos(e)
      const { mx, my, rect: sr } = dragStart.current
      const dx = rx - mx
      const dy = ry - my

      let newRect = { ...sr }

      if (dragging === 'move') {
        newRect.x = Math.max(0, Math.min(1 - sr.w, sr.x + dx))
        newRect.y = Math.max(0, Math.min(1 - sr.h, sr.y + dy))
      } else {
        if (dragging === 'nw' || dragging === 'sw') {
          const newX = Math.max(0, Math.min(sr.x + sr.w - 0.05, sr.x + dx))
          newRect.w = sr.w - (newX - sr.x)
          newRect.x = newX
        }
        if (dragging === 'ne' || dragging === 'se') {
          newRect.w = Math.max(0.05, Math.min(1 - sr.x, sr.w + dx))
        }
        if (dragging === 'nw' || dragging === 'ne') {
          const newY = Math.max(0, Math.min(sr.y + sr.h - 0.05, sr.y + dy))
          newRect.h = sr.h - (newY - sr.y)
          newRect.y = newY
        }
        if (dragging === 'sw' || dragging === 'se') {
          newRect.h = Math.max(0.05, Math.min(1 - sr.y, sr.h + dy))
        }
      }

      setExcludeRect(newRect)
    }

    const handleUp = () => setDragging(null)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging])

  return (
    <div className="bgr-page">
      <Link to="/" className="back-link">&larr; Home</Link>

      <h1 className="bgr-title">Simple White BG Editor</h1>

      {/* Tabs */}
      <div className="bgr-tabs">
        <button
          className={`bgr-tab ${tab === 'remove' ? 'bgr-tab--active' : ''}`}
          onClick={() => switchTab('remove')}
        >
          Remove White BG
        </button>
        <button
          className={`bgr-tab ${tab === 'whiten' ? 'bgr-tab--active' : ''}`}
          onClick={() => switchTab('whiten')}
        >
          Whiten Background
        </button>
      </div>

      {tab === 'remove' ? (
        <div className="bgr-instructions">
          <p>Upload an image to make white or near-white pixels transparent.</p>
          <ol>
            <li>Upload your image below.</li>
            <li>Use the <strong>Tolerance</strong> slider to control how aggressively near-white colors are removed.</li>
            <li>The checkerboard pattern shows transparent areas.</li>
            <li>Download the result as a PNG.</li>
          </ol>
        </div>
      ) : (
        <div className="bgr-instructions">
          <p>Push light-colored pixels to pure white — useful for cleaning up passport or ID photos.</p>
          <ol>
            <li>Upload your photo below. For best results, <strong>ensure the background is as light as possible</strong> when taking the photo.</li>
            <li>Drag and resize the <strong>exclusion rectangle</strong> over the area you want to protect (e.g. your face, eyes, teeth).</li>
            <li>Use the <strong>Tolerance</strong> slider to whiten more of the background. Only pixels <strong>outside</strong> the rectangle are affected.</li>
            <li>Download the result when satisfied.</li>
          </ol>
          <p className="bgr-tip"><strong>Tip:</strong> Wear dark clothing to avoid it being caught by the whitening filter.</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        className="bgr-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="bgr-file-input"
          id="bgr-upload"
        />
        <label htmlFor="bgr-upload" className="bgr-dropzone-label">
          {hasImage ? 'Drop or click to replace image' : 'Drop an image here or click to upload'}
        </label>
      </div>

      {/* Controls */}
      {hasImage && (
        <div className="bgr-controls">
          <div className="bgr-slider-row">
            <label htmlFor="tolerance">Tolerance</label>
            <input
              id="tolerance"
              type="range"
              min={0}
              max={200}
              value={tolerance}
              onChange={handleToleranceChange}
            />
            <span className="bgr-tol-value">{tolerance}</span>
          </div>
          <p className="bgr-hint">
            {tab === 'remove'
              ? '0 = only perfect white (#fff). Higher values catch near-white pixels too.'
              : '0 = only perfect white. Higher values whiten more light-ish pixels outside the exclusion zone.'}
          </p>
          <button className="bgr-download" onClick={download}>
            Download PNG
          </button>
        </div>
      )}

      {/* Preview */}
      <div
        ref={previewRef}
        className={`bgr-preview ${hasImage ? 'bgr-preview--visible' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ cursor: tab === 'whiten' && hasImage ? (dragging ? 'grabbing' : 'default') : 'default' }}
      >
        <div className="bgr-canvas-wrapper">
          <canvas ref={canvasRef} />
          {/* Exclusion rectangle overlay (whiten tab only) */}
          {tab === 'whiten' && hasImage && (
            <div
              className="bgr-exclude-rect"
              style={{
                left: `${excludeRect.x * 100}%`,
                top: `${excludeRect.y * 100}%`,
                width: `${excludeRect.w * 100}%`,
                height: `${excludeRect.h * 100}%`,
              }}
            >
              <div className="bgr-handle bgr-handle--nw" />
              <div className="bgr-handle bgr-handle--ne" />
              <div className="bgr-handle bgr-handle--sw" />
              <div className="bgr-handle bgr-handle--se" />
              <span className="bgr-exclude-label">exclude</span>
            </div>
          )}
        </div>
        {hasImage && (
          <p className="bgr-dims">{dimensions.w} &times; {dimensions.h}</p>
        )}
      </div>
    </div>
  )
}
