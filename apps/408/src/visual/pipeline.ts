import type { AnimFrame, CellStatus, MatrixState } from './types';
import { cell } from './types';

/**
 * 指令流水线时空图。
 *
 * 为了不教错，模型假设显式写出来（界面上也会显示）：
 * - 五段流水线 IF → ID → EX → MEM → WB，每段一拍；
 * - 固定 5 条指令，**只有 I5 用到 I4 装入的数据**（经典 Load-Use 数据冒险），其余指令互不相关；
 * - 「无冒险」= 假设不存在相关，理想流水线；
 * - 「无转发」= I5 必须等 I4 写回，ID 之后插 2 个气泡；
 * - 「有转发」= I5 可在 I4 访存结束后拿到数据，ID 之后插 1 个气泡。
 */

export const PIPELINE_STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const STAGE_COUNT = PIPELINE_STAGES.length;
/** IF、ID 两个阶段之后才可能插气泡 */
const BUBBLE_AFTER = 2;

export const PIPELINE_INSTRUCTIONS = [
  'I1: SUB R4, R5, R6',
  'I2: AND R7, R8, R9',
  'I3: OR R10, R11, R12',
  'I4: LOAD R1, [x]',
  'I5: ADD R2, R1, R3',
];

export interface PipelineVariant {
  id: string;
  label: string;
  /** 插在 ID 之后的气泡数（针对 I5） */
  bubbles: number;
  blurb: string;
}

export const PIPELINE_VARIANTS: PipelineVariant[] = [
  {
    id: 'ideal',
    label: '无冒险',
    bubbles: 0,
    blurb: '理想流水线：每拍流入一条指令，n 条指令、k 段流水线共需 k + n − 1 拍。',
  },
  {
    id: 'stall',
    label: 'Load-Use（无转发）',
    bubbles: 2,
    blurb: '无转发时 I5 必须等 I4 写回（第 9 拍）才能进入 EX，因此 ID 之后要插 2 个气泡。',
  },
  {
    id: 'forward',
    label: 'Load-Use（有转发）',
    bubbles: 1,
    blurb: '有转发时 I5 可以在 I4 访存结束后就拿到数据，只需插 1 个气泡。',
  },
];

/** 每条指令的起始周期固定为 1..5（每拍流入一条）。 */
const STARTS = PIPELINE_INSTRUCTIONS.map((_, index) => index + 1);

function stagesOf(variant: PipelineVariant, instructionIndex: number) {
  const isHazard = instructionIndex === PIPELINE_INSTRUCTIONS.length - 1;
  const bubbles = isHazard ? variant.bubbles : 0;
  const timeline: (string | null)[] = [];
  for (let offset = 0; offset < BUBBLE_AFTER; offset += 1) timeline.push(PIPELINE_STAGES[offset]);
  for (let i = 0; i < bubbles; i += 1) timeline.push(null); // null = 停顿
  for (let stage = BUBBLE_AFTER; stage < STAGE_COUNT; stage += 1) timeline.push(PIPELINE_STAGES[stage]);
  return timeline;
}

function totalCycles(variant: PipelineVariant): number {
  return Math.max(
    ...PIPELINE_INSTRUCTIONS.map((_, index) => STARTS[index] + stagesOf(variant, index).length - 1),
  );
}

function buildTable(variant: PipelineVariant, upTo: number): MatrixState {
  const cycles = totalCycles(variant);
  const rows = PIPELINE_INSTRUCTIONS.map((instruction, index) => {
    const timeline = stagesOf(variant, index);
    const start = STARTS[index];
    const cells = Array.from({ length: cycles }, (_, cycleIndex) => {
      const cycle = cycleIndex + 1;
      const offset = cycle - start;
      const text = offset >= 0 && offset < timeline.length ? timeline[offset] : null;
      if (text === null && offset >= 0 && offset < timeline.length) {
        return cell('停', cycle <= upTo ? 'bad' : 'idle');
      }
      if (!text) return cell('');
      if (cycle > upTo) return cell(text, 'idle');
      return cell(text, cycle === upTo ? 'done' : 'active');
    });
    return {
      label: instruction,
      cells,
      status: (upTo >= start && upTo < start + timeline.length ? 'active' : undefined) as
        | CellStatus
        | undefined,
    };
  });

  return {
    columnLabels: Array.from({ length: cycles }, (_, i) => `${i + 1}`),
    rowHeader: '指令 \\ 时钟',
    rows,
    badges: [
      { label: '模型', value: variant.label },
      { label: '指令数', value: String(PIPELINE_INSTRUCTIONS.length) },
      { label: '流水段数', value: String(STAGE_COUNT) },
      { label: '总周期', value: String(cycles), tone: 'good' },
    ],
    caption: variant.blurb,
  };
}

export function buildPipeline(variantId: string): AnimFrame<MatrixState>[] {
  const variant = PIPELINE_VARIANTS.find((item) => item.id === variantId) ?? PIPELINE_VARIANTS[0];
  const cycles = totalCycles(variant);
  const instructionCount = PIPELINE_INSTRUCTIONS.length;
  const serialCycles = instructionCount * STAGE_COUNT;
  const speedup = serialCycles / cycles;
  const throughput = instructionCount / cycles;
  const frames: AnimFrame<MatrixState>[] = [];

  frames.push({
    state: buildTable(variant, 0),
    note: `${variant.blurb} 指令序列：${PIPELINE_INSTRUCTIONS.join('；')}。点「单步」逐拍推进。`,
    counters: { 总周期: cycles },
  });

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    const running: string[] = [];
    PIPELINE_INSTRUCTIONS.forEach((_, index) => {
      const timeline = stagesOf(variant, index);
      const offset = cycle - STARTS[index];
      if (offset < 0 || offset >= timeline.length) return;
      const stage = timeline[offset];
      running.push(stage === null ? `I${index + 1} 停顿` : `I${index + 1} 在 ${stage}`);
    });
    frames.push({
      state: buildTable(variant, cycle),
      note: `第 ${cycle} 拍：${running.length ? running.join('，') : '流水线空转'}。`,
      counters: { 当前拍: cycle, 总周期: cycles },
    });
  }

  frames.push({
    state: buildTable(variant, cycles),
    note: `时空图完成：${instructionCount} 条指令、${STAGE_COUNT} 段流水线共需 ${cycles} 拍（理想 ${instructionCount + STAGE_COUNT - 1} 拍）；串行执行需要 ${serialCycles} 拍，因此加速比 = ${serialCycles} / ${cycles} ≈ ${speedup.toFixed(
      2,
    )}，吞吐率 = ${instructionCount} / ${cycles} ≈ ${throughput.toFixed(2)} 条/拍。理想情况下加速比趋近于 ${STAGE_COUNT}。`,
    counters: {
      总周期: cycles,
      理想周期: instructionCount + STAGE_COUNT - 1,
      加速比: Math.round(speedup * 100) / 100,
      吞吐率: Math.round(throughput * 100) / 100,
    },
  });

  return frames;
}
