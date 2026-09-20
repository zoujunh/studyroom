import { Icon } from '../icons';
import { StatTile, cx } from '../ui';
import type { TcpState } from '../../visual/tcp';

export function TcpView({ state }: { state: TcpState }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-surface px-3 py-3">
        <div className="flex items-start justify-between px-1">
          <div className="text-center">
            <div className="text-[12.5px] font-semibold text-brand">客户端</div>
            <div className="mt-0.5 text-[10.5px] font-medium tabular-nums text-ink-3">{state.clientState}</div>
          </div>
          <div className="text-center">
            <div className="text-[12.5px] font-semibold text-[#8a6bbf]">服务器</div>
            <div className="mt-0.5 text-[10.5px] font-medium tabular-nums text-ink-3">{state.serverState}</div>
          </div>
        </div>

        {state.messages.length === 0 ? (
          <p className="mt-5 mb-2 text-center text-[12.5px] text-ink-3">点「单步」或「播放」开始</p>
        ) : (
          <div className="mt-2 border-x border-dashed border-line">
            {state.messages.map((message, index) => {
              const active = index === state.active;
              const toRight = message.from === 'client';
              return (
                <div key={`${message.label}-${index}`} className="px-2 py-2">
                  <div
                    className={cx(
                      'text-center text-[12.5px] font-semibold',
                      active ? 'text-brand-dark' : 'text-ink-2',
                    )}
                  >
                    {message.label}
                  </div>
                  <div className={cx('mt-1 flex items-center gap-1', toRight ? '' : 'flex-row-reverse')}>
                    <div className={cx('h-[1.5px] flex-1', active ? 'bg-brand' : 'bg-line')} />
                    <span className={active ? 'text-brand' : 'text-ink-3'}>
                      <Icon name="arrowRight" size={13} className={toRight ? '' : 'rotate-180'} />
                    </span>
                  </div>
                  <div className="mt-1 text-center text-[11px] tabular-nums text-ink-3">{message.detail}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="客户端状态" value={<span className="text-[12.5px]">{state.clientState}</span>} />
        <StatTile label="服务器状态" value={<span className="text-[12.5px]">{state.serverState}</span>} />
        <StatTile label="已发报文" value={state.sent} />
      </div>

      <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-[11.5px] leading-relaxed text-ink-3">
        报文流水：
        {state.messages.length
          ? state.messages.map((message) => ` → ${message.label}`).join('')
          : ' （尚未发送）'}
      </div>
    </div>
  );
}
