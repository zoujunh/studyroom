import type { SubjectId } from '../types';

/**
 * 题库契约。
 *
 * 408 统考的选择题是**单选**（40 题 × 2 分），所以 `single` 是主力题型；
 * `judge`（判断）留给概念辨析，`options` 固定为 ['正确', '错误']。
 * 综合应用题（大题）需要步骤级给分，留到后续里程碑。
 */
export type QuestionType = 'single' | 'judge';

export interface SeedQuestion {
  /** 全局唯一，形如 'q-ds-graph-01' */
  id: string;
  subject: SubjectId;
  chapter: string;
  type: QuestionType;
  /** 题干，可用行内公式 $...$、行内代码 */
  stem: string;
  /** 选项文本（**不带** A. B. 前缀）；判断题固定 ['正确', '错误'] */
  options: string[];
  /** 正确选项下标；单选与判断都只有 1 个 */
  answer: number[];
  /** 解析：Markdown + KaTeX，80–200 字，要说清干扰项为什么错 */
  analysis: string;
  /** 难度：1 基础 / 2 中等 / 3 较难 */
  difficulty: number;
  year?: string;
  tags: string[];
}
