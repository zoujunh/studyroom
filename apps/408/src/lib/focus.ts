import type { CardFocusRow, CardRow, Grade, SubjectId } from '../types';
import { SUBJECTS } from '../data/curriculum';

/**
 * 复习专项：刷卡时评「不会 / 模糊」的卡片集中到这里，供集中突击。
 *
 * 状态机（与选择题错题本一致，好理解）：
 * - 评「不会」或「模糊」 → 进专项，weakCount +1，goodStreak 归零
 * - 评「会了」 → goodStreak +1，连续 2 次自动移出专项
 */

export const FOCUS_GRADUATE_STREAK = 2;

export interface FocusUpdate {
  next: CardFocusRow | null;
  /** 刚刚被移出专项 */
  removed: boolean;
  /** 刚刚被加入专项 */
  added: boolean;
}

export function applyFocus(
  cardId: string,
  prev: CardFocusRow | undefined,
  grade: Grade,
  now: number,
): FocusUpdate {
  if (grade === 'again' || grade === 'hard') {
    return {
      next: {
        cardId,
        weakCount: (prev?.weakCount ?? 0) + 1,
        goodStreak: 0,
        lastGrade: grade,
        firstWeakAt: prev?.firstWeakAt ?? now,
        lastWeakAt: now,
      },
      removed: false,
      added: !prev,
    };
  }
  // 会了 / 太简单
  if (!prev) return { next: null, removed: false, added: false };
  const streak = prev.goodStreak + 1;
  if (streak >= FOCUS_GRADUATE_STREAK) {
    return { next: null, removed: true, added: false };
  }
  return { next: { ...prev, goodStreak: streak, lastGrade: grade }, removed: false, added: false };
}

export interface SubjectFocusStat {
  subject: SubjectId;
  name: string;
  count: number;
}

export interface FocusStats {
  total: number;
  /** 其中「模糊」占多少（按最近一次评分） */
  hardOnly: number;
  /** 已经答对一次、再对一次就毕业的 */
  almostDone: number;
  bySubject: SubjectFocusStat[];
}

export function focusStats(
  focus: Map<string, CardFocusRow>,
  cards: CardRow[],
): FocusStats {
  const cardMap = new Map(cards.map((card) => [card.id, card]));
  const rows = [...focus.values()].filter((row) => cardMap.has(row.cardId));
  return {
    total: rows.length,
    hardOnly: rows.filter((row) => row.lastGrade === 'hard').length,
    almostDone: rows.filter((row) => row.goodStreak > 0).length,
    bySubject: SUBJECTS.map((meta) => ({
      subject: meta.id,
      name: meta.name,
      count: rows.filter((row) => cardMap.get(row.cardId)?.subject === meta.id).length,
    })),
  };
}

/** 复习专项的卡片列表，按「错得最多 / 最近错」排。 */
export function focusCards(
  focus: Map<string, CardFocusRow>,
  cards: CardRow[],
  subject?: SubjectId | 'all',
): { card: CardRow; row: CardFocusRow }[] {
  return cards
    .filter((card) => focus.has(card.id))
    .filter((card) => !subject || subject === 'all' || card.subject === subject)
    .map((card) => ({ card, row: focus.get(card.id) as CardFocusRow }))
    .sort((a, b) => b.row.weakCount - a.row.weakCount || b.row.lastWeakAt - a.row.lastWeakAt);
}
