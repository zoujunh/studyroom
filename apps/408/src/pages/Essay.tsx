import { useMemo, useState } from 'react';
import { RichText } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, Progress, SectionTitle, StatTile, cx } from '../components/ui';
import { SUBJECTS, subjectMeta } from '../data/curriculum';
import { essayStats } from '../lib/essay';
import { navigate } from '../lib/router';
import { useStore } from '../state/store';
import type { SubjectId } from '../types';

export function EssayPage() {
  const { essays, essayAttempts } = useStore();
  const [active, setActive] = useState<SubjectId>('ds');

  const stats = useMemo(() => essayStats(essays, essayAttempts), [essays, essayAttempts]);
  const chapters = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const essay of essays) {
      if (essay.subject !== active) continue;
      grouped.set(essay.chapter, (grouped.get(essay.chapter) ?? 0) + 1);
    }
    return [...grouped.entries()];
  }, [essays, active]);

  const activeList = useMemo(() => essays.filter((essay) => essay.subject === active), [essays, active]);
  const activeStat = stats.bySubject.find((item) => item.subject === active);
  const practicedIds = new Set(essayAttempts.map((attempt) => attempt.essayId));

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
          <h1 className="text-[19px] font-semibold">综合应用题</h1>
          <p className="text-[11.5px] text-ink-3">
            共 {stats.essays} 道 · 先自己做，再按评分点逐条自评
          </p>
        </div>
        <Button
          variant="primary"
          className="px-3 py-2 text-[12.5px]"
          onClick={() => navigate('/essay/run?mode=random')}
        >
          随机练一道
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile label="已练" value={stats.attempts} sub={`覆盖 ${practicedIds.size} 道`} />
        <StatTile label="平均得分率" value={`${Math.round(stats.rate * 100)}%`} sub={`${stats.score}/${stats.fullScore} 分`} />
        <StatTile label="题目总数" value={stats.essays} sub="四科各 6 道" />
      </div>

      <Panel className="mt-2.5 px-3.5 py-3">
        <div className="text-[12.5px] font-medium text-ink-2">怎么用</div>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-ink-3">
          <li>· 先在纸上（或心里）把步骤写完整，再点「看评分点」；</li>
          <li>· 逐条对照参考答案，答到的点勾上，系统实时算分；</li>
          <li>· 漏掉的点会被记下来，在报告里汇总成你的固定丢分位置。</li>
        </ul>
      </Panel>

      {stats.weakestPoints.length ? (
        <section className="mt-4">
          <SectionTitle extra={<span className="text-[11.5px] text-ink-3">按漏掉次数</span>}>
            最常漏的评分点
          </SectionTitle>
          <Panel className="divide-y divide-line">
            {stats.weakestPoints.map((point) => (
              <div key={point.label} className="flex items-start gap-2 px-3.5 py-2.5">
                <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-again-soft text-[10px] font-semibold text-again">
                  {point.missed}
                </span>
                <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-2">{point.label}</span>
              </div>
            ))}
          </Panel>
        </section>
      ) : null}

      <section className="mt-4">
        <SectionTitle extra={<span className="text-[11.5px] text-ink-3">按科目练习</span>}>各科得分率</SectionTitle>
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
                      {item.attempts ? `${Math.round(item.rate * 100)}%` : '未练'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11.5px] text-ink-3">
                    {item.essays} 道大题 · 已练 {item.attempts} 次
                  </div>
                  <Progress className="mt-2" value={item.rate} />
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/essay/run?mode=subject&subject=${item.subject}`)}
                  className="shrink-0 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] font-medium text-brand-dark active:bg-line"
                >
                  练这科
                </button>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <SectionTitle>题目清单</SectionTitle>
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
            {activeStat.name}：{activeStat.essays} 道 · {chapters.length} 个章节 · 已练 {activeStat.attempts} 次
          </p>
        ) : null}

        <div className="mt-2.5 space-y-2">
          {activeList.map((essay) => {
            const full = essay.points.reduce((sum, point) => sum + point.score, 0);
            const practiced = practicedIds.has(essay.id);
            return (
              <button
                key={essay.id}
                type="button"
                onClick={() => navigate(`/essay/run?mode=single&id=${essay.id}`)}
                className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-left active:bg-surface-2"
              >
                <div className="flex items-center gap-1.5">
                  <Chip tone="brand">{subjectMeta(essay.subject).short}</Chip>
                  <Chip>{essay.chapter}</Chip>
                  <Chip tone="hard">{full} 分</Chip>
                  {practiced ? <Chip tone="good">练过</Chip> : null}
                </div>
                <div className="mt-2 line-clamp-2 text-[13px] leading-snug text-ink-2">
                  <RichText source={essay.stem.replace(/^#{1,6}\s*/gm, '').slice(0, 120)} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-3">
                  <span>
                    {essay.points.length} 个评分点 · 建议 {essay.minutes} 分钟
                  </span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
