import { useMemo, useState } from 'react';
import { InlineMarkdown, Markdown } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, Toast, cx } from '../components/ui';
import { SUBJECTS, subjectMeta } from '../data/curriculum';
import { errorTypeLabel, quizStats } from '../lib/quiz';
import { dayKey } from '../lib/date';
import { navigate } from '../lib/router';
import { useStore } from '../state/store';
import type { SubjectId } from '../types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function MistakesPage() {
  const { questions, attempts, mistakes, questionMap, dropMistake } = useStore();
  const [filter, setFilter] = useState<SubjectId | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(
    () => quizStats(questions, attempts, mistakes, (ts) => dayKey(ts), dayKey()),
    [questions, attempts, mistakes],
  );

  const rows = useMemo(() => {
    return [...mistakes.values()]
      .map((row) => ({ row, question: questionMap.get(row.questionId) }))
      .filter((item) => item.question && (filter === 'all' || item.question.subject === filter))
      .sort((a, b) => b.row.wrongCount - a.row.wrongCount || b.row.lastWrongAt - a.row.lastWrongAt);
  }, [filter, mistakes, questionMap]);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const maxErrorCount = Math.max(1, ...stats.byError.map((item) => item.count));

  return (
    <div className="px-4 pt-5 pb-6">
      <header className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate('/quiz')}
          className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[19px] font-semibold">错题本</h1>
          <p className="text-[11.5px] text-ink-3">
            {stats.mistakes} 道待订正 · {stats.resolved} 道已答对一次（再答对一次就移出）
          </p>
        </div>
        {stats.mistakes > 0 ? (
          <Button
            variant="primary"
            className="px-3 py-2 text-[12.5px]"
            onClick={() => navigate('/quiz/run?mode=mistake')}
          >
            全部重做
          </Button>
        ) : null}
      </header>

      {stats.byError.length ? (
        <Panel className="px-3.5 py-3">
          <div className="text-[12.5px] font-medium text-ink-2">错因分布</div>
          <div className="mt-2 space-y-2">
            {stats.byError.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5">
                <span className="w-[62px] shrink-0 text-[12px] text-ink-2">{item.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-hard"
                    style={{ width: `${(item.count / maxErrorCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-3">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
            「概念不清」占比高说明要回去刷知识点卡；「计算失误」多则要练手算速度。
          </p>
        </Panel>
      ) : (
        <Panel className="px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-3">
          还没有标注过错因。做题答错后可以顺手点一下「概念不清 / 计算失误 / 审题错误」，
          这里就会汇总出你的薄弱环节。
        </Panel>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cx(
            'rounded-lg border px-2.5 py-1.5 text-[12px] transition',
            filter === 'all' ? 'border-brand bg-brand-soft font-medium text-brand-dark' : 'border-line bg-surface text-ink-2',
          )}
        >
          全部 {mistakes.size}
        </button>
        {SUBJECTS.map((subject) => {
          const count = [...mistakes.values()].filter(
            (row) => questionMap.get(row.questionId)?.subject === subject.id,
          ).length;
          if (!count) return null;
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => setFilter(subject.id)}
              className={cx(
                'rounded-lg border px-2.5 py-1.5 text-[12px] transition',
                filter === subject.id
                  ? 'border-brand bg-brand-soft font-medium text-brand-dark'
                  : 'border-line bg-surface text-ink-2',
              )}
            >
              {subject.short} {count}
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-2.5">
        {rows.map(({ row, question }) => {
          if (!question) return null;
          const open = openId === question.id;
          return (
            <Panel key={question.id} className="overflow-hidden">
              <button
                type="button"
                className="w-full px-3.5 py-3 text-left active:bg-surface-2"
                onClick={() => setOpenId(open ? null : question.id)}
              >
                <div className="flex items-center gap-1.5">
                  <Chip tone="brand">{subjectMeta(question.subject).short}</Chip>
                  <Chip>{question.chapter}</Chip>
                  <Chip tone="again">错 {row.wrongCount} 次</Chip>
                  {row.correctStreak > 0 ? <Chip tone="good">已答对 1 次</Chip> : null}
                </div>
                <InlineMarkdown
                  source={question.stem}
                  className="mt-2 block text-[13.5px] leading-snug [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1"
                />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] text-ink-3">
                    最后错因：{errorTypeLabel(row.lastErrorType)}
                  </span>
                  <Icon
                    name="chevronDown"
                    size={16}
                    className={cx('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
                  />
                </div>
              </button>

              {open ? (
                <div className="border-t border-line px-3.5 pt-3 pb-3.5">
                  <div className="text-[12.5px] text-good">
                    正确答案：{question.answer.map((index) => OPTION_LETTERS[index]).join('、')}
                  </div>
                  <div className="mt-1 text-[12.5px] text-ink-3">
                    {question.options.map((option, index) => (
                      <span key={index} className="mr-3 inline-block">
                        <span className="mr-1 font-medium">{OPTION_LETTERS[index]}.</span>
                        <InlineMarkdown source={option} />
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                    <Markdown source={question.analysis} />
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      className="flex-1 px-3 py-2 text-[12.5px]"
                      onClick={() => navigate(`/quiz/run?mode=chapter&subject=${question.subject}&chapter=${encodeURIComponent(question.chapter)}`)}
                    >
                      去练这一章
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-2 text-[12.5px]"
                      onClick={() => {
                        void dropMistake(question.id).then(() => flash('已移出错题本'));
                      }}
                    >
                      移出错题本
                    </Button>
                  </div>
                </div>
              ) : null}
            </Panel>
          );
        })}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <div className="text-[15px] font-medium">
              {mistakes.size === 0 ? '错题本是空的' : '这个科目没有错题'}
            </div>
            <div className="text-[12.5px] leading-relaxed text-ink-3">
              {mistakes.size === 0
                ? '去做几道题，答错的会自动进错题本，连续答对两次自动移出。'
                : '换个科目看看。'}
            </div>
            <Button variant="primary" className="mt-1" onClick={() => navigate('/quiz')}>
              去题库
            </Button>
          </div>
        ) : null}
      </div>

      <Toast message={toast} />
    </div>
  );
}
