/**
 * 写作工作台 API —— /api/workspace/*
 * 协议：/root/写作工作台/接口协议.md
 * 多项目支持：《春江雨》（默认，行为不变）、《拾遗》
 * 读写白名单：writing/drafts、writing/拾遗/drafts、writing/review、writing/versions、writing/tasks
 * 安全：写接口需要 Bearer Token（WORKSPACE_TOKEN）；路径白名单防穿越；不暴露文件系统
 * 协作约束：/assistant 只入任务队列；企鹅结果只写 review/（审核区），绝不直接覆盖作者稿
 */
import express from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { exec } from 'child_process'

const router = express.Router()

// ---------- 路径与白名单 ----------
const WRITING_ROOT = '/root/.openclaw/workspace/writing'
const DRAFTS = path.join(WRITING_ROOT, 'drafts')
const REVIEW = path.join(WRITING_ROOT, 'review')
const VERSIONS = path.join(WRITING_ROOT, 'versions')
const TASKS = path.join(WRITING_ROOT, 'tasks')

// ---------- 项目配置 ----------
interface ProjectDef {
  draftsDir: string
  sections: Record<string, { title: string; file: string }>
}

const PROJECTS: Record<string, ProjectDef> = {
  // 《春江雨》：章节映射与 /root/sync_story.py 保持一致（默认项目，接口行为不变）
  '春江雨': {
    draftsDir: DRAFTS,
    sections: {
      '01': { title: '春江潮水', file: '春江雨-第一章-expanded.md' },
      '02': { title: '月照花林', file: '春江雨-第二章.md' },
      '03': { title: '皎皎孤月', file: '春江雨-第三章.md' },
      '04': { title: '青枫浦上', file: '春江雨-第四章.md' },
      '05': { title: '应照离人', file: '春江雨-第五章.md' },
      '06': { title: '愿逐月华', file: '春江雨-第六章.md' },
      '07': { title: '鸿雁长飞', file: '春江雨-第七章.md' },
      '08': { title: '碣石潇湘', file: '春江雨-第八章.md' },
      '09': { title: '江水流春', file: '春江雨-第九章.md' },
      '10': { title: '落月摇情', file: '春江雨-第十章.md' },
    },
  },
  // 《拾遗》：独立草稿目录
  '拾遗': {
    draftsDir: path.join(WRITING_ROOT, '拾遗', 'drafts'),
    sections: {
      '01': { title: '第一章 · 旧物店', file: '拾遗-第一章-旧物店.md' },
    },
  },
}

function projectDef(name: string): ProjectDef | null {
  return PROJECTS[name] || null
}

// 项目名解析：?project= 优先，其次 ?name=，缺省《春江雨》
function resolveProject(q: any): string {
  const name = String((q && (q.project || q.name)) || '').trim()
  return projectDef(name) ? name : '春江雨'
}

// 确保子目录存在
for (const dir of [REVIEW, VERSIONS, TASKS]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ---------- 工具函数 ----------
function hanCount(text: string): number {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

interface ResolvedSection {
  id: string
  title: string
  file: string
  abs: string
}

function resolveSection(project: string, id: string): ResolvedSection | null {
  const def = projectDef(project)
  if (!def) return null
  const s = def.sections[id]
  if (!s) return null
  const abs = path.join(def.draftsDir, s.file)
  if (!abs.startsWith(def.draftsDir + path.sep)) return null // 防穿越
  return { id, title: s.title, file: s.file, abs }
}

function backupSection(sec: ResolvedSection): string {
  const backup = path.join(VERSIONS, `${stamp()}-${sec.id}-${sec.file}`)
  if (fs.existsSync(sec.abs)) fs.copyFileSync(sec.abs, backup)
  return backup
}

function readReviews(): any[] {
  if (!fs.existsSync(REVIEW)) return []
  return fs.readdirSync(REVIEW)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(REVIEW, f), 'utf-8'))
        r.id = r.id || f.replace(/\.json$/, '')
        return r
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

// ---------- 写接口认证 ----------
function workspaceAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = process.env.WORKSPACE_TOKEN
  if (!token) {
    return res.status(500).json({ error: '服务器未配置 WORKSPACE_TOKEN' })
  }
  const auth = req.headers.authorization || ''
  if (auth !== `Bearer ${token}`) {
    return res.status(401).json({ error: '无效的工作台令牌' })
  }
  next()
}

