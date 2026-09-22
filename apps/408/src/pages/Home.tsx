import { useMemo } from 'react';
import { Icon, type IconName } from '../components/icons';
import { Button, Chip, Panel, Progress, Ring, SectionTitle, StatTile, cx } from '../components/ui';
import { daysUntilExam } from '../lib/date';
import { focusStats } from '../lib/focus';
import { navigate } from '../lib/router';
import { planSprint, sprintAdvice } from '../lib/sprint';
import { bySubject, overallCounts, streakDays, todayQuota } from '../lib/stats';
import { useStore } from '../state/store';

function CountdownChip() {
  const { settings } = useStore();
  const days = daysUntilExam(settings.examDate);
  if (days === null) {
    return (
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className="rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink-3"
      >
        未设置考试日期
      </button>
    );
  }
  const passed = days < 0;
  return (
    <button
      type="button"
      onClick={() => navigate('/settings')}
      className={cx(
        'rounded-[10px] border px-2.5 py-1.5 text-[12px] font-medium',
        passed ? 'border-line bg-surface text-ink-3' : 'border-transparent bg-brand-soft text-brand-dark',
      )}
    >
      {passed ? `已考完 ${-days} 天` : `距考试 ${days} 天`}
    </button>
  );
}

interface QuickAction {
  label: string;
  sub: string;
  icon: IconName;
  to?: string;
  badge?: string;
}

