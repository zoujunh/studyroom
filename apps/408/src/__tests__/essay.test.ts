import { describe, expect, it } from 'vitest';
import { auditEssays, essayRows } from '../data/essay-seed';
import { buildEssayQueue, essayFullScore, essayStats, missedPoints, rateTier, scoreEssay } from '../lib/essay';
import { buildBanker, BANKER_SAFE, BANKER_UNSAFE } from '../visual/banker';
import { buildCache } from '../visual/cache';
import { buildFragment, planFragments } from '../visual/fragment';
import { buildGraph } from '../visual/graph';
import { buildKmp } from '../visual/kmp';
import { buildPipeline } from '../visual/pipeline';
import { getVisual, VISUALS } from '../visual/registry';
import { buildScheduling, parseProcesses } from '../visual/scheduling';
import type { GanttState, GraphState, MatrixState } from '../visual/types';
import type { EssayAttemptRow, EssayRow } from '../types';

/* ---------------- 大题：计分与队列 ---------------- */

function makeEssay(id: string, subject: EssayRow['subject'], scores: number[]): EssayRow {
  return {
    id,
    subject,
    chapter: '测试',
    stem: `题干 ${id} 的内容`,
    points: scores.map((score, index) => ({ label: `评分点 ${index + 1}`, score, answer: '参考要点' })),
    solution: '## 参考解答',
    pitfalls: '> 注意',
    difficulty: 2,
    tags: [],
    minutes: 10,
    seedVersion: 4,
  };
}

describe('大题计分', () => {
  const essay = makeEssay('e1', 'ds', [2, 3, 5]);

  it('满分是评分点之和，得分只算勾选的点', () => {
    expect(essayFullScore(essay)).toBe(10);
    expect(scoreEssay(essay, [])).toBe(0);
    expect(scoreEssay(essay, [0])).toBe(2);
    expect(scoreEssay(essay, [0, 2])).toBe(7);
    expect(scoreEssay(essay, [0, 1, 2])).toBe(10);
    // 越界下标不影响计分
    expect(scoreEssay(essay, [9])).toBe(0);
  });

  it('能列出漏掉的评分点', () => {
    const missed = missedPoints(essay, [1]);
    expect(missed.map((point) => point.label)).toEqual(['评分点 1', '评分点 3']);
  });

  it('得分率分档', () => {
    expect(rateTier(0.9).tone).toBe('good');
    expect(rateTier(0.7).tone).toBe('hard');
    expect(rateTier(0.3).tone).toBe('again');
  });

  it('组卷：单题 / 科目 / 章节 / 随机', () => {
    const essays = [
      makeEssay('e-ds-1', 'ds', [2, 3, 5]),
      makeEssay('e-ds-2', 'ds', [4, 4]),
      makeEssay('e-os-1', 'os', [5, 5]),
    ];
    expect(buildEssayQueue({ mode: 'single', essays, id: 'e-os-1' })).toEqual(['e-os-1']);
    expect(buildEssayQueue({ mode: 'single', essays, id: '不存在' })).toEqual([]);
    expect(buildEssayQueue({ mode: 'subject', essays, subject: 'ds' })).toHaveLength(2);
    expect(buildEssayQueue({ mode: 'chapter', essays, chapter: '不存在' })).toHaveLength(0);
    expect(buildEssayQueue({ mode: 'random', essays, count: 2 })).toHaveLength(2);
  });

  it('统计：得分率、各科、最常漏的评分点', () => {
    const essays = [makeEssay('e1', 'ds', [2, 3, 5]), makeEssay('e2', 'os', [5, 5])];
    const attempts: EssayAttemptRow[] = [
      { essayId: 'e1', ts: 1, checked: [0], score: 2, fullScore: 10, ms: 1000, mode: 'random' },
      { essayId: 'e1', ts: 2, checked: [0, 1, 2], score: 10, fullScore: 10, ms: 1000, mode: 'random' },
    ];
    const stats = essayStats(essays, attempts);
    expect(stats.attempts).toBe(2);
    expect(stats.score).toBe(12);
    expect(stats.fullScore).toBe(20);
    expect(stats.rate).toBeCloseTo(0.6);
    expect(stats.bySubject.find((item) => item.subject === 'ds')?.attempts).toBe(2);
    expect(stats.bySubject.find((item) => item.subject === 'os')?.attempts).toBe(0);
    // 第 1 次漏了 评分点 2、3，第 2 次没漏 → 各漏 1 次
    expect(stats.weakestPoints.map((point) => point.label).sort()).toEqual(['评分点 2', '评分点 3']);
  });
});

