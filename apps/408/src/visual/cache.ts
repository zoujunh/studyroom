import type { AnimFrame, CellStatus, MatrixState } from './types';
import { cell } from './types';

/** Cache 映射方式：直接映射 / 二路组相联 / 全相联，逐步演示地址划分与命中判断。 */

export type CacheMode = 'direct' | 'set2' | 'full';

/** 统一设定：块大小 16 B，Cache 共 8 行，主存按字节编址。 */
export const BLOCK_SIZE = 16;
export const CACHE_LINES = 8;

export const CACHE_MODES: {
  id: CacheMode;
  label: string;
  lines: number;
  ways: number;
  indexBits: number;
  blurb: string;
}[] = [
  {
    id: 'direct',
    label: '直接映射',
    lines: CACHE_LINES,
    ways: 1,
    indexBits: 3,
    blurb: '主存块只能放到唯一一行：行号 = 块号 mod 8，冲突率最高但比较电路最简单',
  },
  {
    id: 'set2',
    label: '二路组相联',
    lines: CACHE_LINES,
    ways: 2,
    indexBits: 2,
    blurb: '分成 4 组、每组 2 行：组号 = 块号 mod 4，块可放在组内任意一行，兼顾冲突与成本',
  },
  {
    id: 'full',
    label: '全相联',
    lines: CACHE_LINES,
    ways: 8,
    indexBits: 0,
    blurb: '主存块可放任意一行：没有索引位，标记位最长，需要与所有行比较，冲突最少但电路最复杂',
  },
];

export const DEFAULT_ADDRESSES = '0 16 1024 16 2048 0 1040';

interface CacheLine {
  valid: boolean;
  tag: number;
  block: number;
  lastUsed: number;
}

export function parseAddresses(raw: string | undefined): number[] {
  const values = (raw ?? '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0 && value < 65536);
  return values.length ? values.slice(0, 10) : DEFAULT_ADDRESSES.split(' ').map(Number);
}

export function buildCache(addresses: number[], modeId: CacheMode): AnimFrame<MatrixState>[] {
  const mode = CACHE_MODES.find((item) => item.id === modeId) ?? CACHE_MODES[0];
  const sets = mode.lines / mode.ways;
  const lines: CacheLine[] = Array.from({ length: mode.lines }, () => ({
    valid: false,
    tag: 0,
    block: 0,
    lastUsed: -1,
  }));
  const frames: AnimFrame<MatrixState>[] = [];
  let hitCount = 0;
  let missCount = 0;
  let clock = 0;

  const table = (): MatrixState => ({
    columnLabels: ['有效位', '标记', '数据块号'],
    rowHeader: mode.ways === 1 ? 'Cache 行' : `Cache 行（每 ${mode.ways} 行一组）`,
    rows: lines.map((line, index) => ({
      label: `第 ${index} 行${sets > 1 ? `（第 ${Math.floor(index / mode.ways)} 组）` : ''}`,
      cells: [
        cell(line.valid ? 1 : 0, line.valid ? 'ok' : 'idle'),
        cell(line.valid ? line.tag : '—'),
        cell(line.valid ? line.block : '—'),
      ],
    })),
    badges: [
      { label: '映射方式', value: mode.label },
      { label: '块大小', value: `${BLOCK_SIZE} B` },
      { label: '命中', value: String(hitCount), tone: 'good' },
      { label: '缺失', value: String(missCount), tone: 'again' },
    ],
    caption: mode.blurb,
  });

  frames.push({
    state: table(),
    note: `块大小 ${BLOCK_SIZE} B（块内地址 ${Math.log2(BLOCK_SIZE)} 位），Cache 共 ${CACHE_LINES} 行，映射方式：${mode.label}。依次访问地址：${addresses.join('、')}。`,
    counters: { 命中: 0, 缺失: 0 },
  });

  addresses.forEach((address, order) => {
    clock += 1;
    const block = Math.floor(address / BLOCK_SIZE);
    const offset = address % BLOCK_SIZE;
    const index =
      mode.ways === 1 ? block % mode.lines : sets > 1 ? block % sets : 0;
    const tag = mode.ways === 1 ? Math.floor(block / mode.lines) : sets > 1 ? Math.floor(block / sets) : block;

    // 在第 index 组（或全相联的全部行）里找
    const candidates = mode.ways === 1
      ? [index]
      : Array.from({ length: mode.ways }, (_, way) => index * mode.ways + way);
    const hitLine = candidates.find((lineIndex) => lines[lineIndex].valid && lines[lineIndex].tag === tag);

    let resultNote: string;
    if (hitLine !== undefined) {
      hitCount += 1;
      lines[hitLine].lastUsed = clock;
      resultNote = `地址 ${address} → 块号 ${block}，标记 ${tag}，${
        mode.ways === 1 ? `行号 ${index}` : sets > 1 ? `组号 ${index}` : '全相联（无索引）'
      }，块内偏移 ${offset}。第 ${hitLine} 行已有该块 → **命中**。`;
    } else {
      missCount += 1;
      const empty = candidates.find((lineIndex) => !lines[lineIndex].valid);
      const target =
        empty !== undefined
          ? empty
          : candidates.reduce((best, lineIndex) =>
              lines[lineIndex].lastUsed < lines[best].lastUsed ? lineIndex : best,
            );
      const evicted = !lines[target].valid ? null : lines[target].block;
      lines[target] = { valid: true, tag, block, lastUsed: clock };
      resultNote = `地址 ${address} → 块号 ${block}，标记 ${tag}，${
        mode.ways === 1 ? `行号 ${index}` : sets > 1 ? `组号 ${index}` : '全相联（无索引）'
      }，块内偏移 ${offset}。${
        empty !== undefined
          ? `第 ${target} 行为空 → 直接装入`
          : `第 ${target} 行被块 ${evicted} 占用 → **缺失并替换**（替换后标记 ${tag}）`
      }，本次**缺失**。`;
    }

    const marked = table();
    const targetLine = hitLine ?? candidates[0];
    marked.rows = marked.rows.map((row, rowIndex) => ({
      ...row,
      status: rowIndex === targetLine ? 'active' : undefined,
      cells: row.cells.map((item) =>
        typeof item === 'string'
          ? item
          : { ...item, status: (rowIndex === targetLine ? 'done' : item.status) as CellStatus },
      ),
    }));

    frames.push({
      state: marked,
      note: `第 ${order + 1} 次访问：${resultNote}`,
      counters: { 命中: hitCount, 缺失: missCount },
    });
  });

  const finalTable = table();
  finalTable.badges = [
    { label: '映射方式', value: mode.label },
    { label: '命中次数', value: String(hitCount), tone: 'good' },
    { label: '缺失次数', value: String(missCount), tone: 'again' },
    { label: '命中率', value: `${Math.round((hitCount / Math.max(1, addresses.length)) * 100)}%` },
  ];
  frames.push({
    state: finalTable,
    note: `访问序列结束：命中 ${hitCount} 次、缺失 ${missCount} 次，命中率 ${Math.round(
      (hitCount / Math.max(1, addresses.length)) * 100,
    )}%。地址划分：块内地址 ${Math.log2(BLOCK_SIZE)} 位${
      mode.ways === 1 ? `，行号 ${mode.indexBits} 位` : sets > 1 ? `，组号 ${mode.indexBits} 位` : '，无索引位'
    }，其余高位为标记。`,
    counters: {
      命中: hitCount,
      缺失: missCount,
      命中率: Math.round((hitCount / Math.max(1, addresses.length)) * 100),
    },
  });

  return frames;
}
