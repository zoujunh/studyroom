import { useEffect, useState } from 'react';

export interface Route {
  /** 形如 '/review'，不带 query。 */
  path: string;
  query: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(search) };
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const next = `#${to.startsWith('/') ? to : `/${to}`}`;
  if (window.location.hash === next) return;
  if (options.replace) {
    window.history.replaceState(null, '', next);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = next;
  }
}

/** 极简 hash 路由：让 PWA 的返回键与前进后退都能正常工作。 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? { path: '/', query: new URLSearchParams() } : parseHash(),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function back(): void {
  if (window.history.length > 1) window.history.back();
  else navigate('/');
}
