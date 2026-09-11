# 考研备考工作台

一个**移动端优先**的考研备考管理应用：倒计时、计划、四科进度、真题、错题、模考、资料、复盘、设置，共 9 个模块。
纯前端、无框架、无依赖、无构建：**双击 `index.html` 即可使用**，数据保存在本机浏览器（localStorage）。

- 手机浏览器打开后，用「添加到主屏幕」可以当成 App 使用（已带 manifest 和图标）。
- 首次打开是**完全空白**的：没有任何预填的任务、分数或模考记录。填什么由你决定。
- 想先看看各项功能长什么样，可以在「设置 → 数据管理 → 加载示例数据」一键载入演示数据（会覆盖当前数据）。

## 本地打开（推荐起本地服务）

```powershell
# 方式一：脚本（自动开浏览器，优先用 python，没有则用自带的 node 静态服务器）
powershell -ExecutionPolicy Bypass -File tools\serve-local.ps1   # http://127.0.0.1:8080

# 方式二：手动
cd C:\Users\sakura\Desktop\kaoyan-workbench
python -m http.server 8080            # 然后访问 http://127.0.0.1:8080
```

为什么建议用 `http://127.0.0.1` 而不是直接双击：`file://` 打开时，若页面被嵌在别的预览面板里，浏览器会禁用 localStorage，数据只留在内存中。用本地服务则一切正常。直接双击也能用，只是这种嵌套预览的场景存不了数据（页面会明确提示）。

## 部署到自己的服务器

站点 `zjhydyxf.xyz`（自习室）上挂载的完整方案见 [`docs/deploy.md`](docs/deploy.md)：
放进 studyroom 仓库的 `public/kaoyan/` → `git push` → 服务器 `git pull && npm run build && pm2 restart studyroom` → 访问 `/kaoyan/`。
给执行方（OpenClaw 等）的极简指令见 [`docs/部署给-OpenClaw.md`](docs/部署给-OpenClaw.md)。同步脚本：`tools/sync-to-studyroom.ps1`。

## 一切都可以自己改

| 别人写死的 | 这里 |
| --- | --- |
| 四科固定叫英语/政治/数学/专业课 | 「科目」页可改**科目名、全称、满分、单科目标分、当前分数、复习进度、薄弱点、状态备注**；想叫「专业课二」也行 |
| 目标分数固定 | 目标总分、目标院校、目标专业、考试日期、每日学习时长、给自己的一句话，全部自填 |
| 单科目标按满分 85% | 「设置 → 单科目标默认比例」可改，也可逐个科目单独设目标分 |
| 任务只能勾选 | 每条任务可设**截止日期（逾期标红）、优先级（高/中/低）、完成状态、预计用时**，可编辑可删除 |
| 学习时长只能看 | 可**增、删、改**，一天记多笔，带科目与备注；「管理时长记录」里统一维护 |
| 错因、资料类型固定 | 「设置 → 自定义选项」可改成自己的分类，优先级文案也能改 |
| 复盘内容靠猜 | 每天的复盘笔记自己写，首页/计划页/复盘页共用同一条 |
| 只能恢复示例数据 | 导出 JSON 备份、导入恢复、清空所有数据、加载示例数据 |

## 九个模块

