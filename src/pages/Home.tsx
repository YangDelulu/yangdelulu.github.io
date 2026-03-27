import { Link } from 'react-router-dom'
import './Home.css'

interface TileData {
  title: string
  subtitle: string
  to: string
  image?: string
  imageContain?: boolean
  size?: 'large' | 'wide' | 'tall' | 'normal'
}

const tiles: TileData[] = [
  {
    title: 'About Me',
    subtitle: 'Resume & background',
    to: '/about',
    size: 'large',
  },
  {
    title: 'Star Force Simulator',
    subtitle: 'Simulate star force enhancement',
    to: '/tools/star-force',
    image: '/images/destroyed.png',
    size: 'wide',
  },
  {
    title: 'Simple White BG Editor',
    subtitle: 'Remove or whiten image backgrounds',
    to: '/tools/bg-remover',
    image: '/images/bg-editor.svg',
  },
  {
    title: 'Images to PDF',
    subtitle: 'Combine images into a single PDF',
    to: '/tools/images-to-pdf',
  },
  {
    title: 'Color Picker',
    subtitle: 'Grab colors from any image',
    to: '/tools/color-picker',
    image: '/images/color-picker.svg',
  },
  {
    title: 'Unit Converter',
    subtitle: 'Every unit known to man',
    to: '/tools/unit-converter',
  },
  {
    title: 'QR Code Generator',
    subtitle: 'Generate QR codes instantly',
    to: '/tools/qr-generator',
    image: '/images/qr-generator.svg',
    imageContain: true,
    size: 'tall',
  },
  {
    title: 'World Clock',
    subtitle: 'Interactive timezone map',
    to: '/tools/world-clock',
    size: 'wide',
  },
  {
    title: 'Image Editor',
    subtitle: 'Resize, crop & convert images',
    to: '/tools/image-editor',
  },
]

export default function Home() {
  // Place the large "About Me" tile in the center,
  // surround it with other tiles
  const center = tiles.find((t) => t.size === 'large')!
  const others = tiles.filter((t) => t !== center)

  // Split others into before/after center for the spiral effect
  const half = Math.ceil(others.length / 2)
  const before = others.slice(0, half)
  const after = others.slice(half)
  const ordered = [...before, center, ...after]

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-name">Welcome to my site</h1>
        <p className="home-sub">I post random widgets and tools I build for myself.</p>
        <p className="home-sub">Feel free to share, or <a href="mailto:YangLu.dev@gmail.com">shoot me an email</a> for bugs/requests.</p>
      </header>

      <div className="tiles-mosaic">
        {ordered.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            className={`tile tile--${tile.size || 'normal'}`}
          >
            <div
              className={`tile-image ${tile.imageContain ? 'tile-image--contain' : ''}`}
              style={tile.image ? { backgroundImage: `url(${tile.image})` } : undefined}
            >
              {!tile.image && <div className="tile-image-empty" />}
            </div>
            <div className="tile-info">
              <h2 className="tile-title">{tile.title}</h2>
              <p className="tile-subtitle">{tile.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
