import type { AnimFrame, CellStatus, MatrixState } from './types';
import { cell } from './types';

/** 银行家算法：逐步做安全性检查，直到找到安全序列或判定不安全。 */

export interface BankerData {
  id: string;
  label: string;
  resources: string[];
  available: number[];
  processes: { pid: string; alloc: number[]; need: number[] }[];
}

/** 经典安全例题：安全序列 P1 → P3 → P4 → P2 → P0 */
export const BANKER_SAFE: BankerData = {
  id: 'safe',
  label: '安全例题',
  resources: ['A', 'B', 'C'],
  available: [3, 3, 2],
  processes: [
    { pid: 'P0', alloc: [0, 1, 0], need: [7, 4, 3] },
    { pid: 'P1', alloc: [2, 0, 0], need: [1, 2, 2] },
    { pid: 'P2', alloc: [3, 0, 2], need: [6, 0, 0] },
    { pid: 'P3', alloc: [2, 1, 1], need: [0, 1, 1] },
    { pid: 'P4', alloc: [0, 0, 2], need: [4, 3, 1] },
  ],
};

/** 把可用资源改小，任何进程都无法满足 → 不安全状态 */
export const BANKER_UNSAFE: BankerData = {
  ...BANKER_SAFE,
  id: 'unsafe',
  label: '不安全例题',
  available: [1, 1, 0],
};

const vector = (values: number[]): string => values.join(' ');
const leq = (need: number[], work: number[]): boolean => need.every((value, index) => value <= work[index]);

export function buildBanker(data: BankerData): AnimFrame<MatrixState>[] {
  const frames: AnimFrame<MatrixState>[] = [];
  const work = [...data.available];
  const finished: string[] = [];
  const sequence: string[] = [];
  const done = new Set<string>();

  const table = (activePid: string | null, marks: Map<string, CellStatus>): MatrixState => ({
    columnLabels: ['Allocation', 'Need', 'Work + Allocation', 'Finish'],
    rowHeader: '进程',
    rows: data.processes.map((process) => ({
      label: process.pid,
      status: activePid === process.pid ? 'active' : done.has(process.pid) ? 'done' : 'idle',
      cells: [
        cell(vector(process.alloc)),
        cell(vector(process.need), marks.get(process.pid)),
        cell(done.has(process.pid) ? '已回收' : '—'),
        cell(done.has(process.pid) ? 'true' : 'false', done.has(process.pid) ? 'ok' : 'idle'),
      ],
    })),
    badges: [
      { label: 'Work', value: vector(work), tone: 'brand' },
      { label: '安全序列', value: sequence.length ? sequence.join(' → ') : '（空）', tone: 'good' },
      { label: '已完成', value: `${finished.length} / ${data.processes.length}` },
    ],
    caption: `资源类型：${data.resources.join('、')}；Work 初值等于 Available = ${vector(data.available)}。`,
  });

  frames.push({
    state: table(null, new Map()),
    note: `安全性检查开始：Work = Available = ${vector(data.available)}。逐个检查「Need ≤ Work」，能满足就让该进程执行完并回收它的 Allocation。`,
    counters: { 已完成: 0 },
  });

  let progressed = true;
  let guard = 0;
  while (done.size < data.processes.length && progressed && guard < 40) {
    progressed = false;
    guard += 1;
    for (const process of data.processes) {
      if (done.has(process.pid)) continue;
      const ok = leq(process.need, work);
      const marks = new Map<string, CellStatus>([[process.pid, ok ? 'ok' : 'bad']]);
      frames.push({
        state: table(process.pid, marks),
        note: ok
          ? `检查 ${process.pid}：Need(${vector(process.need)}) ≤ Work(${vector(work)})，可以满足 → ${process.pid} 执行完并释放资源。`
          : `检查 ${process.pid}：Need(${vector(process.need)}) 不满足 Work(${vector(work)})，暂时跳过。`,
        counters: { 已完成: done.size },
      });
      if (!ok) continue;

      for (let i = 0; i < work.length; i += 1) work[i] += process.alloc[i];
      done.add(process.pid);
      finished.push(process.pid);
      sequence.push(process.pid);
      progressed = true;
      frames.push({
        state: table(process.pid, new Map([[process.pid, 'ok']])),
        note: `${process.pid} 完成，回收 Allocation(${vector(process.alloc)}) → 新的 Work = ${vector(work)}。`,
        counters: { 已完成: done.size },
      });
    }
  }

  const safe = done.size === data.processes.length;
  const finalTable = table(null, new Map());
  finalTable.badges = [
    { label: 'Work', value: vector(work), tone: 'brand' },
    {
      label: '安全序列',
      value: safe ? sequence.join(' → ') : '不存在',
      tone: safe ? 'good' : 'again',
    },
  ];
  finalTable.rows = finalTable.rows.map((row) => ({
    ...row,
    cells: row.cells.map((item) =>
      typeof item === 'string' ? item : { ...item, status: done.has(row.label) ? 'ok' : 'bad' },
    ),
  }));

  frames.push({
    state: finalTable,
    note: safe
      ? `存在安全序列：${sequence.join(' → ')}，系统处于安全状态。注意安全序列可能不唯一，只要找到一个就说明安全。`
      : `不存在安全序列：剩余进程的 Need 都无法被当前 Work = ${vector(work)} 满足，系统处于不安全状态（此时不一定已经死锁，但不能保证一定不死锁）。`,
    counters: { 已完成: done.size },
  });

  return frames;
}

export const BANKER_DATASETS: BankerData[] = [BANKER_SAFE, BANKER_UNSAFE];
