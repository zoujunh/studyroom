import { BANKER_DATASETS, buildBanker } from './banker';
import { buildCache, CACHE_MODES, DEFAULT_ADDRESSES, parseAddresses } from './cache';
import { buildFragment, DEFAULT_DATAGRAM_LENGTH, DEFAULT_MTU } from './fragment';
import { buildGraph, GRAPH_MODES } from './graph';
import { buildKmp, DEFAULT_PATTERN, KMP_MODES } from './kmp';
import { buildPagingFrames, DEFAULT_FRAME_COUNT, DEFAULT_REFS, PAGING_ALGORITHMS } from './paging';
import { buildPipeline, PIPELINE_VARIANTS } from './pipeline';
import { buildScheduling, DEFAULT_PROCESSES, parseProcesses, SCHED_ALGOS } from './scheduling';
import { DEFAULT_SERIES, SORT_ALGORITHMS } from './sort';
import { buildTcp, TCP_SCENARIOS } from './tcp';
import { intIn, parseSeries, type VisualDef } from './types';

const FALLBACK_SERIES = [5, 2, 9, 1, 7, 4, 8, 3, 6, 10, 0, 11];
const FALLBACK_REFS = DEFAULT_REFS.split(' ').map(Number);

/**
 * 所有可视化的注册表。
 * 每个条目只声明「输入字段 + 若干算法/场景 + 纯函数生成器」，
 * 播放控制与渲染由 StepPlayer 和对应视图复用。
 */
