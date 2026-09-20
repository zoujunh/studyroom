import type { CardRow, SubjectId } from '../types';
import { CN_BANK } from './bank/cn';
import { CN_BANK2 } from './bank/cn-2';
import { CN_BANK3 } from './bank/cn-3';
import { CN_BANK4 } from './bank/cn-4';
import { CO_BANK } from './bank/co';
import { CO_BANK2 } from './bank/co-2';
import { CO_BANK3 } from './bank/co-3';
import { CO_BANK4 } from './bank/co-4';
import { DS_BANK } from './bank/ds';
import { DS_BANK2 } from './bank/ds-2';
import { DS_BANK3 } from './bank/ds-3';
import { DS_BANK4 } from './bank/ds-4';
import { OS_BANK } from './bank/os';
import { OS_BANK2 } from './bank/os-2';
import { OS_BANK3 } from './bank/os-3';
import { OS_BANK4 } from './bank/os-4';
import { SEED_CARDS, type SeedCard } from './seed-cards';

/**
 * 内容版本：每次批量修订内置内容（卡片 / 题目 / 大题）时 +1，
 * 应用启动时会用新内容覆盖本地数据，但**不动**学习进度（srs / logs / attempts / mistakes / essayAttempts）。
 *
 * v1：四科各 9 张的高频卡（36 张）
 * v2：四科各 +40 张的考纲系统卡（合计 196 张）
 * v3：新增题库（四科各 30 道，合计 120 道）
 * v4：新增综合应用题（四科各 6 道，合计 24 道）
 * v5：内容大扩充——卡片补齐考纲（四科各约 121 张）、题库三批（四科各约 90 道）、大题两批（四科各约 12 道）
 */
export const SEED_VERSION = 5;

/** 全部内置知识点卡：高频卡 + 四科考纲卡库（每科 4 批）。 */
const ALL_CARDS: SeedCard[] = [
  ...SEED_CARDS,
  ...DS_BANK,
  ...DS_BANK2,
  ...DS_BANK3,
  ...DS_BANK4,
  ...CO_BANK,
  ...CO_BANK2,
  ...CO_BANK3,
  ...CO_BANK4,
  ...OS_BANK,
  ...OS_BANK2,
  ...OS_BANK3,
  ...OS_BANK4,
  ...CN_BANK,
  ...CN_BANK2,
  ...CN_BANK3,
  ...CN_BANK4,
];

const VALID_SUBJECTS: SubjectId[] = ['ds', 'co', 'os', 'cn'];

function normalize(card: SeedCard): CardRow {
  return {
    id: String(card.id),
    subject: VALID_SUBJECTS.includes(card.subject) ? card.subject : 'ds',
    chapter: card.chapter || '未分类',
    tags: Array.isArray(card.tags) ? card.tags.filter(Boolean) : [],
    title: card.title || card.id,
    back: card.back || '',
    importance: Math.min(5, Math.max(1, Number(card.importance) || 3)),
    year: card.year,
    hint: card.hint || '',
    seedVersion: SEED_VERSION,
  };
}

export function seedRows(): CardRow[] {
  const seen = new Set<string>();
  const rows: CardRow[] = [];
  for (const card of ALL_CARDS) {
    const row = normalize(card);
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

/** 开发期自检：返回种子数据的问题列表（空数组表示健康）。 */
export function auditSeed(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const card of ALL_CARDS) {
    if (!card.id) problems.push('存在缺少 id 的卡片');
    else if (seen.has(card.id)) problems.push(`id 重复：${card.id}`);
    seen.add(card.id);
    if (!VALID_SUBJECTS.includes(card.subject)) problems.push(`${card.id} 科目非法：${card.subject}`);
    if (!card.title) problems.push(`${card.id} 缺少 title`);
    if (!card.back) problems.push(`${card.id} 缺少 back`);
    if (!card.hint) problems.push(`${card.id} 缺少 hint`);
    if (!Number.isFinite(card.importance) || card.importance < 1 || card.importance > 5) {
      problems.push(`${card.id} 考频非法：${card.importance}`);
    }
  }
  return problems;
}

/** 各科题/卡数量与章节分布，用于覆盖率自查。 */
export function contentCoverage(): {
  cards: number;
  bySubject: Record<SubjectId, { cards: number; chapters: number }>;
  chapters: string[];
} {
  const rows = seedRows();
  const chapters = [...new Set(rows.map((row) => row.chapter))];
  const bySubject = {
    ds: { cards: 0, chapters: 0 },
    co: { cards: 0, chapters: 0 },
    os: { cards: 0, chapters: 0 },
    cn: { cards: 0, chapters: 0 },
  };
  for (const subject of VALID_SUBJECTS) {
    const owned = rows.filter((row) => row.subject === subject);
    bySubject[subject] = {
      cards: owned.length,
      chapters: new Set(owned.map((row) => row.chapter)).size,
    };
  }
  return { cards: rows.length, bySubject, chapters };
}

export type { SeedCard };