/* ---------------- 大题内容自检 ---------------- */

describe('内置综合应用题', () => {
  it('四科题量均衡，结构自检无问题', () => {
    const rows = essayRows();
    // v5 起：四科各 2 批大题，总量 40 道以上（只设下限）
    expect(rows.length).toBeGreaterThanOrEqual(40);
    for (const subject of ['ds', 'co', 'os', 'cn'] as const) {
      expect(rows.filter((row) => row.subject === subject).length, `${subject} 大题量`).toBeGreaterThanOrEqual(10);
    }
    expect(auditEssays()).toEqual([]);
  });

  it('每题满分 8–12，评分点分值之和与满分一致', () => {
    for (const essay of essayRows()) {
      const full = essayFullScore(essay);
      expect(full).toBeGreaterThanOrEqual(8);
      expect(full).toBeLessThanOrEqual(12);
      expect(essay.points.length).toBeGreaterThanOrEqual(3);
      expect(essay.points.length).toBeLessThanOrEqual(6);
      expect(essay.solution.length).toBeGreaterThan(30);
      expect(essay.pitfalls.startsWith('>')).toBe(true);
      expect(essay.stem.length).toBeGreaterThan(30);
    }
  });
});

/* ---------------- 进程调度 ---------------- */

describe('进程调度生成器', () => {
  const processes = parseProcesses(undefined); // P1 0 7 3; P2 2 4 1; P3 4 1 4; P4 5 4 2

  it('默认例题解析出 4 个进程', () => {
    expect(processes.map((p) => p.pid)).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(processes[0]).toMatchObject({ arrive: 0, burst: 7, priority: 3 });
  });

  it('FCFS：总时间 16、平均周转时间 8.75', () => {
    const frames = buildScheduling(processes, 'fcfs', 2);
    const last = frames[frames.length - 1];
    expect(last.counters?.总时间).toBe(16);
    expect(last.counters?.平均周转时间).toBe(8.75);
    const rows = (last.state as GanttState).rows;
    expect(rows[0].segments).toEqual([{ start: 0, end: 7, status: 'active' }]);
    expect(rows[3].segments).toEqual([{ start: 12, end: 16, status: 'active' }]);
  });

  it('SJF 的平均周转时间不大于 FCFS（经典结论）', () => {
    const fcfs = buildScheduling(processes, 'fcfs', 2);
    const sjf = buildScheduling(processes, 'sjf', 2);
    const fcfsAvg = fcfs[fcfs.length - 1].counters?.平均周转时间 ?? 0;
    const sjfAvg = sjf[sjf.length - 1].counters?.平均周转时间 ?? 0;
    expect(sjfAvg).toBeLessThanOrEqual(fcfsAvg);
    // 具体数值：P1(0-7) P3(7-8) P2(8-12) P4(12-16) → (7+4+10+11)/4 = 8
    expect(sjfAvg).toBe(8);
  });

  it('时间片轮转会产生多个片段（被抢占）', () => {
    const frames = buildScheduling(processes, 'rr', 2);
    const last = frames[frames.length - 1].state as GanttState;
    const p1 = last.rows.find((row) => row.label === 'P1');
    expect(p1?.segments.length).toBeGreaterThan(1);
    // 每一段长度不超过时间片
    for (const row of last.rows) {
      for (const segment of row.segments) {
        expect(segment.end - segment.start).toBeLessThanOrEqual(2);
      }
    }
  });

  it('调度完成后给出指标表', () => {
    const frames = buildScheduling(processes, 'priority', 2);
    const last = frames[frames.length - 1].state as GanttState;
    expect(last.metrics?.rows).toHaveLength(4);
    expect(last.metrics?.columnLabels).toContain('带权周转');
  });
});

/* ---------------- 银行家 ---------------- */

