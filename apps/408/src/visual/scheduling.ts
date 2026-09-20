import type { AnimFrame, CellStatus, GanttState, MatrixState } from './types';
import { cell } from './types';

/** 进程调度：FCFS / SJF / 时间片轮转 / 优先级（非抢占），输出甘特图。 */

export type SchedAlgo = 'fcfs' | 'sjf' | 'rr' | 'priority';

export interface SchedProcess {
  pid: string;
  /** 到达时间 */
  arrive: number;
  /** 服务时间 */
  burst: number;
  /** 优先级（数越小越高） */
  priority: number;
}

export const SCHED_ALGOS: { id: SchedAlgo; label: string; blurb: string }[] = [
  { id: 'fcfs', label: 'FCFS', blurb: '先来先服务、非抢占：实现最简单，长作业先到会让平均周转时间变差' },
  { id: 'sjf', label: '短作业优先', blurb: '非抢占 SJF：平均周转时间最小，但长作业可能饥饿' },
  { id: 'rr', label: '时间片轮转', blurb: '按时间片轮流执行：响应快；时间片过大退化成 FCFS，过小则切换开销高' },
  { id: 'priority', label: '优先级', blurb: '非抢占优先级调度：数越小优先级越高，低优先级可能饥饿' },
];

export const DEFAULT_PROCESSES = 'P1 0 7 3; P2 2 4 1; P3 4 1 4; P4 5 4 2';

