import { useMemo } from 'react';
import { Icon } from '../components/icons';
import { Panel, Progress, SectionTitle, StatTile, cx } from '../components/ui';
import { MASTERED_STABILITY_DAYS, SUBJECT_SCORE } from '../data/curriculum';
import { dayKey, dueLabel } from '../lib/date';
import { essayStats } from '../lib/essay';
import { focusStats } from '../lib/focus';
import { quizStats } from '../lib/quiz';
import { navigate } from '../lib/router';
import { bySubject, dailyStats, dueBuckets, overallCounts, reviewsOn, streakDays } from '../lib/stats';
import { useStore } from '../state/store';

export function StatsPage() {
  const { cards, srs, logs, settings, questions, attempts, mistakes, essays, essayAttempts, cardFocus } =
    useStore();

  const counts = useMemo(() => overallCounts(cards, srs), [cards, srs]);
  const subjects = useMemo(() => bySubject(cards, srs), [cards, srs]);
  const days = useMemo(() => dailyStats(logs, 7), [logs]);
  const streak = useMemo(() => streakDays(logs), [logs]);
  const today = reviewsOn(logs);
  const buckets = useMemo(() => dueBuckets(srs), [srs]);

  const todayLogs = useMemo(() => logs.filter((l) => dayKey(l.ts) === dayKey()), [logs]);
  const goodToday = todayLogs.filter((l) => l.grade === 'good' || l.grade === 'easy').length;
  const goodRate = todayLogs.length ? Math.round((goodToday / todayLogs.length) * 100) : 0;
  const maxBar = Math.max(1, ...days.map((d) => d.reviews));

  const quiz = useMemo(
    () => quizStats(questions, attempts, mistakes, (ts) => dayKey(ts), dayKey()),
    [questions, attempts, mistakes],
  );
  const maxError = Math.max(1, ...quiz.byError.map((item) => item.count));
  const essay = useMemo(() => essayStats(essays, essayAttempts), [essays, essayAttempts]);
  const focus = useMemo(() => focusStats(cardFocus, cards), [cardFocus, cards]);

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-[19px] font-semibold">学习统计</h1>
      <p className="mt-1 text-[12.5px] text-ink-3">
        目标保持率 {Math.round(settings.requestRetention * 100)}% · 连续学习 {streak} 天
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <StatTile label="今日复习" value={today} sub={`会了率 ${goodRate}%`} />
        <StatTile label="今日待复习" value={counts.dueToday} sub="到期卡" />
        <StatTile label="累计复习" value={logs.length} sub="次评分" />
      </div>

      <section className="mt-5">
        <SectionTitle extra={<span className="text-[11.5px] text-ink-3">近 7 天</span>}>复习趋势</SectionTitle>
        <Panel className="px-3.5 py-3.5">
          <div className="flex h-[112px] items-end gap-2">
            {days.map((day) => {
              const height = Math.round((day.reviews / maxBar) * 96);
              const isToday = day.date === dayKey();
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10.5px] tabular-nums text-ink-3">{day.reviews || ''}</span>
                  <div
                    className={cx('w-full rounded-t-[5px]', isToday ? 'bg-brand' : 'bg-brand/35')}
                    style={{ height: Math.max(day.reviews ? 6 : 2, height) }}
                  />
                  <span className={cx('text-[10.5px]', isToday ? 'font-medium text-brand' : 'text-ink-3')}>
                    {day.date.slice(5).replace('-', '/')}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <SectionTitle>各科掌握率</SectionTitle>
        <Panel className="divide-y divide-line">
          {subjects.map((item) => (
            <div key={item.meta.id} className="px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-medium">
                  {item.meta.name}
                  <span className="ml-1.5 text-[11px] text-ink-3">占 {SUBJECT_SCORE[item.meta.id]} 分</span>
                </span>
                <span className="text-[12.5px] font-medium text-ink-2">{Math.round(item.ratio * 100)}%</span>
              </div>
              <Progress className="mt-2" value={item.ratio} />
              <div className="mt-1.5 text-[11px] text-ink-3">
                已掌握 {item.mastered} · 学习中 {item.learning} · 没学过 {item.new} · 今天待复习 {item.dueToday}
              </div>
            </div>
          ))}
        </Panel>
      </section>

      <section className="mt-5">
        <SectionTitle>复习负载</SectionTitle>
        <Panel className="divide-y divide-line">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center justify-between px-3.5 py-3">
              <span className="text-[13.5px]">{bucket.label}</span>
              <span className="text-[13px] font-medium text-ink-2">{bucket.value} 张</span>
            </div>
          ))}
        </Panel>
      </section>

      <section className="mt-5">
        <SectionTitle
          extra={
            <button
              type="button"
              className="text-[11.5px] font-medium text-brand"
              onClick={() => navigate('/mistakes')}
            >
              错题本 →
            </button>
          }
        >
          刷题
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="累计做题" value={quiz.attempts} sub={`今天 ${quiz.todayAttempts} 道`} />
          <StatTile
            label="总正确率"
            value={`${Math.round(quiz.accuracy * 100)}%`}
            sub={`对 ${quiz.correct} 道`}
          />
          <StatTile label="错题待订正" value={quiz.mistakes} sub={`已订正 ${quiz.resolved}`} />
        </div>
        <Panel className="mt-2.5 divide-y divide-line">
          {quiz.bySubject.map((item) => (
            <div key={item.subject} className="px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px]">
                  {item.name}
                  <span className="ml-1.5 text-[11px] text-ink-3">{item.questions} 道题</span>
                </span>
                <span className="text-[12.5px] text-ink-2">
                  {item.attempts ? `${Math.round(item.accuracy * 100)}% · 做 ${item.attempts}` : '未练'}
                </span>
              </div>
              <Progress className="mt-1.5" value={item.accuracy} />
            </div>
          ))}
        </Panel>
        {quiz.byError.length ? (
          <Panel className="mt-2.5 px-3.5 py-3">
            <div className="text-[12.5px] font-medium text-ink-2">错因分布</div>
            <div className="mt-2 space-y-2">
              {quiz.byError.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <span className="w-[62px] shrink-0 text-[12px] text-ink-2">{item.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-hard"
                      style={{ width: `${(item.count / maxError) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-3">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </section>

      <section className="mt-5">
        <SectionTitle
          extra={
            <button
              type="button"
              className="text-[11.5px] font-medium text-brand"
              onClick={() => navigate('/essay')}
            >
              综合应用题 →
            </button>
          }
        >
          大题自评
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="已练" value={essay.attempts} sub={`共 ${essay.essays} 道`} />
          <StatTile
            label="平均得分率"
            value={`${Math.round(essay.rate * 100)}%`}
            sub={`${essay.score}/${essay.fullScore} 分`}
          />
          <StatTile
            label="最常漏"
            value={essay.weakestPoints.length ? essay.weakestPoints[0].missed : 0}
            sub="次同一个评分点"
          />
        </div>
        {essay.weakestPoints.length ? (
          <Panel className="mt-2.5 divide-y divide-line">
            {essay.weakestPoints.slice(0, 4).map((point) => (
              <div key={point.label} className="flex items-start gap-2 px-3.5 py-2.5">
                <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-again-soft text-[10px] font-semibold text-again">
                  {point.missed}
                </span>
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-ink-2">{point.label}</span>
              </div>
            ))}
          </Panel>
        ) : null}
      </section>

      <section className="mt-5">
        <SectionTitle
          extra={
            <button
              type="button"
              className="text-[11.5px] font-medium text-brand"
              onClick={() => navigate('/focus')}
            >
              复习专项 →
            </button>
          }
        >
          复习专项（刷卡时评「不会 / 模糊」的卡）
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile label="待攻克" value={focus.total} sub="张卡片" />
          <StatTile label="其中「模糊」" value={focus.hardOnly} sub="最近一次评分" />
          <StatTile label="快毕业" value={focus.almostDone} sub="已答对 1 次" />
        </div>
        {focus.total > 0 ? (
          <Panel className="mt-2.5 divide-y divide-line">
            {focus.bySubject
              .filter((item) => item.count > 0)
              .map((item) => (
                <div key={item.subject} className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-[13px]">{item.name}</span>
                  <span className="text-[12.5px] text-ink-2">{item.count} 张</span>
                </div>
              ))}
          </Panel>
        ) : null}
      </section>

      <section className="mt-5">
        <SectionTitle>掌握口径</SectionTitle>
        <Panel className="space-y-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
          <p className="flex gap-2">
            <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-ink-3/45" />
            没学过：从未评过分的新卡。
          </p>
          <p className="flex gap-2">
            <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-hard" />
            学习中：评过分，但还没进入稳定复习阶段。
          </p>
          <p className="flex gap-2">
            <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-brand" />
            已掌握：FSRS 判定处于复习状态，且记忆稳定度 ≥ {MASTERED_STABILITY_DAYS} 天。
          </p>
          <p className="flex items-start gap-2 pt-1 text-ink-3">
            <Icon name="clock" size={14} className="mt-[3px] shrink-0" />
            最近一次到期的卡：{srs.size ? dueLabel(Math.min(...[...srs.values()].map((r) => r.due))) : '暂无'}
          </p>
        </Panel>
      </section>
    </div>
  );
}
