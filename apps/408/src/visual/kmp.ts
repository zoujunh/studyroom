import type { AnimFrame, CellStatus, MatrixState } from './types';
import { cell } from './types';

/** KMP：逐步求 next 与 nextval 数组（采用 next[1] = 0 的教材约定）。 */

export const DEFAULT_PATTERN = 'ababaa';

export type KmpMode = 'next' | 'nextval';

export const KMP_MODES: { id: KmpMode; label: string; blurb: string }[] = [
  { id: 'next', label: 'next 数组', blurb: 'next[j] 表示模式串第 j 个字符失配时，j 应该回退到哪个位置' },
  {
    id: 'nextval',
    label: 'nextval 数组',
    blurb: '若 P[j] 与 P[next[j]] 相同，则 nextval[j] = nextval[next[j]]，可减少无意义的比较',
  },
];

interface NextTrace {
  next: number[];
  frames: { i: number; j: number; note: string; comparing?: [number, number] }[];
}

function computeNext(pattern: string): NextTrace {
  const m = pattern.length;
  const next = new Array<number>(m + 1).fill(0);
  const frames: NextTrace['frames'] = [];
  const at = (k: number) => pattern[k - 1] ?? '';

  next[1] = 0;
  frames.push({ i: 1, j: 0, note: `约定：next[1] = 0。此时 i = 1、j = 0。` });

  let i = 1;
  let j = 0;
  let guard = 0;
  while (i < m && guard < 200) {
    guard += 1;
    if (j === 0) {
      i += 1;
      j += 1;
      next[i] = j;
      frames.push({
        i,
        j,
        note: `j = 0（已是串首），无法再回退：i 和 j 同时后移，得到 next[${i}] = ${j}。`,
      });
    } else if (at(i) === at(j)) {
      i += 1;
      j += 1;
      next[i] = j;
      frames.push({
        i,
        j,
        comparing: [i - 1, j - 1],
        note: `比较 P[${i - 1}] = '${at(i - 1)}' 与 P[${j - 1}] = '${at(j - 1)}'：相等 → i、j 后移，next[${i}] = ${j}。`,
      });
    } else {
      j = next[j];
      frames.push({
        i,
        j,
        note: `字符不等：j 回退到 next[${i}] 指向的位置，新的 j = ${j}。`,
      });
    }
  }
  return { next, frames };
}

function computeNextval(pattern: string, next: number[]): { nextval: number[]; frames: NextTrace['frames'] } {
  const m = pattern.length;
  const nextval = new Array<number>(m + 1).fill(0);
  const frames: NextTrace['frames'] = [];
  const at = (k: number) => pattern[k - 1] ?? '';

  nextval[1] = 0;
  frames.push({ i: 1, j: 0, note: '约定：nextval[1] = 0。' });
  for (let i = 2; i <= m; i += 1) {
    if (next[i] === 0) {
      nextval[i] = 0;
      frames.push({ i, j: 0, note: `next[${i}] = 0 → nextval[${i}] = 0。` });
    } else if (at(i) === at(next[i])) {
      nextval[i] = nextval[next[i]];
      frames.push({
        i,
        j: next[i],
        comparing: [i, next[i]],
        note: `P[${i}] = '${at(i)}' 与 P[${next[i]}] = '${at(next[i])}' 相同 → nextval[${i}] = nextval[${next[i]}] = ${nextval[i]}。`,
      });
    } else {
      nextval[i] = next[i];
      frames.push({
        i,
        j: next[i],
        comparing: [i, next[i]],
        note: `P[${i}] = '${at(i)}' 与 P[${next[i]}] = '${at(next[i])}' 不同 → nextval[${i}] = next[${i}] = ${nextval[i]}。`,
      });
    }
  }
  return { nextval, frames };
}

function buildTable(
  pattern: string,
  next: number[],
  nextval: number[],
  current: number,
  reveal: { next: number; nextval: number },
): MatrixState {
  const m = pattern.length;
  const columns = Array.from({ length: m }, (_, index) => `${index + 1}`);
  const status = (index: number): CellStatus | undefined => (index === current ? 'active' : undefined);

  return {
    columnLabels: columns,
    rowHeader: 'j \\ 内容',
    rows: [
      {
        label: '模式串 P',
        cells: Array.from({ length: m }, (_, index) => cell(pattern[index] ?? '', status(index + 1))),
      },
      {
        label: 'next',
        cells: Array.from({ length: m }, (_, index) => {
          const j = index + 1;
          if (j > reveal.next) return cell('·', 'idle');
          return cell(next[j], status(j) ?? (j === current ? 'done' : 'ok'));
        }),
      },
      {
        label: 'nextval',
        cells: Array.from({ length: m }, (_, index) => {
          const j = index + 1;
          if (j > reveal.nextval) return cell('·', 'idle');
          return cell(nextval[j], status(j) ?? 'ok');
        }),
      },
    ],
    badges: [
      { label: '模式串', value: pattern },
      { label: '长度', value: String(m) },
    ],
    caption: '约定 next[1] = 0；模式串下标从 1 开始。不同教材的编号可能整体平移一位，注意与题目约定对齐。',
  };
}

export function buildKmp(patternRaw: string, mode: KmpMode): AnimFrame<MatrixState>[] {
  const pattern = (patternRaw || DEFAULT_PATTERN).replace(/\s+/g, '').slice(0, 12) || DEFAULT_PATTERN;
  const { next, frames: nextFrames } = computeNext(pattern);
  const { nextval, frames: nextvalFrames } = computeNextval(pattern, next);
  const m = pattern.length;

  const frames: AnimFrame<MatrixState>[] = [];
  frames.push({
    state: buildTable(pattern, next, nextval, 0, { next: 0, nextval: 0 }),
    note: `模式串 P = "${pattern}"，长度 ${m}。先求 next，再求 nextval。点「单步」逐步推进。`,
    counters: { 长度: m },
  });

  if (mode === 'next') {
    nextFrames.forEach((step, index) => {
      frames.push({
        state: buildTable(pattern, next, nextval, step.i, { next: step.i, nextval: 0 }),
        note: `第 ${index + 1} 步（i = ${step.i}，j = ${step.j}）：${step.note}`,
        counters: { i: step.i, j: step.j },
      });
    });
    frames.push({
      state: buildTable(pattern, next, nextval, 0, { next: m, nextval: 0 }),
      note: `next 数组完成：${next
        .slice(1, m + 1)
        .map((value, index) => `next[${index + 1}] = ${value}`)
        .join('，')}。含义：第 j 个字符失配时，模式串指针回退到 next[j]。`,
      counters: { 长度: m },
    });
  } else {
    nextFrames.forEach((step) => {
      frames.push({
        state: buildTable(pattern, next, nextval, step.i, { next: step.i, nextval: 0 }),
        note: `先把 next 求出来（i = ${step.i}）：${step.note}`,
        counters: { i: step.i, j: step.j },
      });
    });
    nextvalFrames.forEach((step, index) => {
      frames.push({
        state: buildTable(pattern, next, nextval, step.i, { next: m, nextval: step.i }),
        note: `nextval 第 ${index + 1} 步（j = ${step.i}）：${step.note}`,
        counters: { j: step.i },
      });
    });
    frames.push({
      state: buildTable(pattern, next, nextval, 0, { next: m, nextval: m }),
      note: `nextval 完成：${nextval
        .slice(1, m + 1)
        .map((value, index) => `nextval[${index + 1}] = ${value}`)
        .join('，')}。使用 nextval 可以跳过「回退后仍是失配字符」的无效比较。`,
      counters: { 长度: m },
    });
  }

  return frames;
}
