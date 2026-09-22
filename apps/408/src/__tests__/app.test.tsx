// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import App from '../App';
import { essayRows } from '../data/essay-seed';
import { questionRows } from '../data/question-seed';
import { seedRows } from '../data/seed';
import { db } from '../db/db';
import { StoreProvider } from '../state/store';

/**
 * 端到端冒烟测试：真实挂载 React 应用（JSDOM + fake-indexeddb），
 * 走完「首页 → 今日复习 → 看答案 → 评分 → 落库」的完整闭环。
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (!window.matchMedia) {
    // JSDOM 没有 matchMedia，补一个最小实现（store 里用于跟随系统主题）。
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
  Element.prototype.scrollTo = () => {};
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function settle(ms = 60) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <StoreProvider>
        <App />
      </StoreProvider>,
    );
  });
  await settle(200);
  return container;
}

async function goTo(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  await settle();
}

function pressKey(init: KeyboardEventInit) {
  return act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
  });
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = null;
  container = null;
  await db.srs.clear();
  await db.logs.clear();
  await db.attempts.clear();
  await db.mistakes.clear();
  await db.essayAttempts.clear();
  await db.cardFocus.clear();
  window.location.hash = '';
});

/** 按 data-testid 点击（选项与操作按钮都带了这个钩子）。 */
async function clickTestId(el: HTMLElement, testId: string) {
  const node = el.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;
  expect(node, `找不到 ${testId}`).toBeTruthy();
  await act(async () => {
    node!.click();
  });
  await settle(80);
}

/** 从 DOM 上读当前题目的 id（题干里有公式，按文本匹配不可靠）。 */
function shownQuestion(el: HTMLElement) {
  const node = el.querySelector('[data-question-id]');
  const id = node?.getAttribute('data-question-id') ?? '';
  const found = questionRows().find((question) => question.id === id);
  expect(found, `页面上找不到题目 ${id}`).toBeTruthy();
  return found!;
}

