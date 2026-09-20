import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------------- 容器 ---------------- */

export function Panel({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'rounded-2xl border border-line bg-surface',
        'shadow-[0_1px_2px_rgba(16,32,28,0.04),0_8px_24px_-18px_rgba(16,32,28,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between px-0.5">
      <h2 className="text-[14px] font-medium text-ink-2">{children}</h2>
      {extra}
    </div>
  );
}

/* ---------------- 小组件 ---------------- */

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'again' | 'hard' | 'good';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-2 text-ink-2 border-line',
    brand: 'bg-brand-soft text-brand-dark border-transparent',
    again: 'bg-again-soft text-again border-transparent',
    hard: 'bg-hard-soft text-hard border-transparent',
    good: 'bg-good-soft text-good border-transparent',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-lg border px-2 py-[3px] text-[11.5px] leading-none font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Progress({
  value,
  className,
  tone = 'brand',
}: {
  value: number;
  className?: string;
  tone?: 'brand' | 'hard';
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cx('h-[5px] w-full overflow-hidden rounded-full bg-line', className)}>
      <div
        className={cx('h-full rounded-full transition-[width] duration-500', tone === 'brand' ? 'bg-brand' : 'bg-hard')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Ring({
  ratio,
  size = 84,
  stroke = 9,
  children,
}: {
  ratio: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * clamped} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('rounded-xl border border-line bg-surface-2 px-3 py-2.5', className)}>
      <div className="text-[11.5px] text-ink-3">{label}</div>
      <div className="mt-0.5 text-[19px] leading-tight font-semibold text-ink">{value}</div>
      {sub ? <div className="mt-0.5 text-[11.5px] text-ink-3">{sub}</div> : null}
    </div>
  );
}

/* ---------------- 交互控件 ---------------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  block?: boolean;
}

export function Button({ variant = 'secondary', block, className, children, ...rest }: ButtonProps) {
  const styles: Record<string, string> = {
    primary: 'bg-brand text-white border-transparent active:bg-brand-dark',
    secondary: 'bg-surface text-ink border-line active:bg-surface-2',
    ghost: 'bg-transparent text-ink-2 border-transparent active:bg-surface-2',
    danger: 'bg-again-soft text-again border-transparent active:brightness-95',
  };
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[14px] font-medium',
        'transition-[transform,filter] duration-100 active:scale-[0.985] disabled:opacity-45 disabled:active:scale-100',
        styles[variant],
        block && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cx('flex gap-1 rounded-xl border border-line bg-surface-2 p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'flex-1 rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors',
            option.value === value ? 'bg-surface text-brand-dark shadow-sm' : 'text-ink-2',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative m-0 w-full max-w-[460px] rounded-t-2xl border border-line bg-surface p-4 sm:m-4 sm:rounded-2xl">
        <div className="mb-2 text-[15px] font-semibold">{title}</div>
        <div className="text-[13.5px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[60] flex justify-center px-4">
      <div className="rounded-full bg-ink/90 px-3.5 py-2 text-[12.5px] font-medium text-canvas shadow-lg">
        {message}
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="text-[15px] font-medium text-ink">{title}</div>
      {hint ? <div className="text-[13px] leading-relaxed text-ink-3">{hint}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
