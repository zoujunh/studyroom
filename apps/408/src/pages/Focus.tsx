import { useMemo, useState } from 'react';
import { InlineMarkdown, Markdown } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, StatTile, Toast, cx } from '../components/ui';
import { subjectMeta } from '../data/curriculum';
import { focusCards, focusStats } from '../lib/focus';
import { GRADE_LABEL } from '../srs/fsrs';
import { navigate } from '../lib/router';
import { useStore } from '../state/store';
import type { SubjectId } from '../types';

/**
 * 复习专项：刷卡时评「不会 / 模糊」的卡片集中在这里。
 * 与「错题本」（选择题）是一对：一个管卡片，一个管题目。
 */
export function FocusPage() {
  const { cards, cardFocus, srs, dropFocus } = useStore();
  const [filter, setFilter] = useState<SubjectId | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const stats = useMemo(() => focusStats(cardFocus, cards), [cardFocus, cards]);
  const rows = useMemo(() => focusCards(cardFocus, cards, filter), [cardFocus, cards, filter]);

  return (
    <div className="px-4 pt-5 pb-6">
      <header className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate('/')}
          className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[19px] font-semibold">复习专项</h1>
          <p className="text-[11.5px] text-ink-3">
            刷卡时评「不会 / 模糊」的卡片都在这里 · 连续两次「会了」自动移出
          </p>
        </div>
        {stats.total > 0 ? (
          <Button
            variant="primary"
            className="px-3 py-2 text-[12.5px]"
            data-testid="focus-review-all"
            onClick={() => navigate('/review?mode=focus')}
          >
            全部刷一遍
          </Button>
        ) : null}
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="专项待攻克" value={stats.total} sub="张卡片" />
        <StatTile label="其中「模糊」" value={stats.hardOnly} sub="最近一次评分" />
        <StatTile label="快毕业了" value={stats.almostDone} sub="已答对 1 次" />
      </div>

      {stats.total > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cx(
              'rounded-lg border px-2.5 py-1.5 text-[12px] transition',
              filter === 'all'
                ? 'border-brand bg-brand-soft font-medium text-brand-dark'
                : 'border-line bg-surface text-ink-2',
            )}
          >
            全部 {stats.total}
          </button>
          {stats.bySubject.map((item) => {
            if (!item.count) return null;
            return (
              <button
                key={item.subject}
                type="button"
                onClick={() => setFilter(item.subject)}
                className={cx(
                  'rounded-lg border px-2.5 py-1.5 text-[12px] transition',
                  filter === item.subject
                    ? 'border-brand bg-brand-soft font-medium text-brand-dark'
                    : 'border-line bg-surface text-ink-2',
                )}
              >
                {subjectMeta(item.subject).short} {item.count}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 space-y-2.5">
        {rows.map(({ card, row }) => {
          const open = openId === card.id;
          const srsRow = srs.get(card.id);
          return (
            <Panel key={card.id} className="overflow-hidden">
              <button
                type="button"
                className="w-full px-3.5 py-3 text-left active:bg-surface-2"
                onClick={() => setOpenId(open ? null : card.id)}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone="brand">{subjectMeta(card.subject).short}</Chip>
                  <Chip>{card.chapter}</Chip>
                  <Chip tone="again">错 {row.weakCount} 次</Chip>
                  <Chip tone={row.lastGrade === 'hard' ? 'hard' : 'again'}>
                    上次「{GRADE_LABEL[row.lastGrade]}」
                  </Chip>
                  {row.goodStreak > 0 ? <Chip tone="good">已答对 1 次</Chip> : null}
                </div>
                <InlineMarkdown
                  source={card.title}
                  className="mt-2 block text-[13.5px] leading-snug [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1"
                />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] text-ink-3">
                    {srsRow && srsRow.reps > 0
                      ? `已复习 ${srsRow.reps} 次 · 稳定度 ${srsRow.stability.toFixed(1)} 天`
                      : '还没进入复习周期'}
                  </span>
                  <Icon
                    name="chevronDown"
                    size={16}
                    className={cx('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
                  />
                </div>
              </button>

              {open ? (
                <div className="border-t border-line bg-surface-2 px-3.5 pt-3 pb-3.5">
                  <Markdown source={card.back} />
                  {card.hint ? (
                    <div className="mt-2.5 rounded-xl bg-brand-soft/70 px-3 py-2 text-[12.5px] leading-relaxed text-brand-dark">
                      <span className="font-semibold">记忆锚点 · </span>
                      {card.hint}
                    </div>
                  ) : null}
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      className="flex-1 px-3 py-2 text-[12.5px]"
                      onClick={() =>
                        navigate(
                          `/review?mode=chapter&subject=${card.subject}&chapter=${encodeURIComponent(card.chapter)}`,
                        )
                      }
                    >
                      去刷这一章
                    </Button>
                    <Button
                      variant="danger"
                      className="px-3 py-2 text-[12.5px]"
                      onClick={() => {
                        void dropFocus(card.id).then(() => {
                          setToast('已移出复习专项');
                          window.setTimeout(() => setToast(null), 1800);
                        });
                      }}
                    >
                      移出专项
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
              {stats.total === 0 ? '复习专项是空的' : '这个科目暂无专项卡片'}
            </div>
            <div className="text-[12.5px] leading-relaxed text-ink-3">
              {stats.total === 0
                ? '去刷卡吧——评「不会」或「模糊」的卡会自动进这里，连续两次「会了」自动移出。'
                : '换个科目看看。'}
            </div>
            <Button variant="primary" className="mt-1" onClick={() => navigate('/review?mode=due')}>
              去刷卡
            </Button>
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-3">
        复习专项和 FSRS 调度是两件事：FSRS 决定「什么时候该复习」，
        <br />
        专项记录「这一轮我明确没掌握的卡」，方便你考前集中突击。
      </p>

      <Toast message={toast} />
    </div>
  );
}