describe('应用闭环', () => {
  it('首页展示种子题库的三态统计与四科进度', async () => {
    const el = await mount();
    const text = el.textContent ?? '';
    expect(text).toContain('408 刷卡');
    expect(text).toContain(`共 ${seedRows().length} 个知识点`);
    expect(text).toContain('已掌握');
    expect(text).toContain('学习中');
    expect(text).toContain('没学过');
    for (const subject of ['数据结构', '计算机组成原理', '操作系统', '计算机网络']) {
      expect(text).toContain(subject);
    }
    expect(text).toContain('今日复习');
    expect(text).toContain('连续学习');
  });

  it('刷卡：评分后自动亮出答案 + 出现「下一题」，不自动跳走、本轮不重复', async () => {
    const el = await mount();
    await goTo('#/review?mode=due');

    // 计划 20 张（默认每日新卡上限），当前第 1 张
    expect(el.textContent).toContain('今日复习');
    expect(el.textContent).toContain('共 20 张');
    expect(el.textContent).toContain('1 / 20');
    expect(el.textContent).toContain('点一下看答案');

    await pressKey({ code: 'Space', key: ' ' });
    await settle();
    expect(el.textContent).toContain('记忆锚点');

    await pressKey({ key: '3' });
    await settle(150);

    // 1) 落库
    const rows = await db.srs.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].reps).toBe(1);
    const logs = await db.logs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].grade).toBe('good');

    // 2) 评分后：答案仍然亮着 + 出现「下一题」按钮 + 头部有已记录标记
    expect(el.textContent).toContain('已记录「会了」');
    expect(el.querySelector('[data-testid="next-card"]')).toBeTruthy();
    expect(await db.cardFocus.count()).toBe(0); // 「会了」不进复习专项

    // 3) 还没有跳走：还是同一张卡（分母不变，本轮不重复）
    expect(el.textContent).toContain('1 / 20');
    expect(el.textContent).toContain('会了 1');

    // 4) 点「下一题」才前进
    await clickTestId(el, 'next-card');
    expect(el.textContent).toContain('2 / 20');
    expect(el.textContent).toContain('点一下看答案'); // 新卡回到正面
  });

  it('不打开答案也能直接评分，评分后同样亮答案并给反馈', async () => {
    const el = await mount();
    await goTo('#/review?mode=due');
    expect(el.textContent).toContain('点一下看答案');

    // 没看答案直接按 1：照样落库，并且会进复习专项
    await pressKey({ key: '1' });
    await settle(150);

    expect(await db.logs.count()).toBe(1);
    expect(el.textContent).toContain('不会 1');
    expect(el.textContent).toContain('已记录「不会」');
    expect(el.textContent).toContain('上次评「不会」');
    expect(el.textContent).toContain('已加入复习专项');

    // 答案被自动亮出来（不用再点一次），并且有下一题按钮
    expect(el.textContent).toContain('记忆锚点');
    expect(el.querySelector('[data-testid="next-card"]')).toBeTruthy();

    // 复习专项表里出现这张卡
    const focus = await db.cardFocus.toArray();
    expect(focus).toHaveLength(1);
    expect(focus[0].weakCount).toBe(1);
  });

  it('评「不会」不会在本轮重复出现，撤销可以把这张卡退回来', async () => {
    const el = await mount();
    await goTo('#/review?mode=due');

    await pressKey({ key: '1' });
    await settle(150);
    await clickTestId(el, 'next-card');
    await settle(60);

    // 本轮只在队列里出现过一次：分母还是 20（不会变成 21）
    expect(el.textContent).toContain('2 / 20');
    expect(el.textContent).not.toContain('/ 21');

    // 撤销：回到刚才那张卡，并且记录被删掉
    await pressKey({ key: 'z' });
    await settle(150);
    expect(el.textContent).toContain('1 / 20');
    expect(await db.logs.count()).toBe(0);
    expect(await db.srs.count()).toBe(0);
    expect(await db.cardFocus.count()).toBe(0);
  });

  it('已复习过的卡片会显示复习次数与记忆稳定度', async () => {
    // 预置一批「复习过、今天到期」的进度，让第一张卡就带记录
    const past = Date.now() - 3600_000;
    await db.srs.bulkPut(
      seedRows().map((card) => ({
        cardId: card.id,
        due: past,
        stability: 3.5,
        difficulty: 5.1,
        elapsed_days: 1,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 2,
        lapses: 1,
        state: 2,
        last_review: Date.now() - 86400000,
        firstSeen: Date.now() - 3 * 86400000,
      })),
    );

    const el = await mount();
    await goTo('#/review?mode=due');

    expect(el.textContent).toContain('这张卡已复习');
    expect(el.textContent).toContain('记忆稳定度');
    expect(el.textContent).toContain('忘过 1 次');
    // 全部卡片都到期，复习队列受「每日复习上限」约束（默认 300），不受每日新卡上限约束
    const expectedTotal = Math.min(300, seedRows().length);
    expect(el.textContent).toContain(`共 ${expectedTotal} 张`);
  });

  it('复习专项：评「不会」入库，连续两次「会了」自动移出', async () => {
    const el = await mount();
    await goTo('#/review?mode=due');

    // 第一次：不会 → 进专项
    await clickTestId(el, 'grade-again');
    expect(await db.cardFocus.count()).toBe(1);
    await clickTestId(el, 'next-card');

    // 专项页能看到这张卡
    await goTo('#/focus');
    expect(el.textContent).toContain('复习专项');
    expect(el.textContent).toContain('专项待攻克');
    expect(el.textContent).toContain('错 1 次');

    // 用「全部刷一遍」进专项会话
    await clickTestId(el, 'focus-review-all');
    await settle(120);
    expect(el.textContent).toContain('复习专项');
    expect(el.textContent).toContain('共 1 张');

    // 第一次「会了」：仍在专项里（goodStreak = 1）
    await clickTestId(el, 'grade-good');
    let rows = await db.cardFocus.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].goodStreak).toBe(1);
    await clickTestId(el, 'next-card');
    await settle(120);

    // 再刷一次专项，第二次「会了」→ 自动移出
    await goTo('#/focus');
    await clickTestId(el, 'focus-review-all');
    await settle(120);
    await clickTestId(el, 'grade-good');
    expect(await db.cardFocus.count()).toBe(0);
    expect(el.textContent).toContain('已从复习专项移出');
  });

  it('可视化页可以单步推进，并能切换算法', async () => {
    const el = await mount();
    await goTo('#/visual');
    expect(el.textContent).toContain('可视化演示');
    expect(el.textContent).toContain('排序动画');
    expect(el.textContent).toContain('页面置换');
    expect(el.textContent).toContain('TCP 握手挥手');

    await goTo('#/visual/sort?algo=quick');
    expect(el.textContent).toContain('排序动画');
    expect(el.textContent).toContain('1 / ');
    expect(el.textContent).toContain('待排序序列');

    const clickByText = async (text: string) => {
      const button = [...el.querySelectorAll('button')].find((node) => node.textContent?.includes(text));
      expect(button, `找不到按钮：${text}`).toBeTruthy();
      await act(async () => {
        (button as HTMLButtonElement).click();
      });
      await settle(40);
    };

    await clickByText('单步');
    expect(el.textContent).toContain('2 / ');

    await clickByText('堆排序');
    expect(el.textContent).toContain('堆排序');
    expect(el.textContent).toContain('不稳定');
  });

  it('页面置换页把教材例题的缺页次数算对并显示出来', async () => {
    const el = await mount();
    await goTo('#/visual/paging');
    const text = el.textContent ?? '';
    // 经典例题（20 次访问 / 3 个物理块）：OPT 9、FIFO 15、LRU 12
    expect(text).toContain('9 次缺页');
    expect(text).toContain('15 次缺页');
    expect(text).toContain('12 次缺页');
    expect(text).toContain('缺页率');
    expect(text).toContain('Belady');
  });

  it('题库页展示题量与各科入口', async () => {
    const el = await mount();
    await goTo('#/quiz');
    const text = el.textContent ?? '';
    expect(text).toContain('题库');
    expect(text).toContain(`共 ${questionRows().length} 道题`);
    expect(text).toContain('随机练习');
    expect(text).toContain('模考');
    expect(text).toContain('错题重做');
    expect(text).toContain('各科正确率');
    expect(text).toContain('按章节练习');
  });

  it('答对一题：落库、显示解析、不进错题本', async () => {
    const el = await mount();
    await goTo('#/quiz/run?mode=random&count=1');
    const question = shownQuestion(el);

    await clickTestId(el, `option-${question.answer[0]}`);
    await clickTestId(el, 'submit-answer');

    expect(el.textContent).toContain('答对了');
    expect(el.textContent).toContain('解析');
    const attempts = await db.attempts.toArray();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].correct).toBe(true);
    expect(attempts[0].questionId).toBe(question.id);
    expect(await db.mistakes.count()).toBe(0);

    // 完成本轮 → 结算页
    await clickTestId(el, 'next-question');
    expect(el.textContent).toContain('本轮完成');
    expect(el.textContent).toContain('正确率');
    expect(el.textContent).toContain('100%');
  });

  it('答错一题：给出正确答案与错因选项，自动进错题本', async () => {
    const el = await mount();
    await goTo('#/quiz/run?mode=random&count=1');
    const question = shownQuestion(el);
    const wrongOption = question.answer[0] === 0 ? 1 : 0;

    await clickTestId(el, `option-${wrongOption}`);
    await clickTestId(el, 'submit-answer');

    expect(el.textContent).toContain('答错了');
    expect(el.textContent).toContain('这道题错在哪');
    expect(await db.mistakes.count()).toBe(1);

    // 标注错因
    const errorButton = [...el.querySelectorAll('button')].find((node) =>
      node.textContent?.trim() === '计算失误',
    );
    expect(errorButton).toBeTruthy();
    await act(async () => {
      (errorButton as HTMLButtonElement).click();
    });
    await settle(80);
    const rows = await db.mistakes.toArray();
    expect(rows[0].lastErrorType).toBe('calc');

    // 错题本页能看到它，并带上错因
    await goTo('#/mistakes');
    expect(el.textContent).toContain('错题本');
    expect(el.textContent).toContain('错 1 次');
    expect(el.textContent).toContain('计算失误');
    expect(el.textContent).toContain('错因分布');
  });

  it('错题连续答对两次会自动移出错题本', async () => {
    const el = await mount();

    // 第一轮：故意答错 → 进错题本
    await goTo('#/quiz/run?mode=random&count=1');
    const question = shownQuestion(el);
    await clickTestId(el, `option-${question.answer[0] === 0 ? 1 : 0}`);
    await clickTestId(el, 'submit-answer');
    expect(await db.mistakes.count()).toBe(1);

    // 第二轮：错题重做，答对一次 → 仍在错题本（correctStreak = 1）
    await goTo('#/quiz/run?mode=mistake');
    expect(shownQuestion(el).id).toBe(question.id);
    await clickTestId(el, `option-${question.answer[0]}`);
    await clickTestId(el, 'submit-answer');
    const afterFirst = await db.mistakes.toArray();
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0].correctStreak).toBe(1);

    // 第三轮：走结算页的「重做错题」（URL 不变，靠 restart 重开）
    await clickTestId(el, 'next-question');
    expect(el.textContent).toContain('本轮完成');
    await clickTestId(el, 'redo-mistakes');
    expect(shownQuestion(el).id).toBe(question.id);
    await clickTestId(el, `option-${question.answer[0]}`);
    await clickTestId(el, 'submit-answer');

    expect(await db.mistakes.count()).toBe(0);
    expect(el.textContent).toContain('已移出错题本');
  });

  it('模考模式：倒计时、不显示对错、交卷后出报告', async () => {
    const el = await mount();
    await goTo('#/quiz/run?mode=exam');
    const text = el.textContent ?? '';
    expect(text).toContain('模考');
    expect(text).toContain('共 20 题');
    expect(text).toContain('已作答 0 / 20');
    // 模考中不给正确与否的反馈
    expect(text).not.toContain('答对了');

    // 一路跳过（全部未作答），到最后一题交卷
    for (let i = 0; i < 19; i += 1) {
      await clickTestId(el, 'next-question');
    }
    await clickTestId(el, 'submit-exam');
    await settle(400);

    expect(el.textContent).toContain('模考报告');
    expect(el.textContent).toContain('得分');
    // 20 道全部未作答 → 0 分，但每一道都写进了作答记录与错题本
    expect(el.textContent).toContain('0 / 40');
    expect(await db.attempts.count()).toBe(20);
    expect(await db.mistakes.count()).toBe(20);
  });

  it('大题：看评分点 → 逐条自评 → 提交落库 → 结算报告', async () => {
    const el = await mount();
    const essay = essayRows()[0];
    await goTo(`#/essay/run?mode=single&id=${essay.id}`);

    const full = essay.points.reduce((sum, point) => sum + point.score, 0);
    expect(el.textContent).toContain('满分');
    expect(el.textContent).toContain(String(full));
    expect(el.textContent).toContain('看评分点与参考答案');

    await clickTestId(el, 'reveal-points');
    expect(el.textContent).toContain('逐条自评');
    expect(el.textContent).toContain('参考答案');
    // 未勾选时得分为 0
    expect(el.textContent).toContain(`0 / ${full} 分`);

    // 勾选前两个评分点
    await clickTestId(el, 'point-0');
    await clickTestId(el, 'point-1');
    const partial = essay.points[0].score + essay.points[1].score;
    expect(el.textContent).toContain(`${partial} / ${full} 分`);

    await clickTestId(el, 'submit-essay');
    await settle(200);

    const attempts = await db.essayAttempts.toArray();
    expect(attempts).toHaveLength(1);
    expect(attempts[0].essayId).toBe(essay.id);
    expect(attempts[0].score).toBe(partial);
    expect(attempts[0].fullScore).toBe(full);
    expect(attempts[0].checked).toEqual([0, 1]);

    // 结算页：总分 + 漏掉的评分点
    expect(el.textContent).toContain('自评总分');
    expect(el.textContent).toContain(`漏掉的评分点 ${essay.points.length - 2} 个`);
  });

  it('大题列表页展示最常漏的评分点与各科得分率', async () => {
    const el = await mount();
    await goTo('#/essay');
    expect(el.textContent).toContain('综合应用题');
    expect(el.textContent).toContain(`共 ${essayRows().length} 道`);
    expect(el.textContent).toContain('各科得分率');
    expect(el.textContent).toContain('题目清单');
    expect(el.textContent).toContain('怎么用');
  });

  it('新增动画页（进程调度 / 银行家 / 图遍历）能渲染并推进', async () => {
    const el = await mount();

    await goTo('#/visual/scheduling');
    expect(el.textContent).toContain('进程调度');
    expect(el.textContent).toContain('FCFS');
    // 一路单步到结尾，看平均周转时间是否出现
    for (let i = 0; i < 12; i += 1) {
      const stepButton = [...el.querySelectorAll('button')].find((node) =>
        node.textContent?.includes('单步'),
      );
      if (!stepButton) break;
      await act(async () => {
        (stepButton as HTMLButtonElement).click();
      });
      await settle(20);
    }
    expect(el.textContent).toContain('平均周转时间');
    expect(el.textContent).toContain('各进程指标');

    await goTo('#/visual/banker');
    expect(el.textContent).toContain('银行家算法');
    expect(el.textContent).toContain('Allocation');

    await goTo('#/visual/graph?algo=dfs');
    expect(el.textContent).toContain('图遍历');
    expect(el.textContent).toContain('访问序列');
  });

  it('凡是展示内容的地方都不许出现裸 LaTeX（必须渲染成 KaTeX）', async () => {
    const el = await mount();

    // 1）大题：题干与评分点要点都含公式
    const essay = essayRows().find((item) => item.points.some((point) => point.answer.includes('$')));
    expect(essay, '题库里应当有含公式的大题').toBeTruthy();
    await goTo(`#/essay/run?mode=single&id=${essay!.id}`);
    // 题干正文必须真的渲染出来：取题干里一段纯中文（不含公式）来判断
    const runs = essay!.stem.replace(/\$[^$]*\$/g, ' ').match(/[\u4e00-\u9fa5]{6,}/g) ?? [];
    expect(runs.length, '题干里应当有连续中文片段').toBeGreaterThan(0);
    const squash = (text: string) => text.replace(/\s+/g, '');
    expect(squash(el.textContent ?? '')).toContain(runs[0]!.slice(0, 6));
    // 计时器不能出现负数
    expect(el.textContent ?? '').not.toContain('-1:');
    expect(el.innerHTML).toContain('katex');
    expect(el.textContent ?? '').not.toContain('$');

    await clickTestId(el, 'reveal-points');
    // 评分点要点里的公式也要渲染
    expect(el.innerHTML).toContain('katex');
    expect(el.textContent ?? '').not.toContain('$');
    expect(el.textContent ?? '').not.toContain('\\text');

    // 2）可视化：说明文字与旁白里的公式（IP 分片的说明就带公式）
    await goTo('#/visual/fragment');
    expect(el.innerHTML).toContain('katex');
    expect(el.textContent ?? '').not.toContain('$');

    // 3）选择题解析（随机抽题，所以按抽到的这道题来判断是否应当渲染公式）
    await goTo('#/quiz/run?mode=random&count=1');
    const question = shownQuestion(el);
    await clickTestId(el, `option-${question.answer[0]}`);
    await clickTestId(el, 'submit-answer');
    if (question.analysis.includes('$') || question.stem.includes('$')) {
      expect(el.innerHTML).toContain('katex');
    }
    expect(el.textContent ?? '').not.toContain('$');
  });

  it('科目页与统计页可正常渲染', async () => {
    const el = await mount();
    await goTo('#/subjects');
    expect(el.textContent).toContain('我的科目');
    expect(el.textContent).toContain('刷这一科');
    expect(el.textContent).toContain('个章节');

    await goTo('#/stats');
    expect(el.textContent).toContain('学习统计');
    expect(el.textContent).toContain('复习趋势');
    expect(el.textContent).toContain('各科掌握率');
    expect(el.textContent).toContain('掌握口径');

    await goTo('#/settings');
    expect(el.textContent).toContain('考试日期');
    expect(el.textContent).toContain('目标记忆保持率');
    expect(el.textContent).toContain('导出备份');
  });
});
