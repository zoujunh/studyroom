import type { StudyScene } from '../types'

export const scenes: StudyScene[] = [
  {
    id: 'morning',
    name: '清晨窗边',
    shortName: '晨光',
    description: '晨光、植物、安静书桌',
    detail: '鸟鸣与晨风',
    image: '/images/morning/scene-morning.webp',
    tone: 'morning',
  },
  {
    id: 'rainy-cafe',
    name: '雨天咖啡店',
    shortName: '雨咖啡',
    description: '暖灯、咖啡、低声环境',
    detail: '窗边雨声与咖啡馆环境',
    image: '/images/rainy-cafe/scene-rainy.webp',
    tone: 'rain',
  },
  {
    id: 'library',
    name: '深夜图书馆',
    shortName: '图书馆',
    description: '书架、台灯、低干扰',
    detail: '图书馆氛围与翻书声',
    image: '/images/library/scene-library.webp',
    tone: 'library',
  },
  {
    id: 'ocean',
    name: '海边书房',
    shortName: '海边',
    description: '海风、蓝光、开阔视野',
    detail: '海浪声与海鸥',
    image: '/images/ocean/scene-ocean.webp',
    tone: 'ocean',
  },
]

export const durations = [25, 45, 90]

// 每个场景的可选背景图
export const sceneBackgrounds: Record<string, string[]> = {
  morning: [
    '/images/morning/scene-morning.webp',
    '/images/morning/annie-spratt-quzrYrc4YYc-unsplash.webp',
    '/images/morning/annie-spratt-TAH-tZpuow4-unsplash.webp',
    '/images/morning/jun-ren-uWodkAzIXYM-unsplash.webp',
    '/images/morning/paulina-k-XYf5sOX7p6Y-unsplash.webp',
    '/images/morning/petri-r-AoCiNXiiEIU-unsplash.webp',
  ],
  'rainy-cafe': [
    '/images/rainy-cafe/scene-rainy.webp',
    '/images/rainy-cafe/alex-he-QCOMGD9YqFI-unsplash.webp',
    '/images/rainy-cafe/allison-christine-SEbQSYozn7c-unsplash.webp',
    '/images/rainy-cafe/freya-song-dq7-C_Qcy5A-unsplash.webp',
    '/images/rainy-cafe/gil-ribeiro-FhR46F3l9KQ-unsplash.webp',
    '/images/rainy-cafe/loren-gu-_bT-oNYP5Wk-unsplash.webp',
    '/images/rainy-cafe/ning-shi-_cqRjq4rp0M-unsplash.webp',
    '/images/rainy-cafe/rhendi-rukmana-H0lTOg1t_0o-unsplash.webp',
    '/images/rainy-cafe/se-tsuchiya-dHHEwqWrnO0-unsplash.webp',
  ],
  library: [
    '/images/library/scene-library.webp',
    '/images/library/anastasia-meraki-HsHybQQHgWo-unsplash.webp',
    '/images/library/ashutosh-gupta-tcTYO6YyazY-unsplash.webp',
    '/images/library/ashutosh-gupta-vYNsRnUhjIk-unsplash.webp',
    '/images/library/david-yao-Bt9ueiVZ5u0-unsplash.webp',
    '/images/library/rocio-perera-whCTS6_zigo-unsplash.webp',
    '/images/library/ziyao-xiong-DwIjFr7twC0-unsplash.webp',
  ],
  ocean: [
    '/images/ocean/scene-ocean.webp',
    '/images/ocean/florian-7fw2L_Vj7zg-unsplash.webp',
    '/images/ocean/gio-l-45OUvpIMchM-unsplash.webp',
    '/images/ocean/luo-jin-hong-IWvdmqW1wL8-unsplash.webp',
    '/images/ocean/omar-IyvAqGd5Hd0-unsplash.webp',
    '/images/ocean/steve-adams-73HEIvEOL4k-unsplash.webp',
    '/images/ocean/steve-jewett-7NDJ7sWWOLQ-unsplash.webp',
    '/images/ocean/ty-crump-wFMGYfTMlgo-unsplash.webp',
  ],
}
