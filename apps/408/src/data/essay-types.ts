import type { EssayPoint, SubjectId } from '../types';

/**
 * 综合应用题（408 的 70 分大头）契约。
 *
 * 因为没有 AI 批改，采用**评分点自评**：学生先自己做，再逐条勾选「这个点我答到了」，
 * 系统按评分点分值实时算分，并记录漏掉的点用于复盘。
 */
export type { EssayPoint };

export interface SeedEssay {
  id: string;
  subject: SubjectId;
  chapter: string;
  /** 题干，可分小问，Markdown + KaTeX */
  stem: string;
  /** 评分点：分值之和即满分 */
  points: EssayPoint[];
  /** 参考答案全文（分步推导） */
  solution: string;
  /** 最容易丢分的地方 */
  pitfalls: string;
  /** 难度 1 基础 / 2 中等 / 3 较难 */
  difficulty: number;
  year?: string;
  tags: string[];
  /** 建议用时（分钟） */
  minutes: number;
}
