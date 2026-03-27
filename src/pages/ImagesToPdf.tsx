import { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import './ImagesToPdf.css'

interface ImageEntry {
  id: string
  file: File
  url: string
  rotation: number
}

let nextId = 0

export default function ImagesToPdf() {
  const [images, setImages] = useState<ImageEntry[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'fit'>('a4')
  const [generating, setGenerating] = useState(false)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: ImageEntry[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      newEntries.push({
        id: `img-${nextId++}`,
        file,
        url: URL.createObjectURL(file),
        rotation: 0,
      })
    }
    setImages((prev) => [...prev, ...newEntries])
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const entry = prev.find((e) => e.id === id)
      if (entry) URL.revokeObjectURL(entry.url)
      return prev.filter((e) => e.id !== id)
    })
  }

  const rotateImage = (id: string) => {
    setImages((prev) =>
      prev.map((e) => (e.id === id ? { ...e, rotation: (e.rotation + 90) % 360 } : e))
    )
  }

  const handleDragStart = (idx: number) => {
    dragItem.current = idx
  }

  const handleDragEnter = (idx: number) => {
    dragOver.current = idx
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return
    const from = dragItem.current
    const to = dragOver.current
    if (from === to) return
    setImages((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      return copy
    })
    dragItem.current = null
    dragOver.current = null
  }

  const loadImg = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })

  // Flatten transparency onto white and apply rotation
  const flattenImg = (img: HTMLImageElement, rotation: number): HTMLCanvasElement => {
    const swapped = rotation === 90 || rotation === 270
    const w = swapped ? img.height : img.width
    const h = swapped ? img.width : img.height
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.translate(w / 2, h / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    return canvas
  }

  const generate = async () => {
    if (images.length === 0) return
    setGenerating(true)

    try {
      if (pageSize === 'fit') {
        const firstImg = await loadImg(images[0].url)
        const firstCanvas = flattenImg(firstImg, images[0].rotation)
        const pdf = new jsPDF({
          unit: 'px',
          format: [firstCanvas.width, firstCanvas.height],
          hotfixes: ['px_scaling'],
        })
        pdf.addImage(firstCanvas, 'JPEG', 0, 0, firstCanvas.width, firstCanvas.height)

        for (let i = 1; i < images.length; i++) {
          const img = await loadImg(images[i].url)
          const canvas = flattenImg(img, images[i].rotation)
          pdf.addPage([canvas.width, canvas.height])
          pdf.addImage(canvas, 'JPEG', 0, 0, canvas.width, canvas.height)
        }
        pdf.save('images.pdf')
      } else {
        const pdf = new jsPDF({ unit: 'mm', format: pageSize })

        for (let i = 0; i < images.length; i++) {
          if (i > 0) pdf.addPage()
          const img = await loadImg(images[i].url)
          const canvas = flattenImg(img, images[i].rotation)

          const pageW = pdf.internal.pageSize.getWidth()
          const pageH = pdf.internal.pageSize.getHeight()
          const margin = 10
          const maxW = pageW - margin * 2
          const maxH = pageH - margin * 2

          const ratio = Math.min(maxW / canvas.width, maxH / canvas.height)
          const w = canvas.width * ratio
          const h = canvas.height * ratio
          const x = (pageW - w) / 2
          const y = (pageH - h) / 2

          pdf.addImage(canvas, 'JPEG', x, y, w, h)
        }
        pdf.save('images.pdf')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="i2p-page">
      <Link to="/" className="back-link">&larr; Home</Link>

      <h1 className="i2p-title">Images to PDF</h1>
      <p className="i2p-desc">
        Combine multiple images into a single PDF. Drag to reorder.
      </p>

      {/* Drop zone */}
      <div
        className="i2p-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFile}
          className="i2p-file-input"
          id="i2p-upload"
        />
        <label htmlFor="i2p-upload" className="i2p-dropzone-label">
          Drop images here or click to upload
        </label>
      </div>

      {/* Image list */}
      {images.length > 0 && (
        <>
          <div className="i2p-list">
            {images.map((entry, idx) => (
              <div
                key={entry.id}
                className="i2p-item"
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
              >
                <span className="i2p-item-handle">&#x2630;</span>
                <img
                  src={entry.url}
                  alt=""
                  className="i2p-item-thumb"
                  style={{ transform: `rotate(${entry.rotation}deg)` }}
                />
                <span className="i2p-item-name">{entry.file.name}</span>
                <button
                  className="i2p-item-rotate"
                  onClick={() => rotateImage(entry.id)}
                  aria-label="Rotate"
                  title="Rotate 90°"
                >
                  &#x21bb;
                </button>
                <button
                  className="i2p-item-remove"
                  onClick={() => removeImage(entry.id)}
                  aria-label="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="i2p-controls">
            <div className="i2p-option">
              <label htmlFor="pageSize">Page size</label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter' | 'fit')}
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="fit">Fit to image</option>
              </select>
            </div>
            <button
              className="i2p-generate"
              onClick={generate}
              disabled={generating}
            >
              {generating ? 'Generating...' : `Create PDF (${images.length} image${images.length !== 1 ? 's' : ''})`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
