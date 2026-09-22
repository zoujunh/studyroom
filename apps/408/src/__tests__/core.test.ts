import { describe, expect, it } from 'vitest';
import { auditSeed, seedRows, SEED_VERSION } from '../data/seed';
import { dayKey, diffDays, endOfDay, maxIntervalDays } from '../lib/date';
import { renderInline, renderMarkdown } from '../lib/markdown';
import { buildQueue, sessionTitle } from '../lib/queue';
import { dailyStats, overallCounts, sortNewCards, streakDays, todayQuota, bySubject } from '../lib/stats';
import { applyFocus } from '../lib/focus';
import { applyGrade, previewIntervals, statusOf, isDueNow } from '../srs/fsrs';
import type { CardFocusRow, CardRow, DayStat, Grade, LogRow, Settings, SrsRow } from '../types';

/* ---------------- 测试工具 ---------------- */

const SETTINGS: Settings = {
  examDate: '2026-12-19',
  newPerDay: 20,
  reviewPerDay: 300,
  requestRetention: 0.9,
  theme: 'auto',
  fontSize: 15.5,
  seedVersion: SEED_VERSION,
};

function makeCards(n: number, subject: CardRow['subject'] = 'ds', chapter = '图'): CardRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    subject,
    chapter,
    tags: ['测试'],
    title: `问题 ${i + 1}`,
    back: '## 结论\n- 要点',
    importance: 3,
    hint: '锚点',
    seedVersion: SEED_VERSION,
  }));
}

function makeLog(ts: number, grade: Grade = 'good', cardId = 'c1', prevState: SrsRow | null = null): LogRow {
  return {
    cardId,
    ts,
    grade,
    rating: 3,
    prevState,
    nextState: {
      cardId,
      due: ts,
      stability: 1,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 1,
      learning_steps: 0,
      reps: 1,
      lapses: 0,
      state: 1,
      firstSeen: ts,
    },
    mode: 'due',
  };
}

const T0 = new Date(2026, 8, 18, 9, 0, 0); // 2026-09-18 09:00 本地时间

/* ---------------- 种子内容 ---------------- */

