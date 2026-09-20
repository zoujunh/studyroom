import { useMemo, useState } from 'react';
import { Icon, type IconName } from '../components/icons';
import { Chip, Panel, Progress, SectionTitle, StatTile, cx } from '../components/ui';
import { SUBJECTS, subjectMeta } from '../data/curriculum';
import { dayKey } from '../lib/date';
import { EXAM_MINUTES, EXAM_TOTAL_COUNT, quizStats } from '../lib/quiz';
import { navigate } from '../lib/router';
import { useStore } from '../state/store';
import { useEssayOverview } from './EssayRun';
import type { SubjectId } from '../types';

interface Entry {
  label: string;
  sub: string;
  icon: IconName;
  to: string;
  disabled?: boolean;
}

export function QuizPage() {
  const { questions, attempts, mistakes } = useStore();
  const [active, setActive] = useState<SubjectId>('ds');
  const essayOverview = useEssayOverview();

  const stats = useMemo(
    () => quizStats(questions, attempts, mistakes, (ts) => dayKey(ts), dayKey()),
    [questions, attempts, mistakes],
  );

  const chapters = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const question of questions) {
      if (question.subject !== active) continue;
      grouped.set(question.chapter, (grouped.get(question.chapter) ?? 0) + 1);
    }
    return [...grouped.entries()];
  }, [questions, active]);

  const activeStat = stats.bySubject.find((item) => item.subject === active);

  const entries: Entry[] = [
    {
      label: '随机练习',
      sub: '10 题 · 立刻看解析',
      icon: 'cards',
      to: '/quiz/run?mode=random&count=10',
    },
    {
      label: '模考',
      sub: `${EXAM_TOTAL_COUNT} 题 · ${EXAM_MINUTES} 分钟 · 交卷判分`,
      icon: 'clock',
      to: '/quiz/run?mode=exam',
    },
    {
      label: '错题重做',
      sub: mistakes.size ? `${mistakes.size} 道待订正` : '还没有错题',
      icon: 'undo',
      to: '/quiz/run?mode=mistake',
      disabled: mistakes.size === 0,
    },
    {
      label: '错题本',
      sub: '按错因归类',
      icon: 'book',
      to: '/mistakes',
    },
    {
      label: '综合应用题',
      sub: `${essayOverview.essays} 道大题 · 评分点自评`,
      icon: 'layers',
      to: '/essay',
    },
  ];

  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-[19px] font-semibold">题库</h1>
      <p className="mt-1 text-[12.5px] text-ink-3">
        共 {stats.questions} 道题 · 单选与判断 · 答错自动进错题本
      </p>

      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        <StatTile label="已做题数" value={stats.attempts} sub={`今天 ${stats.todayAttempts} 道`} />
        <StatTile
          label="正确率"
          value={`${Math.round(stats.accuracy * 100)}%`}
          sub={`对 ${stats.correct}`}
        />
        <StatTile label="错题本" value={stats.mistakes} sub={`已订正 ${stats.resolved}`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {entries.map((entry) =>
          entry.disabled ? (
            <div
              key={entry.label}
              className="flex items-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface/60 px-3 py-3 opacity-60"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink-3">
                <Icon name={entry.icon} size={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium text-ink-2">{entry.label}</span>
                <span className="block truncate text-[11px] text-ink-3">{entry.sub}</span>
              </span>
            </div>
          ) : (
            <button
              key={entry.label}
              type="button"
              onClick={() => navigate(entry.to)}
              className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-3 text-left active:bg-surface-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                <Icon name={entry.icon} size={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium">{entry.label}</span>
                <span className="block truncate text-[11px] text-ink-3">{entry.sub}</span>
              </span>
            </button>
          ),
        )}
      </div>

      <section className="mt-5">
        <SectionTitle extra={<span className="text-[11.5px] text-ink-3">按科目专项练习</span>}>
          各科正确率
        </SectionTitle>
        <div className="space-y-2.5">
          {stats.bySubject.map((item) => (
            <Panel key={item.subject} className="px-3.5 py-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-semibold text-white"
                  style={{ backgroundColor: subjectMeta(item.subject).color }}
                >
                  {subjectMeta(item.subject).glyph}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-medium">{item.name}</span>
                    <span className="shrink-0 text-[12px] text-ink-2">
                      {item.attempts ? `${Math.round(item.accuracy * 100)}%` : '未练'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11.5px] text-ink-3">
                    {item.questions} 道题 · 已做 {item.attempts} 次
                    {item.mistakes ? ` · 错题 ${item.mistakes}` : ''}
                  </div>
                  <Progress className="mt-2" value={item.accuracy} />
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/quiz/run?mode=subject&subject=${item.subject}&count=10`)}
                  className="shrink-0 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] font-medium text-brand-dark active:bg-line"
                >
                  练这科
                </button>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <SectionTitle>按章节练习</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {SUBJECTS.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => setActive(subject.id)}
              className={cx(
                'rounded-lg border px-2.5 py-1.5 text-[12px] transition',
                active === subject.id
                  ? 'border-brand bg-brand-soft font-medium text-brand-dark'
                  : 'border-line bg-surface text-ink-2',
              )}
            >
              {subject.short}
            </button>
          ))}
        </div>

        {activeStat ? (
          <p className="mt-2 text-[11.5px] text-ink-3">
            {activeStat.name}：{activeStat.questions} 道题 · 已做 {activeStat.attempts} 次
            {activeStat.attempts ? ` · 正确率 ${Math.round(activeStat.accuracy * 100)}%` : ''}
          </p>
        ) : null}

        <div className="mt-2.5 space-y-2">
          {chapters.map(([chapter, count]) => (
            <button
              key={chapter}
              type="button"
              onClick={() =>
                navigate(
                  `/quiz/run?mode=chapter&subject=${active}&chapter=${encodeURIComponent(chapter)}`,
                )
              }
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left active:bg-surface-2"
            >
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{chapter}</span>
              <Chip>{count} 道</Chip>
              <Icon name="chevronRight" size={16} className="shrink-0 text-ink-3" />
            </button>
          ))}
          {chapters.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-ink-3">这一科还没有题目</p>
          ) : null}
        </div>
      </section>

      <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-3">
        答错的题会自动进错题本，连续答对两次自动移出。
        <br />
        错因标注会汇总到错题本，帮你看清是概念问题还是计算问题。
      </p>
    </div>
  );
}
