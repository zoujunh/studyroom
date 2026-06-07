import type { StudyScene } from '../types'

export const scenes: StudyScene[] = [
  {
    id: 'morning',
    name: '清晨窗边',
    shortName: '晨光',
    description: '晨光、植物、安静书桌',
    detail: '鸟鸣与晨风',
    image: '/images/morning/scene-morning.jpg',
    tone: 'morning',
  },
  {
    id: 'rainy-cafe',
    name: '雨天咖啡店',
    shortName: '雨咖啡',
    description: '暖灯、咖啡、低声环境',
    detail: '窗边雨声与咖啡馆环境',
    image: '/images/rainy-cafe/scene-rainy.jpg',
    tone: 'rain',
  },
  {
    id: 'library',
    name: '深夜图书馆',
    shortName: '图书馆',
    description: '书架、台灯、低干扰',
    detail: '图书馆氛围与翻书声',
    image: '/images/library/scene-library.jpg',
    tone: 'library',
  },
  {
    id: 'ocean',
    name: '海边书房',
    shortName: '海边',
    description: '海风、蓝光、开阔视野',
    detail: '海浪声与海鸥',
    image: '/images/ocean/scene-ocean.jpg',
    tone: 'ocean',
  },
]

export const durations = [25, 45, 90]

// 每个场景的可选背景图
export const sceneBackgrounds: Record<string, string[]> = {
  morning: ['/images/morning/scene-morning.jpg'],
  'rainy-cafe': ['/images/rainy-cafe/scene-rainy.jpg'],
  library: ['/images/library/scene-library.jpg'],
  ocean: [
    '/images/ocean/scene-ocean.jpg',
    '/images/ocean/florian-7fw2L_Vj7zg-unsplash.jpg',
    '/images/ocean/omar-IyvAqGd5Hd0-unsplash.jpg',
    '/images/ocean/steve-adams-73HEIvEOL4k-unsplash.jpg',
  ],
}
