import { X, Check } from 'lucide-react'
import { useState } from 'react'

interface PhotoSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (photo: string) => void
  currentPhoto: string
}

const availablePhotos = [
  { id: 'scene-morning', name: '清晨窗边', file: '/images/morning/scene-morning.jpg' },
  { id: 'scene-rainy', name: '雨天咖啡店', file: '/images/rainy-cafe/scene-rainy.jpg' },
  { id: 'scene-library', name: '深夜图书馆', file: '/images/library/scene-library.jpg' },
  { id: 'scene-ocean', name: '海边书房', file: '/images/ocean/scene-ocean.jpg' },
  { id: 'florian-7fw2L_Vj7zg-unsplash', name: '海景1', file: '/images/ocean/florian-7fw2L_Vj7zg-unsplash.jpg' },
  { id: 'omar-IyvAqGd5Hd0-unsplash', name: '海景2', file: '/images/ocean/omar-IyvAqGd5Hd0-unsplash.jpg' },
  { id: 'steve-adams-73HEIvEOL4k-unsplash', name: '海景3', file: '/images/ocean/steve-adams-73HEIvEOL4k-unsplash.jpg' },
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
      <div className="glass-panel relative w-[min(50rem,calc(100%-2rem))] max-h-[80vh] overflow-y-auto p-6">
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
