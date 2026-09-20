/** 全站共享类型定义。 */

export type SubjectId = 'ds' | 'co' | 'os' | 'cn';

/** 学习者对一张卡的自评档位（UI 三档 + 隐藏的第四档）。 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

/** 首页三态统计口径。 */
export type MasteryStatus = 'new' | 'learning' | 'mastered';

/** 刷卡会话的来源模式。 */
export type SessionMode = 'due' | 'new' | 'random' | 'subject' | 'chapter';

/** 一张知识卡的内容（由种子数据 / 导入数据提供）。 */
export interface CardContent {
  id: string;
  subject: SubjectId;
  chapter: string;
  tags: string[];
  /** 正面：问题，一行，可含行内公式。 */
  title: string;
  /** 背面：Markdown 正文。 */
  back: string;
  /** 考频 1–5。 */
  importance: number;
  year?: string;
  /** 记忆锚点/口诀。 */
  hint: string;
}

/** 落库的卡片行：内容 + 种子版本，便于内容升级时覆盖正文又不丢学习进度。 */
export interface CardRow extends CardContent {
  seedVersion: number;
}

/** 一张卡的 FSRS 记忆状态（时间字段落库为 epoch ms）。 */
export interface SrsRow {
  cardId: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  /** 0 New / 1 Learning / 2 Review / 3 Relearning */
  state: number;
  last_review?: number;
  learning_steps?: number;
  /** 首次进入学习队列的时间。 */
  firstSeen: number;
}

/** 一条复习记录，带前后快照，用于撤销与统计。 */
export interface LogRow {
  id?: number;
  cardId: string;
  ts: number;
  grade: Grade;
  rating: number;
  prevState: SrsRow | null;
  nextState: SrsRow;
  mode: SessionMode;
}

export interface Settings {
  /** 'YYYY-MM-DD'，空串表示未设置。 */
  examDate: string;
  /** 每日新卡上限。 */
  newPerDay: number;
  /** 每日复习上限。 */
  reviewPerDay: number;
  /** FSRS 目标记忆保持率。 */
  requestRetention: number;
  theme: 'auto' | 'light' | 'dark';
  /** 正文基准字号 px。 */
  fontSize: number;
  /** 已导入的种子内容版本，用于内容升级。 */
  seedVersion: number;
}

/** 单日统计（由 logs 聚合而来）。 */
export interface DayStat {
  /** 'YYYY-MM-DD' */
  date: string;
  reviews: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  newIntroduced: number;
}

/* ---------------- 题库（M3） ---------------- */

export type QuestionType = 'single' | 'judge';

/** 落库的题目行。 */
export interface QuestionRow {
  id: string;
  subject: SubjectId;
  chapter: string;
  type: QuestionType;
  stem: string;
  options: string[];
  answer: number[];
  analysis: string;
  /** 1 基础 / 2 中等 / 3 较难 */
  difficulty: number;
  year?: string;
  tags: string[];
  seedVersion: number;
}

/** 错因归类。 */
export type ErrorType = 'concept' | 'calc' | 'reading' | 'memory' | 'time' | 'careless';

/** 刷题模式。 */
export type QuizMode = 'random' | 'subject' | 'chapter' | 'mistake' | 'exam';

/** 一次作答记录。 */
export interface AttemptRow {
  id?: number;
  questionId: string;
  ts: number;
  chosen: number[];
  correct: boolean;
  mode: QuizMode;
  /** 作答耗时（毫秒） */
  ms: number;
  errorType?: ErrorType;
}

/** 错题本条目：答错入库，连续答对 2 次自动移出。 */
export interface MistakeRow {
  questionId: string;
  wrongCount: number;
  correctStreak: number;
  lastErrorType: ErrorType | null;
  firstWrongAt: number;
  lastWrongAt: number;
}

/* ---------------- 综合应用题（M3+） ---------------- */

/** 评分点：学生逐条自评「我答到了」。 */
export interface EssayPoint {
  label: string;
  score: number;
  answer: string;
}

/** 落库的大题行。 */
export interface EssayRow {
  id: string;
  subject: SubjectId;
  chapter: string;
  stem: string;
  points: EssayPoint[];
  solution: string;
  pitfalls: string;
  difficulty: number;
  year?: string;
  tags: string[];
  minutes: number;
  seedVersion: number;
}

export type EssayMode = 'random' | 'subject' | 'chapter' | 'single';

/** 一次大题自评记录。 */
export interface EssayAttemptRow {
  id?: number;
  essayId: string;
  ts: number;
  /** 勾选到的评分点下标 */
  checked: number[];
  score: number;
  fullScore: number;
  /** 用时（毫秒） */
  ms: number;
  mode: EssayMode;
}