describe('银行家算法生成器', () => {
  it('经典例题能找出安全序列', () => {
    const frames = buildBanker(BANKER_SAFE);
    const last = frames[frames.length - 1];
    expect(last.note).toContain('存在安全序列');
    expect(last.note).toContain('P1 → P3 → P4');
    const badges = (last.state as MatrixState).badges ?? [];
    const sequence = badges.find((badge) => badge.label === '安全序列');
    expect(sequence?.value.split(' → ')).toHaveLength(5);
    expect(last.counters?.已完成).toBe(5);
  });

  it('资源不足时判定不安全', () => {
    const frames = buildBanker(BANKER_UNSAFE);
    const last = frames[frames.length - 1];
    expect(last.note).toContain('不存在安全序列');
    expect(last.note).toContain('不安全');
    expect(last.counters?.已完成).toBe(0);
  });

  it('每一步都会展示 Work 向量', () => {
    const frames = buildBanker(BANKER_SAFE);
    for (const frame of frames) {
      const badges = (frame.state as MatrixState).badges ?? [];
      expect(badges.some((badge) => badge.label === 'Work')).toBe(true);
    }
  });
});

/* ---------------- 流水线 ---------------- */

describe('流水线时空图', () => {
  it('三种模型的总周期与加速比', () => {
    const ideal = buildPipeline('ideal');
    const stall = buildPipeline('stall');
    const forward = buildPipeline('forward');

    expect(ideal[ideal.length - 1].counters?.总周期).toBe(9);
    expect(stall[stall.length - 1].counters?.总周期).toBe(11);
    expect(forward[forward.length - 1].counters?.总周期).toBe(10);
    // 加速比随气泡增多而下降
    expect(ideal[ideal.length - 1].counters?.加速比).toBeGreaterThan(
      forward[forward.length - 1].counters?.加速比 ?? 0,
    );
    expect(forward[forward.length - 1].counters?.加速比).toBeGreaterThan(
      stall[stall.length - 1].counters?.加速比 ?? 0,
    );
  });

  it('无冒险时每条指令依次流入，不存在停顿', () => {
    const frames = buildPipeline('ideal');
    const last = frames[frames.length - 1].state as MatrixState;
    const texts = last.rows.flatMap((row) => row.cells.map((item) => (typeof item === 'string' ? item : item.text)));
    expect(texts).not.toContain('停');
  });

  it('Load-Use 无转发时最后一条指令出现 2 个停顿', () => {
    const frames = buildPipeline('stall');
    const last = frames[frames.length - 1].state as MatrixState;
    const lastRow = last.rows[last.rows.length - 1];
    const bubbles = lastRow.cells.filter((item) => (typeof item === 'string' ? item : item.text) === '停');
    expect(bubbles).toHaveLength(2);
  });
});

/* ---------------- KMP ---------------- */

describe('KMP next 数组', () => {
  it('ababaa 的 next = 0,1,1,2,3,4', () => {
    const frames = buildKmp('ababaa', 'next');
    const last = frames[frames.length - 1];
    expect(last.note).toContain('next[1] = 0');
    expect(last.note).toContain('next[6] = 4');
    expect(last.note).toContain('next[4] = 2');
  });

  it('ababaa 的 nextval = 0,1,0,1,0,4', () => {
    const frames = buildKmp('ababaa', 'nextval');
    const last = frames[frames.length - 1];
    expect(last.note).toContain('nextval[3] = 0');
    expect(last.note).toContain('nextval[6] = 4');
    expect(last.note).toContain('nextval[5] = 0');
  });

  it('模式串为空时回退到默认模式串', () => {
    const frames = buildKmp('', 'next');
    expect((frames[0].state as MatrixState).badges?.some((badge) => badge.value === 'ababaa')).toBe(true);
  });
});

/* ---------------- IP 分片 ---------------- */

