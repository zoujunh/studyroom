import { SUBJECTS, type SubjectMeta } from '../data/curriculum';
import { dayKey, endOfDay, recentDayKeys } from './date';
import { isDueToday, statusOf } from '../srs/fsrs';
import type { CardRow, DayStat, LogRow, MasteryStatus, Settings, SrsRow, SubjectId } from '../types';

export interface Counts {
  total: number;
  mastered: number;
  learning: number;
  new: number;
  dueToday: number;
}

export interface SubjectCounts extends Counts {
  meta: SubjectMeta;
  /** 掌握率 0–1 */
  ratio: number;
}

export interface ChapterCounts extends Counts {
  name: string;
}

export function emptyCounts(): Counts {
  return { total: 0, mastered: 0, learning: 0, new: 0, dueToday: 0 };
}

function tally(cards: CardRow[], srs: Map<string, SrsRow>, now: Date): Counts {
  const counts = emptyCounts();
  for (const card of cards) {
    const row = srs.get(card.id);
    counts.total += 1;
    counts[statusOf(row)] += 1;
    if (row && isDueToday(row, now)) counts.dueToday += 1;
  }
  return counts;
}

export function overallCounts(cards: CardRow[], srs: Map<string, SrsRow>, now = new Date()): Counts {
  return tally(cards, srs, now);
}

export function bySubject(
  cards: CardRow[],
  srs: Map<string, SrsRow>,
  now = new Date(),
): SubjectCounts[] {
  return SUBJECTS.map((meta) => {
    const owned = cards.filter((c) => c.subject === meta.id);
    const counts = tally(owned, srs, now);
    return {
      ...counts,
      meta,
      ratio: counts.total ? counts.mastered / counts.total : 0,
    };
  });
}

export function byChapter(
  cards: CardRow[],
  srs: Map<string, SrsRow>,
  subject: SubjectId,
  now = new Date(),
): ChapterCounts[] {
  const grouped = new Map<string, CardRow[]>();
  for (const card of cards) {
    if (card.subject !== subject) continue;
    const list = grouped.get(card.chapter);
    if (list) list.push(card);
    else grouped.set(card.chapter, [card]);
  }
  return [...grouped.entries()].map(([name, list]) => ({ name, ...tally(list, srs, now) }));
}

/** 连续学习天数：从今天（或昨天）往前数连续有复习记录的天数。 */
export function streakDays(logs: LogRow[], now = new Date()): number {
  if (!logs.length) return 0;
  const days = new Set(logs.map((l) => dayKey(l.ts)));
  let streak = 0;
  const cursor = new Date(now.getTime());
  // 今天还没学不算断，从昨天起补算。
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 今天已引入的新卡数量（用于每日新卡上限）。 */
export function newIntroducedOn(logs: LogRow[], date = new Date()): number {
  const key = dayKey(date);
  return logs.filter((l) => dayKey(l.ts) === key && (l.prevState === null || l.prevState.reps === 0)).length;
}

export function reviewsOn(logs: LogRow[], date = new Date()): number {
  const key = dayKey(date);
  return logs.filter((l) => dayKey(l.ts) === key).length;
}

export function dailyStats(logs: LogRow[], days: number, now = new Date()): DayStat[] {
  const keys = recentDayKeys(days, now);
  const index = new Map<string, DayStat>(
    keys.map((date) => [date, { date, reviews: 0, again: 0, hard: 0, good: 0, easy: 0, newIntroduced: 0 }]),
  );
  for (const log of logs) {
    const stat = index.get(dayKey(log.ts));
    if (!stat) continue;
    stat.reviews += 1;
    stat[log.grade] += 1;
    if (log.prevState === null || log.prevState.reps === 0) stat.newIntroduced += 1;
  }
  return keys.map((k) => index.get(k)!);
}

/** 今日剩余配额：复习 + 新卡。 */
export function todayQuota(
  cards: CardRow[],
  srs: Map<string, SrsRow>,
  logs: LogRow[],
  settings: Settings,
  now = new Date(),
): { due: number; newAvailable: number; newIntroduced: number; newRemaining: number } {
  const due = cards.filter((c) => {
    const row = srs.get(c.id);
    return row ? isDueToday(row, now) : false;
  }).length;
  const fresh = cards.filter((c) => statusOf(srs.get(c.id)) === 'new').length;
  const introduced = newIntroducedOn(logs, now);
  const remaining = Math.max(0, settings.newPerDay - introduced);
  return {
    due,
    newAvailable: fresh,
    newIntroduced: introduced,
    newRemaining: Math.min(remaining, fresh),
  };
}

/** 按「考频 × 未掌握度」给新卡排序，让有限的每日额度先花在刀刃上。 */
export function newCardPriority(card: CardRow): number {
  return card.importance * 10;
}

/** 就地打乱（不依赖 queue.ts，避免循环引用）。 */
function shuffleList<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 各科目轮流取一张，保证四科混着出现。 */
function interleaveBySubject(cards: CardRow[]): CardRow[] {
  const groups = new Map<string, CardRow[]>();
  for (const card of cards) {
    const list = groups.get(card.subject);
    if (list) list.push(card);
    else groups.set(card.subject, [card]);
  }
  const lists = [...groups.values()];
  const out: CardRow[] = [];
  let index = 0;
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const list of lists) {
      const card = list[index];
      if (card) {
        out.push(card);
        hasMore = true;
      }
    }
    index += 1;
  }
  return out;
}

/**
 * 新卡顺序：考频降序 → 同考频内**按科目轮转 + 随机**。
 *
 * ⚠️ 这里曾经用 id 字母序做兜底，导致同考频的卡全是 `cn-`（计算机网络），
 * 用户看到「怎么一直是计网的题」。修好后再也不会按科目扎堆。
 */
export function sortNewCards(cards: CardRow[]): CardRow[] {
  const buckets = new Map<number, CardRow[]>();
  for (const card of cards) {
    const list = buckets.get(card.importance);
    if (list) list.push(card);
    else buckets.set(card.importance, [card]);
  }
  const out: CardRow[] = [];
  for (const importance of [...buckets.keys()].sort((a, b) => b - a)) {
    out.push(...interleaveBySubject(shuffleList(buckets.get(importance) as CardRow[])));
  }
  return out;
}

export function masteryStatusOf(cards: CardRow[], srs: Map<string, SrsRow>, status: MasteryStatus): CardRow[] {
  return cards.filter((c) => statusOf(srs.get(c.id)) === status);
}

/** 到期时间分布：今天 / 本周 / 更晚 / 未安排，用于统计页。 */
export function dueBuckets(srs: Map<string, SrsRow>, now = new Date()): { label: string; value: number }[] {
  const todayEnd = endOfDay(now).getTime();
  const weekEnd = todayEnd + 6 * 86400000;
  let today = 0;
  let week = 0;
  let later = 0;
  for (const row of srs.values()) {
    if (row.reps === 0) continue;
    if (row.due <= todayEnd) today += 1;
    else if (row.due <= weekEnd) week += 1;
    else later += 1;
  }
  return [
    { label: '今天及逾期', value: today },
    { label: '未来 7 天', value: week },
    { label: '更晚', value: later },
  ];
}
