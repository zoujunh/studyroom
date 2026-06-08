import { X, Check } from 'lucide-react'
import { useState } from 'react'

interface PhotoSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (photo: string) => void
  currentPhoto: string
}

const availablePhotos = [
  // 清晨窗边
  { id: 'morning-1', name: '清晨窗边', file: '/images/morning/scene-morning.jpg' },
  { id: 'morning-2', name: '晨光植物', file: '/images/morning/annie-spratt-quzrYrc4YYc-unsplash.jpg' },
  { id: 'morning-3', name: '清晨书桌', file: '/images/morning/annie-spratt-TAH-tZpuow4-unsplash.jpg' },
  { id: 'morning-4', name: '阳光洒入', file: '/images/morning/jun-ren-uWodkAzIXYM-unsplash.jpg' },
  { id: 'morning-5', name: '温暖氛围', file: '/images/morning/paulina-k-XYf5sOX7p6Y-unsplash.jpg' },
  { id: 'morning-6', name: '晨间静思', file: '/images/morning/petri-r-AoCiNXiiEIU-unsplash.jpg' },
  // 雨天咖啡店
  { id: 'rainy-1', name: '雨天咖啡店', file: '/images/rainy-cafe/scene-rainy.jpg' },
  { id: 'rainy-2', name: '雨中咖啡', file: '/images/rainy-cafe/alex-he-QCOMGD9YqFI-unsplash.jpg' },
  { id: 'rainy-3', name: '温暖灯光', file: '/images/rainy-cafe/allison-christine-SEbQSYozn7c-unsplash.jpg' },
  { id: 'rainy-4', name: '雨滴窗户', file: '/images/rainy-cafe/freya-song-dq7-C_Qcy5A-unsplash.jpg' },
  { id: 'rainy-5', name: '咖啡时光', file: '/images/rainy-cafe/gil-ribeiro-FhR46F3l9KQ-unsplash.jpg' },
  { id: 'rainy-6', name: '安静角落', file: '/images/rainy-cafe/loren-gu-_bT-oNYP5Wk-unsplash.jpg' },
  { id: 'rainy-7', name: '窗边听雨', file: '/images/rainy-cafe/ning-shi-_cqRjq4rp0M-unsplash.jpg' },
  { id: 'rainy-8', name: '雨天阅读', file: '/images/rainy-cafe/rhendi-rukmana-H0lTOg1t_0o-unsplash.jpg' },
  { id: 'rainy-9', name: '暖意融融', file: '/images/rainy-cafe/se-tsuchiya-dHHEwqWrnO0-unsplash.jpg' },
  // 深夜图书馆
  { id: 'library-1', name: '深夜图书馆', file: '/images/library/scene-library.jpg' },
  { id: 'library-2', name: '静谧书架', file: '/images/library/anastasia-meraki-HsHybQQHgWo-unsplash.jpg' },
  { id: 'library-3', name: '台灯下', file: '/images/library/ashutosh-gupta-tcTYO6YyazY-unsplash.jpg' },
  { id: 'library-4', name: '深夜阅读', file: '/images/library/ashutosh-gupta-vYNsRnUhjIk-unsplash.jpg' },
  { id: 'library-5', name: '书香氛围', file: '/images/library/david-yao-Bt9ueiVZ5u0-unsplash.jpg' },
  { id: 'library-6', name: '安静角落', file: '/images/library/rocio-perera-whCTS6_zigo-unsplash.jpg' },
  { id: 'library-7', name: '灯下独坐', file: '/images/library/ziyao-xiong-DwIjFr7twC0-unsplash.jpg' },
  // 海边书房
  { id: 'ocean-1', name: '海边书房', file: '/images/ocean/scene-ocean.jpg' },
  { id: 'ocean-2', name: '海景窗边', file: '/images/ocean/florian-7fw2L_Vj7zg-unsplash.jpg' },
  { id: 'ocean-3', name: '蓝天碧海', file: '/images/ocean/gio-l-45OUvpIMchM-unsplash.jpg' },
  { id: 'ocean-4', name: '海边晨光', file: '/images/ocean/luo-jin-hong-IWvdmqW1wL8-unsplash.jpg' },
  { id: 'ocean-5', name: '海风拂面', file: '/images/ocean/omar-IyvAqGd5Hd0-unsplash.jpg' },
  { id: 'ocean-6', name: '开阔视野', file: '/images/ocean/steve-adams-73HEIvEOL4k-unsplash.jpg' },
  { id: 'ocean-7', name: '海边小屋', file: '/images/ocean/steve-jewett-7NDJ7sWWOLQ-unsplash.jpg' },
  { id: 'ocean-8', name: '海天一色', file: '/images/ocean/ty-crump-wFMGYfTMlgo-unsplash.jpg' },
]

export function PhotoSelector({ isOpen, onClose, onSelect, currentPhoto }: PhotoSelectorProps) {
  const [selected, setSelected] = useState(currentPhoto)

  if (!isOpen) return null

  const handleSelect = (photo: string) => {
    setSelected(photo)
    onSelect(photo)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel photo-scroll relative w-[min(50rem,calc(100%-2rem))] max-h-[70vh] overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">选择主场景照片</h2>
            <p className="mt-1 text-sm text-white/50">选择一张你喜欢的照片作为首页背景</p>
          </div>
          <button
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {availablePhotos.map((photo) => (
            <button
              key={photo.id}
              className={`group relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                selected === photo.file
                  ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                  : 'border-white/10 hover:border-white/30'
              }`}
              onClick={() => handleSelect(photo.file)}
            >
              <img
                src={photo.file}
                alt={photo.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <span className="text-sm font-medium text-white">{photo.name}</span>
              </div>
              {selected === photo.file && (
                <div className="absolute right-2 top-2 rounded-full bg-emerald-400 p-1">
                  <Check className="h-4 w-4 text-black" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="primary-ghost"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