| 模块 | 内容 |
| --- | --- |
| 首页 | 倒计时（未设日期时如实显示「未设置」，不造假）、目标院校/分数与差距、今日任务、学习时长（近 7 天）、本周完成率、四科进度总览、最近模考、总分趋势、今日复盘、全部模块快捷入口 |
| 计划 | 周视图（每天完成数）、点选任意日期看/加任务、今日时长明细（可编辑）、每日学习目标、本周各科安排、今日复盘 |
| 科目 | 四科分数/目标/进度/薄弱点、折算对比表、最近 5 次模考分科对比 |
| 真题 | 真题/模拟/习题/讲义登记，按科目与状态筛选，一键「未开始 → 进行中 → 已完成」 |
| 错题 | 遗忘曲线排复习（1/3/7/15/30/60 天），「复习 +1」拉长间隔，掌握度 5/5 自动毕业；各科薄弱点分布 |
| 模考 | 填各科分数自动算总分/距目标/进步幅度，总分趋势 + 分科复盘建议 |
| 资料 | 网课/文档/笔记/链接/书籍，来源、链接、学习进度百分比 |
| 复盘 | 近 7 天时长、本周完成率、总分趋势、各科表现、按你的数据生成下一步建议 |
| 设置 | 考试与目标、四科分类、自定义选项、数据管理（导出/导入/加载示例/清空） |

## 数据保存与"存储不可用"说明

数据默认保存在浏览器的 localStorage。三种情况会自动降级，并且**如实告知**，不会假装保存成功：

| 情况 | 表现 |
| --- | --- |
| 正常（自己双击打开 index.html） | 状态"正常 · 写入本机浏览器"，关掉浏览器数据还在 |
| 能读不能写 / 无痕模式的降级 | 退到 `sessionStorage`，提示"数据只在本次会话中保存" |
| 完全不允许存储 | 退到内存，页面顶部显示红色提示 + 导出兜底；功能照常可用，刷新会丢 |

**最常见的触发场景：把 `index.html` 嵌在别的页面里预览**（例如在编辑器 / 工作台的预览面板里打开）。被嵌入的 `file://` 页面属于「不透明来源」，浏览器会直接禁用 localStorage 并抛 SecurityError。
解决办法：**在新标签页单独打开这个文件**——直接双击 `kaoyan-workbench/index.html`，或用 PowerShell 执行：

```powershell
Start-Process "C:\Users\sakura\Desktop\kaoyan-workbench\index.html"
```

屏幕上出现提示条时，点条上的「在新标签页打开」或「导出备份」即可。设置页 → 数据管理里也能随时看到当前存储状态。

## 视觉：苹果风格的毛玻璃

- 背景是柔和的渐变 + 四团缓慢漂移的环境光斑（`body::before`），毛玻璃才有东西可"糊"。
- 卡片、底部导航、弹窗、按钮统一使用 `backdrop-filter: saturate(180%) blur(20px)` 的半透明玻璃层，配 1px 高光描边（`inset 0 1px 0`），就是 iOS 那种"浮在背景上"的观感。
- 圆角与动效照 iOS 来：卡片 22–24px、胶囊导航 24px、圆点勾选框；统一缓动曲线 `cubic-bezier(.32,.72,0,1)`，按钮按下 `scale(.96)`、卡片按压微缩。
- 主色用 iOS 系统蓝 `#0a84ff`，语义色用系统红/绿/橙（深色模式自动换成 iOS 深色变体）；倒计时和总分用蓝色渐变文字。
- 细节：底部导航是**悬浮胶囊**并自动让当前页滚入视野；页面切换有轻微上浮淡入；折线图有描线动画、数据点逐个弹出。
- 性能与兼容：密集的小卡片（指标卡/科目卡/日期格）用高不透明度玻璃但不做实时模糊，避免手机上滚动掉帧；不支持 `backdrop-filter` 的浏览器自动回退成不透明底色；尊重系统「减弱动态效果」。

## 移动端优先的细节

- 默认按**手机布局**渲染：底部导航栏（可横向滑动，当前页高亮并自动滚入视野，带待办数量角标）、单列卡片、大触控区域（按钮最小 40px、底部导航 52px）。
- **≥760px 才增强为桌面布局**：标签栏移到顶部、卡片变 2/3/4 列、弹窗从底部抽屉变为居中卡片。
- 输入框字号 16px（iOS 聚焦不缩放）、`viewport-fit=cover` + `env(safe-area-inset-bottom)`（适配全面屏与手势条）、隐藏点击高亮、`overscroll-behavior` 防橡皮筋。
- 弹窗是**底部抽屉**：标题与按钮固定、内容区独立滚动，长表单在小屏上也不会顶掉按钮。
- 表单默认单列、最常用的「取消 / 保存」占满整行；键盘 `N` 新建任务、`1-9` 切模块、`Esc` 关弹窗。
- 深色模式（右上角按钮切换），晚上看更舒服。

