import { describe, expect, it } from 'vitest';
import { SEED_VERSION } from '../data/seed';
import { planSprint, sprintAdvice } from '../lib/sprint';
import { comparePaging, simulatePaging } from '../visual/paging';
import { getVisual, VISUALS } from '../visual/registry';
import { SORT_ALGORITHMS } from '../visual/sort';
import { buildHandshake, buildTeardown } from '../visual/tcp';
import type { SortState } from '../visual/sort';
import type { CardRow, Settings, SrsRow } from '../types';

const T0 = new Date(2026, 8, 18, 9, 0, 0);

const SETTINGS: Settings = {
  examDate: '2026-12-19',
  newPerDay: 20,
  reviewPerDay: 300,
  requestRetention: 0.95,
  theme: 'auto',
  fontSize: 15.5,
  seedVersion: SEED_VERSION,
};

function makeCards(n: number): CardRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    subject: 'ds' as const,
    chapter: '图',
    tags: [],
    title: `题 ${i + 1}`,
    back: '## 结论',
    importance: 3,
    hint: '锚点',
    seedVersion: SEED_VERSION,
  }));
}

/* ---------------- 排序生成器 ---------------- */

describe('排序动画生成器', () => {
  const inputs = [
    [5, 2, 9, 1, 7, 4, 8, 3, 6, 10, 0, 11],
    [3, 1, 2],
    [1, 2, 3, 4, 5],
    [5, 4, 3, 2, 1],
  ];

  for (const algorithm of SORT_ALGORITHMS) {
    it(`${algorithm.label}：每一步结构完整，最后一定排好序`, () => {
      for (const input of inputs) {
        const frames = algorithm.run(input);
        expect(frames.length).toBeGreaterThan(1);
        for (const frame of frames) {
          const state = frame.state as SortState;
          expect(state.bars).toHaveLength(input.length);
          expect(frame.note.length).toBeGreaterThan(0);
        }
        const last = (frames[frames.length - 1].state as SortState).bars.map((bar) => bar.value);
        expect(last).toEqual([...input].sort((a, b) => a - b));
        // 最后一步应当全部标记为已就位
        expect((frames[frames.length - 1].state as SortState).bars.every((bar) => bar.status === 'sorted')).toBe(
          true,
        );
      }
    });
  }

  it('冒泡：逆序输入会触发交换，已就位元素逐步累积', () => {
    const frames = SORT_ALGORITHMS[0].run([3, 2, 1]);
    const last = frames[frames.length - 1];
    expect(last.counters?.交换).toBeGreaterThanOrEqual(3);
  });

  it('插入排序：中间步骤允许出现"手中元素"造成的重复值，但收尾正确', () => {
    const frames = SORT_ALGORITHMS[2].run([3, 1, 2]);
    const last = (frames[frames.length - 1].state as SortState).bars.map((bar) => bar.value);
    expect(last).toEqual([1, 2, 3]);
  });
});

/* ---------------- 页面置换 ---------------- */

/** 王道经典例题：20 次访问、3 个物理块 */
const CLASSIC = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];

describe('页面置换生成器', () => {
  it('经典例题的缺页次数与教材一致：OPT 9 / FIFO 15 / LRU 12', () => {
    const result = comparePaging(CLASSIC, 3);
    const byId = Object.fromEntries(result.map((item) => [item.id, item.faults]));
    expect(byId.opt).toBe(9);
    expect(byId.fifo).toBe(15);
    expect(byId.lru).toBe(12);
  });

  it('OPT 的缺页次数不会多于 LRU 与 FIFO（理论最优）', () => {
    for (const refs of [CLASSIC, [1, 2, 3, 4, 1, 2, 5], [1, 2, 3, 1, 2, 4, 1, 2, 5]]) {
      const result = comparePaging(refs, 3);
      const byId = Object.fromEntries(result.map((item) => [item.id, item.faults]));
      expect(byId.opt).toBeLessThanOrEqual(byId.lru);
      expect(byId.opt).toBeLessThanOrEqual(byId.fifo);
    }
  });

  it('复现 FIFO 的 Belady 异常：物理块变多，缺页反而变多', () => {
    const refs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    const three = simulatePaging(refs, 3, 'fifo').filter((step) => !step.hit).length;
    const four = simulatePaging(refs, 4, 'fifo').filter((step) => !step.hit).length;
    expect(three).toBe(9);
    expect(four).toBe(10);
    expect(four).toBeGreaterThan(three);
    // LRU 不会出现 Belady 异常
    const lruThree = simulatePaging(refs, 3, 'lru').filter((step) => !step.hit).length;
    const lruFour = simulatePaging(refs, 4, 'lru').filter((step) => !step.hit).length;
    expect(lruFour).toBeLessThanOrEqual(lruThree);
  });

  it('每一步的物理块内容与访问序列自洽', () => {
    const steps = simulatePaging(CLASSIC, 3, 'lru');
    expect(steps).toHaveLength(CLASSIC.length);
    for (const step of steps) {
      expect(step.memory.filter((page) => page !== null).length).toBeLessThanOrEqual(3);
      if (step.hit) expect(step.memory).toContain(step.page);
      else {
        expect(step.memory).toContain(step.page);
        if (step.evicted !== null) expect(step.memory).not.toContain(step.evicted);
      }
    }
  });
});

/* ---------------- TCP 时序 ---------------- */

