import { subjectMeta } from '../data/curriculum';
import { isDueNow, statusOf } from '../srs/fsrs';
import type { CardFocusRow, CardRow, LogRow, SessionMode, Settings, SrsRow, SubjectId } from '../types';
import { newIntroducedOn, sortNewCards } from './stats';

export function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface BuildQueueArgs {
  mode: SessionMode;
  cards: CardRow[];
  srs: Map<string, SrsRow>;
  logs: LogRow[];
  settings: Settings;
  subject?: SubjectId | string | null;
  chapter?: string | null;
  /** 复习专项的卡片（mode = 'focus' 时使用） */
  focus?: Map<string, CardFocusRow>;
  now?: Date;
}

/**
 * 构建一次刷卡会话的队列。
 * - due：到期卡 + 剩余新卡额度，两者交错，各自受每日上限约束
 * - new：只发新卡，受每日新卡上限约束
 * - random：全池随机，受每日复习上限约束
 * - subject / chapter：在过滤后的池子里按 due 规则排
 * - focus：复习专项（评过「不会 / 模糊」的卡），按错误次数从多到少
 *
 * 注意：**同一轮里每张卡只会出现一次**，不会再插回队尾。
 */
export function buildQueue({
  mode,
  cards,
  srs,
  logs,
  settings,
  subject,
  chapter,
  focus,
  now = new Date(),
}: BuildQueueArgs): string[] {
  let pool = cards;
  if (subject) pool = pool.filter((c) => c.subject === subject);
  if (chapter) pool = pool.filter((c) => c.chapter === chapter);

  if (mode === 'focus') {
    return pool
      .filter((card) => focus?.has(card.id))
      .map((card) => ({ card, row: focus?.get(card.id) as CardFocusRow }))
      .sort((a, b) => b.row.weakCount - a.row.weakCount || b.row.lastWeakAt - a.row.lastWeakAt)
      .slice(0, settings.reviewPerDay)
      .map((item) => item.card.id);
  }

  const due = pool
    .filter((c) => {
      const row = srs.get(c.id);
      return row ? isDueNow(row, now) : false;
    })
    .sort((a, b) => (srs.get(a.id)?.due ?? 0) - (srs.get(b.id)?.due ?? 0));

  const fresh = sortNewCards(pool.filter((c) => statusOf(srs.get(c.id)) === 'new'));
  const newRemaining = Math.max(0, settings.newPerDay - newIntroducedOn(logs, now));

  if (mode === 'new') return fresh.slice(0, newRemaining).map((c) => c.id);
  if (mode === 'random') return shuffle(pool).slice(0, settings.reviewPerDay).map((c) => c.id);

  const reviewIds = due.slice(0, settings.reviewPerDay).map((c) => c.id);
  const newIds = fresh.slice(0, newRemaining).map((c) => c.id);

  // 新卡占比高时先给新卡，占比低时先给到期卡，整体交错，避免连续十几张全新内容。
  const newFirst = newIds.length > reviewIds.length;
  const merged: string[] = [];
  const maxLen = Math.max(reviewIds.length, newIds.length);
  for (let i = 0; i < maxLen; i += 1) {
    const first = newFirst ? newIds[i] : reviewIds[i];
    const second = newFirst ? reviewIds[i] : newIds[i];
    if (first) merged.push(first);
    if (second) merged.push(second);
  }
  return merged;
}

export function sessionTitle(
  mode: SessionMode,
  subject?: string | null,
  chapter?: string | null,
): string {
  if (mode === 'new') return '新卡学习';
  if (mode === 'random') return '随机刷卡';
  if (mode === 'focus') return '复习专项';
  if (chapter) return `章节 · ${chapter}`;
  if (subject) return `科目 · ${subjectMeta(subject as SubjectId).short}`;
  return '今日复习';
}
