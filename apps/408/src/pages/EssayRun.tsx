import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Markdown, RichText } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, cx } from '../components/ui';
import { subjectMeta } from '../data/curriculum';
import {
  buildEssayQueue,
  essayFullScore,
  missedPoints,
  rateTier,
  scoreEssay,
} from '../lib/essay';
import { back, navigate, useRoute } from '../lib/router';
import { useStore } from '../state/store';
import type { EssayMode } from '../types';

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function sessionTitle(mode: EssayMode, subject?: string | null, chapter?: string | null): string {
  if (mode === 'single') return '单题练习';
  if (mode === 'subject' && subject) return `${subjectMeta(subject as 'ds').short} · 大题专项`;
  if (mode === 'chapter' && chapter) return `章节 · ${chapter}`;
  return '综合应用题';
}

export function EssayRunPage() {
  const route = useRoute();
  const { ready, essays, essayMap, recordEssay } = useStore();

  const mode = (route.query.get('mode') as EssayMode | null) ?? 'random';
  const subject = route.query.get('subject');
  const chapter = route.query.get('chapter');
  const singleId = route.query.get('id');
  const count = Number(route.query.get('count') ?? '') || undefined;
  const sessionKey = `${mode}|${subject ?? ''}|${chapter ?? ''}|${singleId ?? ''}|${count ?? ''}`;

  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState<number[]>([]);
  const [tally, setTally] = useState({ score: 0, full: 0, done: 0 });
  const [missed, setMissed] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sessionStart = useRef(Date.now());
  const questionStart = useRef(Date.now());

  useEffect(() => {
    setQueue(null);
    setIndex(0);
    setRevealed(false);
    setChecked([]);
    setTally({ score: 0, full: 0, done: 0 });
    setMissed([]);
    setFinished(false);
    sessionStart.current = Date.now();
    questionStart.current = Date.now();
  }, [sessionKey]);

  useEffect(() => {
    if (!ready || queue !== null) return;
    setQueue(buildEssayQueue({ mode, essays, subject, chapter, id: singleId, count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queue, sessionKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const total = queue?.length ?? 0;
  const essay = queue && index < total ? essayMap.get(queue[index]) : undefined;
  const fullScore = essay ? essayFullScore(essay) : 0;
  const liveScore = essay ? scoreEssay(essay, checked) : 0;
  const elapsed = Math.max(0, Math.floor((now - sessionStart.current) / 1000));

  const submit = useCallback(async () => {
    if (!essay) return;
    const ms = Date.now() - questionStart.current;
    const result = await recordEssay(essay.id, checked, ms, mode);
    setTally((current) => ({
      score: current.score + result.score,
      full: current.full + result.fullScore,
      done: current.done + 1,
    }));
    setMissed((current) => [...current, ...missedPoints(essay, checked).map((point) => point.label)]);
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((current) => current + 1);
    setRevealed(false);
    setChecked([]);
    questionStart.current = Date.now();
  }, [checked, essay, index, mode, recordEssay, total]);

  const togglePoint = (pointIndex: number) => {
    setChecked((current) =>
      current.includes(pointIndex) ? current.filter((item) => item !== pointIndex) : [...current, pointIndex],
    );
  };

  const rate = tally.full ? tally.score / tally.full : 0;
  const tier = rateTier(rate);

  if (finished) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="返回"
              onClick={() => navigate('/essay')}
              className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
            <div className="text-[15px] font-semibold">本轮得分</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-4">
          <Panel className="px-4 py-4 text-center">
            <div className="text-[12.5px] text-ink-3">自评总分</div>
            <div className="mt-1 text-[34px] leading-none font-semibold text-brand">
              {tally.score}
              <span className="text-[16px] text-ink-3"> / {tally.full}</span>
            </div>
            <div className="mt-2 text-[12.5px] text-ink-3">
              练了 {tally.done} 道 · 得分率 {Math.round(rate * 100)}% · 用时 {mmss(elapsed)}
            </div>
            <div
              className={cx(
                'mt-2.5 inline-block rounded-lg px-2.5 py-1 text-[12.5px] font-medium',
                tier.tone === 'good'
                  ? 'bg-good-soft text-good'
                  : tier.tone === 'hard'
                    ? 'bg-hard-soft text-hard'
                    : 'bg-again-soft text-again',
              )}
            >
              {tier.label}
            </div>
          </Panel>

          {missed.length ? (
            <section className="mt-4">
              <div className="mb-2 text-[13.5px] font-medium text-ink-2">
                漏掉的评分点 {missed.length} 个（这些就是你固定丢分的位置）
              </div>
              <Panel className="divide-y divide-line">
                {missed.map((label, index) => (
                  <div key={`${label}-${index}`} className="flex items-start gap-2 px-3.5 py-2.5">
                    <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-again" />
                    <span className="text-[12.5px] leading-snug text-ink-2">{label}</span>
                  </div>
                ))}
              </Panel>
            </section>
          ) : (
            <div className="mt-4 rounded-xl bg-good-soft px-3.5 py-3 text-[12.5px] text-good">
              所有评分点都答到了，这轮很稳。
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => navigate('/essay')}>
              回到大题列表
            </Button>
            <Button
              onClick={() => {
                setQueue(null);
                setFinished(false);
              }}
            >
              再来一轮
            </Button>
          </div>
        </main>
      </div>
    );
  }

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
              {total ? <span className="text-ink-3"> · 共 {total} 道</span> : null}
            </div>
            <div className="text-[11.5px] text-ink-3">
              已自评 {tally.done} 道 · 累计 {tally.score} / {tally.full} 分
            </div>
          </div>
          <div className="shrink-0 rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-[13px] font-semibold tabular-nums text-ink-2">
            {mmss(elapsed)}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${total ? ((index + (revealed ? 0.5 : 0)) / total) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">
            {Math.min(index + 1, total)} / {total}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {essay ? (
          <>
            <Panel className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone="brand">{subjectMeta(essay.subject).name}</Chip>
                <Chip>{essay.chapter}</Chip>
                <Chip tone="hard">满分 {fullScore} 分</Chip>
                <Chip>建议 {essay.minutes} 分钟</Chip>
                {essay.year ? <Chip tone="hard">真题 {essay.year}</Chip> : null}
              </div>
              <div className="mt-3.5">
                <Markdown source={essay.stem} />
              </div>
            </Panel>

            {!revealed ? (
              <Button
                variant="primary"
                block
                className="mt-3 py-3 text-[15px]"
                data-testid="reveal-points"
                onClick={() => setRevealed(true)}
              >
                看评分点与参考答案
              </Button>
            ) : (
              <>
                <section className="mt-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[13.5px] font-medium text-ink-2">
                      逐条自评（答到的点勾上）
                    </span>
                    <span className="text-[13px] font-semibold text-brand-dark tabular-nums">
                      {liveScore} / {fullScore} 分
                    </span>
                  </div>
                  <Panel className="divide-y divide-line">
                    {essay.points.map((point, pointIndex) => {
                      const on = checked.includes(pointIndex);
                      return (
                        <button
                          key={`${point.label}-${pointIndex}`}
                          type="button"
                          data-testid={`point-${pointIndex}`}
                          onClick={() => togglePoint(pointIndex)}
                          className={cx('flex w-full items-start gap-2.5 px-3.5 py-3 text-left', on && 'bg-good-soft/60')}
                        >
                          <span
                            className={cx(
                              'mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold',
                              on ? 'border-good bg-good text-white' : 'border-line bg-surface text-transparent',
                            )}
                          >
                            ✓
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="text-[13px] font-medium">{point.label}</span>
                              <span className="shrink-0 text-[11.5px] text-ink-3">{point.score} 分</span>
                            </span>
                            <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-3">
                              <RichText source={point.answer} />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </Panel>
                </section>

                <section className="mt-4">
                  <div className="mb-2 text-[13.5px] font-medium text-ink-2">参考答案</div>
                  <Panel className="px-3.5 py-3">
                    <Markdown source={essay.solution} />
                  </Panel>
                </section>

                {essay.pitfalls ? (
                  <div className="mt-3 rounded-xl border-l-[3px] border-again bg-again-soft/70 px-3.5 py-2.5">
                    <Markdown source={essay.pitfalls} />
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 pt-12 text-center">
            <div className="text-[15.5px] font-semibold">这里还没有大题</div>
            <div className="text-[13px] leading-relaxed text-ink-3">换个科目或章节试试。</div>
            <Button variant="primary" className="mt-1" onClick={() => navigate('/essay')}>
              回到大题列表
            </Button>
          </div>
        )}
      </main>

      {essay && revealed ? (
        <div className="shrink-0 border-t border-line bg-surface px-3 pt-2.5 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-ink-3">
                {checked.length} / {essay.points.length} 个评分点
              </div>
              <div className="text-[15px] font-semibold text-brand-dark tabular-nums">
                {liveScore} / {fullScore} 分
              </div>
            </div>
            <Button
              variant="primary"
              className="px-4 py-2.5 text-[13.5px]"
              data-testid="submit-essay"
              onClick={() => void submit()}
            >
              {index + 1 >= total ? '提交并结算' : '提交并下一题'}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-ink-3">
            自评要诚实：没写出来的点别勾，勾了才会漏掉自己的薄弱位置
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** 供题库页展示的大题概览数字。 */
export function useEssayOverview() {
  const { essays, essayAttempts } = useStore();
  return useMemo(() => {
    const practiced = new Set(essayAttempts.map((attempt) => attempt.essayId));
    const score = essayAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const full = essayAttempts.reduce((sum, attempt) => sum + attempt.fullScore, 0);
    return {
      essays: essays.length,
      practiced: practiced.size,
      attempts: essayAttempts.length,
      rate: full ? score / full : 0,
    };
  }, [essays, essayAttempts]);
}