export function parseProcesses(raw: string | undefined): SchedProcess[] {
  const groups = (raw ?? '')
    .split(/[;；\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed: SchedProcess[] = [];
  for (const group of groups) {
    const parts = group.split(/[\s,，]+/).filter(Boolean);
    if (parts.length < 3) continue;
    const arrive = Number(parts[1]);
    const burst = Number(parts[2]);
    const priority = parts[3] !== undefined ? Number(parts[3]) : 3;
    if (!Number.isFinite(arrive) || !Number.isFinite(burst) || burst <= 0) continue;
    parsed.push({ pid: parts[0], arrive: Math.max(0, Math.round(arrive)), burst: Math.round(burst), priority });
  }
  return parsed.length ? parsed.slice(0, 6) : parseProcesses(DEFAULT_PROCESSES);
}

interface Step {
  /** 这一步结束的时刻 */
  t: number;
  pid: string;
  start: number;
  ready: string[];
}

function simulate(
  processes: SchedProcess[],
  algo: SchedAlgo,
  quantum: number,
): { steps: Step[]; finishAt: Map<string, number> } {
  const remaining = new Map(processes.map((p) => [p.pid, p.burst]));
  const finishAt = new Map<string, number>();
  const sorted = [...processes].sort((a, b) => a.arrive - b.arrive || a.pid.localeCompare(b.pid));
  const queue: string[] = [];
  const steps: Step[] = [];
  let cursor = 0;
  let index = 0;
  let done = 0;
  const isRr = algo === 'rr';

  const enqueueArrivals = (upto: number) => {
    while (index < sorted.length && sorted[index].arrive <= upto) {
      queue.push(sorted[index].pid);
      index += 1;
    }
  };
  enqueueArrivals(0);

  const pick = (): string | null => {
    const candidates = sorted.filter((p) => (remaining.get(p.pid) ?? 0) > 0 && p.arrive <= cursor);
    if (!candidates.length) return null;
    if (algo === 'fcfs') {
      return candidates.sort((a, b) => a.arrive - b.arrive || a.pid.localeCompare(b.pid))[0].pid;
    }
    if (algo === 'sjf') {
      return candidates.sort(
        (a, b) => (remaining.get(a.pid) ?? 0) - (remaining.get(b.pid) ?? 0) || a.arrive - b.arrive,
      )[0].pid;
    }
    return candidates.sort((a, b) => a.priority - b.priority || a.arrive - b.arrive)[0].pid;
  };

  let guard = 0;
  while (done < sorted.length && guard < 400) {
    guard += 1;
    let pid: string;
    let run: number;
    if (isRr) {
      if (!queue.length) {
        cursor += 1;
        enqueueArrivals(cursor);
        continue;
      }
      pid = queue.shift() as string;
      run = Math.min(quantum, remaining.get(pid) ?? 0);
    } else {
      const chosen = pick();
      if (!chosen) {
        cursor += 1;
        continue;
      }
      pid = chosen;
      run = remaining.get(pid) ?? 0;
    }

    const start = cursor;
    cursor += run;
    remaining.set(pid, (remaining.get(pid) ?? 0) - run);
    enqueueArrivals(cursor);
    if ((remaining.get(pid) ?? 0) === 0) {
      finishAt.set(pid, cursor);
      done += 1;
    } else if (isRr) {
      queue.push(pid);
    }
    steps.push({ t: cursor, pid, start, ready: [...queue] });
  }

  return { steps, finishAt };
}

function metricsTable(processes: SchedProcess[], finishAt: Map<string, number>): MatrixState {
  const rows = processes.map((p) => {
    const finish = finishAt.get(p.pid) ?? 0;
    const turnover = finish - p.arrive;
    const weighted = turnover / p.burst;
    return {
      label: p.pid,
      cells: [
        cell(p.arrive),
        cell(p.burst),
        cell(finish),
        cell(turnover),
        cell(weighted.toFixed(2)),
      ],
    };
  });
  return {
    columnLabels: ['到达', '服务', '完成', '周转', '带权周转'],
    rowHeader: '进程',
    rows,
    caption: '周转时间 = 完成时间 − 到达时间；带权周转时间 = 周转时间 ÷ 服务时间。',
  };
}

export function buildScheduling(
  processes: SchedProcess[],
  algo: SchedAlgo,
  quantum: number,
): AnimFrame<GanttState>[] {
  const { steps, finishAt } = simulate(processes, algo, quantum);
  const algoMeta = SCHED_ALGOS.find((item) => item.id === algo);
  const total = Math.max(1, ...steps.map((step) => step.t));
  const frames: AnimFrame<GanttState>[] = [];

  const segments = new Map<string, { start: number; end: number; status?: CellStatus; text?: string }[]>();
  const snapshot = (): GanttState['rows'] =>
    processes.map((p) => ({
      label: p.pid,
      segments: (segments.get(p.pid) ?? []).map((segment) => ({ ...segment })),
    }));

  frames.push({
    state: {
      total,
      rows: processes.map((p) => ({ label: p.pid, segments: [] })),
      cursor: 0,
      badges: [
        { label: '算法', value: algoMeta?.label ?? algo },
        ...(algo === 'rr' ? [{ label: '时间片', value: String(quantum) }] : []),
        { label: '就绪队列', value: '空' },
      ],
      caption: algoMeta?.blurb,
    },
    note: `进程：${processes
      .map((p) => `${p.pid}(到达 ${p.arrive}，服务 ${p.burst}${algo === 'priority' ? `，优先级 ${p.priority}` : ''})`)
      .join('；')}。点「播放」或「单步」开始调度。`,
    counters: { 时间片: quantum },
  });

  steps.forEach((step, index) => {
    const list = segments.get(step.pid) ?? [];
    list.push({ start: step.start, end: step.t, status: 'active' });
    segments.set(step.pid, list);
    const finished = [...finishAt.entries()].filter(([, time]) => time <= step.t).map(([pid]) => pid);
    frames.push({
      state: {
        total,
        rows: snapshot(),
        cursor: step.t,
        badges: [
          { label: '算法', value: algoMeta?.label ?? algo },
          { label: '刚运行', value: `${step.pid}（${step.start}–${step.t}）` },
          { label: '就绪队列', value: step.ready.length ? step.ready.join(' > ') : '空' },
          { label: '已完成', value: finished.length ? finished.join('、') : '无', tone: 'good' },
        ],
      },
      note: `第 ${index + 1} 次调度：${
        algo === 'rr'
          ? `${step.pid} 获得时间片，运行 ${step.start}–${step.t}`
          : `${step.pid} 占用处理机，从 ${step.start} 运行到 ${step.t}`
      }。${step.ready.length ? `就绪队列：${step.ready.join(' > ')}` : '就绪队列为空'}。`,
      counters: {
        当前时刻: step.t,
        已完成: finished.length,
      },
    });
  });

  const finished = [...finishAt.entries()];
  const avgTurnover =
    finished.reduce((sum, [pid, time]) => {
      const process = processes.find((p) => p.pid === pid);
      return sum + (time - (process?.arrive ?? 0));
    }, 0) / Math.max(1, finished.length);
  const avgWeighted =
    finished.reduce((sum, [pid, time]) => {
      const process = processes.find((p) => p.pid === pid);
      const turnover = time - (process?.arrive ?? 0);
      return sum + turnover / Math.max(1, process?.burst ?? 1);
    }, 0) / Math.max(1, finished.length);

  frames.push({
    state: {
      total,
      rows: snapshot(),
      cursor: total,
      badges: [
        { label: '平均周转时间', value: avgTurnover.toFixed(2), tone: 'good' },
        { label: '平均带权周转', value: avgWeighted.toFixed(2), tone: 'good' },
        { label: '总时间', value: String(total) },
      ],
      metrics: metricsTable(processes, finishAt),
      caption: '甘特图从左到右是时间轴；同一进程出现多段说明被抢占（时间片轮转）。',
    },
    note: `调度完成：总时间 ${total}，平均周转时间 ${avgTurnover.toFixed(2)}，平均带权周转时间 ${avgWeighted.toFixed(
      2,
    )}。对比：SJF 的平均周转时间最小，FCFS 对长作业有利，时间片轮转响应最快。`,
    counters: {
      总时间: total,
      平均周转时间: Math.round(avgTurnover * 100) / 100,
      平均带权周转时间: Math.round(avgWeighted * 100) / 100,
    },
  });

  return frames;
}
