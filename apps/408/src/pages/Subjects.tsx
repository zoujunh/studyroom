import { useEffect, useMemo, useState } from 'react';
import { InlineMarkdown, Markdown } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, Progress, SectionTitle, Segmented, cx } from '../components/ui';
import { SUBJECTS, subjectMeta } from '../data/curriculum';
import { navigate, useRoute } from '../lib/router';
import { byChapter, bySubject } from '../lib/stats';
import { statusOf } from '../srs/fsrs';
import { useStore } from '../state/store';
import type { MasteryStatus, SubjectId } from '../types';

const STATUS_STYLE: Record<MasteryStatus, { dot: string; label: string }> = {
  new: { dot: 'bg-ink-3/45', label: '没学过' },
  learning: { dot: 'bg-hard', label: '学习中' },
  mastered: { dot: 'bg-brand', label: '已掌握' },
};

export function SubjectsPage() {
  const route = useRoute();
  const { cards, srs } = useStore();
  const querySubject = route.query.get('subject') as SubjectId | null;
  const [active, setActive] = useState<SubjectId>(querySubject ?? 'ds');
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (querySubject && querySubject !== active) setActive(querySubject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySubject]);

  const subjects = useMemo(() => bySubject(cards, srs), [cards, srs]);
  const chapters = useMemo(() => byChapter(cards, srs, active), [cards, srs, active]);
  const activeCounts = subjects.find((s) => s.meta.id === active);
  const activeCards = useMemo(() => cards.filter((c) => c.subject === active), [cards, active]);

  return (
    <div className="px-4 pt-5 pb-6">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h1 className="text-[19px] font-semibold">我的科目</h1>
        <Button variant="primary" className="px-3 py-2 text-[13px]" onClick={() => navigate(`/review?mode=subject&subject=${active}`)}>
          刷这一科
        </Button>
      </header>

      <Segmented
        value={active}
        onChange={(value) => {
          setActive(value);
          setOpenChapter(null);
          setPreviewId(null);
        }}
        options={SUBJECTS.map((s) => ({ value: s.id, label: s.short }))}
      />

      {activeCounts ? (
        <Panel className="mt-3 px-3.5 py-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[17px] font-semibold text-white"
              style={{ backgroundColor: activeCounts.meta.color }}
            >
              {activeCounts.meta.glyph}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-medium">{activeCounts.meta.name}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">
                共 {activeCounts.total} 个知识点 · 已掌握 {activeCounts.mastered} · 学习中{' '}
                {activeCounts.learning} · 没学过 {activeCounts.new}
              </div>
            </div>
            <div className="shrink-0 text-[15px] font-semibold text-brand-dark">
              {Math.round(activeCounts.ratio * 100)}%
            </div>
          </div>
          <Progress className="mt-3" value={activeCounts.ratio} />
        </Panel>
      ) : null}

      <section className="mt-5">
        <SectionTitle extra={<span className="text-[11.5px] text-ink-3">{chapters.length} 个章节</span>}>
          章节
        </SectionTitle>
        <div className="space-y-2.5">
          {chapters.map((chapter) => {
            const open = openChapter === chapter.name;
            const list = activeCards.filter((c) => c.chapter === chapter.name);
            const ratio = chapter.total ? chapter.mastered / chapter.total : 0;
            return (
              <Panel key={chapter.name} className="overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2"
                  onClick={() => {
                    setOpenChapter(open ? null : chapter.name);
                    setPreviewId(null);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-medium">{chapter.name}</span>
                      <span className="shrink-0 text-[12px] text-ink-2">
                        {chapter.mastered}/{chapter.total}
                      </span>
                    </div>
                    <div className="mt-1 text-[11.5px] text-ink-3">
                      今天待复习 {chapter.dueToday} · 学习中 {chapter.learning}
                    </div>
                    <Progress className="mt-2" value={ratio} />
                  </div>
                  <Icon
                    name="chevronDown"
                    size={18}
                    className={cx('shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
                  />
                </button>

                {open ? (
                  <div className="border-t border-line">
                    <div className="flex items-center justify-between px-3.5 py-2">
                      <span className="text-[11.5px] text-ink-3">共 {list.length} 张卡</span>
                      <button
                        type="button"
                        className="text-[12px] font-medium text-brand"
                        onClick={() => navigate(`/review?mode=chapter&subject=${active}&chapter=${encodeURIComponent(chapter.name)}`)}
                      >
                        刷本章 →
                      </button>
                    </div>
                    <ul className="divide-y divide-line">
                      {list.map((card) => {
                        const status = statusOf(srs.get(card.id));
                        const style = STATUS_STYLE[status];
                        const previewing = previewId === card.id;
                        return (
                          <li key={card.id}>
                            <button
                              type="button"
                              className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left active:bg-surface-2"
                              onClick={() => setPreviewId(previewing ? null : card.id)}
                            >
                              <span className={cx('mt-[7px] h-2 w-2 shrink-0 rounded-full', style.dot)} />
                              <span className="min-w-0 flex-1">
                                <InlineMarkdown
                                  source={card.title}
                                  className="block text-[13.5px] leading-snug [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1"
                                />
                                <span className="mt-1 flex items-center gap-1.5">
                                  <span className="text-[11px] text-ink-3">{style.label}</span>
                                  {card.importance >= 4 ? <Chip tone="again">高频</Chip> : null}
                                  {card.year ? <Chip>真题 {card.year}</Chip> : null}
                                </span>
                              </span>
                              <Icon
                                name="chevronDown"
                                size={16}
                                className={cx('mt-0.5 shrink-0 text-ink-3 transition-transform', previewing && 'rotate-180')}
                              />
                            </button>
                            {previewing ? (
                              <div className="bg-surface-2 px-3.5 pt-1 pb-3.5">
                                <Markdown source={card.back} />
                                {card.hint ? (
                                  <div className="mt-2.5 rounded-xl bg-brand-soft/70 px-3 py-2 text-[12.5px] leading-relaxed text-brand-dark">
                                    <span className="font-semibold">记忆锚点 · </span>
                                    {card.hint}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </Panel>
            );
          })}
        </div>
      </section>

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-3">
        当前内容为 {subjectMeta(active).name} 的高频知识点种子卡，
        <br />
        后续里程碑会持续扩充到 408 全量考纲。
      </p>
    </div>
  );
}
