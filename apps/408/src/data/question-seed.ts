import type { QuestionRow, SubjectId } from '../types';
import type { SeedQuestion } from './question-types';
import { CN_QUESTIONS } from './questions/cn';
import { CN_QUESTIONS2 } from './questions/cn-2';
import { CN_QUESTIONS3 } from './questions/cn-3';
import { CO_QUESTIONS } from './questions/co';
import { CO_QUESTIONS2 } from './questions/co-2';
import { CO_QUESTIONS3 } from './questions/co-3';
import { DS_QUESTIONS } from './questions/ds';
import { DS_QUESTIONS2 } from './questions/ds-2';
import { DS_QUESTIONS3 } from './questions/ds-3';
import { OS_QUESTIONS } from './questions/os';
import { OS_QUESTIONS2 } from './questions/os-2';
import { OS_QUESTIONS3 } from './questions/os-3';
import { SEED_VERSION } from './seed';

/** 全部内置题目（四科各 3 批，每批 30 道）。 */
const ALL_QUESTIONS: SeedQuestion[] = [
  ...DS_QUESTIONS,
  ...DS_QUESTIONS2,
  ...DS_QUESTIONS3,
  ...CO_QUESTIONS,
  ...CO_QUESTIONS2,
  ...CO_QUESTIONS3,
  ...OS_QUESTIONS,
  ...OS_QUESTIONS2,
  ...OS_QUESTIONS3,
  ...CN_QUESTIONS,
  ...CN_QUESTIONS2,
  ...CN_QUESTIONS3,
];

const VALID_SUBJECTS: SubjectId[] = ['ds', 'co', 'os', 'cn'];
const VALID_TYPES = ['single', 'judge'];

function normalize(question: SeedQuestion): QuestionRow {
  const options = Array.isArray(question.options) ? question.options.map(String) : [];
  const answer = (Array.isArray(question.answer) ? question.answer : [])
    .map(Number)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < options.length)
    .sort((a, b) => a - b);
  return {
    id: String(question.id),
    subject: VALID_SUBJECTS.includes(question.subject) ? question.subject : 'ds',
    chapter: question.chapter || '未分类',
    type: question.type === 'judge' ? 'judge' : 'single',
    stem: question.stem || question.id,
    options,
    answer,
    analysis: question.analysis || '',
    difficulty: Math.min(3, Math.max(1, Math.round(Number(question.difficulty) || 2))),
    year: question.year,
    tags: Array.isArray(question.tags) ? question.tags.filter(Boolean) : [],
    seedVersion: SEED_VERSION,
  };
}

export function questionRows(): QuestionRow[] {
  const seen = new Set<string>();
  const rows: QuestionRow[] = [];
  for (const question of ALL_QUESTIONS) {
    const row = normalize(question);
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/** 题库自检：返回问题列表（空数组表示健康）。测试里会断言为空。 */
export function auditQuestions(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const question of ALL_QUESTIONS) {
    const row = normalize(question);
    if (!row.id) problems.push('存在缺少 id 的题目');
    else if (seen.has(row.id)) problems.push(`id 重复：${row.id}`);
    seen.add(row.id);
    if (!VALID_SUBJECTS.includes(question.subject)) problems.push(`${row.id} 科目非法：${question.subject}`);
    if (!VALID_TYPES.includes(question.type)) problems.push(`${row.id} 题型非法：${question.type}`);
    if (!row.stem) problems.push(`${row.id} 缺少题干`);
    if (row.options.length !== (row.type === 'judge' ? 2 : 4)) {
      problems.push(`${row.id} 选项数量异常：${row.options.length}`);
    }
    if (row.answer.length !== 1) problems.push(`${row.id} 正确答案数量应为 1，实际 ${row.answer.length}`);
    if (!row.analysis) problems.push(`${row.id} 缺少解析`);
    if (row.analysis.length < 40) problems.push(`${row.id} 解析过短：${row.analysis.length} 字`);
    if (row.analysis.includes('${')) problems.push(`${row.id} 解析里有模板插值痕迹`);
    if (row.stem.includes('${')) problems.push(`${row.id} 题干里有模板插值痕迹`);
    const dup = new Set(row.options);
    if (dup.size !== row.options.length) problems.push(`${row.id} 存在重复选项`);
  }
  return problems;
}

/** 各科题量分布，供题库首页展示。 */
export function questionCountBySubject(): Record<SubjectId, number> {
  const rows = questionRows();
  return {
    ds: rows.filter((row) => row.subject === 'ds').length,
    co: rows.filter((row) => row.subject === 'co').length,
    os: rows.filter((row) => row.subject === 'os').length,
    cn: rows.filter((row) => row.subject === 'cn').length,
  };
}
