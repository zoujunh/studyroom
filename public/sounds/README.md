# 音频资源说明

## 目录结构

```
public/
├── images/                    ← 场景图片（已有）
│   ├── scene-morning.jpg
│   ├── scene-rainy.jpg
│   ├── scene-library.jpg
│   └── scene-ocean.jpg
└── sounds/
    └── scenes/                ← 需要放入音频文件
        ├── bird-sounds_01.m4a      ✅ 已有
        ├── wind and birds.wav      ✅ 已有
        ├── rain-window.mp3         ← 待添加
        ├── cafe.mp3                ← 待添加
        ├── library-ambience.mp3    ← 待添加
        ├── library-pages.mp3       ← 待添加
        ├── waves.mp3               ← 待添加
        └── seagulls.mp3            ← 待添加
```

## 音频文件说明

### 清晨窗边 (morning) ✅ 已有音频
- `bird-sounds_01.m4a` - 鸟叫声
- `wind and birds.wav` - 风声和鸟叫

### 雨天咖啡店 (rainy-cafe) ← 待添加
- `rain-window.mp3` - 窗边雨声
- `cafe.mp3` - 咖啡馆环境音

### 深夜图书馆 (library) ← 待添加
- `library-ambience.mp3` - 图书馆氛围音
- `library-pages.mp3` - 翻书声

### 海边书房 (ocean) ← 待添加
- `waves.mp3` - 海浪声
- `seagulls.mp3` - 海鸥叫声

## 音频来源推荐

1. **Freesound** - https://freesound.org
   - 免费，需要注册
   - 搜索关键词：rain, ocean, library, birds

2. **Pixabay Music** - https://pixabay.com/music
   - 免费，无需注册
   - 搜索关键词：ambient, nature, relaxation

3. **Zapsplat** - https://www.zapsplat.com
   - 免费，需要注册
   - 搜索关键词：rain, waves, library ambience

## 使用方法

1. 下载对应的音频文件（.mp3格式）
2. 放入 `public/sounds/scenes/` 目录
3. 确保文件名与上述说明一致
4. 重启开发服务器或刷新页面

## 注意事项

- 音频文件建议使用 .mp3 格式
- 文件大小建议控制在 5MB 以内
- 音频时长建议 30秒以上，确保循环播放自然
- 如果某个音频文件缺失，对应的场景将没有声音
