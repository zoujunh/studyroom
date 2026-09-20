import type { SubjectId } from '../types';

export interface SubjectMeta {
  id: SubjectId;
  /** 全称 */
  name: string;
  /** 单字徽标 */
  glyph: string;
  /** 短名，用于窄屏 */
  short: string;
  /** 徽标底色 */
  color: string;
}

export const SUBJECTS: SubjectMeta[] = [
  { id: 'ds', name: '数据结构', short: '数据结构', glyph: '结', color: '#0f8a72' },
  { id: 'co', name: '计算机组成原理', short: '组成', glyph: '组', color: '#3b7fb5' },
  { id: 'os', name: '操作系统', short: '操作系统', glyph: '系', color: '#8a6bbf' },
  { id: 'cn', name: '计算机网络', short: '计网', glyph: '网', color: '#c08a2e' },
];

const SUBJECT_MAP = new Map(SUBJECTS.map((s) => [s.id, s]));

export function subjectMeta(id: SubjectId): SubjectMeta {
  return SUBJECT_MAP.get(id) ?? SUBJECTS[0];
}

export function subjectName(id: SubjectId): string {
  return subjectMeta(id).name;
}

/** 408 四科在试卷上的分值（满分 150）。 */
export const SUBJECT_SCORE: Record<SubjectId, number> = {
  ds: 45,
  co: 45,
  os: 35,
  cn: 25,
};

/** 掌握判定阈值：状态为 Review 且稳定度 >= 该值，视为「已掌握」。 */
export const MASTERED_STABILITY_DAYS = 14;