## 目录结构

```
kaoyan-workbench/
├── index.html                 入口（无内联脚本，带 PWA meta）
├── manifest.webmanifest       PWA 清单（可加到手机主屏幕）
├── assets/css/style.css       设计令牌 + 移动优先样式 + 苹果风毛玻璃（含深色模式）
├── assets/icon/               应用图标（svg + 192/512/apple-touch/maskable）
├── assets/js/util.js          日期/格式化/DOM 构建/弹窗/表单引擎
├── assets/js/store.js         数据模型、空白与示例数据、持久化（含存储降级）、领域查询
├── assets/js/charts.js        纯 SVG 图表（折线、环形、半环、柱状）
├── assets/js/ui.js            共享视图组件（任务行、时长行、表格、标签、卡片、存储提示）
├── assets/js/pages.js         九个页面的渲染
├── assets/js/app.js           路由、事件委托、全部增删改、表单
├── tools/serve-local.ps1      一键起本地服务并打开浏览器
├── tools/static-server.mjs    零依赖静态服务器（没有 python 时的退路）
├── tools/sync-to-studyroom.ps1 同步进 studyroom 仓库（部署用）
├── docs/deploy.md             部署到 zjhydyxf.xyz 的完整方案
├── docs/部署给-OpenClaw.md     给执行方的极简指令
└── test/smoke.mjs             无浏览器冒烟测试
```

## 自测

```bash
node test/smoke.mjs
```

180 项检查，覆盖：

- **空白状态**：首次打开没有任何预填记录；未设考试日期时不产生假倒计时；未设目标时不产生假达成率。
- **记录操作**：任务增删、勾选、逾期识别、时长统计、复盘笔记读写、模考总分、错题复习排期。
- **全部可自定义**：改科目名/满分/单科目标/当前分数/错因选项后，各处统计随之变化。
- **持久化与降级**：导出再导入后自定义内容保留；异常数据（分数超满分、未知科目、非法日期）被自动修正；`null`/空对象安全回退；localStorage 被禁用时自动退到 sessionStorage / 内存且不报错。
- **九个页面渲染**：示例数据与空白数据两种场景下均无 `undefined` / `NaN` / `[object Object]`，`<div>` 配平。
- **静态文件**：引用完整、PWA 清单与图标存在且为相对路径（保证 `/kaoyan/` 子目录部署可用）、移动端 meta、安全区、≥760px 断点。

## 数据模型（localStorage: `kaoyan.workbench.v1`）

```
settings   { examDate, school, major, targetScore, dailyGoalMinutes, subjectRatio, motto, errTypes[] }
subjects   [ { id, color, name, full, sub, max, target, score, progress, weak[], note } ]
tasks      [ { id, title, subject, date, priority, status, est, createdAt } ]
sessions   [ { id, date, minutes, subject, note } ]      // minutes=0 且带 note 时只作为复盘笔记
mocks      [ { id, date, name, scores:{en,po,ma,pr}, note } ]
papers     [ { id, name, subject, year, type, progress, note } ]
mistakes   [ { id, subject, topic, type, note, mastery, reviewCount, lastReview, createdAt } ]
resources  [ { id, title, subject, type, source, progress, url, note } ]
```

导出的 JSON 可以直接导入，也可以手改后导入。

## 还可以继续加

- 云同步 / 多设备（当前是本机存储，换设备请先导出）
- 真题逐题得分记录
- 番茄钟与专注时段统计
- 背诵计划批量导入（艾宾浩斯表格）
- 目标院校分数线对比
