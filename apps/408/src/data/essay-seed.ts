import type { EssayRow, SubjectId } from '../types';
import type { SeedEssay } from './essay-types';
import { CN_ESSAYS } from './essays/cn';
import { CN_ESSAYS2 } from './essays/cn-2';
import { CO_ESSAYS } from './essays/co';
import { CO_ESSAYS2 } from './essays/co-2';
import { DS_ESSAYS } from './essays/ds';
import { DS_ESSAYS2 } from './essays/ds-2';
import { OS_ESSAYS } from './essays/os';
import { OS_ESSAYS2 } from './essays/os-2';
import { SEED_VERSION } from './seed';

/** 全部内置综合应用题（四科各 2 批，每批 6 道）。 */
const ALL_ESSAYS: SeedEssay[] = [
  ...DS_ESSAYS,
  ...DS_ESSAYS2,
  ...CO_ESSAYS,
  ...CO_ESSAYS2,
  ...OS_ESSAYS,
  ...OS_ESSAYS2,
  ...CN_ESSAYS,
  ...CN_ESSAYS2,
];

const VALID_SUBJECTS: SubjectId[] = ['ds', 'co', 'os', 'cn'];

export function essayFullScoreOf(points: { score: number }[]): number {
  return points.reduce((sum, point) => sum + point.score, 0);
}

function normalize(essay: SeedEssay): EssayRow {
  return {
    id: String(essay.id),
    subject: VALID_SUBJECTS.includes(essay.subject) ? essay.subject : 'ds',
    chapter: essay.chapter || '未分类',
    stem: essay.stem || essay.id,
    points: Array.isArray(essay.points)
      ? essay.points.map((point) => ({
          label: String(point.label ?? ''),
          score: Math.max(0, Number(point.score) || 0),
          answer: String(point.answer ?? ''),
        }))
      : [],
    solution: essay.solution || '',
    pitfalls: essay.pitfalls || '',
    difficulty: Math.min(3, Math.max(1, Math.round(Number(essay.difficulty) || 2))),
    year: essay.year,
    tags: Array.isArray(essay.tags) ? essay.tags.filter(Boolean) : [],
    minutes: Math.max(1, Math.round(Number(essay.minutes) || 10)),
    seedVersion: SEED_VERSION,
  };
}

export function essayRows(): EssayRow[] {
  const seen = new Set<string>();
  const rows: EssayRow[] = [];
  for (const essay of ALL_ESSAYS) {
    const row = normalize(essay);
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/** 大题结构化自检：测试里断言为空数组。 */
export function auditEssays(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const essay of ALL_ESSAYS) {
    const row = normalize(essay);
    if (!row.id) problems.push('存在缺少 id 的大题');
    else if (seen.has(row.id)) problems.push(`id 重复：${row.id}`);
    seen.add(row.id);
    if (!VALID_SUBJECTS.includes(essay.subject)) problems.push(`${row.id} 科目非法：${essay.subject}`);
    if (!row.stem || row.stem.length < 20) problems.push(`${row.id} 题干过短`);
    if (row.points.length < 3 || row.points.length > 6) {
      problems.push(`${row.id} 评分点数量应为 3–6，实际 ${row.points.length}`);
    }
    const full = essayFullScoreOf(row.points);
    if (full < 8 || full > 12) problems.push(`${row.id} 满分应为 8–12，实际 ${full}`);
    if (row.points.some((point) => !point.label || !point.answer)) {
      problems.push(`${row.id} 存在缺 label 或 answer 的评分点`);
    }
    if (!row.solution) problems.push(`${row.id} 缺少参考答案`);
    if (!row.pitfalls.startsWith('>')) problems.push(`${row.id} pitfalls 未以 > 开头`);
    for (const text of [row.stem, row.solution, ...row.points.map((p) => p.answer)]) {
      if (text.includes('${')) problems.push(`${row.id} 正文里有模板插值痕迹`);
    }
  }
  return problems;
}
