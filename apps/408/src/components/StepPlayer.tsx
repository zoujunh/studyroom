import { Icon } from './icons';
import { cx } from './ui';

export interface SpeedOption {
  label: string;
  ms: number;
}

export const SPEEDS: SpeedOption[] = [
  { label: '慢', ms: 1500 },
  { label: '中', ms: 850 },
  { label: '快', ms: 380 },
];

interface StepPlayerProps {
  total: number;
  index: number;
  playing: boolean;
  speed: number;
  onIndex: (index: number) => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSpeed: (ms: number) => void;
}

/**
 * 通用步进播放器：播放/上一步/单步/重置 + 可拖拽进度条（回看任意一步）+ 变速。
 * 所有可视化共用这一套控件。
 */
export function StepPlayer({
  total,
  index,
  playing,
  speed,
  onIndex,
  onTogglePlay,
  onReset,
  onSpeed,
}: StepPlayerProps) {
  const last = Math.max(1, total - 1);
  const atStart = index <= 0;
  const atEnd = index >= last;

  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className={cx(
            'flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition active:scale-[0.97]',
            playing ? 'bg-brand-dark text-white' : 'bg-brand text-white',
          )}
        >
          <Icon name={playing ? 'pause' : 'play'} size={15} filled={!playing} />
          {playing ? '暂停' : '播放'}
        </button>

        <button
          type="button"
          onClick={() => onIndex(Math.max(0, index - 1))}
          disabled={atStart}
          className="flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-2 text-[13px] text-ink-2 active:bg-surface-2 disabled:opacity-40"
        >
          <Icon name="stepBack" size={15} />
          <span className="hidden sm:inline">上一步</span>
        </button>

        <button
          type="button"
          onClick={() => onIndex(Math.min(last, index + 1))}
          disabled={atEnd}
          className="flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-2 text-[13px] text-ink-2 active:bg-surface-2 disabled:opacity-40"
        >
          <Icon name="stepForward" size={15} />
          <span className="hidden sm:inline">单步</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="ml-auto flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-2 text-[13px] text-ink-2 active:bg-surface-2"
        >
          <Icon name="reset" size={15} />
          <span className="hidden sm:inline">重置</span>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={last}
          value={Math.min(index, last)}
          onChange={(event) => onIndex(Number(event.target.value))}
          className="h-1.5 flex-1 accent-[var(--color-brand)]"
          aria-label="步骤进度"
        />
        <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">
          {Math.min(index + 1, total)} / {total}
        </span>
        <select
          value={String(speed)}
          onChange={(event) => onSpeed(Number(event.target.value))}
          className="shrink-0 rounded-lg border border-line bg-surface-2 px-1.5 py-1 text-[12px] text-ink-2 outline-none"
          aria-label="播放速度"
        >
          {SPEEDS.map((option) => (
            <option key={option.ms} value={option.ms}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-center text-[10.5px] text-ink-3">
        空格 播放/暂停 · ←/→ 单步 · R 重置
      </p>
    </div>
  );
}