export function HomePage() {
  const { cards, srs, logs, settings, storageOk, updateSettings, cardFocus, mistakes } = useStore();

  const counts = useMemo(() => overallCounts(cards, srs), [cards, srs]);
  const subjects = useMemo(() => bySubject(cards, srs), [cards, srs]);
  const quota = useMemo(() => todayQuota(cards, srs, logs, settings), [cards, srs, logs, settings]);
  const streak = useMemo(() => streakDays(logs), [logs]);
  const focus = useMemo(() => focusStats(cardFocus, cards), [cardFocus, cards]);
  const plan = useMemo(
    () => planSprint(cards, srs, settings, quota.due, quota.newRemaining),
    [cards, srs, settings, quota.due, quota.newRemaining],
  );

  const masteredRatio = counts.total ? counts.mastered / counts.total : 0;
  const todayTotal = quota.due + quota.newRemaining;

  const quick: QuickAction[] = [
    { label: '刷卡背诵', sub: '按考频优先', icon: 'cards', to: '/review?mode=due' },
    { label: '新卡学习', sub: `今日还剩 ${quota.newRemaining} 张`, icon: 'sparkle', to: '/review?mode=new' },
    { label: '我的科目', sub: '按章节查看', icon: 'book', to: '/subjects' },
    { label: '可视化', sub: '排序 / 置换 / TCP', icon: 'layers', to: '/visual' },
    { label: '题库刷题', sub: '单选 / 判断', icon: 'check', to: '/quiz' },
    { label: '复习专项', sub: `${focus.total} 张待攻克`, icon: 'sparkle', to: '/focus' },
    { label: '错题本', sub: '选择题按错因', icon: 'undo', to: '/mistakes' },
    { label: '全局搜索', sub: '卡片 / 题目 / 大题', icon: 'search', to: '/search' },
  ];

  return (
    <div className="px-4 pt-5 pb-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] leading-tight font-semibold tracking-tight">408 刷卡</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-3">计算机学科专业基础综合 · 知识点间隔重复</p>
        </div>
        <div className="flex items-center gap-2">
          <CountdownChip />
          <button
            type="button"
            aria-label="搜索"
            onClick={() => navigate('/search')}
            className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
          >
            <Icon name="search" size={18} />
          </button>
          <button
            type="button"
            aria-label="设置"
            onClick={() => navigate('/settings')}
            className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
          >
            <Icon name="gear" size={18} />
          </button>
        </div>
      </header>

      {!storageOk ? (
        <div className="mt-3 rounded-xl border border-again/40 bg-again-soft px-3 py-2 text-[12.5px] text-again">
          浏览器禁用了本地数据库，本次学习进度不会被保存（请关闭无痕模式后重试）。
        </div>
      ) : null}

      <Panel className="mt-4 p-4">
        <div className="flex items-center gap-4">
          <Ring ratio={masteredRatio} size={92} stroke={10}>
            <span className="text-[19px] leading-none font-semibold">{Math.round(masteredRatio * 100)}%</span>
            <span className="mt-0.5 text-[10.5px] text-ink-3">已掌握</span>
          </Ring>

          <div className="min-w-0 flex-1">
            <div className="flex items-end justify-between gap-2">
              {[
                { value: counts.mastered, label: '已掌握' },
                { value: counts.learning, label: '学习中' },
                { value: counts.new, label: '没学过' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-[17px] leading-tight font-semibold">{item.value}</div>
                  <div className="text-[11px] text-ink-3">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 text-[12px] text-ink-3">
              共 {counts.total} 个知识点 · 今天待复习 {quota.due} 个 · 预计 {plan.estimatedMinutes} 分钟
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-hard">
              <Icon name="flame" size={14} filled />
              连续学习 {streak} 天
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
              <button type="button" className="text-brand" onClick={() => navigate('/focus')}>
                复习专项 <span className="font-semibold">{focus.total}</span> 张
              </button>
              <button type="button" className="text-brand" onClick={() => navigate('/mistakes')}>
                错题本 <span className="font-semibold">{mistakes.size}</span> 道
              </button>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          block
          className="mt-4 py-3 text-[15px]"
          onClick={() => navigate('/review?mode=due')}
        >
          今日复习（{todayTotal}）
        </Button>
        <Button block className="mt-2 py-3 text-[14px]" onClick={() => navigate('/review?mode=random')}>
          <Icon name="shuffle" size={16} />
          随机刷卡
        </Button>
      </Panel>

      <Panel className="mt-3 px-3.5 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Icon name="clock" size={15} className="text-ink-3" />
            <span className="text-[13.5px] font-medium">冲刺计划</span>
          </div>
          {plan.daysLeft !== null && plan.daysLeft > 0 ? (
            <Chip tone={plan.canFinish ? 'good' : 'again'}>{plan.canFinish ? '来得及' : '需要提速'}</Chip>
          ) : null}
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <StatTile
            label="未掌握"
            value={plan.newCount + plan.learningCount}
            sub={`没学过 ${plan.newCount}`}
          />
          <StatTile label="建议每天新学" value={plan.suggestedNewPerDay} sub="张" />
          <StatTile
            label="考前还能过"
            value={plan.roundsBeforeExam ?? '—'}
            sub="轮（估算）"
          />
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">{sprintAdvice(plan)}</p>
        {plan.daysLeft !== null && plan.daysLeft > 0 && plan.suggestedNewPerDay > settings.newPerDay ? (
          <Button
            block
            className="mt-2.5 text-[13px]"
            onClick={() => updateSettings({ newPerDay: plan.suggestedNewPerDay, requestRetention: 0.95 })}
          >
            按冲刺节奏调整：每天 {plan.suggestedNewPerDay} 张新卡 · 保持率 95%
          </Button>
        ) : null}
      </Panel>

      <section className="mt-6">
        <SectionTitle extra={<span className="text-[11.5px] text-ink-3">按考频优先排卡</span>}>
          四个科目
        </SectionTitle>
        <div className="space-y-2.5">
          {subjects.map((item) => (
            <Panel
              key={item.meta.id}
              className="flex cursor-pointer items-center gap-3 px-3.5 py-3 active:bg-surface-2"
              onClick={() => navigate(`/subjects?subject=${item.meta.id}`)}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[17px] font-semibold text-white"
                style={{ backgroundColor: item.meta.color }}
              >
                {item.meta.glyph}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14.5px] font-medium">{item.meta.name}</span>
                  <span className="shrink-0 text-[12.5px] font-medium text-ink-2">
                    {Math.round(item.ratio * 100)}%
                  </span>
                </div>
                <div className="mt-1 text-[11.5px] text-ink-3">
                  {item.total} 个知识点 · 已掌握 {item.mastered} · 待复习 {item.dueToday}
                </div>
                <Progress className="mt-2" value={item.ratio} />
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle>快捷</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {quick.map((action) =>
            action.to ? (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.to!)}
                className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 py-3 text-left active:bg-surface-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
                  <Icon name={action.icon} size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium">{action.label}</span>
                  <span className="block truncate text-[11px] text-ink-3">{action.sub}</span>
                </span>
              </button>
            ) : (
              <div
                key={action.label}
                className="flex items-center gap-2.5 rounded-2xl border border-dashed border-line bg-surface/60 px-3 py-3 text-left opacity-60"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink-3">
                  <Icon name={action.icon} size={17} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-medium text-ink-2">{action.label}</span>
                    {action.badge ? <Chip>{action.badge}</Chip> : null}
                  </span>
                  <span className="block truncate text-[11px] text-ink-3">{action.sub}</span>
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-ink-3">
        数据保存在本机浏览器（IndexedDB），不上传服务器。
        <br />
        调度算法：FSRS · 目标保持率 {Math.round(settings.requestRetention * 100)}%
      </p>
    </div>
  );
}
