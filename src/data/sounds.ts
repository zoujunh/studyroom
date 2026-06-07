export interface SoundTrack {
  id: string
  name: string
  icon: string
  category: 'nature' | 'ambient' | 'noise'
  frequency?: number
  type?: OscillatorType
}

export const soundTracks: SoundTrack[] = [
  { id: 'rain', name: '雨声', icon: '🌧️', category: 'nature', frequency: 92, type: 'sine' },
  { id: 'ocean', name: '海浪', icon: '🌊', category: 'nature', frequency: 73, type: 'sine' },
  { id: 'forest', name: '森林', icon: '🌲', category: 'nature', frequency: 196, type: 'triangle' },
  { id: 'fireplace', name: '壁炉', icon: '🔥', category: 'ambient', frequency: 110, type: 'sawtooth' },
  { id: 'wind', name: '风声', icon: '💨', category: 'nature', frequency: 64, type: 'sine' },
  { id: 'river', name: '溪流', icon: '🏞️', category: 'nature', frequency: 146, type: 'sine' },
  { id: 'morning-birds', name: '鸟鸣', icon: '🐦', category: 'nature', frequency: 392, type: 'sine' },
  { id: 'wind-in-trees', name: '林中微风', icon: '🌿', category: 'nature', frequency: 128, type: 'triangle' },
  { id: 'rain-window', name: '窗边雨声', icon: '🪟', category: 'nature', frequency: 100, type: 'sine' },
  { id: 'cafe', name: '咖啡馆', icon: '☕', category: 'ambient', frequency: 150, type: 'triangle' },
  { id: 'light-rain', name: '小雨', icon: '🌦️', category: 'nature', frequency: 85, type: 'sine' },
  { id: 'library-ambience', name: '图书馆氛围', icon: '📚', category: 'ambient', frequency: 64, type: 'sine' },
  { id: 'library-pages', name: '翻书声', icon: '📖', category: 'ambient', frequency: 200, type: 'triangle' },
  { id: 'seagulls', name: '海鸥', icon: '🕊️', category: 'nature', frequency: 440, type: 'sine' },
  { id: 'waves', name: '海浪', icon: '🌊', category: 'nature', frequency: 80, type: 'sine' },
  { id: 'white-noise', name: '白噪音', icon: '📡', category: 'noise' },
  { id: 'pink-noise', name: '粉红噪音', icon: '🎛️', category: 'noise' },
  { id: 'brown-noise', name: '棕噪音', icon: '🔊', category: 'noise' },
  { id: 'droplets', name: '溪流', icon: '💧', category: 'nature', frequency: 180, type: 'sine' },
  { id: 'pages', name: '翻书声', icon: '📄', category: 'ambient', frequency: 220, type: 'triangle' },
  { id: 'campfire', name: '壁炉', icon: '🏕️', category: 'ambient', frequency: 120, type: 'sawtooth' },
  { id: 'thunder', name: '雷声', icon: '⚡', category: 'nature', frequency: 50, type: 'sawtooth' },
  { id: 'rain-on-window', name: '窗边雨声', icon: '🪟', category: 'nature', frequency: 95, type: 'sine' },
  { id: 'morning-wind', name: '晨风', icon: '🍃', category: 'nature', frequency: 70, type: 'sine' },
]

export const sceneSoundMap: Record<string, string[]> = {
  morning: ['morning-birds', 'morning-wind', 'light-rain', 'wind-in-trees'],
  'rainy-cafe': ['rain', 'rain-window', 'rain-on-window', 'cafe', 'light-rain'],
  library: ['library-ambience', 'library-pages', 'pages', 'white-noise'],
  ocean: ['ocean', 'waves', 'seagulls', 'wind'],
}
