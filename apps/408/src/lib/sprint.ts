import { MASTERED_STABILITY_DAYS } from '../data/curriculum';
import { daysUntilExam } from './date';
import { statusOf } from '../srs/fsrs';
import type { CardRow, Settings, SrsRow } from '../types';

/**
 * 冲刺模式：按考试日期倒排每日任务量，并给出「照现在节奏能不能刷完」的判断。
 * 所有数字都是**估算**，界面上用「约」字标注，不做虚假精确。
 */

export interface SprintPlan {
  /** 距考试天数；未设置或已过为 null */
  daysLeft: number | null;
  /** 还没学过的知识点 */
  newCount: number;
  /** 评过分但还没稳定的 */
  learningCount: number;
  /** 已掌握 */
  masteredCount: number;
  /** 倒排出的每日新卡量建议 */
  suggestedNewPerDay: number;
  /** 按当前设置，学完所有新卡还需要多少天 */
  projectedDays: number | null;
  /** 按当前设置能否在考前学完 */
  canFinish: boolean;
  /** 平均复习间隔（天），用于估算还能过几轮 */
  avgIntervalDays: number;
  /** 考前还能把全部记忆过几轮 */
  roundsBeforeExam: number | null;
  /** 今天待复习 + 今天该学的新卡 */
  todayLoad: number;
  /** 今天的预计耗时（分钟） */
  estimatedMinutes: number;
}

/** 每张卡的平均处理时间（分钟），用于估算每日耗时。 */
const MINUTES_PER_CARD = 0.4;
/** 触发「按冲刺节奏调整」时的上限，避免出现每天 200 张的荒谬计划。 */
export const MAX_SUGGESTED_NEW_PER_DAY = 80;

export function planSprint(
  cards: CardRow[],
  srs: Map<string, SrsRow>,
  settings: Settings,
  dueToday: number,
  newRemainingToday: number,
  now = new Date(),
): SprintPlan {
  let newCount = 0;
  let learningCount = 0;
  let masteredCount = 0;
  let stabilitySum = 0;
  let stabilityCount = 0;

  for (const card of cards) {
    const row = srs.get(card.id);
    const status = statusOf(row);
    if (status === 'new') newCount += 1;
    else if (status === 'mastered') masteredCount += 1;
    else learningCount += 1;
    if (row && row.reps > 0 && row.stability > 0) {
      stabilitySum += row.stability;
      stabilityCount += 1;
    }
  }

  const daysLeft = daysUntilExam(settings.examDate, now);
  const avgIntervalDays = stabilityCount
    ? Math.min(MASTERED_STABILITY_DAYS * 2, Math.max(1, stabilitySum / stabilityCount))
    : 6;

  const suggestedNewPerDay =
    daysLeft && daysLeft > 0
      ? Math.min(MAX_SUGGESTED_NEW_PER_DAY, Math.max(5, Math.ceil(newCount / daysLeft)))
      : settings.newPerDay;

  const projectedDays = settings.newPerDay > 0 ? Math.ceil(newCount / settings.newPerDay) : null;
  const canFinish = daysLeft === null || (projectedDays !== null && projectedDays <= daysLeft);
  const roundsBeforeExam =
    daysLeft !== null && daysLeft > 0 ? Math.max(0, Math.floor(daysLeft / avgIntervalDays)) : null;

  const todayLoad = dueToday + newRemainingToday;
  return {
    daysLeft,
    newCount,
    learningCount,
    masteredCount,
    suggestedNewPerDay,
    projectedDays,
    canFinish,
    avgIntervalDays,
    roundsBeforeExam,
    todayLoad,
    estimatedMinutes: Math.round(todayLoad * MINUTES_PER_CARD),
  };
}

/** 冲刺建议的一句话文案。 */
export function sprintAdvice(plan: SprintPlan): string {
  if (plan.daysLeft === null) return '设置考试日期后，这里会给出倒排的每日计划。';
  if (plan.daysLeft <= 0) return '考试日期已过，复习计划不再倒排。';
  if (plan.newCount === 0) return '所有知识点都至少学过一遍了，接下来靠复习轮次保持。';
  if (!plan.canFinish) {
    return `按当前节奏，学完所有新卡还要约 ${plan.projectedDays} 天，超过剩余 ${plan.daysLeft} 天。建议把每日新卡提到约 ${plan.suggestedNewPerDay} 张。`;
  }
  return `按当前节奏约 ${plan.projectedDays} 天能学完，剩余 ${plan.daysLeft} 天来得及，考前大约还能过 ${plan.roundsBeforeExam ?? 0} 轮。`;
}
