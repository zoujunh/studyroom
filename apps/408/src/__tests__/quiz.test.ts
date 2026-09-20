import { describe, expect, it } from 'vitest';
import { auditQuestions, questionRows } from '../data/question-seed';
import {
  applyMistake,
  buildExamReport,
  buildQuizQueue,
  EXAM_BLUEPRINT,
  EXAM_TOTAL_COUNT,
  isCorrect,
  MISTAKE_GRADUATE_STREAK,
  quizStats,
} from '../lib/quiz';
import type { AttemptRow, MistakeRow, QuestionRow } from '../types';

const T0 = Date.now();

function makeQuestion(id: string, subject: QuestionRow['subject'], answer: number[]): QuestionRow {
  return {
    id,
    subject,
    chapter: '测试',
    type: 'single',
    stem: `题目 ${id}`,
    options: ['甲', '乙', '丙', '丁'],
    answer,
    analysis: '## 解析\n- 因为……\n> 注意',
    difficulty: 2,
    tags: [],
    seedVersion: 3,
  };
}

/* ---------------- 判分 ---------------- */

describe('判分', () => {
  const question = makeQuestion('q1', 'ds', [2]);

  it('选项完全一致才算对，与顺序无关', () => {
    expect(isCorrect(question, [2])).toBe(true);
    expect(isCorrect(question, [0])).toBe(false);
    expect(isCorrect(question, [])).toBe(false);
    expect(isCorrect(question, [2, 3])).toBe(false);
    expect(isCorrect({ answer: [0, 2] }, [2, 0])).toBe(true);
    expect(isCorrect({ answer: [0, 2] }, [0])).toBe(false);
  });
});

/* ---------------- 错题状态机 ---------------- */

describe('错题本状态机', () => {
  it('答错入库并累加错误次数', () => {
    const first = applyMistake('q1', undefined, false, T0, 'concept');
    expect(first.next?.wrongCount).toBe(1);
    expect(first.next?.correctStreak).toBe(0);
    expect(first.next?.lastErrorType).toBe('concept');
    expect(first.next?.firstWrongAt).toBe(T0);

    const second = applyMistake('q1', first.next ?? undefined, false, T0 + 1000, 'calc');
    expect(second.next?.wrongCount).toBe(2);
    expect(second.next?.firstWrongAt).toBe(T0); // 首次时间保持
    expect(second.next?.lastWrongAt).toBe(T0 + 1000);
    expect(second.next?.lastErrorType).toBe('calc');
  });

  it('答对一次仍在错题本里，连续答对两次才移出', () => {
    const wrong = applyMistake('q1', undefined, false, T0).next as MistakeRow;
    const once = applyMistake('q1', wrong, true, T0 + 1000);
    expect(once.removed).toBe(false);
    expect(once.next?.correctStreak).toBe(1);
    expect(once.next?.wrongCount).toBe(1); // 错误次数保留，用于排序

    const twice = applyMistake('q1', once.next ?? undefined, true, T0 + 2000);
    expect(twice.removed).toBe(true);
    expect(twice.next).toBeNull();
    expect(MISTAKE_GRADUATE_STREAK).toBe(2);
  });

  it('答错会重置连续答对计数', () => {
    const wrong = applyMistake('q1', undefined, false, T0).next as MistakeRow;
    const once = applyMistake('q1', wrong, true, T0 + 1).next as MistakeRow;
    const again = applyMistake('q1', once, false, T0 + 2);
    expect(again.next?.correctStreak).toBe(0);
    expect(again.next?.wrongCount).toBe(2);
  });

  it('从未错过的题答对了不会进错题本', () => {
    const result = applyMistake('q9', undefined, true, T0);
    expect(result.next).toBeNull();
    expect(result.removed).toBe(false);
  });
});

/* ---------------- 组卷 ---------------- */