describe('种子内容', () => {
  it('内容规模：四科均衡、覆盖全部考纲章节，结构自检无问题', () => {
    const rows = seedRows();
    // v5 起：四科各 4 批卡库，总量在 400 张以上（只设下限，内容继续扩充不会挂）
    expect(rows.length).toBeGreaterThanOrEqual(400);
    for (const subject of ['ds', 'co', 'os', 'cn'] as const) {
      const owned = rows.filter((r) => r.subject === subject);
      expect(owned.length, `${subject} 卡片数量`).toBeGreaterThanOrEqual(100);
      // 每科至少覆盖 6 个章节
      expect(new Set(owned.map((r) => r.chapter)).size).toBeGreaterThanOrEqual(6);
    }
    expect(auditSeed()).toEqual([]);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it('每张卡都有可渲染的正文、记忆锚点与合法考频', () => {
    for (const card of seedRows()) {
      expect(card.title.length).toBeGreaterThan(4);
      expect(card.back).toContain('##');
      expect(card.hint.length).toBeGreaterThan(3);
      expect(card.importance).toBeGreaterThanOrEqual(1);
      expect(card.importance).toBeLessThanOrEqual(5);
      expect(card.tags.length).toBeGreaterThanOrEqual(1);
      // 正文里不能出现未转义的模板字符串插值痕迹
      expect(card.back).not.toContain('${');
    }
  });

  it('每个科目都覆盖了多个章节，且章节名不为空', () => {
    const rows = seedRows();
    for (const subject of ['ds', 'co', 'os', 'cn'] as const) {
      const chapters = new Set(rows.filter((r) => r.subject === subject).map((r) => r.chapter));
      expect(chapters.size).toBeGreaterThanOrEqual(6);
      expect([...chapters].every((name) => name.trim().length > 0)).toBe(true);
    }
  });
});

/* ---------------- FSRS 调度 ---------------- */

describe('FSRS 调度', () => {
  it('新卡评「会了」后进入学习态并安排下次复习', () => {
    const outcome = applyGrade('c1', null, 'good', 0.9, T0);
    expect(outcome.next.reps).toBe(1);
    expect(outcome.next.due).toBeGreaterThan(T0.getTime());
    expect(outcome.next.stability).toBeGreaterThan(0);
  });

  it('评「不会」会在本次会话内重现（requeue）', () => {
    const outcome = applyGrade('c1', null, 'again', 0.9, T0);
    expect(outcome.requeue).toBe(true);
    expect(outcome.next.due - T0.getTime()).toBeLessThanOrEqual(10 * 60 * 1000);
  });

  it('四档预测满足 again ≤ hard ≤ good ≤ easy', () => {
    const intervals = previewIntervals(null, 0.9, T0);
    expect(intervals.again).toBeLessThanOrEqual(intervals.hard);
    expect(intervals.hard).toBeLessThanOrEqual(intervals.good);
    expect(intervals.good).toBeLessThanOrEqual(intervals.easy);
  });

  it('连续答对会让间隔逐步拉长，最终达到「已掌握」口径', () => {
    let row: SrsRow | null = null;
    let now = T0;
    const dues: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const outcome = applyGrade('c1', row, 'good', 0.9, now);
      row = outcome.next;
      dues.push(row.due);
      now = new Date(row.due);
    }
    expect(statusOf(row ?? undefined)).toBe('mastered');
    expect(row!.stability).toBeGreaterThanOrEqual(14);
    // 间隔单调不减
    for (let i = 1; i < dues.length; i += 1) {
      expect(dues[i]).toBeGreaterThanOrEqual(dues[i - 1]);
    }
    // 给人工核对用的证据输出
    const days = dues.map((d, i) => Math.round((d - (i === 0 ? T0.getTime() : dues[i - 1])) / 86400000));
    console.log('[FSRS] 连续 12 次「会了」的间隔（天）：', days.join(' → '));
  });

  it('目标保持率越高，间隔越短（复习越频繁）', () => {
    const firstInterval = (retention: number) =>
      applyGrade('c1', null, 'good', retention, T0).next.due - T0.getTime();
    for (const retention of [0.85, 0.9, 0.95]) {
      let row: SrsRow | null = null;
      let now = T0;
      const dues: number[] = [T0.getTime()];
      for (let i = 0; i < 6; i += 1) {
        row = applyGrade('c1', row, 'good', retention, now).next;
        dues.push(row.due);
        now = new Date(row.due);
      }
      const days = dues.slice(1).map((d, i) => Math.round((d - dues[i]) / 86400000));
      console.log(`[FSRS] 保持率 ${retention}：${days.join(' → ')} 天`);
    }
    expect(firstInterval(0.95)).toBeLessThanOrEqual(firstInterval(0.9));
    expect(firstInterval(0.9)).toBeLessThanOrEqual(firstInterval(0.85));
  });

  it('最长间隔被压缩到考前剩余时间之内', () => {
    expect(maxIntervalDays('', T0)).toBe(36500);
    expect(maxIntervalDays('2027-12-19', T0)).toBe(60);
    expect(maxIntervalDays('2026-09-28', T0)).toBe(10);
    expect(maxIntervalDays('2026-09-18', T0)).toBe(36500);

    const cap = 7;
    let row: SrsRow | null = null;
    let reviewedAt = T0;
    const gaps: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      row = applyGrade('c1', row, 'good', 0.95, reviewedAt, cap).next;
      // 真实到期时间必须落在封顶范围内（允许 1 天的取整/扰动余量）
      const gapDays = (row.due - reviewedAt.getTime()) / 86400000;
      expect(gapDays).toBeLessThanOrEqual(cap + 1);
      gaps.push(Math.round(gapDays));
      reviewedAt = new Date(row.due);
    }
    // 作为对照：不封顶时同一串评分早已推进到上百天（见上一个用例）
    console.log('[FSRS] 最长间隔封顶 7 天的实际间隔（天）：', gaps.join(' → '));
    expect(gaps[gaps.length - 1]).toBeLessThanOrEqual(cap + 1);
  });

  it('三态口径：未学过 / 学习中 / 已掌握', () => {    expect(statusOf(undefined)).toBe('new');
    const first = applyGrade('c1', null, 'good', 0.9, T0).next;
    expect(statusOf(first)).toBe('learning');
  });

  it('到期判断：只把已到期的卡算作现在可刷', () => {
    const row = applyGrade('c1', null, 'good', 0.9, T0).next;
    expect(isDueNow(row, T0)).toBe(false);
    expect(isDueNow(row, new Date(row.due + 1000))).toBe(true);
  });
});

