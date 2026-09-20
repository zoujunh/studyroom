import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade as FsrsGrade,
  type IPreview,
} from 'ts-fsrs';
import { MASTERED_STABILITY_DAYS } from '../data/curriculum';
import type { Grade, MasteryStatus, SrsRow } from '../types';
import { endOfDay } from '../lib/date';

/** 三档按钮 → FSRS 评分。 */
export const RATING: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export const GRADE_LABEL: Record<Grade, string> = {
  again: '不会',
  hard: '模糊',
  good: '会了',
  easy: '太简单',
};

export const GRADE_SUBLABEL: Record<Grade, string> = {
  again: '完全没印象',
  hard: '想起来了但不全',
  good: '能完整复述',
  easy: '不用再看了',
};

/** 按「目标保持率 + 最长间隔」缓存调度引擎（参数一致时复用同一个实例）。 */
const engines = new Map<string, ReturnType<typeof fsrs>>();

function engine(retention: number, maxInterval = 36500): ReturnType<typeof fsrs> {
  const key = `${Math.round(retention * 100)}:${maxInterval}`;
  let instance = engines.get(key);
  if (!instance) {
    instance = fsrs(
      generatorParameters({
        request_retention: Math.round(retention * 100) / 100,
        maximum_interval: maxInterval,
        enable_fuzz: true,
        enable_short_term: true,
      }),
    );
    engines.set(key, instance);
  }
  return instance;
}

function toFsrs(row: SrsRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps ?? 0,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

function fromFsrs(cardId: string, card: Card, firstSeen: number): SrsRow {
  return {
    cardId,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.getTime() : undefined,
    firstSeen,
  };
}

/** 四档预测结果，用于在按钮上直接显示「下次什么时候再见」。 */
export function previewIntervals(
  row: SrsRow | null,
  retention: number,
  now = new Date(),
  maxInterval = 36500,
): Record<Grade, number> {
  const card = row ? toFsrs(row) : createEmptyCard(now);
  const preview: IPreview = engine(retention, maxInterval).repeat(card, now);
  return {
    again: preview[Rating.Again].card.due.getTime(),
    hard: preview[Rating.Hard].card.due.getTime(),
    good: preview[Rating.Good].card.due.getTime(),
    easy: preview[Rating.Easy].card.due.getTime(),
  };
}

export interface GradeOutcome {
  next: SrsRow;
  rating: number;
  /** 是否需要在本次会话中立刻重现（短周期学习步）。 */
  requeue: boolean;
}

/** 核心调度：给一张卡打分，返回它新的记忆状态。 */
export function applyGrade(
  cardId: string,
  row: SrsRow | null,
  grade: Grade,
  retention: number,
  now = new Date(),
  maxInterval = 36500,
): GradeOutcome {
  const card = row ? toFsrs(row) : createEmptyCard(now);
  const item = engine(retention, maxInterval).next(card, now, RATING[grade]);
  const next = fromFsrs(cardId, item.card, row?.firstSeen ?? now.getTime());
  // 学习步内（10 分钟内）再次到期 → 本轮继续出现，符合「不会就再来一遍」的直觉。
  const requeue = next.due - now.getTime() <= 10 * 60 * 1000 && next.state !== State.Review;
  return { next, rating: RATING[grade], requeue };
}

/** 新建一张卡的初始状态（用于导入或预热）。 */
export function freshRow(cardId: string, now = new Date()): SrsRow {
  return fromFsrs(cardId, createEmptyCard(now), now.getTime());
}

/** 首页三态口径：没学过 / 学习中 / 已掌握。 */
export function statusOf(row: SrsRow | undefined): MasteryStatus {
  if (!row || row.reps === 0) return 'new';
  if (row.state === State.Review && row.stability >= MASTERED_STABILITY_DAYS) return 'mastered';
  return 'learning';
}

/** 是否是「今天该复习」的卡（不含从未学过的新卡）。 */
export function isDueToday(row: SrsRow, now = new Date()): boolean {
  return row.reps > 0 && row.due <= endOfDay(now).getTime();
}

/** 当前是否已经到期（可以立刻复习）。 */
export function isDueNow(row: SrsRow, now = new Date()): boolean {
  return row.reps > 0 && row.due <= now.getTime();
}

export const STATE_LABEL: Record<number, string> = {
  [State.New]: '新卡',
  [State.Learning]: '学习中',
  [State.Review]: '复习',
  [State.Relearning]: '重学',
};
