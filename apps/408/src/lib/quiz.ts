import type { AttemptRow, ErrorType, MistakeRow, QuestionRow, QuizMode, SubjectId } from '../types';
import { SUBJECTS } from '../data/curriculum';
import { shuffle } from './queue';

/**
 * 题库核心逻辑：判分、错题状态机、组卷、统计。
 * 全部是纯函数，便于单测覆盖。
 */

export const ERROR_TYPES: { id: ErrorType; label: string; hint: string }[] = [
  { id: 'concept', label: '概念不清', hint: '知识点本身没记住' },
  { id: 'calc', label: '计算失误', hint: '思路对但算错了' },
  { id: 'reading', label: '审题错误', hint: '看漏了条件或问法' },
  { id: 'memory', label: '记忆模糊', hint: '想起来了但不全' },
  { id: 'time', label: '时间不够', hint: '来不及细想' },
  { id: 'careless', label: '手滑', hint: '点错了选项' },
];

export function errorTypeLabel(id: ErrorType | null | undefined): string {
  return ERROR_TYPES.find((item) => item.id === id)?.label ?? '未标注';
}

/** 判分：选项集合完全一致才算对。 */
export function isCorrect(question: Pick<QuestionRow, 'answer'>, chosen: number[]): boolean {
  if (!chosen.length || chosen.length !== question.answer.length) return false;
  const a = [...question.answer].sort((x, y) => x - y).join(',');
  const b = [...chosen].sort((x, y) => x - y).join(',');
  return a === b;
}

/* ---------------- 错题状态机 ---------------- */

export interface MistakeUpdate {
  /** 新的错题条目；null 表示不在错题本里（答对且已订正 / 首次答对） */
  next: MistakeRow | null;
  /** 是否刚刚被移出错题本 */
  removed: boolean;
}

/** 连续答对几次后自动移出错题本。 */
export const MISTAKE_GRADUATE_STREAK = 2;

export function applyMistake(
  questionId: string,
  prev: MistakeRow | undefined,
  correct: boolean,
  now: number,
  errorType?: ErrorType,
): MistakeUpdate {
  if (!correct) {
    return {
      next: {
        questionId,
        wrongCount: (prev?.wrongCount ?? 0) + 1,
        correctStreak: 0,
        lastErrorType: errorType ?? prev?.lastErrorType ?? null,
        firstWrongAt: prev?.firstWrongAt ?? now,
        lastWrongAt: now,
      },
      removed: false,
    };
  }
  if (!prev) return { next: null, removed: false };
  const streak = prev.correctStreak + 1;
  if (streak >= MISTAKE_GRADUATE_STREAK) return { next: null, removed: true };
  return { next: { ...prev, correctStreak: streak }, removed: false };
}

/* ---------------- 组卷 ---------------- */

/** 模考卷：按 408 各科分值比例抽题。 */
export const EXAM_BLUEPRINT: { subject: SubjectId; count: number }[] = [
  { subject: 'ds', count: 6 },
  { subject: 'co', count: 5 },
  { subject: 'os', count: 5 },
  { subject: 'cn', count: 4 },
];

export const EXAM_TOTAL_COUNT = EXAM_BLUEPRINT.reduce((sum, item) => sum + item.count, 0);
/** 模考时长（分钟）：每题约 1.5 分钟。 */
export const EXAM_MINUTES = Math.round(EXAM_TOTAL_COUNT * 1.5);

export interface BuildQuizQueueArgs {
  mode: QuizMode;
  questions: QuestionRow[];
  mistakes: Map<string, MistakeRow>;
  subject?: string | null;
  chapter?: string | null;
  count?: number;
}

export function buildQuizQueue({
  mode,
  questions,
  mistakes,
  subject,
  chapter,
  count,
}: BuildQuizQueueArgs): string[] {
  let pool = questions;
  if (subject) pool = pool.filter((item) => item.subject === subject);
  if (chapter) pool = pool.filter((item) => item.chapter === chapter);

  if (mode === 'mistake') {
    const wrong = pool
      .filter((item) => mistakes.has(item.id))
      .sort((a, b) => {
        const ma = mistakes.get(a.id);
        const mb = mistakes.get(b.id);
        if ((mb?.wrongCount ?? 0) !== (ma?.wrongCount ?? 0)) {
          return (mb?.wrongCount ?? 0) - (ma?.wrongCount ?? 0);
        }
        return (mb?.lastWrongAt ?? 0) - (ma?.lastWrongAt ?? 0);
      });
    return wrong.map((item) => item.id);
  }

  if (mode === 'exam') {
    const picked: string[] = [];
    for (const slot of EXAM_BLUEPRINT) {
      const owned = pool.filter((item) => item.subject === slot.subject);
      picked.push(...shuffle(owned).slice(0, slot.count).map((item) => item.id));
    }
    return picked;
  }

  const limit = count && count > 0 ? count : pool.length;
  return shuffle(pool).slice(0, limit).map((item) => item.id);
}

