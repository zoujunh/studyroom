import { RichText } from '../Markdown';
import { cx } from '../ui';
import { BadgeRow, MatrixView } from './MatrixView';
import type { CellStatus, GanttState } from '../../visual/types';

const SEGMENT_STYLE: Record<CellStatus, string> = {
  idle: 'bg-ink-3/35 text-white',
  active: 'bg-brand text-white',
  ok: 'bg-good text-white',
  warn: 'bg-hard text-white',
  bad: 'bg-again text-white',
  done: 'bg-brand-dark text-white',
};

/** 甘特图：进程调度的时间轴。 */
export function GanttView({ state }: { state: GanttState }) {
  const total = Math.max(1, state.total);

  return (
    <div className="space-y-3">
      <BadgeRow badges={state.badges} />

      <div className="space-y-1.5">
        {state.rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[12px] font-medium tabular-nums text-ink-2">{row.label}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-surface-2">
              {row.segments.map((segment, index) => (
                <div
                  key={index}
                  className={cx(
                    'absolute top-0 flex h-full items-center justify-center overflow-hidden text-[10.5px] font-medium',
                    SEGMENT_STYLE[segment.status ?? 'active'],
                  )}
                  style={{
                    left: `${(segment.start / total) * 100}%`,
                    width: `${((segment.end - segment.start) / total) * 100}%`,
                  }}
                >
                  {segment.text ?? ''}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 时间轴 */}
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0" />
        <div className="flex flex-1 justify-between text-[10.5px] tabular-nums text-ink-3">
          {Array.from({ length: Math.min(total, 21) }, (_, index) => {
            const tick = Math.round((index / Math.min(total, 20)) * total);
            return <span key={index}>{tick}</span>;
          })}
        </div>
      </div>

      {state.cursor !== undefined ? (
        <p className="text-[11.5px] tabular-nums text-ink-3">当前时刻 t = {state.cursor}</p>
      ) : null}

      {state.metrics ? (
        <div className="rounded-xl border border-line bg-surface-2/60 p-2.5">
          <div className="mb-2 text-[12px] font-medium text-ink-2">各进程指标</div>
          <MatrixView state={state.metrics} compact />
        </div>
      ) : null}

      {state.caption ? (
        <p className="text-[11.5px] leading-relaxed text-ink-3">
          <RichText source={state.caption} />
        </p>
      ) : null}
    </div>
  );
}
