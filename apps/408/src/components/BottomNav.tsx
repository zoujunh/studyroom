import { useRoute, navigate } from '../lib/router';
import { Icon, type IconName } from './icons';
import { cx } from './ui';

interface Tab {
  path: string;
  label: string;
  icon: IconName;
}

const TABS: Tab[] = [
  { path: '/', label: '首页', icon: 'home' },
  { path: '/review', label: '刷卡', icon: 'cards' },
  { path: '/quiz', label: '题库', icon: 'check' },
  { path: '/visual', label: '可视化', icon: 'layers' },
  { path: '/stats', label: '统计', icon: 'chart' },
];

export function BottomNav() {
  const route = useRoute();
  return (
    <nav className="safe-bottom shrink-0 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[520px] items-stretch">
        {TABS.map((tab) => {
          const active = route.path === tab.path || route.path.startsWith(`${tab.path}/`);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={cx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors',
                active ? 'text-brand' : 'text-ink-3',
              )}
            >
              <Icon name={tab.icon} size={22} />
              <span className={active ? 'font-medium' : undefined}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