// ---------- 0. Token 校验（供前端“连接”按钮验证 Token） ----------
router.get('/auth-check', workspaceAuth, (req, res) => {
  res.json({ ok: true })
})

// ---------- 1. 项目概览 ----------
router.get('/project', (req, res) => {
  const name = resolveProject(req.query)
  const def = projectDef(name)!
  const sections = Object.entries(def.sections).map(([id, s]) => {
    const abs = path.join(def.draftsDir, s.file)
    let count = 0
    let wordCount = 0
    if (fs.existsSync(abs)) {
      const text = fs.readFileSync(abs, 'utf-8')
      wordCount = hanCount(text)
      count = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
    }
    return { id, title: s.title, file: s.file, count, wordCount }
  })
  const pendingReviews = readReviews().filter((r) => (r.project || '春江雨') === name && r.status === 'pending').length
  res.json({ name, status: 'published', sections, pendingReviews })
})

// ---------- 2. 获取章节 ----------
router.get('/section/:id', (req, res) => {
  const project = resolveProject(req.query)
  const sec = resolveSection(project, req.params.id)
  if (!sec) return res.status(404).json({ error: '章节不存在' })
  if (!fs.existsSync(sec.abs)) return res.status(404).json({ error: '章节文件不存在' })
  const content = fs.readFileSync(sec.abs, 'utf-8')
  const stat = fs.statSync(sec.abs)
  res.json({
    id: req.params.id,
    project,
    title: sec.title,
    content,
    wordCount: hanCount(content),
    updatedAt: stat.mtime.toISOString(),
  })
})

// ---------- 3. 保存草稿 ----------
router.put('/section/:id', workspaceAuth, (req, res) => {
  const project = resolveProject(req.query)
  const sec = resolveSection(project, req.params.id)
  if (!sec) return res.status(404).json({ error: '章节不存在' })
  const content: unknown = (req.body || {}).content
  if (typeof content !== 'string') return res.status(400).json({ error: '缺少 content 字段' })
  backupSection(sec) // 保存前自动备份到 versions/
  fs.writeFileSync(sec.abs, content, 'utf-8')
  res.json({ ok: true, id: req.params.id, project, wordCount: hanCount(content), savedAt: new Date().toISOString() })
})

// ---------- 4. 获取审核建议 ----------
router.get('/reviews', (req, res) => {
  const project = String((req.query as any).project || '').trim()
  const section = (req.query.section as string) || ''
  const status = (req.query.status as string) || ''
  let items = readReviews()
  if (project) items = items.filter((r) => (r.project || '春江雨') === project)
  if (section) items = items.filter((r) => r.section === section)
  if (status) items = items.filter((r) => r.status === status)
  res.json(items)
})

