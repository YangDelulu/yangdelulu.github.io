import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import BgRemover from './pages/BgRemover'
import ImagesToPdf from './pages/ImagesToPdf'
import ColorPicker from './pages/ColorPicker'
import StarForce from './pages/StarForce'
import UnitConverter from './pages/UnitConverter'
import QrGenerator from './pages/QrGenerator'
import TimeZones from './pages/TimeZones'
import ImageEditor from './pages/ImageEditor'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/tools/bg-remover" element={<BgRemover />} />
        <Route path="/tools/images-to-pdf" element={<ImagesToPdf />} />
        <Route path="/tools/color-picker" element={<ColorPicker />} />
        <Route path="/tools/star-force" element={<StarForce />} />
        <Route path="/tools/unit-converter" element={<UnitConverter />} />
        <Route path="/tools/qr-generator" element={<QrGenerator />} />
        <Route path="/tools/world-clock" element={<TimeZones />} />
        <Route path="/tools/image-editor" element={<ImageEditor />} />
      </Routes>
    </HashRouter>
  )
}

export default App