describe('IP 分片生成器', () => {
  it('4000 B 数据报、MTU 1500 → 3 片，偏移 0/185/370', () => {
    const plan = planFragments(4000, 1500);
    expect(plan).not.toBeNull();
    expect(plan!.maxData).toBe(1480);
    expect(plan!.fragments.map((item) => item.dataLength)).toEqual([1480, 1480, 1020]);
    expect(plan!.fragments.map((item) => item.offset)).toEqual([0, 185, 370]);
    expect(plan!.fragments.map((item) => item.mf)).toEqual([1, 1, 0]);
    expect(plan!.fragments.reduce((sum, item) => sum + item.dataLength, 0)).toBe(3980);
  });

  it('除最后一片外长度都是 8 的倍数，片偏移按 8 递增', () => {
    const plan = planFragments(4000, 1500)!;
    let last = -1;
    plan.fragments.forEach((fragment, index) => {
      // 只有最后一片允许有零头，其余必须是 8 的倍数（片偏移以 8 字节为单位）
      if (index < plan.fragments.length - 1) expect(fragment.dataLength % 8).toBe(0);
      expect(fragment.offset).toBeGreaterThan(last);
      expect(fragment.offset % 1).toBe(0);
      last = fragment.offset;
    });
    // 最后一片的零头正好是 1020 % 8 = 4
    expect(plan.fragments[plan.fragments.length - 1].dataLength % 8).toBe(4);
  });

  it('MTU 太小时给出提示', () => {
    const frames = buildFragment(4000, 20);
    expect(frames[0].note).toContain('不合法');
  });
});

/* ---------------- Cache ---------------- */

describe('Cache 映射生成器', () => {
  it('直接映射：0/16/1024/16 → 命中 1 次、缺失 3 次', () => {
    const frames = buildCache([0, 16, 1024, 16], 'direct');
    const last = frames[frames.length - 1];
    expect(last.counters?.命中).toBe(1);
    expect(last.counters?.缺失).toBe(3);
    // 1024 的块号是 64，行号 64 % 8 = 0，与地址 0 冲突 → 替换
    expect(frames[3].note).toContain('缺失并替换');
    expect(frames[4].note).toContain('命中');
  });

  it('全相联不会因为行号冲突而替换（行未满时）', () => {
    const frames = buildCache([0, 16, 1024, 16], 'full');
    const last = frames[frames.length - 1];
    expect(last.counters?.命中).toBe(1);
    expect(last.counters?.缺失).toBe(3);
    expect(frames[3].note).toContain('直接装入');
  });

  it('每次访问都给出地址划分信息', () => {
    const frames = buildCache([1024], 'set2');
    expect(frames[1].note).toContain('块号 64');
    expect(frames[1].note).toContain('块内偏移 0');
  });
});

/* ---------------- 图遍历 ---------------- */

describe('图遍历生成器', () => {
  it('DFS 访问顺序 A → B → C → F → E → D', () => {
    const frames = buildGraph('dfs');
    const last = frames[frames.length - 1];
    expect(last.note).toContain('A → B → C → F → E → D');
    expect(last.counters?.已访问).toBe(6);
  });

  it('BFS 访问顺序 A → B → D → C → E → F', () => {
    const frames = buildGraph('bfs');
    const last = frames[frames.length - 1];
    expect(last.note).toContain('A → B → D → C → E → F');
    expect(last.state as GraphState).toBeTruthy();
  });

  it('遍历过程会点亮节点与树边', () => {
    const frames = buildGraph('bfs');
    const last = frames[frames.length - 1].state as GraphState;
    expect(last.nodes.every((node) => node.status === 'done')).toBe(true);
    expect(last.edges.filter((edge) => edge.status === 'ok')).toHaveLength(5);
  });
});

/* ---------------- 注册表 ---------------- */

describe('可视化注册表（扩充后）', () => {
  it('包含全部 10 个可视化', () => {
    expect(VISUALS.map((visual) => visual.id)).toEqual([
      'sort',
      'paging',
      'tcp',
      'scheduling',
      'banker',
      'cache',
      'pipeline',
      'kmp',
      'fragment',
      'graph',
    ]);
  });

  it('新增的可视化在默认参数下都能生成多步', () => {
    for (const id of ['scheduling', 'banker', 'cache', 'pipeline', 'kmp', 'fragment', 'graph']) {
      const visual = getVisual(id);
      expect(visual, `缺少可视化 ${id}`).toBeTruthy();
      for (const variant of visual!.variants) {
        const frames = variant.build(visual!.defaults);
        expect(frames.length, `${id}/${variant.id} 步骤太少`).toBeGreaterThan(1);
        expect(frames[0].note.length).toBeGreaterThan(5);
      }
    }
  });

  it('三种新视图都被用到了', () => {
    const kinds = new Set(VISUALS.map((visual) => visual.view));
    expect(kinds.has('gantt')).toBe(true);
    expect(kinds.has('graph')).toBe(true);
    expect(kinds.has('matrix')).toBe(true);
  });
});
