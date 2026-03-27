import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './ImageEditor.css'

interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export default function ImageEditor() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [fileName, setFileName] = useState('')

  // Output size
  const [outW, setOutW] = useState(0)
  const [outH, setOutH] = useState(0)
  const [lockAspect, setLockAspect] = useState(true)

  // Crop state
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 })
  const dragRef = useRef<{
    type: 'move' | 'tl' | 'tr' | 'bl' | 'br'
    startX: number
    startY: number
    startCrop: CropRect
  } | null>(null)
  const [displayScale, setDisplayScale] = useState(1)

  // Format state
  const [format, setFormat] = useState('image/png')
  const [quality, setQuality] = useState(92)

  const fileRef = useRef<HTMLInputElement>(null)
  const previewImgRef = useRef<HTMLImageElement>(null)

  const loadImage = useCallback((file: File) => {
    setFileName(file.name)
    const img = new Image()
    img.onload = () => {
      setImage(img)
      setOutW(img.naturalWidth)
      setOutH(img.naturalHeight)
      setCrop({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = URL.createObjectURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) loadImage(file)
  }, [loadImage])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
  }, [loadImage])

  // Source dimensions from crop
  const aspectRatio = crop.w / (crop.h || 1)

  // When crop changes, update output dims
  useEffect(() => {
    if (crop.w > 0 && crop.h > 0) {
      setOutW(crop.w)
      setOutH(crop.h)
    }
  }, [crop.w, crop.h])

  // Size handlers
  const handleOutW = (val: string) => {
    const w = Math.max(1, parseInt(val) || 1)
    setOutW(w)
    if (lockAspect) setOutH(Math.round(w / aspectRatio))
  }

  const handleOutH = (val: string) => {
    const h = Math.max(1, parseInt(val) || 1)
    setOutH(h)
    if (lockAspect) setOutW(Math.round(h * aspectRatio))
  }

  const handlePercentResize = (pct: number) => {
    const w = Math.round(crop.w * pct / 100)
    const h = Math.round(crop.h * pct / 100)
    setOutW(w)
    setOutH(h)
  }

  // Crop drag handlers
  const handleCropMouseDown = (type: 'move' | 'tl' | 'tr' | 'bl' | 'br', e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current
      if (!drag || !image) return

      const dx = (e.clientX - drag.startX) / displayScale
      const dy = (e.clientY - drag.startY) / displayScale
      const { startCrop } = drag
      const maxW = image.naturalWidth
      const maxH = image.naturalHeight

      let newCrop: CropRect
      if (drag.type === 'move') {
        newCrop = {
          x: Math.max(0, Math.min(maxW - startCrop.w, startCrop.x + dx)),
          y: Math.max(0, Math.min(maxH - startCrop.h, startCrop.y + dy)),
          w: startCrop.w,
          h: startCrop.h,
        }
      } else {
        let { x, y, w, h } = startCrop
        if (drag.type === 'tl' || drag.type === 'bl') {
          const newX = Math.max(0, Math.min(x + w - 10, x + dx))
          w = w - (newX - x)
          x = newX
        }
        if (drag.type === 'tr' || drag.type === 'br') {
          w = Math.max(10, Math.min(maxW - x, w + dx))
        }
        if (drag.type === 'tl' || drag.type === 'tr') {
          const newY = Math.max(0, Math.min(y + h - 10, y + dy))
          h = h - (newY - y)
          y = newY
        }
        if (drag.type === 'bl' || drag.type === 'br') {
          h = Math.max(10, Math.min(maxH - y, h + dy))
        }
        newCrop = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
      }
      setCrop(newCrop)
    }

    const handleMouseUp = () => { dragRef.current = null }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [crop, displayScale, image])

  // Track display scale for crop overlay
  useEffect(() => {
    if (!previewImgRef.current || !image) return
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDisplayScale(entry.contentRect.width / image.naturalWidth)
      }
    })
    obs.observe(previewImgRef.current)
    return () => obs.disconnect()
  }, [image])

  // Download
  const handleDownload = () => {
    if (!image) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = outW
    canvas.height = outH
    ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH)

    const ext = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp'
    const mimeQuality = format === 'image/png' ? undefined : quality / 100

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName.replace(/\.[^.]+$/, '')}-edited.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    }, format, mimeQuality)
  }

  return (
    <div className="ime-page">
      <Link to="/" className="back-link">← Home</Link>
      <h1 className="ime-title">Image Editor</h1>
      <p className="ime-desc">Resize, crop, and convert images. Everything runs in your browser.</p>

      {/* Drop zone */}
      {!image && (
        <div
          className="ime-dropzone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
          <p className="ime-dropzone-text">
            Drop an image here or <span>click to browse</span>
          </p>
        </div>
      )}

      {/* Editor */}
      {image && (
        <>
          <div className="ime-preview-area">
            {/* Preview with crop overlay */}
            <div className="ime-preview">
              <div className="ime-crop-container">
                <img
                  ref={previewImgRef}
                  src={image.src}
                  alt="Preview"
                  draggable={false}
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '400px' }}
                />
                <div className="ime-crop-dim">
                  <div className="ime-crop-dim-top" style={{
                    top: 0, left: 0, right: 0,
                    height: crop.y * displayScale,
                  }} />
                  <div className="ime-crop-dim-bottom" style={{
                    bottom: 0, left: 0, right: 0,
                    height: (image.naturalHeight - crop.y - crop.h) * displayScale,
                  }} />
                  <div className="ime-crop-dim-left" style={{
                    top: crop.y * displayScale, left: 0,
                    width: crop.x * displayScale,
                    height: crop.h * displayScale,
                  }} />
                  <div className="ime-crop-dim-right" style={{
                    top: crop.y * displayScale, right: 0,
                    width: (image.naturalWidth - crop.x - crop.w) * displayScale,
                    height: crop.h * displayScale,
                  }} />
                </div>
                <div
                  className="ime-crop-overlay"
                  style={{
                    left: crop.x * displayScale,
                    top: crop.y * displayScale,
                    width: crop.w * displayScale,
                    height: crop.h * displayScale,
                  }}
                  onMouseDown={(e) => handleCropMouseDown('move', e)}
                >
                  <div className="ime-crop-handle ime-crop-handle--tl" onMouseDown={(e) => handleCropMouseDown('tl', e)} />
                  <div className="ime-crop-handle ime-crop-handle--tr" onMouseDown={(e) => handleCropMouseDown('tr', e)} />
                  <div className="ime-crop-handle ime-crop-handle--bl" onMouseDown={(e) => handleCropMouseDown('bl', e)} />
                  <div className="ime-crop-handle ime-crop-handle--br" onMouseDown={(e) => handleCropMouseDown('br', e)} />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="ime-controls">
              <button
                className="ime-btn ime-btn--secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                onClick={() => setCrop({ x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight })}
              >
                Reset crop
              </button>

              <hr className="ime-divider" />

              {/* Output size */}
              <div className="ime-control-group">
                <label>Output size</label>
                <div className="ime-control-row">
                  <input className="ime-input ime-input--small" type="number" min={1}
                    value={outW} onChange={(e) => handleOutW(e.target.value)}
                  />
                  <span style={{ color: '#71717a' }}>×</span>
                  <input className="ime-input ime-input--small" type="number" min={1}
                    value={outH} onChange={(e) => handleOutH(e.target.value)}
                  />
                </div>
              </div>

              <label className="ime-checkbox">
                <input type="checkbox" checked={lockAspect}
                  onChange={(e) => setLockAspect(e.target.checked)}
                />
                Lock aspect ratio
              </label>

              <div className="ime-control-group">
                <label>Quick resize</label>
                <div className="ime-control-row" style={{ flexWrap: 'wrap' }}>
                  {[25, 50, 75, 100, 150, 200].map((pct) => (
                    <button key={pct}
                      className="ime-btn ime-btn--secondary"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => handlePercentResize(pct)}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <hr className="ime-divider" />

              {/* Format */}
              <div className="ime-control-group">
                <label>Format</label>
                <select className="ime-select" value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>

              {format !== 'image/png' && (
                <div className="ime-control-group">
                  <label>Quality</label>
                  <div className="ime-slider-row">
                    <input type="range" min={10} max={100} value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value))}
                    />
                    <span className="ime-slider-val">{quality}%</span>
                  </div>
                </div>
              )}

              <div className="ime-btn-row">
                <button className="ime-btn ime-btn--primary" onClick={handleDownload}>
                  Download
                </button>
                <button className="ime-btn ime-btn--secondary" onClick={() => {
                  setImage(null)
                  setFileName('')
                  if (fileRef.current) fileRef.current.value = ''
                }}>
                  New image
                </button>
              </div>
            </div>
          </div>

          <p className="ime-original-info">
            {fileName} — {image.naturalWidth} × {image.naturalHeight}
            {` → crop ${Math.round(crop.w)} × ${Math.round(crop.h)}`}
            {` → output ${outW} × ${outH}`}
          </p>
        </>
      )}
    </div>
  )
}