describe('组卷', () => {
  const questions = [
    ...Array.from({ length: 10 }, (_, i) => makeQuestion(`ds${i}`, 'ds', [0])),
    ...Array.from({ length: 10 }, (_, i) => makeQuestion(`co${i}`, 'co', [1])),
    ...Array.from({ length: 10 }, (_, i) => makeQuestion(`os${i}`, 'os', [2])),
    ...Array.from({ length: 10 }, (_, i) => makeQuestion(`cn${i}`, 'cn', [3])),
  ];

  it('模考按各科分值比例抽题', () => {
    const ids = buildQuizQueue({ mode: 'exam', questions, mistakes: new Map() });
    expect(ids).toHaveLength(EXAM_TOTAL_COUNT);
    for (const slot of EXAM_BLUEPRINT) {
      const picked = ids.filter((id) => id.startsWith(slot.subject));
      expect(picked).toHaveLength(slot.count);
    }
  });

  it('随机模式受题量限制，科目/章节可以过滤', () => {
    expect(buildQuizQueue({ mode: 'random', questions, mistakes: new Map(), count: 7 })).toHaveLength(7);
    const onlyDs = buildQuizQueue({ mode: 'subject', questions, mistakes: new Map(), subject: 'ds' });
    expect(onlyDs).toHaveLength(10);
    expect(onlyDs.every((id) => id.startsWith('ds'))).toBe(true);
    const none = buildQuizQueue({ mode: 'chapter', questions, mistakes: new Map(), chapter: '不存在的章节' });
    expect(none).toHaveLength(0);
  });

  it('错题模式只出错题，并按错误次数从多到少排', () => {
    const mistakes = new Map<string, MistakeRow>([
      [
        'ds1',
        { questionId: 'ds1', wrongCount: 1, correctStreak: 0, lastErrorType: null, firstWrongAt: T0, lastWrongAt: T0 },
      ],
      [
        'co2',
        { questionId: 'co2', wrongCount: 3, correctStreak: 0, lastErrorType: null, firstWrongAt: T0, lastWrongAt: T0 },
      ],
    ]);
    const ids = buildQuizQueue({ mode: 'mistake', questions, mistakes });
    expect(ids).toEqual(['co2', 'ds1']);
    // 科目过滤同样生效
    expect(buildQuizQueue({ mode: 'mistake', questions, mistakes, subject: 'ds' })).toEqual(['ds1']);
  });
});

/* ---------------- 统计与报告 ---------------- */

describe('统计与模考报告', () => {
  const questions = [makeQuestion('ds1', 'ds', [0]), makeQuestion('co1', 'co', [1])];

  it('正确率、按科目与错因聚合', () => {
    const attempts: AttemptRow[] = [
      { questionId: 'ds1', ts: T0, chosen: [0], correct: true, mode: 'random', ms: 1000 },
      { questionId: 'ds1', ts: T0, chosen: [1], correct: false, mode: 'random', ms: 1000, errorType: 'calc' },
      { questionId: 'co1', ts: T0, chosen: [3], correct: false, mode: 'random', ms: 1000, errorType: 'concept' },
      { questionId: 'co1', ts: T0, chosen: [3], correct: false, mode: 'random', ms: 1000, errorType: 'concept' },
    ];
    const mistakes = new Map<string, MistakeRow>();
    const stats = quizStats(questions, attempts, mistakes, () => '2026-09-18', '2026-09-18');
    expect(stats.attempts).toBe(4);
    expect(stats.correct).toBe(1);
    expect(stats.accuracy).toBeCloseTo(0.25);
    expect(stats.todayAttempts).toBe(4);
    expect(stats.bySubject.find((s) => s.subject === 'ds')?.attempts).toBe(2);
    expect(stats.bySubject.find((s) => s.subject === 'co')?.accuracy).toBe(0);
    expect(stats.byError.find((e) => e.id === 'concept')?.count).toBe(2);
    expect(stats.byError.find((e) => e.id === 'calc')?.count).toBe(1);
  });

  it('模考报告按每题 2 分计分并给出分科明细', () => {
    const map = new Map(questions.map((q) => [q.id, q]));
    const report = buildExamReport(map, [
      { id: 'ds1', correct: true },
      { id: 'co1', correct: false },
    ]);
    expect(report.score).toBe(2);
    expect(report.fullScore).toBe(4);
    expect(report.correct).toBe(1);
    expect(report.wrongIds).toEqual(['co1']);
    expect(report.bySubject.map((s) => s.subject)).toEqual(['ds', 'co']);
  });
});

/* ---------------- 题库内容 ---------------- */

describe('内置题库', () => {
  it('四科题量均衡，结构自检无问题', () => {
    const rows = questionRows();
    // v5 起：四科各 3 批题，总量 300 道以上（只设下限）
    expect(rows.length).toBeGreaterThanOrEqual(300);
    for (const subject of ['ds', 'co', 'os', 'cn'] as const) {
      expect(rows.filter((row) => row.subject === subject).length, `${subject} 题量`).toBeGreaterThanOrEqual(75);
    }
    expect(auditQuestions()).toEqual([]);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('每题只有一个正确答案，选项数量与题型匹配', () => {
    for (const row of questionRows()) {
      expect(row.answer).toHaveLength(1);
      expect(row.options).toHaveLength(row.type === 'judge' ? 2 : 4);
      expect(row.analysis.length).toBeGreaterThanOrEqual(40);
      expect(row.options[row.answer[0]]).toBeTruthy();
    }
  });

  it('正确答案的字母分布不能过分集中', () => {
    const counts = [0, 0, 0, 0];
    for (const row of questionRows()) {
      if (row.type !== 'single') continue;
      counts[row.answer[0]] += 1;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    for (const count of counts) {
      // 每个字母至少占 10%，避免"答案全是 A"
      expect(count / total).toBeGreaterThan(0.1);
    }
  });
});
