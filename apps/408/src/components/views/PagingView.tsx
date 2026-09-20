import { useMemo } from 'react';
import { cx } from '../ui';
import { comparePaging, type PagingState } from '../../visual/paging';

export function PagingView({
  state,
  refs,
  frameCount,
}: {
  state: PagingState;
  refs: number[];
  frameCount: number;
}) {
  const comparison = useMemo(() => comparePaging(refs, frameCount), [refs, frameCount]);
  const stepIndex = state.stepIndex;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-[11.5px] text-ink-3">
          页面序列 · 已访问 {Math.max(0, stepIndex + 1)} / {refs.length}
        </div>
        <div className="flex flex-wrap gap-1">
          {refs.map((page, index) => (
            <span
              key={index}
              className={cx(
                'flex h-7 w-7 items-center justify-center rounded-lg border text-[12px] tabular-nums',
                index === stepIndex
                  ? 'border-brand bg-brand font-semibold text-white'
                  : index < stepIndex
                    ? 'border-line bg-surface-2 text-ink-2'
                    : 'border-line bg-surface text-ink-3',
              )}
            >
              {page}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11.5px] text-ink-3">物理块 · 共 {frameCount} 个</div>
        <div className="flex gap-2">
          {state.memory.map((page, index) => (
            <div
              key={index}
              className={cx(
                'flex h-12 flex-1 items-center justify-center rounded-xl border text-[16px] font-semibold tabular-nums',
                page === null ? 'border-dashed border-line text-ink-3' : 'border-line bg-surface-2 text-ink',
                stepIndex >= 0 && page !== null && page === state.current
                  ? 'border-brand bg-brand-soft text-brand-dark'
                  : null,
              )}
            >
              {page === null ? '—' : page}
            </div>
          ))}
        </div>
      </div>

      {stepIndex >= 0 ? (
        <div
          className={cx(
            'rounded-xl px-3 py-2 text-[12.5px] font-medium',
            state.hit ? 'bg-good-soft text-good' : 'bg-again-soft text-again',
          )}
        >
          {state.hit ? '命中' : state.evicted !== null ? `缺页（淘汰 ${state.evicted}）` : '缺页（装入空闲块）'}
          <span className="ml-2 font-normal text-ink-3">累计缺页 {state.faults} 次</span>
        </div>
      ) : null}

      <div className="overflow-x-auto pb-0.5">
        <table className="w-full min-w-[440px] border-collapse text-[11.5px]">
          <thead>
            <tr>
              <th className="border border-line px-1.5 py-1 text-left font-medium text-ink-3">算法</th>
              {refs.map((page, index) => (
                <th
                  key={index}
                  className={cx(
                    'border border-line px-1 py-1 font-normal tabular-nums',
                    index === stepIndex ? 'bg-brand-soft font-semibold text-brand-dark' : 'text-ink-3',
                  )}
                >
                  {page}
                </th>
              ))}
              <th className="border border-line px-1.5 py-1 font-medium text-ink-3">缺页</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((algo) => (
              <tr key={algo.id}>
                <td className="border border-line px-1.5 py-1 font-medium">{algo.label}</td>
                {algo.steps.map((step, index) => (
                  <td
                    key={index}
                    className={cx(
                      'border border-line px-1 py-1 text-center',
                      index > stepIndex
                        ? 'text-ink-3/35'
                        : step.hit
                          ? 'bg-good-soft text-good'
                          : 'bg-again-soft text-again',
                    )}
                  >
                    {index > stepIndex ? '·' : step.hit ? '✓' : '✗'}
                  </td>
                ))}
                <td className="border border-line px-1.5 py-1 text-center font-semibold tabular-nums">
                  {algo.faults}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        {comparison.map((algo) => (
          <div key={algo.id} className="rounded-xl border border-line bg-surface-2 px-3 py-2">
            <div className="flex items-baseline gap-2 text-[12.5px]">
              <span className="font-semibold">{algo.label}</span>
              <span className="text-ink-2">{algo.faults} 次缺页</span>
              <span className="text-ink-3">缺页率 {algo.rate}%</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-ink-3">{algo.blurb}</div>
          </div>
        ))}
      </div>

      <p className="text-[11.5px] leading-relaxed text-ink-3">
        提示：统计的是整段序列跑完的总缺页次数。想看 Belady 异常，把物理块数改成 4 再对比 FIFO 的缺页数。
      </p>
    </div>
  );
}