/* ---------------- 统计 ---------------- */

export interface SubjectQuizStat {
  subject: SubjectId;
  name: string;
  questions: number;
  attempts: number;
  correct: number;
  accuracy: number;
  mistakes: number;
}

export interface QuizStats {
  questions: number;
  attempts: number;
  correct: number;
  accuracy: number;
  todayAttempts: number;
  todayCorrect: number;
  mistakes: number;
  resolved: number;
  bySubject: SubjectQuizStat[];
  byError: { id: ErrorType; label: string; count: number }[];
}

export function quizStats(
  questions: QuestionRow[],
  attempts: AttemptRow[],
  mistakes: Map<string, MistakeRow>,
  todayKeyOf: (ts: number) => string,
  today: string,
): QuizStats {
  const correct = attempts.filter((item) => item.correct).length;
  const todayAttempts = attempts.filter((item) => todayKeyOf(item.ts) === today);

  const bySubject = SUBJECTS.map((meta) => {
    const owned = questions.filter((item) => item.subject === meta.id);
    const ownedIds = new Set(owned.map((item) => item.id));
    const subjectAttempts = attempts.filter((item) => ownedIds.has(item.questionId));
    const subjectCorrect = subjectAttempts.filter((item) => item.correct).length;
    return {
      subject: meta.id,
      name: meta.name,
      questions: owned.length,
      attempts: subjectAttempts.length,
      correct: subjectCorrect,
      accuracy: subjectAttempts.length ? subjectCorrect / subjectAttempts.length : 0,
      mistakes: owned.filter((item) => mistakes.has(item.id)).length,
    };
  });

  const errorCounts = new Map<ErrorType, number>();
  for (const item of attempts) {
    if (item.correct || !item.errorType) continue;
    errorCounts.set(item.errorType, (errorCounts.get(item.errorType) ?? 0) + 1);
  }

  return {
    questions: questions.length,
    attempts: attempts.length,
    correct,
    accuracy: attempts.length ? correct / attempts.length : 0,
    todayAttempts: todayAttempts.length,
    todayCorrect: todayAttempts.filter((item) => item.correct).length,
    mistakes: mistakes.size,
    resolved: [...mistakes.values()].filter((item) => item.correctStreak > 0).length,
    bySubject,
    byError: ERROR_TYPES.map((item) => ({
      id: item.id,
      label: item.label,
      count: errorCounts.get(item.id) ?? 0,
    })).filter((item) => item.count > 0),
  };
}

/** 模考交卷报告。 */
export interface ExamReport {
  total: number;
  correct: number;
  /** 每题 2 分（与 408 选择题一致） */
  score: number;
  fullScore: number;
  bySubject: { subject: SubjectId; name: string; total: number; correct: number }[];
  wrongIds: string[];
}

export function buildExamReport(questions: Map<string, QuestionRow>, results: { id: string; correct: boolean }[]): ExamReport {
  const bySubjectMap = new Map<SubjectId, { total: number; correct: number }>();
  const wrongIds: string[] = [];
  let correct = 0;
  for (const result of results) {
    const question = questions.get(result.id);
    if (!question) continue;
    const bucket = bySubjectMap.get(question.subject) ?? { total: 0, correct: 0 };
    bucket.total += 1;
    if (result.correct) {
      bucket.correct += 1;
      correct += 1;
    } else {
      wrongIds.push(result.id);
    }
    bySubjectMap.set(question.subject, bucket);
  }
  return {
    total: results.length,
    correct,
    score: correct * 2,
    fullScore: results.length * 2,
    bySubject: SUBJECTS.filter((meta) => bySubjectMap.has(meta.id)).map((meta) => ({
      subject: meta.id,
      name: meta.name,
      ...(bySubjectMap.get(meta.id) as { total: number; correct: number }),
    })),
    wrongIds,
  };
}
