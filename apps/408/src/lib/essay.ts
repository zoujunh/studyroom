import type { EssayAttemptRow, EssayMode, EssayRow, EssayPoint, SubjectId } from '../types';
import { SUBJECTS } from '../data/curriculum';
import { shuffle } from './queue';

/** 大题满分 = 评分点分值之和。 */
export function essayFullScore(essay: Pick<EssayRow, 'points'>): number {
  return essay.points.reduce((sum, point) => sum + point.score, 0);
}

/** 自评得分：勾选到的评分点分值之和。 */
export function scoreEssay(essay: Pick<EssayRow, 'points'>, checked: number[]): number {
  const set = new Set(checked);
  return essay.points.reduce((sum, point, index) => (set.has(index) ? sum + point.score : sum), 0);
}

/** 漏掉的评分点（复盘用）。 */
export function missedPoints(essay: Pick<EssayRow, 'points'>, checked: number[]): EssayPoint[] {
  const set = new Set(checked);
  return essay.points.filter((_, index) => !set.has(index));
}

/** 得分率分档，用于给自评结果一个直观评价。 */
export function rateTier(rate: number): { label: string; tone: 'good' | 'hard' | 'again' } {
  if (rate >= 0.85) return { label: '这题稳了', tone: 'good' };
  if (rate >= 0.6) return { label: '基本会，但会丢分', tone: 'hard' };
  return { label: '这题要先回去看知识点', tone: 'again' };
}

export interface BuildEssayQueueArgs {
  mode: EssayMode;
  essays: EssayRow[];
  subject?: string | null;
  chapter?: string | null;
  id?: string | null;
  count?: number;
}

export function buildEssayQueue({
  mode,
  essays,
  subject,
  chapter,
  id,
  count,
}: BuildEssayQueueArgs): string[] {
  if (mode === 'single') {
    const found = essays.find((item) => item.id === id);
    return found ? [found.id] : [];
  }
  let pool = essays;
  if (subject) pool = pool.filter((item) => item.subject === subject);
  if (chapter) pool = pool.filter((item) => item.chapter === chapter);
  if (mode === 'random') {
    const limit = count && count > 0 ? count : pool.length;
    return shuffle(pool).slice(0, limit).map((item) => item.id);
  }
  // 科目/章节练习：按难度从易到难，方便循序渐进
  return [...pool]
    .sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id))
    .map((item) => item.id);
}

export interface SubjectEssayStat {
  subject: SubjectId;
  name: string;
  essays: number;
  attempts: number;
  score: number;
  fullScore: number;
  rate: number;
}

export interface EssayStats {
  essays: number;
  attempts: number;
  score: number;
  fullScore: number;
  rate: number;
  /** 最常漏的评分点（按漏掉次数排序，取前 5） */
  weakestPoints: { label: string; missed: number; total: number }[];
  bySubject: SubjectEssayStat[];
}

export function essayStats(essays: EssayRow[], attempts: EssayAttemptRow[]): EssayStats {
  const essayMap = new Map(essays.map((essay) => [essay.id, essay]));
  const score = attempts.reduce((sum, item) => sum + item.score, 0);
  const fullScore = attempts.reduce((sum, item) => sum + item.fullScore, 0);

  // 统计每个评分点被漏掉的次数
  const missedMap = new Map<string, { missed: number; total: number }>();
  for (const attempt of attempts) {
    const essay = essayMap.get(attempt.essayId);
    if (!essay) continue;
    const checked = new Set(attempt.checked);
    essay.points.forEach((point, index) => {
      const bucket = missedMap.get(point.label) ?? { missed: 0, total: 0 };
      bucket.total += 1;
      if (!checked.has(index)) bucket.missed += 1;
      missedMap.set(point.label, bucket);
    });
  }

  const bySubject = SUBJECTS.map((meta) => {
    const owned = essays.filter((essay) => essay.subject === meta.id);
    const ownedIds = new Set(owned.map((essay) => essay.id));
    const ownedAttempts = attempts.filter((item) => ownedIds.has(item.essayId));
    const subjectScore = ownedAttempts.reduce((sum, item) => sum + item.score, 0);
    const subjectFull = ownedAttempts.reduce((sum, item) => sum + item.fullScore, 0);
    return {
      subject: meta.id,
      name: meta.name,
      essays: owned.length,
      attempts: ownedAttempts.length,
      score: subjectScore,
      fullScore: subjectFull,
      rate: subjectFull ? subjectScore / subjectFull : 0,
    };
  });

  return {
    essays: essays.length,
    attempts: attempts.length,
    score,
    fullScore,
    rate: fullScore ? score / fullScore : 0,
    weakestPoints: [...missedMap.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .filter((item) => item.missed > 0)
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 5),
    bySubject,
  };
}
