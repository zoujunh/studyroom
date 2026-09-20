import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InlineMarkdown, Markdown } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, StatTile, Toast, cx } from '../components/ui';
import { subjectMeta } from '../data/curriculum';
import { back, navigate, useRoute } from '../lib/router';
import {
  buildExamReport,
  buildQuizQueue,
  ERROR_TYPES,
  EXAM_MINUTES,
  errorTypeLabel,
  type ExamReport,
} from '../lib/quiz';
import { useStore } from '../state/store';
import type { ErrorType, QuestionRow, QuizMode } from '../types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function sessionTitle(mode: QuizMode, subject?: string | null, chapter?: string | null): string {
  if (mode === 'exam') return '模考';
  if (mode === 'mistake') return '错题重做';
  if (chapter) return `章节 · ${chapter}`;
  if (subject) return `${subjectMeta(subject as QuestionRow['subject']).short} · 专项练习`;
  return '随机练习';
}

interface Judged {
  correct: boolean;
  removed: boolean;
  errorType?: ErrorType;
}

export function QuizRunPage() {
  const route = useRoute();
  const { ready, questions, questionMap, mistakes, answerQuestion, tagErrorType } = useStore();

  const mode = (route.query.get('mode') as QuizMode | null) ?? 'random';
  const subject = route.query.get('subject');
  const chapter = route.query.get('chapter');
  const count = Number(route.query.get('count') ?? '') || undefined;
  const isExam = mode === 'exam';

  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number[]>([]);
  const [judged, setJudged] = useState<Judged | null>(null);
  const [tally, setTally] = useState({ correct: 0, wrong: 0 });
  const [examAnswers, setExamAnswers] = useState<Map<string, number[]>>(new Map());
  const [report, setReport] = useState<ExamReport | null>(null);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const sessionStart = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const submittedRef = useRef(false);

  /** 会话参数指纹：只变 query 不变路径时也要能重开一轮。 */
  const sessionKey = `${mode}|${subject ?? ''}|${chapter ?? ''}|${count ?? ''}`;

  /** 清空本轮状态重开（URL 不变时也有效，比如结算页点「重做错题」）。 */
  const restart = useCallback(() => {
    setQueue(null);
    setIndex(0);
    setChosen([]);
    setJudged(null);
    setTally({ correct: 0, wrong: 0 });
    setExamAnswers(new Map());
    setReport(null);
    setWrongIds([]);
    setToast(null);
    submittedRef.current = false;
  }, []);

  // 会话参数变化 → 先把旧状态清空（下一帧的组卷 effect 会自动重开）
  useEffect(() => {
    restart();
  }, [restart, sessionKey]);

  useEffect(() => {
    if (!ready || queue !== null) return;
    setQueue(buildQuizQueue({ mode, questions, mistakes, subject, chapter, count }));
    sessionStart.current = Date.now();
    questionStart.current = Date.now();
    // 只在会话开始时组卷一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queue, sessionKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const total = queue?.length ?? 0;
  const currentId = queue && index < total ? queue[index] : null;
  const question = currentId ? questionMap.get(currentId) : undefined;
  const isLast = total > 0 && index >= total - 1;
  const elapsed = Math.max(0, Math.floor((now - sessionStart.current) / 1000));
  const remaining = Math.max(0, EXAM_MINUTES * 60 - elapsed);
  // 练习模式：最后一题答完再点一次就结算；模考模式：交卷后才出报告
  const finished = report !== null || (!isExam && total > 0 && index >= total);

  const submitExam = useCallback(
    async (override?: Map<string, number[]>) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const answered = override ?? examAnswers;
      const ids = queue ?? [];
      const results: { id: string; correct: boolean }[] = [];
      const wrong: string[] = [];
      for (const id of ids) {
        const answer = answered.get(id) ?? [];
        const result = await answerQuestion(id, answer, 'exam', 0);
        results.push({ id, correct: result.correct });
        if (!result.correct) wrong.push(id);
      }
      setWrongIds(wrong);
      setReport(buildExamReport(questionMap, results));
    },
    [answerQuestion, examAnswers, questionMap, queue],
  );

  /** 把当前这题尚未提交的选择并入答卷（交卷 / 超时都要用）。 */
  const withCurrentChoice = useCallback(
    (base: Map<string, number[]>) => {
      if (!question || chosen.length === 0) return base;
      const next = new Map(base);
      next.set(question.id, chosen);
      setExamAnswers(next);
      return next;
    },
    [chosen, question],
  );

  // 模考倒计时结束自动交卷（含当前题的选择）
  useEffect(() => {
    if (!isExam || total === 0 || remaining > 0 || submittedRef.current) return;
    const merged = withCurrentChoice(examAnswers);
    void submitExam(merged);
  }, [examAnswers, isExam, remaining, submitExam, total, withCurrentChoice]);

  const submit = useCallback(async () => {
    if (!question || judged || chosen.length === 0) return;
    const ms = Date.now() - questionStart.current;
    const result = await answerQuestion(question.id, chosen, mode, ms);
    setJudged({ correct: result.correct, removed: result.removedFromMistakes });
    setTally((current) =>
      result.correct
        ? { ...current, correct: current.correct + 1 }
        : { ...current, wrong: current.wrong + 1 },
    );
    if (result.correct && result.removedFromMistakes) {
      setToast('连续答对两次，已移出错题本');
    } else if (!result.correct) {
      setWrongIds((current) => (current.includes(question.id) ? current : [...current, question.id]));
      setToast('已加入错题本');
    }
  }, [answerQuestion, chosen, judged, mode, question]);

  const advance = useCallback(() => {
    setJudged(null);
    setChosen([]);
    questionStart.current = Date.now();
    setIndex((current) => current + 1);
  }, []);

  const pickErrorType = useCallback(
    async (errorType: ErrorType) => {
      if (!question) return;
      await tagErrorType(question.id, errorType);
      setJudged((current) => (current ? { ...current, errorType } : current));
      setToast(`已记为「${errorTypeLabel(errorType)}」`);
    },
    [question, tagErrorType],
  );

  const toggleChoice = useCallback(
    (option: number) => {
      if (!question || judged) return;
      setChosen([option]);
    },
    [judged, question],
  );

  const goPrev = useCallback(() => {
    if (index <= 0) return;
    setIndex((current) => Math.max(0, current - 1));
    setChosen([]);
    setJudged(null);
    questionStart.current = Date.now();
  }, [index]);

  // 键盘：1-4 选择、Enter 提交/下一题、← 上一题、Esc 退出
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'Escape') {
        back();
        return;
      }
      const digit = Number(event.key);
      if (digit >= 1 && digit <= (question?.options.length ?? 0)) {
        event.preventDefault();
        toggleChoice(digit - 1);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (isExam) {
          if (isLast) void submitExam();
          else advance();
        } else if (judged) {
          if (!isLast) advance();
        } else {
          void submit();
        }
        return;
      }
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, goPrev, isExam, isLast, judged, question, submit, submitExam, toggleChoice]);

  const answeredCount = useMemo(
    () => (queue ?? []).filter((id) => (examAnswers.get(id) ?? []).length > 0).length,
    [examAnswers, queue],
  );

  /* ---------------- 结算 ---------------- */

  if (finished) {
    const wrongList = wrongIds;
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="返回"
              onClick={() => navigate('/quiz')}
              className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <div className="text-[15px] font-semibold">
              {isExam ? '模考报告' : '本轮完成'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-4">
          {isExam && report ? (
            <>
              <Panel className="px-4 py-4 text-center">
                <div className="text-[12.5px] text-ink-3">得分</div>
                <div className="mt-1 text-[34px] leading-none font-semibold text-brand">
                  {report.score}
                  <span className="text-[16px] text-ink-3"> / {report.fullScore}</span>
                </div>
                <div className="mt-2 text-[12.5px] text-ink-3">
                  答对 {report.correct} / {report.total} 题 · 用时 {mmss(elapsed)}
                </div>
              </Panel>
              <div className="mt-3 space-y-2">
                {report.bySubject.map((item) => (
                  <Panel key={item.subject} className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className="h-8 w-8 shrink-0 rounded-lg text-center text-[13px] leading-8 font-semibold text-white" style={{ backgroundColor: subjectMeta(item.subject).color }}>
                      {subjectMeta(item.subject).glyph}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{item.name}</div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${item.total ? (item.correct / item.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-[13px] tabular-nums text-ink-2">
                      {item.correct}/{item.total}
                    </div>
                  </Panel>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile label="做对" value={tally.correct} />
              <StatTile label="做错" value={tally.wrong} />
              <StatTile
                label="正确率"
                value={`${
                  tally.correct + tally.wrong
                    ? Math.round((tally.correct / (tally.correct + tally.wrong)) * 100)
                    : 0
                }%`}
              />
            </div>
          )}

          {wrongList.length ? (
            <div className="mt-4">
              <div className="mb-2 text-[13.5px] font-medium text-ink-2">
                错题 {wrongList.length} 道（已自动进错题本）
              </div>
              <div className="space-y-2">
                {wrongList.map((id) => {
                  const item = questionMap.get(id);
                  if (!item) return null;
                  return (
                    <Panel key={id} className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Chip tone="brand">{subjectMeta(item.subject).short}</Chip>
                        <Chip>{item.chapter}</Chip>
                      </div>
                      <InlineMarkdown source={item.stem} className="mt-2 block text-[13.5px] leading-snug" />
                      <div className="mt-1.5 text-[12px] text-good">
                        正确答案：{item.answer.map((i) => OPTION_LETTERS[i]).join('、')}
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => navigate('/quiz')}>
              回到题库
            </Button>
            <Button
              data-testid="redo-mistakes"
              onClick={() => {
                navigate('/quiz/run?mode=mistake');
                restart();
              }}
            >
              重做错题
            </Button>
          </div>
          <Button
            variant="ghost"
            block
            className="mt-2"
            data-testid="restart-session"
            onClick={restart}
          >
            再来一轮
          </Button>
        </main>
        <Toast message={toast} />
      </div>
    );
  }

  /* ---------------- 答题中 ---------------- */

  const correctSet = new Set(question?.answer ?? []);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-line bg-canvas/95 px-4 pt-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="返回"
            onClick={back}
            className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold">
              {sessionTitle(mode, subject, chapter)}
              {total ? <span className="text-ink-3"> · 共 {total} 题</span> : null}
            </div>
            <div className="text-[11.5px] text-ink-3">
              {isExam
                ? `已作答 ${answeredCount} / ${total}`
                : `对 ${tally.correct} · 错 ${tally.wrong}`}
            </div>
          </div>
          <div
            className={cx(
              'shrink-0 rounded-[10px] border px-2.5 py-1.5 text-[13px] font-semibold tabular-nums',
              isExam && remaining <= 60
                ? 'border-again/40 bg-again-soft text-again'
                : 'border-line bg-surface text-ink-2',
            )}
          >
            {isExam ? mmss(remaining) : mmss(elapsed)}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${total ? ((index + (judged ? 1 : 0)) / total) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">
            {Math.min(index + 1, total)} / {total}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {question ? (
          <Panel className="px-4 py-4">
            {/* 供自动化测试定位当前题目 */}
            <span className="hidden" data-question-id={question.id} />
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone="brand">{subjectMeta(question.subject).name}</Chip>
              <Chip>{question.chapter}</Chip>
              <Chip tone={question.difficulty >= 3 ? 'again' : 'neutral'}>
                难度 {'●'.repeat(Math.max(1, Math.min(3, question.difficulty)))}
              </Chip>
              {question.year ? <Chip tone="hard">真题 {question.year}</Chip> : null}
            </div>

            <InlineMarkdown
              source={question.stem}
              className="mt-3.5 block text-[15.5px] leading-[1.7] font-medium [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1"
            />

            <div className="mt-3.5 space-y-2">
              {question.options.map((option, optionIndex) => {
                const selected = chosen.includes(optionIndex);
                const isAnswer = correctSet.has(optionIndex);
                // 练习模式判分后揭晓答案；模考模式整卷交完才揭晓
                const reveal = Boolean(judged);
                return (
                  <button
                    key={optionIndex}
                    type="button"
                    data-testid={`option-${optionIndex}`}
                    onClick={() => toggleChoice(optionIndex)}
                    className={cx(
                      'flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition',
                      !reveal && selected && 'border-brand bg-brand-soft',
                      !reveal && !selected && 'border-line bg-surface-2 active:bg-line',
                      reveal && isAnswer && 'border-good bg-good-soft',
                      reveal && !isAnswer && selected && 'border-again bg-again-soft',
                      reveal && !isAnswer && !selected && 'border-line bg-surface-2 opacity-70',
                    )}
                  >
                    <span
                      className={cx(
                        'mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border text-[11.5px] font-semibold',
                        !reveal && selected
                          ? 'border-brand bg-brand text-white'
                          : reveal && isAnswer
                            ? 'border-good bg-good text-white'
                            : reveal && selected
                              ? 'border-again bg-again text-white'
                              : 'border-line bg-surface text-ink-3',
                      )}
                    >
                      {OPTION_LETTERS[optionIndex]}
                    </span>
                    <InlineMarkdown source={option} className="min-w-0 flex-1 text-[14px] leading-relaxed" />
                  </button>
                );
              })}
            </div>

            {judged ? (
              <div className="mt-3.5">
                <div
                  className={cx(
                    'rounded-xl px-3 py-2 text-[13px] font-medium',
                    judged.correct ? 'bg-good-soft text-good' : 'bg-again-soft text-again',
                  )}
                >
                  {judged.correct
                    ? judged.removed
                      ? '答对了，连续两次正确，已移出错题本'
                      : '答对了'
                    : `答错了，正确答案是 ${question.answer.map((i) => OPTION_LETTERS[i]).join('、')}`}
                </div>
                <div className="mt-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3">
                  <Markdown source={question.analysis} />
                </div>
                {!judged.correct ? (
                  <div className="mt-2.5">
                    <div className="mb-1.5 text-[11.5px] text-ink-3">
                      这道题错在哪？（可选，用来分析薄弱环节）
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ERROR_TYPES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => void pickErrorType(item.id)}
                          className={cx(
                            'rounded-lg border px-2.5 py-1.5 text-[12px] transition',
                            judged.errorType === item.id
                              ? 'border-brand bg-brand-soft text-brand-dark'
                              : 'border-line bg-surface text-ink-2 active:bg-surface-2',
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Panel>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 pt-12 text-center">
            <div className="text-[15.5px] font-semibold">
              {mode === 'mistake' ? '错题本是空的' : '这个范围里还没有题目'}
            </div>
            <div className="text-[13px] leading-relaxed text-ink-3">
              {mode === 'mistake'
                ? '先去做几道题，答错的会自动进错题本，之后可以在这里集中重做。'
                : '换一个科目或章节试试。'}
            </div>
            <Button variant="primary" className="mt-1" onClick={() => navigate('/quiz')}>
              回到题库
            </Button>
          </div>
        )}
      </main>

      {question ? (
        <div className="shrink-0 border-t border-line bg-surface px-3 pt-2.5 pb-2.5">
          <div className="flex items-center gap-2">
            {isExam ? (
              <>
                <Button
                  className="px-3 py-2.5 text-[13px]"
                  disabled={index <= 0}
                  onClick={goPrev}
                >
                  上一题
                </Button>
                {isLast ? (
                  <Button
                    variant="primary"
                    block
                    data-testid="submit-exam"
                    onClick={() => void submitExam(withCurrentChoice(examAnswers))}
                  >
                    交卷（已答 {answeredCount}/{total}）
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    block
                    data-testid="next-question"
                    onClick={() => {
                      withCurrentChoice(examAnswers);
                      advance();
                    }}
                  >
                    下一题
                  </Button>
                )}
              </>
            ) : (
              <>
                {judged ? (
                  <Button
                    variant="primary"
                    block
                    data-testid="next-question"
                    onClick={advance}
                  >
                    {isLast ? '完成本轮（Enter）' : '下一题（Enter）'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    block
                    data-testid="submit-answer"
                    disabled={chosen.length === 0}
                    onClick={() => void submit()}
                  >
                    提交答案（Enter）
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-3">
            {isExam
              ? '模考中不显示对错，交卷后统一判分 · ← 上一题 · Enter 下一题'
              : judged
                ? 'Enter 下一题 · 可以点错因标注薄弱环节'
                : '数字键 1-4 选择 · Enter 提交'}
          </p>
        </div>
      ) : null}

      <Toast message={toast} />
    </div>
  );
}
