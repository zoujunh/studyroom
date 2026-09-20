import { RichText } from '../Markdown';
import { cx } from '../ui';
import type { CellStatus, MatrixBadge, MatrixState } from '../../visual/types';

const CELL_STYLE: Record<CellStatus, string> = {
  idle: 'bg-surface-2 text-ink-2 border-line',
  active: 'bg-brand-soft text-brand-dark border-brand',
  ok: 'bg-good-soft text-good border-transparent',
  warn: 'bg-hard-soft text-hard border-transparent',
  bad: 'bg-again-soft text-again border-transparent',
  done: 'bg-brand text-white border-transparent',
};

const BADGE_TONE: Record<string, string> = {
  brand: 'bg-brand-soft text-brand-dark',
  good: 'bg-good-soft text-good',
  hard: 'bg-hard-soft text-hard',
  again: 'bg-again-soft text-again',
};

export function BadgeRow({ badges }: { badges?: MatrixBadge[] }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={`${badge.label}-${badge.value}`}
          className={cx(
            'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px]',
            BADGE_TONE[badge.tone ?? 'brand'],
          )}
        >
          <span className="opacity-75">{badge.label}</span>
          <span className="font-semibold tabular-nums">
            <RichText source={badge.value} />
          </span>
        </span>
      ))}
    </div>
  );
}

/** 通用矩阵/表格：行可高亮、单元格可着色，窄屏横向滚动。 */
export function MatrixView({ state, compact }: { state: MatrixState; compact?: boolean }) {
  return (
    <div className="space-y-2.5">
      <BadgeRow badges={state.badges} />
      <div className="overflow-x-auto pb-0.5">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            {state.columnLabels?.length ? (
              <tr>
                <th className="sticky left-0 z-[1] border border-line bg-surface-2 px-2 py-1.5 text-left font-medium text-ink-3">
                  {state.rowHeader ?? ''}
                </th>
                {state.columnLabels.map((label, index) => (
                  <th
                    key={`${label}-${index}`}
                    className="border border-line bg-surface-2 px-2 py-1.5 text-center font-medium whitespace-nowrap text-ink-3"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {state.rows.map((row, rowIndex) => (
              <tr key={`${row.label}-${rowIndex}`}>
                <th
                  className={cx(
                    'sticky left-0 z-[1] border border-line px-2 py-1.5 text-left font-medium whitespace-nowrap',
                    row.status === 'active' ? 'bg-brand-soft text-brand-dark' : 'bg-surface-2 text-ink-2',
                  )}
                >
                  {row.label}
                </th>
                {row.cells.map((raw, cellIndex) => {
                  const item = typeof raw === 'string' ? { text: raw } : raw;
                  return (
                    <td
                      key={cellIndex}
                      className={cx(
                        'border px-2 text-center tabular-nums',
                        compact ? 'py-1' : 'py-1.5',
                        CELL_STYLE[item.status ?? 'idle'],
                      )}
                    >
                      {item.text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.caption ? (
        <p className="text-[11.5px] leading-relaxed text-ink-3">
          <RichText source={state.caption} />
        </p>
      ) : null}
    </div>
  );
}