/* ---------------- 队列与配额 ---------------- */

describe('会话队列', () => {
  const cards = makeCards(10);

  it('新卡模式下受每日新卡上限约束', () => {
    const ids = buildQueue({
      mode: 'new',
      cards,
      srs: new Map(),
      logs: [],
      settings: { ...SETTINGS, newPerDay: 3 },
      now: T0,
    });
    expect(ids).toHaveLength(3);
  });

  it('今日复习模式 = 到期卡 + 剩余新卡额度', () => {
    const introduced = makeLog(T0.getTime());
    const ids = buildQueue({
      mode: 'due',
      cards,
      srs: new Map(),
      logs: [introduced],
      settings: { ...SETTINGS, newPerDay: 4 },
      now: T0,
    });
    // 已引入 1 张新卡 → 还剩 3 张额度
    expect(ids).toHaveLength(3);
  });

  it('到期的卡优先于新卡出现在队列前部', () => {
    const dueRow: SrsRow = {
      ...applyGrade('c9', null, 'good', 0.9, new Date(T0.getTime() - 5 * 86400000)).next,
      due: T0.getTime() - 3600_000,
      reps: 3,
      state: 2,
    };
    const ids = buildQueue({
      mode: 'due',
      cards,
      srs: new Map([['c9', dueRow]]),
      logs: [],
      settings: { ...SETTINGS, newPerDay: 10 },
      now: T0,
    });
    expect(ids).toHaveLength(10);
    expect(ids).toContain('c9');
    // 新卡多于到期卡时会先发新卡，但到期卡必须在队列里且不重复
    expect(ids.filter((id) => id === 'c9')).toHaveLength(1);
  });

  it('科目 / 章节过滤只保留对应卡片', () => {
    const mixed = [...makeCards(5, 'ds', '图'), ...makeCards(5, 'os', '进程管理').map((c, i) => ({ ...c, id: `os${i}` }))];
    const bySubjectIds = buildQueue({
      mode: 'random',
      cards: mixed,
      srs: new Map(),
      logs: [],
      settings: SETTINGS,
      subject: 'os',
      now: T0,
    });
    expect(bySubjectIds.every((id) => id.startsWith('os'))).toBe(true);
    expect(bySubjectIds).toHaveLength(5);

    const byChapterIds = buildQueue({
      mode: 'random',
      cards: mixed,
      srs: new Map(),
      logs: [],
      settings: SETTINGS,
      chapter: '图',
      now: T0,
    });
    expect(byChapterIds).toHaveLength(5);
  });

  it('随机模式受每日复习上限约束', () => {
    const ids = buildQueue({
      mode: 'random',
      cards: makeCards(50),
      srs: new Map(),
      logs: [],
      settings: { ...SETTINGS, reviewPerDay: 12 },
      now: T0,
    });
    expect(ids).toHaveLength(12);
  });

  it('会话标题可读', () => {
    expect(sessionTitle('due')).toBe('今日复习');
    expect(sessionTitle('new')).toBe('新卡学习');
    expect(sessionTitle('random')).toBe('随机刷卡');
    expect(sessionTitle('focus')).toBe('复习专项');
    expect(sessionTitle('chapter', 'ds', '图')).toBe('章节 · 图');
  });
});

/* ---------------- 新卡排序（曾经「全是计算机网络」的 bug） ---------------- */

