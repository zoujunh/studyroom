import { cx } from '../ui';
import type { BarStatus, SortState } from '../../visual/sort';

const BAR_COLOR: Record<BarStatus, string> = {
  idle: 'bg-brand/40',
  compare: 'bg-hard',
  pivot: 'bg-[#8a6bbf]',
  sorted: 'bg-good',
  active: 'bg-brand',
};

const LEGEND: { status: BarStatus; label: string }[] = [
  { status: 'idle', label: '未排序' },
  { status: 'compare', label: '正在比较' },
  { status: 'pivot', label: '枢轴 / 标记' },
  { status: 'sorted', label: '已就位' },
];

export function SortView({ state }: { state: SortState }) {
  const max = Math.max(1, ...state.bars.map((bar) => bar.value));
  return (
    <div>
      <div className="flex h-[212px] items-end gap-[5px] px-0.5">
        {state.bars.map((bar, index) => (
          <div key={index} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-medium tabular-nums text-ink-2">{bar.value}</span>
            <div
              className={cx(
                'w-full rounded-t-[5px] transition-[height,background-color] duration-200',
                BAR_COLOR[bar.status],
              )}
              style={{ height: `${Math.max(4, (bar.value / max) * 150)}px` }}
            />
            <span className="text-[9.5px] tabular-nums text-ink-3">{index}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {LEGEND.map((item) => (
          <span key={item.status} className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <span className={cx('h-2.5 w-2.5 rounded-[3px]', BAR_COLOR[item.status])} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