export const VISUALS: VisualDef[] = [
  {
    id: 'sort',
    title: '排序动画',
    subject: 'ds',
    blurb: '冒泡 / 选择 / 插入 / 快排 / 归并 / 堆排六种逐步演示，可调速、可回看任意一步',
    view: 'bars',
    fields: [
      {
        key: 'data',
        label: '数据',
        type: 'text',
        hint: '空格或逗号分隔，最多 14 个（0–99）',
        placeholder: DEFAULT_SERIES,
      },
    ],
    defaults: { data: DEFAULT_SERIES, algo: 'quick' },
    example: { label: '用经典例题', input: { data: DEFAULT_SERIES } },
    variants: SORT_ALGORITHMS.map((algo) => ({
      id: algo.id,
      label: algo.label,
      build: (input) => algo.run(parseSeries(input.data, FALLBACK_SERIES)),
    })),
  },
  {
    id: 'paging',
    title: '页面置换',
    subject: 'os',
    blurb: 'OPT / FIFO / LRU 三算法并排演示 + 缺页统计表，可改页面序列与物理块数',
    view: 'frames',
    fields: [
      { key: 'refs', label: '页面序列', type: 'text', hint: '最多 40 个页号', placeholder: DEFAULT_REFS },
      { key: 'frames', label: '物理块数', type: 'number', hint: '1–6 个' },
    ],
    defaults: { refs: DEFAULT_REFS, frames: String(DEFAULT_FRAME_COUNT), algo: 'lru' },
    example: { label: '用经典例题', input: { refs: DEFAULT_REFS, frames: '3' } },
    variants: PAGING_ALGORITHMS.map((algo) => ({
      id: algo.id,
      label: algo.label,
      build: (input) =>
        buildPagingFrames(
          parseSeries(input.refs, FALLBACK_REFS, 40),
          intIn(input.frames, DEFAULT_FRAME_COUNT, 1, 6),
          algo.id,
        ),
    })),
  },
  {
    id: 'tcp',
    title: 'TCP 握手挥手',
    subject: 'cn',
    blurb: '三次握手 + 四次挥手时序图，含双方状态变化与 2MSL 讲解',
    view: 'lifeline',
    fields: [],
    defaults: { algo: 'handshake' },
    variants: TCP_SCENARIOS.map((scenario) => ({
      id: scenario.id,
      label: scenario.label,
      build: () => buildTcp(scenario.id),
    })),
  },
  {
    id: 'scheduling',
    title: '进程调度',
    subject: 'os',
    blurb: 'FCFS / 短作业优先 / 时间片轮转 / 优先级：甘特图 + 周转时间表',
    view: 'gantt',
    fields: [
      {
        key: 'procs',
        label: '进程（名称 到达 服务 [优先级]）',
        type: 'text',
        hint: '分号分隔多个进程，优先级数越小越高',
        placeholder: DEFAULT_PROCESSES,
      },
      { key: 'quantum', label: '时间片（仅轮转用）', type: 'number', hint: '1–8' },
    ],
    defaults: { procs: DEFAULT_PROCESSES, quantum: '2', algo: 'rr' },
    example: { label: '用经典例题', input: { procs: DEFAULT_PROCESSES, quantum: '2' } },
    variants: SCHED_ALGOS.map((algo) => ({
      id: algo.id,
      label: algo.label,
      build: (input) =>
        buildScheduling(parseProcesses(input.procs), algo.id, intIn(input.quantum, 2, 1, 8)),
    })),
  },
  {
    id: 'banker',
    title: '银行家算法',
    subject: 'os',
    blurb: '逐步做安全性检查，找出安全序列或判定系统不安全',
    view: 'matrix',
    fields: [],
    defaults: { algo: 'safe' },
    variants: BANKER_DATASETS.map((data) => ({
      id: data.id,
      label: data.label,
      build: () => buildBanker(data),
    })),
  },
  {
    id: 'cache',
    title: 'Cache 映射',
    subject: 'co',
    blurb: '直接映射 / 二路组相联 / 全相联：地址划分、命中判断与替换',
    view: 'matrix',
    fields: [
      {
        key: 'addresses',
        label: '访问地址序列（十进制）',
        type: 'text',
        hint: '空格分隔，最多 10 个',
        placeholder: DEFAULT_ADDRESSES,
      },
    ],
    defaults: { addresses: DEFAULT_ADDRESSES, algo: 'set2' },
    example: { label: '用经典例题', input: { addresses: DEFAULT_ADDRESSES } },
    variants: CACHE_MODES.map((mode) => ({
      id: mode.id,
      label: mode.label,
      build: (input) => buildCache(parseAddresses(input.addresses), mode.id),
    })),
  },
  {
    id: 'pipeline',
    title: '指令流水线',
    subject: 'co',
    blurb: '五段流水线时空图：无冒险 / Load-Use 无转发 / 有转发，含加速比与吞吐率',
    view: 'matrix',
    fields: [],
    defaults: { algo: 'ideal' },
    variants: PIPELINE_VARIANTS.map((variant) => ({
      id: variant.id,
      label: variant.label,
      build: () => buildPipeline(variant.id),
    })),
  },
  {
    id: 'kmp',
    title: 'KMP next 数组',
    subject: 'ds',
    blurb: '逐步求出 next 与 nextval 数组（next[1] = 0 约定）',
    view: 'matrix',
    fields: [
      { key: 'pattern', label: '模式串', type: 'text', hint: '长度 ≤ 12', placeholder: DEFAULT_PATTERN },
    ],
    defaults: { pattern: DEFAULT_PATTERN, algo: 'next' },
    example: { label: '用经典例题', input: { pattern: DEFAULT_PATTERN } },
    variants: KMP_MODES.map((mode) => ({
      id: mode.id,
      label: mode.label,
      build: (input) => buildKmp(input.pattern, mode.id),
    })),
  },
  {
    id: 'fragment',
    title: 'IP 分片',
    subject: 'cn',
    blurb: '给定数据报长度与 MTU，逐片算出数据长度、片偏移与 MF',
    view: 'matrix',
    fields: [
      { key: 'length', label: '数据报总长（字节）', type: 'number', hint: '含 20 B 首部' },
      { key: 'mtu', label: 'MTU（字节）', type: 'number', hint: '以太网通常 1500' },
    ],
    defaults: {
      length: String(DEFAULT_DATAGRAM_LENGTH),
      mtu: String(DEFAULT_MTU),
      algo: 'plan',
    },
    example: {
      label: '用经典例题',
      input: { length: String(DEFAULT_DATAGRAM_LENGTH), mtu: String(DEFAULT_MTU) },
    },
    variants: [
      {
        id: 'plan',
        label: '分片计算',
        build: (input) =>
          buildFragment(
            intIn(input.length, DEFAULT_DATAGRAM_LENGTH, 21, 60000),
            intIn(input.mtu, DEFAULT_MTU, 24, 60000),
          ),
      },
    ],
  },
  {
    id: 'graph',
    title: '图遍历',
    subject: 'ds',
    blurb: 'DFS 与 BFS 的访问顺序、辅助结构（栈/队列）与生成树',
    view: 'graph',
    fields: [],
    defaults: { algo: 'dfs' },
    variants: GRAPH_MODES.map((mode) => ({
      id: mode.id,
      label: mode.label,
      build: () => buildGraph(mode.id),
    })),
  },
];

export function getVisual(id: string | undefined): VisualDef | undefined {
  if (!id) return undefined;
  return VISUALS.find((visual) => visual.id === id);
}