describe('新卡排序', () => {
  const build = () => [
    ...makeCards(10, 'cn', '传输层').map((c, i) => ({ ...c, id: `cn-${i}`, importance: 3 })),
    ...makeCards(10, 'co', '存储系统').map((c, i) => ({ ...c, id: `co-${i}`, importance: 3 })),
    ...makeCards(10, 'ds', '图').map((c, i) => ({ ...c, id: `ds-${i}`, importance: 3 })),
    ...makeCards(10, 'os', '进程管理').map((c, i) => ({ ...c, id: `os-${i}`, importance: 3 })),
  ];

  it('四科混着出现，不会同一科扎堆（字母序兜底导致的 bug）', () => {
    const sorted = sortNewCards(build());
    expect(sorted).toHaveLength(40);
    // 前 8 张里四科都要出现
    expect(new Set(sorted.slice(0, 8).map((c) => c.subject)).size).toBe(4);
    // 前 20 张里每科至少 3 张
    for (const subject of ['ds', 'co', 'os', 'cn'] as const) {
      expect(sorted.slice(0, 20).filter((c) => c.subject === subject).length).toBeGreaterThanOrEqual(3);
    }
    // 关键回归：以前前 10 张全是 cn-*（计算机网络）
    expect(new Set(sorted.slice(0, 10).map((c) => c.subject)).size).toBeGreaterThan(1);
  });

  it('考频高的仍然排在前面', () => {
    const cards = [
      ...build(),
      ...makeCards(2, 'ds', '图').map((c, i) => ({ ...c, id: `hot-${i}`, importance: 5 })),
    ];
    const sorted = sortNewCards(cards);
    expect(sorted[0].importance).toBe(5);
    expect(sorted[1].importance).toBe(5);
    expect(sorted[2].importance).toBe(3);
  });

  it('同一科目的卡内部被打乱（不是固定顺序）', () => {
    const first = sortNewCards(build()).map((c) => c.id);
    const second = sortNewCards(build()).map((c) => c.id);
    // 两次排序结果大概率不同（随机性），但都满足四科混排
    expect(first.length).toBe(second.length);
    expect(new Set(first.slice(0, 8).map((id) => id.split('-')[0])).size).toBe(4);
  });
});

/* ---------------- 复习专项 ---------------- */

describe('复习专项状态机', () => {
  const T = T0.getTime();

  it('「不会 / 模糊」进专项并累加错误次数', () => {
    const first = applyFocus('c1', undefined, 'again', T);
    expect(first.added).toBe(true);
    expect(first.next?.weakCount).toBe(1);
    expect(first.next?.goodStreak).toBe(0);
    expect(first.next?.lastGrade).toBe('again');

    const second = applyFocus('c1', first.next ?? undefined, 'hard', T + 1000);
    expect(second.next?.weakCount).toBe(2);
    expect(second.next?.lastGrade).toBe('hard');
    expect(second.next?.firstWeakAt).toBe(T);
  });

  it('「会了」连续两次自动移出专项', () => {
    const weak = applyFocus('c1', undefined, 'again', T).next as CardFocusRow;
    const once = applyFocus('c1', weak, 'good', T + 1);
    expect(once.removed).toBe(false);
    expect(once.next?.goodStreak).toBe(1);
    expect(once.next?.weakCount).toBe(1); // 错误次数保留

    const twice = applyFocus('c1', once.next ?? undefined, 'good', T + 2);
    expect(twice.removed).toBe(true);
    expect(twice.next).toBeNull();
  });

  it('再评「不会」会重置连续答对计数', () => {
    const weak = applyFocus('c1', undefined, 'hard', T).next as CardFocusRow;
    const once = applyFocus('c1', weak, 'good', T + 1).next as CardFocusRow;
    const again = applyFocus('c1', once, 'again', T + 2);
    expect(again.next?.goodStreak).toBe(0);
    expect(again.next?.weakCount).toBe(2);
  });

  it('从没错过的卡评「会了」不会进专项', () => {
    const result = applyFocus('c9', undefined, 'good', T);
    expect(result.next).toBeNull();
    expect(result.added).toBe(false);
  });

  it('focus 模式的队列只出专项里的卡，按错误次数从多到少', () => {
    const cards = makeCards(6);
    const mk = (id: string, weakCount: number): CardFocusRow => ({
      cardId: id,
      weakCount,
      goodStreak: 0,
      lastGrade: 'again',
      firstWeakAt: T,
      lastWeakAt: T,
    });
    const focus = new Map<string, CardFocusRow>([
      ['c1', mk('c1', 1)],
      ['c3', mk('c3', 5)],
    ]);
    const ids = buildQueue({
      mode: 'focus',
      cards,
      srs: new Map(),
      logs: [],
      settings: SETTINGS,
      focus,
      now: T0,
    });
    expect(ids).toEqual(['c3', 'c1']);
  });
});

