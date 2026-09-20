import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InlineMarkdown, Markdown } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, Toast, cx } from '../components/ui';
import { subjectMeta } from '../data/curriculum';
import { dueLabel, maxIntervalDays } from '../lib/date';
import { buildQueue, sessionTitle } from '../lib/queue';
import { back, navigate, useRoute } from '../lib/router';
import { sortNewCards } from '../lib/stats';
import { GRADE_LABEL, GRADE_SUBLABEL, STATE_LABEL, previewIntervals, statusOf } from '../srs/fsrs';
import { useStore } from '../state/store';
import type { Grade, SessionMode } from '../types';

const GRADES: Grade[] = ['again', 'hard', 'good'];

const GRADE_STYLE: Record<Grade, string> = {
  again: 'border-again/35 bg-again-soft text-again',
  hard: 'border-hard/35 bg-hard-soft text-hard',
  good: 'border-good/35 bg-good-soft text-good',
  easy: 'border-line bg-surface-2 text-ink-2',
};

export function ReviewPage() {
  const route = useRoute();
  const { ready, cards, cardMap, srs, logs, settings, lastLog, gradeCard, undo } = useStore();

  const mode = (route.query.get('mode') as SessionMode | null) ?? 'due';
  const subject = route.query.get('subject');
  const chapter = route.query.get('chapter');

  const [queue, setQueue] = useState<string[] | null>(null);
  const [plannedTotal, setPlannedTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState<Record<Grade, number>>({ again: 0, hard: 0, good: 0, easy: 0 });
  const [toast, setToast] = useState<string | null>(null);
  /** 上一张的评分结果，常驻显示在头部，让「分存到哪了」一眼可见。 */
  const [lastRecord, setLastRecord] = useState<{ grade: Grade; due: number } | null>(null);
  const startedAt = useRef(Date.now());
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ready || queue !== null) return;
    const ids = buildQueue({ mode, cards, srs, logs, settings, subject, chapter });
    setQueue(ids);
    setPlannedTotal(ids.length);
    startedAt.current = Date.now();
    // 只在会话开始时构建一次队列。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queue, mode, subject, chapter]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentId = queue && queue.length ? queue[0] : null;
  const card = currentId ? cardMap.get(currentId) : undefined;
  const row = currentId ? srs.get(currentId) ?? null : null;

  const intervals = useMemo(() => {
    if (!card) return null;
    try {
      return previewIntervals(
        row,
        settings.requestRetention,
        new Date(),
        maxIntervalDays(settings.examDate),
      );
    } catch {
      return null;
    }
  }, [card, row, settings.requestRetention, settings.examDate]);

  const handleGrade = useCallback(
    async (grade: Grade) => {
      if (!currentId) return;
      const { requeue, next } = await gradeCard(currentId, grade, mode);
      setTally((t) => ({ ...t, [grade]: t[grade] + 1 }));
      setLastRecord({ grade, due: next.due });
      setToast(
        `已记录到本机 · ${GRADE_LABEL[grade]} · ${
          next.due <= Date.now() ? '本轮稍后重现' : `${dueLabel(next.due)}后复习`
        }`,
      );
      setDone((d) => d + 1);
      setFlipped(false);
      setQueue((q) => {
        if (!q) return q;
        const [head, ...rest] = q;
        return requeue ? [...rest, head] : rest;
      });
      mainRef.current?.scrollTo?.({ top: 0, behavior: 'auto' });
    },
    [currentId, gradeCard, mode],
  );

  const handleUndo = useCallback(async () => {
    const log = await undo();
    if (!log) {
      setToast('没有可撤销的记录');
      return;
    }
    setQueue((q) => (q ? [log.cardId, ...q.filter((id) => id !== log.cardId)] : q));
    setDone((d) => Math.max(0, d - 1));
    setTally((t) => ({ ...t, [log.grade]: Math.max(0, t[log.grade] - 1) }));
    setFlipped(false);
    setToast('已撤销上一张');
  }, [undo]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (event.key === '1') void handleGrade('again');
      else if (event.key === '2') void handleGrade('hard');
      else if (event.key === '3') void handleGrade('good');
      else if (event.key === 'z' || event.key === 'Z') void handleUndo();
      else if (event.key === 'Escape') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleGrade, handleUndo]);

  // 进度按「本轮真实剩余」计算：短学习步内重现的卡会让分母变大，这样进度条不会骗人。
  const remaining = queue?.length ?? 0;
  const denominator = done + remaining;
  const progressLabel = denominator
    ? `${Math.min(done + 1, denominator)} / ${denominator}`
    : `${done} / ${done}`;
  const progressRatio = denominator ? done / denominator : 0;

  const extendNewCards = () => {
    const fresh = sortNewCards(cards.filter((c) => statusOf(srs.get(c.id)) === 'new'));
    const extra = fresh.slice(0, 10).map((c) => c.id);
    if (!extra.length) {
      setToast('已经没有没学过的新卡了');
      return;
    }
    setQueue((q) => [...(q ?? []), ...extra]);
    setPlannedTotal((t) => t + extra.length);
  };

  const finished = queue !== null && queue.length === 0;
  const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));

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
              {plannedTotal ? <span className="text-ink-3"> · 共 {plannedTotal} 张</span> : null}
            </div>
            <div className="text-[11.5px] text-ink-3">
              会了 {tally.good} · 模糊 {tally.hard} · 不会 {tally.again}
            </div>
            {lastRecord ? (
              <div className="mt-0.5 text-[11px] text-brand-dark">
                上次评「{GRADE_LABEL[lastRecord.grade]}」→{' '}
                {lastRecord.due <= Date.now() ? '本轮稍后重现' : `${dueLabel(lastRecord.due)}后复习`}
                <span className="text-ink-3">（已存本机）</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="撤销"
            onClick={() => void handleUndo()}
            disabled={!lastLog}
            className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2 disabled:opacity-40"
          >
            <Icon name="undo" size={18} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">{progressLabel}</span>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-4">
        {card ? (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            // 只在「没看答案」时接管手势：看答案后必须把触摸还给页面滚动，
            // 否则长答案没法往下翻（这是上一版的实际 bug）。
            drag={!flipped}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.18}
            style={{ touchAction: flipped ? 'pan-y' : 'none' }}
            onTap={() => {
              // 只看答案，绝不因为点击而收起——收起只能用「收起答案」按钮或空格键。
              if (!flipped) setFlipped(true);
            }}
            onDragEnd={(_event, info) => {
              if (flipped) return;
              // 左右滑 / 上滑 都当作「看答案」，与提示文案一致。
              if (Math.abs(info.offset.x) > 60 || info.offset.y < -60) setFlipped(true);
            }}
          >
            <Panel className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone="brand">{subjectMeta(card.subject).name}</Chip>
                <Chip>{card.chapter}</Chip>
                {card.year ? <Chip tone="hard">真题 {card.year}</Chip> : null}
                <Chip tone={card.importance >= 4 ? 'again' : 'neutral'}>
                  考频 {'★'.repeat(Math.max(1, Math.min(5, card.importance)))}
                </Chip>
              </div>

              {row && row.reps > 0 ? (
                <div className="mt-2.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-ink-3">
                  这张卡已复习 <span className="font-medium text-ink-2">{row.reps}</span> 次 ·{' '}
                  {STATE_LABEL[row.state] ?? ''} · 记忆稳定度 {row.stability.toFixed(1)} 天
                  {row.last_review
                    ? ` · 上次 ${Math.max(1, Math.round((Date.now() - row.last_review) / 86400000))} 天前`
                    : ''}
                  {row.lapses > 0 ? ` · 忘过 ${row.lapses} 次` : ''}
                </div>
              ) : null}

              <InlineMarkdown
                source={card.title}
                className="mt-4 block text-center text-[18.5px] leading-[1.5] font-semibold [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:text-[15px]"
              />

              {flipped ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.16 }}
                  className="mt-3"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-line" />
                    <button
                      type="button"
                      onClick={() => setFlipped(false)}
                      className="shrink-0 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink-3 active:bg-line"
                    >
                      收起答案
                    </button>
                  </div>
                  <Markdown source={card.back} />
                  {card.hint ? (
                    <div className="mt-3.5 rounded-xl bg-brand-soft/70 px-3 py-2 text-[12.5px] leading-relaxed text-brand-dark">
                      <span className="font-semibold">记忆锚点 · </span>
                      {card.hint}
                    </div>
                  ) : null}
                  {card.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {card.tags.map((tag) => (
                        <Chip key={tag}>#{tag}</Chip>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              ) : (
                <p className="mt-8 mb-2 text-center text-[13px] text-ink-3">
                  点一下看答案（也可以左右滑 / 上滑）
                </p>
              )}
            </Panel>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 pt-10 text-center">
            {finished && done > 0 ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
                  <Icon name="check" size={26} />
                </div>
                <div className="text-[16px] font-semibold">本轮完成</div>
                <div className="text-[13px] text-ink-3">
                  共 {done} 张 · 会了 {tally.good} · 模糊 {tally.hard} · 不会 {tally.again} · 约 {elapsedMin} 分钟
                </div>
                <div className="text-[11.5px] text-ink-3">
                  记录已存入本机浏览器（设置 → 数据 可查看与导出）
                </div>
                <div className="mt-2 grid w-full grid-cols-2 gap-2">
                  <Button variant="primary" onClick={() => navigate('/')}>
                    回到首页
                  </Button>
                  <Button onClick={extendNewCards}>再来 10 张新卡</Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-[15.5px] font-semibold">
                  {mode === 'new' ? '今日新卡额度已用完' : '现在没有到期的卡片'}
                </div>
                <div className="text-[13px] leading-relaxed text-ink-3">
                  {mode === 'new'
                    ? `每天新卡上限是 ${settings.newPerDay} 张，可在设置里调整，或直接再加 10 张。`
                    : '所有到期卡片都复习完了。可以随机刷卡保持手感，或去「设置」提高每日新卡上限。'}
                </div>
                <div className="mt-2 grid w-full grid-cols-2 gap-2">
                  <Button variant="primary" onClick={extendNewCards}>
                    加学 10 张新卡
                  </Button>
                  <Button onClick={() => navigate('/review?mode=random')}>随机刷卡</Button>
                </div>
                <Button variant="ghost" className="mt-1" onClick={() => navigate('/settings')}>
                  去设置每日上限
                </Button>
              </>
            )}
          </div>
        )}
      </main>

      {card ? (
        <div className="shrink-0 border-t border-line bg-surface px-3 pt-2.5 pb-2.5">
          <div className="grid grid-cols-3 gap-2">
            {GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => void handleGrade(grade)}
                className={cx(
                  'flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all duration-100 active:scale-[0.97]',
                  GRADE_STYLE[grade],
                )}
              >
                <span className="text-[15px] font-semibold">{GRADE_LABEL[grade]}</span>
                <span className="text-[10.5px] opacity-85">
                  {flipped && intervals ? dueLabel(intervals[grade]) : GRADE_SUBLABEL[grade]}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-3">
            {flipped
              ? '1/2/3 评分 · 括号里是下次复习时间 · 空格 收起答案 · Z 撤销'
              : '1/2/3 可直接评分（没看答案也行）· 空格/点卡片 看答案 · Z 撤销'}
          </p>
        </div>
      ) : null}

      <Toast message={toast} />
    </div>
  );
}
