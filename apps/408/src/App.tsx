import { BottomNav } from './components/BottomNav';
import { useRoute } from './lib/router';
import { EssayPage } from './pages/Essay';
import { EssayRunPage } from './pages/EssayRun';
import { FocusPage } from './pages/Focus';
import { HomePage } from './pages/Home';
import { MistakesPage } from './pages/Mistakes';
import { QuizPage } from './pages/Quiz';
import { QuizRunPage } from './pages/QuizRun';
import { ReviewPage } from './pages/Review';
import { SearchPage } from './pages/Search';
import { SettingsPage } from './pages/Settings';
import { StatsPage } from './pages/Stats';
import { SubjectsPage } from './pages/Subjects';
import { VisualDetailPage, VisualListPage } from './pages/VisualDetail';
import { useStore } from './state/store';

function Splash({ hint }: { hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-canvas">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-[17px] font-bold text-white">
        408
      </div>
      <p className="text-[13px] text-ink-3">{hint}</p>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const { ready, storageOk } = useStore();

  if (!ready) return <Splash hint="正在加载本地题库…" />;

  // 这几个页面自己管理内部滚动（顶部固定 + 底部操作条）
  const isFullHeight =
    route.path === '/review' || route.path === '/quiz/run' || route.path === '/essay/run';

  const page = (() => {
    if (route.path.startsWith('/visual/')) {
      return <VisualDetailPage visualId={route.path.slice('/visual/'.length)} />;
    }
    switch (route.path) {
      case '/review':
        return <ReviewPage />;
      case '/quiz':
        return <QuizPage />;
      case '/quiz/run':
        return <QuizRunPage />;
      case '/essay':
        return <EssayPage />;
      case '/essay/run':
        return <EssayRunPage />;
      case '/mistakes':
        return <MistakesPage />;
      case '/focus':
        return <FocusPage />;
      case '/search':
        return <SearchPage />;
      case '/subjects':
        return <SubjectsPage />;
      case '/stats':
        return <StatsPage />;
      case '/settings':
        return <SettingsPage />;
      case '/visual':
        return <VisualListPage />;
      default:
        return <HomePage />;
    }
  })();

  return (
    <div className="mx-auto flex h-full max-w-[520px] flex-col overflow-hidden bg-canvas">
      {isFullHeight ? (
        <div className="min-h-0 flex-1">{page}</div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">{page}</div>
          {storageOk ? <BottomNav /> : null}
        </>
      )}
    </div>
  );
}