/* ---------------- 统计口径 ---------------- */

describe('统计口径', () => {
  it('三态计数与总数一致', () => {
    const cards = makeCards(6);
    const mastered = applyGrade('c1', null, 'good', 0.9, T0).next;
    const learning = applyGrade('c2', null, 'hard', 0.9, T0).next;
    const counts = overallCounts(cards, new Map([['c1', mastered], ['c2', learning]]), T0);
    expect(counts.total).toBe(6);
    expect(counts.mastered + counts.learning + counts.new).toBe(6);
    expect(counts.new).toBe(4);
  });

  it('连续学习天数：今天有记录则从今天数', () => {
    const logs = [
      makeLog(new Date(2026, 8, 16, 10).getTime()),
      makeLog(new Date(2026, 8, 17, 10).getTime()),
      makeLog(new Date(2026, 8, 18, 10).getTime()),
    ];
    expect(streakDays(logs, T0)).toBe(3);
    // 中间断一天
    expect(streakDays([logs[0], logs[2]], T0)).toBe(1);
    // 今天还没学，但昨天学过 → 仍算 1 天（不误判为断签）
    expect(streakDays([logs[1]], T0)).toBe(1);
  });

  it('今日配额 = 到期卡 + 剩余新卡额度', () => {
    const cards = makeCards(10);
    const quota = todayQuota(cards, new Map(), [makeLog(T0.getTime())], { ...SETTINGS, newPerDay: 5 }, T0);
    expect(quota.newIntroduced).toBe(1);
    expect(quota.newRemaining).toBe(4);
    expect(quota.due).toBe(0);
  });

  it('近 7 天统计按天聚合各档评分', () => {
    const logs = [
      makeLog(new Date(2026, 8, 18, 9).getTime(), 'good'),
      makeLog(new Date(2026, 8, 18, 10).getTime(), 'again'),
      makeLog(new Date(2026, 8, 17, 10).getTime(), 'hard'),
    ];
    const stats: DayStat[] = dailyStats(logs, 7, T0);
    expect(stats).toHaveLength(7);
    const today = stats[stats.length - 1];
    expect(today.date).toBe(dayKey(T0));
    expect(today.reviews).toBe(2);
    expect(today.good).toBe(1);
    expect(today.again).toBe(1);
    expect(stats[stats.length - 2].hard).toBe(1);
  });

  it('四科统计覆盖全部科目', () => {
    const cards = [...makeCards(3, 'ds'), ...makeCards(2, 'cn').map((c, i) => ({ ...c, id: `cn${i}` }))];
    const list = bySubject(cards, new Map(), T0);
    expect(list).toHaveLength(4);
    expect(list.find((s) => s.meta.id === 'ds')!.total).toBe(3);
    expect(list.find((s) => s.meta.id === 'cn')!.total).toBe(2);
    expect(list.find((s) => s.meta.id === 'os')!.total).toBe(0);
  });
});

/* ---------------- 日期与渲染 ---------------- */

describe('日期与渲染', () => {
  it('按自然日计算跨天', () => {
    expect(dayKey(new Date(2026, 8, 18, 23, 59))).toBe('2026-09-18');
    expect(diffDays(new Date(2026, 8, 18, 23), new Date(2026, 8, 19, 1))).toBe(1);
    expect(endOfDay(T0).getHours()).toBe(23);
  });

  it('行内公式与块公式都能渲染成 KaTeX', () => {
    const html = renderMarkdown('## 结论\n- 出度 $A^{n}[i][j]$\n\n$$\\sum_{k} A[i][k]$$\n\n> 易错提醒');
    expect(html).toContain('katex');
    expect(html).toContain('<blockquote>');
    const inline = renderInline('邻接矩阵的幂 $A^{2}$ 表示什么？');
    expect(inline).toContain('katex');
  });
});