// ---------- 5. 接受 / 拒绝审核建议 ----------
router.post('/reviews/:id/accept', workspaceAuth, (req, res) => {
  const id = req.params.id
  if (!/^[A-Za-z0-9._-]+$/.test(id)) return res.status(400).json({ error: '非法 id' })
  const file = path.join(REVIEW, `${id}.json`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: '审核建议不存在' })
  const review = JSON.parse(fs.readFileSync(file, 'utf-8'))
  if (review.status === 'accepted') return res.status(400).json({ error: '该建议已接受' })
  if (review.status === 'rejected') return res.status(400).json({ error: '该建议已拒绝' })
  const project = review.project || '春江雨'
  const sec = resolveSection(project, review.section)
  if (!sec) return res.status(400).json({ error: '关联章节不存在' })
  if (!fs.existsSync(sec.abs)) return res.status(400).json({ error: '章节文件不存在' })

  const draft = fs.readFileSync(sec.abs, 'utf-8')
  if (typeof review.before === 'string' && typeof review.after === 'string') {
    // 片段替换
    const idx = draft.indexOf(review.before)
    if (idx === -1) {
      return res.status(400).json({ error: '原文在草稿中未找到，可能已被其他修改覆盖' })
    }
    backupSection(sec)
    const next = draft.slice(0, idx) + review.after + draft.slice(idx + review.before.length)
    fs.writeFileSync(sec.abs, next, 'utf-8')
  } else if (typeof review.content === 'string') {
    // 全稿替换
    backupSection(sec)
    fs.writeFileSync(sec.abs, review.content, 'utf-8')
  } else {
    return res.status(400).json({ error: '审核建议缺少 before/after 或 content' })
  }

  review.status = 'accepted'
  review.acceptedAt = new Date().toISOString()
  fs.writeFileSync(file, JSON.stringify(review, null, 2), 'utf-8')
  res.json({ ok: true, id, status: 'accepted' })
})

router.post('/reviews/:id/reject', workspaceAuth, (req, res) => {
  const id = req.params.id
  if (!/^[A-Za-z0-9._-]+$/.test(id)) return res.status(400).json({ error: '非法 id' })
  const file = path.join(REVIEW, `${id}.json`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: '审核建议不存在' })
  const review = JSON.parse(fs.readFileSync(file, 'utf-8'))
  if (review.status !== 'pending') return res.status(400).json({ error: '该建议已处理' })
  review.status = 'rejected'
  review.rejectedAt = new Date().toISOString()
  fs.writeFileSync(file, JSON.stringify(review, null, 2), 'utf-8')
  res.json({ ok: true, id, status: 'rejected' }) // 只改状态，不动正文
})

// ---------- 6. 向 OpenClaw 提交任务 ----------
// kind=draft  → 生成初稿任务；kind=review → 审阅任务（缺省 review，更保守）
// 任务只入队列（tasks/）；企鹅处理结果只写 review/（审核区），绝不直接覆盖作者稿
router.post('/assistant', workspaceAuth, (req, res) => {
  const body: any = req.body || {}
  const project = resolveProject(body)
  const { section, prompt, selection, context, kind, content } = body
  if (!section || !prompt) return res.status(400).json({ error: '缺少 section 或 prompt' })
  if (!resolveSection(project, section)) return res.status(400).json({ error: '章节不存在' })
  const taskKind = kind === 'draft' ? 'draft' : 'review'
  const taskId = `task-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  const task = {
    id: taskId,
    project,
    section,
    kind: taskKind,
    prompt: String(prompt),
    selection: selection ? String(selection) : '',
    context: Array.isArray(context) ? context : [],
    content: typeof content === 'string' ? content : '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  fs.writeFileSync(path.join(TASKS, `${taskId}.json`), JSON.stringify(task, null, 2), 'utf-8')
  res.json({ ok: true, taskId, project, section, kind: taskKind, status: 'pending' })
})

// ---------- 7. 发布（仅作者确认后；当前仅《春江雨》接入小说网站构建链）----------
router.post('/publish', workspaceAuth, (req, res) => {
  const body: any = req.body || {}
  const project = resolveProject(body)
  if (project !== '春江雨') {
    return res.status(403).json({ error: '《拾遗》尚未接入发布，暂不支持' })
  }
  if (body.author !== 'sakura' || body.confirm !== true) {
    return res.status(403).json({ error: '发布需要作者确认：author=sakura 且 confirm=true' })
  }
  const cmd =
    'cd /root && python3 sync_story.py && python3 build_story.py && python3 upgrade_story.py && python3 final_upgrade.py && python3 cover_story.py && cp story-site/read.html story-site/story.html'
  exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: '构建失败', stderr: String(stderr).slice(0, 500) })
    }
    res.json({ ok: true, publishedAt: new Date().toISOString(), status: 'published', log: String(stdout).slice(-300) })
  })
})

export default router
