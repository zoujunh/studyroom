import type { AnimFrame } from './types';

/**
 * 页面置换：OPT / FIFO / LRU 的逐步模拟。
 * 输入页面序列与物理块数，输出每一步的内存快照 + 缺页统计。
 */

export type PagingAlgo = 'opt' | 'fifo' | 'lru';

export const DEFAULT_REFS = '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1';
export const DEFAULT_FRAME_COUNT = 3;

export const PAGING_ALGORITHMS: { id: PagingAlgo; label: string; blurb: string }[] = [
  { id: 'opt', label: 'OPT', blurb: '理论最优，但需要预知未来，无法实现' },
  { id: 'fifo', label: 'FIFO', blurb: '实现简单，可能出现 Belady 异常' },
  { id: 'lru', label: 'LRU', blurb: '性能接近 OPT，但需要额外硬件/开销大' },
];

export interface PagingStep {
  page: number;
  hit: boolean;
  evicted: number | null;
  memory: (number | null)[];
}

export interface PagingState {
  memory: (number | null)[];
  current: number | null;
  stepIndex: number;
  total: number;
  hit: boolean;
  evicted: number | null;
  faults: number;
  hits: number;
  done: boolean;
}

/** 逐步模拟一种置换算法。 */
export function simulatePaging(refs: number[], frameCount: number, algo: PagingAlgo): PagingStep[] {
  const memory: (number | null)[] = new Array(frameCount).fill(null);
  const loadedAt = new Map<number, number>();
  const lastUsed = new Map<number, number>();
  const steps: PagingStep[] = [];

  refs.forEach((page, index) => {
    let hit = false;
    let evicted: number | null = null;

    if (memory.includes(page)) {
      hit = true;
    } else {
      const empty = memory.indexOf(null);
      if (empty >= 0) {
        memory[empty] = page;
      } else {
        let victim = 0;
        if (algo === 'fifo') {
          let oldest = Infinity;
          memory.forEach((p, i) => {
            const t = loadedAt.get(p as number) ?? 0;
            if (t < oldest) {
              oldest = t;
              victim = i;
            }
          });
        } else if (algo === 'lru') {
          let oldest = Infinity;
          memory.forEach((p, i) => {
            const t = lastUsed.get(p as number) ?? -1;
            if (t < oldest) {
              oldest = t;
              victim = i;
            }
          });
        } else {
          // OPT：淘汰「将来最晚才会再被访问」的页；不再出现的记为 Infinity 优先淘汰。
          let farthest = -1;
          memory.forEach((p, i) => {
            const next = refs.indexOf(p as number, index + 1);
            const distance = next === -1 ? Number.MAX_SAFE_INTEGER : next;
            if (distance > farthest) {
              farthest = distance;
              victim = i;
            }
          });
        }
        evicted = memory[victim];
        memory[victim] = page;
      }
      loadedAt.set(page, index);
    }

    lastUsed.set(page, index);
    steps.push({ page, hit, evicted, memory: [...memory] });
  });

  return steps;
}

export function buildPagingFrames(
  refs: number[],
  frameCount: number,
  algo: PagingAlgo,
): AnimFrame<PagingState>[] {
  const label = PAGING_ALGORITHMS.find((a) => a.id === algo)?.label ?? algo;
  const steps = simulatePaging(refs, frameCount, algo);
  const frames: AnimFrame<PagingState>[] = [];
  const blank = new Array(frameCount).fill(null) as (number | null)[];

  frames.push({
    state: {
      memory: blank,
      current: null,
      stepIndex: -1,
      total: refs.length,
      hit: false,
      evicted: null,
      faults: 0,
      hits: 0,
      done: false,
    },
    note: `页面序列 ${refs.length} 次访问、物理块 ${frameCount} 个，算法 ${label}。点「播放」或「单步」开始。`,
    counters: { 缺页: 0, 命中: 0 },
  });

  let faults = 0;
  let hits = 0;
  steps.forEach((step, index) => {
    if (step.hit) hits += 1;
    else faults += 1;
    const prefix = `第 ${index + 1} 步：访问页面 ${step.page} —— `;
    let note: string;
    if (step.hit) {
      note = `${prefix}命中，已在内存中`;
    } else if (step.evicted !== null) {
      note = `${prefix}缺页，淘汰 ${step.evicted}（${
        algo === 'opt' ? '它将来最晚才被用到' : algo === 'fifo' ? '它最早进入内存' : '它最久没被访问'
      }）`;
    } else {
      note = `${prefix}缺页，但还有空闲块，直接装入`;
    }
    frames.push({
      state: {
        memory: step.memory,
        current: step.page,
        stepIndex: index,
        total: refs.length,
        hit: step.hit,
        evicted: step.evicted,
        faults,
        hits,
        done: index === steps.length - 1,
      },
      note,
      counters: {
        缺页: faults,
        命中: hits,
        缺页率: Math.round((faults / (index + 1)) * 100),
      },
    });
  });

  frames.push({
    state: {
      memory: steps.length ? steps[steps.length - 1].memory : blank,
      current: null,
      stepIndex: steps.length - 1,
      total: refs.length,
      hit: false,
      evicted: null,
      faults,
      hits,
      done: true,
    },
    note: `跑完全序列：${label} 共缺页 ${faults} 次，缺页率 ${Math.round(
      (faults / Math.max(1, refs.length)) * 100,
    )}%。${PAGING_ALGORITHMS.find((a) => a.id === algo)?.blurb ?? ''}`,
    counters: {
      缺页: faults,
      命中: hits,
      缺页率: Math.round((faults / Math.max(1, refs.length)) * 100),
    },
  });

  return frames;
}

/** 三种算法并排对比（对应截图里那张命中/缺页表）。 */
export function comparePaging(refs: number[], frameCount: number) {
  return PAGING_ALGORITHMS.map((algo) => {
    const steps = simulatePaging(refs, frameCount, algo.id);
    const faults = steps.filter((s) => !s.hit).length;
    return {
      ...algo,
      steps,
      faults,
      rate: refs.length ? Math.round((faults / refs.length) * 100) : 0,
    };
  });
}