describe('TCP 可视化', () => {
  it('三次握手：报文顺序为 SYN → SYN+ACK → ACK，双方最终 ESTABLISHED', () => {
    const frames = buildHandshake();
    const last = frames[frames.length - 1].state;
    expect(last.messages.map((m) => m.label)).toEqual(['SYN', 'SYN + ACK', 'ACK']);
    expect(last.clientState).toBe('ESTABLISHED');
    expect(last.serverState).toBe('ESTABLISHED');
    expect(last.sent).toBe(3);
    // 中间必须出现过 SYN-SENT 与 SYN-RCVD
    const states = frames.map((frame) => `${frame.state.clientState}/${frame.state.serverState}`);
    expect(states).toContain('SYN-SENT/LISTEN');
    expect(states).toContain('SYN-SENT/SYN-RCVD');
  });

  it('四次挥手：报文顺序为 FIN → ACK → FIN → ACK，并解释 2MSL', () => {
    const frames = buildTeardown();
    const last = frames[frames.length - 1].state;
    expect(last.messages.map((m) => m.label)).toEqual(['FIN', 'ACK', 'FIN', 'ACK']);
    expect(frames.some((frame) => frame.state.clientState === 'TIME-WAIT')).toBe(true);
    expect(frames.some((frame) => frame.state.serverState === 'CLOSE-WAIT')).toBe(true);
    expect(frames[frames.length - 1].note).toContain('2MSL');
  });
});

/* ---------------- 注册表 ---------------- */

describe('可视化注册表', () => {
  it('每个可视化都能在默认参数下生成步骤，且变体有标签', () => {
    expect(VISUALS.length).toBeGreaterThanOrEqual(3);
    for (const visual of VISUALS) {
      expect(visual.variants.length).toBeGreaterThan(0);
      for (const variant of visual.variants) {
        const frames = variant.build(visual.defaults);
        expect(frames.length).toBeGreaterThan(1);
        expect(frames[0].note.length).toBeGreaterThan(0);
      }
    }
  });

  it('按 id 能取到可视化，非法 id 返回 undefined', () => {
    expect(getVisual('sort')?.title).toBe('排序动画');
    expect(getVisual('paging')?.view).toBe('frames');
    expect(getVisual('tcp')?.view).toBe('lifeline');
    expect(getVisual('nope')).toBeUndefined();
    expect(getVisual(undefined)).toBeUndefined();
  });

  it('排序动画有 6 种算法变体', () => {
    const sort = getVisual('sort');
    expect(sort?.variants.map((v) => v.id)).toEqual([
      'bubble',
      'selection',
      'insertion',
      'quick',
      'merge',
      'heap',
    ]);
  });
});

/* ---------------- 冲刺模式 ---------------- */

describe('冲刺模式', () => {
  const examSoon: Settings = { ...SETTINGS, examDate: '2026-09-28' }; // 距今 10 天

  it('新卡量超过剩余天数时会判定「需要提速」并给出倒排建议', () => {
    const cards = makeCards(100);
    const plan = planSprint(cards, new Map(), { ...examSoon, newPerDay: 5 }, 0, 0, T0);
    expect(plan.daysLeft).toBe(10);
    expect(plan.newCount).toBe(100);
    expect(plan.projectedDays).toBe(20);
    expect(plan.canFinish).toBe(false);
    expect(plan.suggestedNewPerDay).toBe(10);
    expect(sprintAdvice(plan)).toContain('超过剩余 10 天');
  });

  it('节奏够快时判定「来得及」', () => {
    const cards = makeCards(100);
    const plan = planSprint(cards, new Map(), { ...examSoon, newPerDay: 20 }, 0, 0, T0);
    expect(plan.projectedDays).toBe(5);
    expect(plan.canFinish).toBe(true);
    expect(sprintAdvice(plan)).toContain('来得及');
  });

  it('已掌握与学习中的卡分别统计', () => {
    const cards = makeCards(10);
    const srs = new Map<string, SrsRow>([
      [
        'c1',
        {
          cardId: 'c1',
          due: T0.getTime(),
          stability: 30,
          difficulty: 5,
          elapsed_days: 5,
          scheduled_days: 30,
          learning_steps: 0,
          reps: 4,
          lapses: 0,
          state: 2,
          last_review: T0.getTime() - 86400000,
          firstSeen: T0.getTime() - 5 * 86400000,
        },
      ],
      [
        'c2',
        {
          cardId: 'c2',
          due: T0.getTime(),
          stability: 2,
          difficulty: 6,
          elapsed_days: 1,
          scheduled_days: 1,
          learning_steps: 0,
          reps: 1,
          lapses: 0,
          state: 1,
          first_review: undefined,
          last_review: T0.getTime() - 86400000,
          firstSeen: T0.getTime() - 86400000,
        } as SrsRow,
      ],
    ]);
    const plan = planSprint(cards, srs, examSoon, 7, 3, T0);
    expect(plan.masteredCount).toBe(1);
    expect(plan.learningCount).toBe(1);
    expect(plan.newCount).toBe(8);
    expect(plan.todayLoad).toBe(10);
    expect(plan.estimatedMinutes).toBe(4);
    expect(plan.avgIntervalDays).toBeGreaterThan(1);
  });

  it('未设置考试日期时不做倒排', () => {
    const plan = planSprint(makeCards(10), new Map(), { ...SETTINGS, examDate: '' }, 0, 0, T0);
    expect(plan.daysLeft).toBeNull();
    expect(plan.roundsBeforeExam).toBeNull();
    expect(sprintAdvice(plan)).toContain('设置考试日期');
  });
});
