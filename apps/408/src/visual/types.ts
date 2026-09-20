import type { SubjectId } from '../types';

/**
 * 一个步骤的状态快照。
 * 生成器是**纯函数**（输入 → 步骤数组），引擎只负责播放/单步/回看，
 * 这样 30+ 个动画可以复用同一套控件，也能被单测覆盖。
 */
export interface AnimFrame<S = unknown> {
  state: S;
  /** 该步的讲解文字（对应"7 > 5，填到右边的空位"这类旁白）。 */
  note: string;
  /** 计数器，如 比较 / 交换 / 缺页。 */
  counters?: Record<string, number>;
}

export type ViewKind = 'bars' | 'frames' | 'lifeline' | 'matrix' | 'gantt' | 'graph';

/* ---------------- 通用视觉元素 ---------------- */

/** 单元格/片段的状态色。 */
export type CellStatus = 'idle' | 'active' | 'ok' | 'warn' | 'bad' | 'done';

export interface MatrixCell {
  text: string;
  status?: CellStatus;
}

export interface MatrixRow {
  label: string;
  cells: (string | MatrixCell)[];
  status?: CellStatus;
}

export interface MatrixBadge {
  label: string;
  value: string;
  tone?: 'brand' | 'good' | 'hard' | 'again';
}

/** 通用矩阵/表格视图：银行家算法、KMP、IP 分片、流水线时空图都用它。 */
export interface MatrixState {
  columnLabels?: string[];
  rowHeader?: string;
  rows: MatrixRow[];
  badges?: MatrixBadge[];
  caption?: string;
}

/** 甘特图：每个进程一行，可含多个片段（时间片轮转）。 */
export interface GanttRow {
  label: string;
  segments: { start: number; end: number; status?: CellStatus; text?: string }[];
}

export interface GanttState {
  total: number;
  rows: GanttRow[];
  /** 当前时刻游标 */
  cursor?: number;
  badges?: MatrixBadge[];
  caption?: string;
  /** 可附一张指标表（周转时间等） */
  metrics?: MatrixState;
}

/** 图：节点使用固定坐标（0–100 × 0–70）。 */
export interface GraphNode {
  id: string;
  label?: string;
  x: number;
  y: number;
  status?: CellStatus;
}

export interface GraphEdge {
  from: string;
  to: string;
  status?: CellStatus;
  weight?: number;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  badges?: MatrixBadge[];
  caption?: string;
}

export function cell(text: string | number, status?: CellStatus): MatrixCell {
  return { text: String(text), status };
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number';
  hint?: string;
  placeholder?: string;
}

/** 输入统一用字符串保存，天然可放进 URL 分享。 */
export type VisualInput = Record<string, string>;

export interface VisualVariant {
  id: string;
  label: string;
  build: (input: VisualInput) => AnimFrame[];
}

export interface VisualDef {
  id: string;
  title: string;
  subject: SubjectId;
  blurb: string;
  view: ViewKind;
  fields: FieldDef[];
  defaults: VisualInput;
  variants: VisualVariant[];
  /** 经典例题按钮：一键填入课堂例题参数。 */
  example?: { label: string; input: VisualInput };
}

/* ---------------- 输入解析工具 ---------------- */

export function num(raw: string | undefined, fallback: number): number {
  const value = Number((raw ?? '').trim());
  return Number.isFinite(value) ? value : fallback;
}

export function intIn(raw: string | undefined, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(num(raw, fallback))));
}

/** 解析 "5 2 9 1" 或 "5,2,9,1" 这类序列。 */
export function parseSeries(raw: string | undefined, fallback: number[], maxLen = 14): number[] {
  const values = (raw ?? '')
    .split(/[^0-9]+/)
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 99);
  if (!values.length) return fallback;
  return values.slice(0, maxLen);
}
