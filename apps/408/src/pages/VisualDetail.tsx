import { useCallback, useEffect, useMemo, useState } from 'react';
import { StepPlayer, SPEEDS } from '../components/StepPlayer';
import { RichText } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, SectionTitle, Segmented, StatTile, Toast, cx } from '../components/ui';
import { GanttView } from '../components/views/GanttView';
import { GraphView } from '../components/views/GraphView';
import { MatrixView } from '../components/views/MatrixView';
import { PagingView } from '../components/views/PagingView';
import { SortView } from '../components/views/SortView';
import { TcpView } from '../components/views/TcpView';
import { subjectMeta } from '../data/curriculum';
import { back, navigate, useRoute } from '../lib/router';
import { DEFAULT_REFS, type PagingState } from '../visual/paging';
import { getVisual, VISUALS } from '../visual/registry';
import { SORT_FACTS, type SortState } from '../visual/sort';
import type { TcpState } from '../visual/tcp';
import type { GanttState, GraphState, MatrixState } from '../visual/types';
import { intIn, parseSeries, type VisualDef, type VisualInput } from '../visual/types';

const FALLBACK_REFS = DEFAULT_REFS.split(' ').map(Number);

function initInput(def: VisualDef | undefined, query: URLSearchParams): VisualInput {
  const next: VisualInput = { ...(def?.defaults ?? {}) };
  if (def) {
    for (const field of def.fields) {
      const value = query.get(field.key);
      if (value) next[field.key] = value;
    }
  }
  return next;
}

export function VisualDetailPage({ visualId }: { visualId: string }) {
  const route = useRoute();
  const def = getVisual(visualId);

  const [input, setInput] = useState<VisualInput>(() => initInput(def, route.query));
  const [variantId, setVariantId] = useState<string>(
    () => route.query.get('algo') ?? def?.defaults.algo ?? def?.variants[0]?.id ?? '',
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[1].ms);
  const [toast, setToast] = useState<string | null>(null);

  // 切换可视化时重新按 URL 初始化
  useEffect(() => {
    setInput(initInput(def, route.query));
    setVariantId(route.query.get('algo') ?? def?.defaults.algo ?? def?.variants[0]?.id ?? '');
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualId]);

  const variant = def?.variants.find((item) => item.id === variantId) ?? def?.variants[0];

  const frames = useMemo(() => {
    if (!variant) return [];
    try {
      return variant.build(input);
    } catch {
      return [];
    }
  }, [variant, input]);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [variantId, input]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1900);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 自动播放：每 speed 毫秒推进一步，到末尾自动停
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    if (index >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => Math.min(frames.length - 1, current + 1));
    }, speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, speed, frames.length]);

  const current = frames.length ? frames[Math.min(index, frames.length - 1)] : undefined;

  const refs = useMemo(() => parseSeries(input.refs, FALLBACK_REFS, 40), [input.refs]);
  const frameCount = intIn(input.frames, 3, 1, 6);
  const fallback = frames[frames.length - 1]?.counters ?? {};

  const randomize = useCallback(() => {
    const count = 8 + Math.floor(Math.random() * 5);
    const data = Array.from({ length: count }, () => Math.floor(Math.random() * 20));
    setInput((prev) => ({ ...prev, data: data.join(' ') }));
  }, []);

  const share = useCallback(async () => {
    if (!def) return;
    const params = new URLSearchParams({ algo: variantId });
    for (const field of def.fields) params.set(field.key, input[field.key] ?? '');
    const url = `${window.location.origin}${window.location.pathname}#/visual/${def.id}?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast('已复制链接，注意参数也一起带上了');
    } catch {
      setToast(url);
    }
  }, [def, input, variantId]);

  // 键盘操作：空格播放/暂停、←/→ 单步、R 重置（输入框里不拦截）
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (event.key === 'ArrowRight') {
        setPlaying(false);
        setIndex((value) => Math.min(Math.max(0, frames.length - 1), value + 1));
      } else if (event.key === 'ArrowLeft') {
        setPlaying(false);
        setIndex((value) => Math.max(0, value - 1));
      } else if (event.key === 'r' || event.key === 'R') {
        setPlaying(false);
        setIndex(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [frames.length]);

  if (!def) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[14px] text-ink-2">没有这个可视化</p>
        <Button className="mt-3" onClick={() => back()}>
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <header className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="返回"
          onClick={back}
          className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold">{def.title}</div>
          <div className="text-[11.5px] text-ink-3">{subjectMeta(def.subject).name}</div>
        </div>
        <button
          type="button"
          onClick={() => void share()}
          className="flex items-center gap-1 rounded-[10px] border border-line bg-surface px-2.5 py-2 text-[12px] text-ink-2 active:bg-surface-2"
        >
          <Icon name="share" size={15} />
          分享
        </button>
      </header>

      <StepPlayer
        total={frames.length}
        index={index}
        playing={playing}
        speed={speed}
        onIndex={(next) => {
          setPlaying(false);
          setIndex(next);
        }}
        onTogglePlay={() => setPlaying((p) => !p)}
        onReset={() => {
          setPlaying(false);
          setIndex(0);
        }}
        onSpeed={setSpeed}
      />

      {def.fields.length ? (
        <Panel className="mt-3 space-y-2.5 px-3.5 py-3">
          {def.fields.map((field) => (
            <div key={field.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <label className="text-[12px] font-medium text-ink-2" htmlFor={`field-${field.key}`}>
                  {field.label}
                </label>
                {field.hint ? <span className="text-[10.5px] text-ink-3">{field.hint}</span> : null}
              </div>
              <input
                id={`field-${field.key}`}
                type={field.type === 'number' ? 'number' : 'text'}
                value={input[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) => setInput((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className="w-full rounded-xl border border-line bg-surface-2 px-2.5 py-2 text-[13px] tabular-nums text-ink outline-none focus:border-brand"
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {def.example ? (
              <Button
                className="px-3 py-2 text-[12.5px]"
                onClick={() => setInput((prev) => ({ ...prev, ...def.example!.input }))}
              >
                {def.example.label}
              </Button>
            ) : null}
            {def.id === 'sort' ? (
              <Button className="px-3 py-2 text-[12.5px]" onClick={randomize}>
                <Icon name="dice" size={15} />
                随机
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="px-3 py-2 text-[12.5px]"
              onClick={() => setInput({ ...def.defaults })}
            >
              恢复默认
            </Button>
          </div>
        </Panel>
      ) : null}

      {def.variants.length > 1 ? (
        <div className="mt-3">
          <Segmented
            value={variantId}
            onChange={(value) => setVariantId(value)}
            options={def.variants.map((item) => ({ value: item.id, label: item.label }))}
          />
        </div>
      ) : null}

      <Panel className="mt-3 px-3 py-3.5">
        {def.view === 'bars' && current ? <SortView state={current.state as SortState} /> : null}
        {def.view === 'frames' && current ? (
          <PagingView state={current.state as PagingState} refs={refs} frameCount={frameCount} />
        ) : null}
        {def.view === 'lifeline' && current ? <TcpView state={current.state as TcpState} /> : null}
        {def.view === 'matrix' && current ? <MatrixView state={current.state as MatrixState} /> : null}
        {def.view === 'gantt' && current ? <GanttView state={current.state as GanttState} /> : null}
        {def.view === 'graph' && current ? <GraphView state={current.state as GraphState} /> : null}
        {!current ? <p className="py-6 text-center text-[13px] text-ink-3">参数无法解析，检查一下输入</p> : null}
      </Panel>

      {current ? (
        <div className="mt-3 rounded-xl border-l-[3px] border-brand bg-brand-soft/70 px-3.5 py-2.5 text-[13px] leading-relaxed text-brand-dark">
          <RichText source={current.note} />
        </div>
      ) : null}

      {Object.keys(fallback).length ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Object.entries(fallback).map(([label, value]) => (
            <StatTile key={label} label={label} value={value} sub={label === '缺页率' ? '%' : undefined} />
          ))}
        </div>
      ) : null}

      {def.id === 'sort' && SORT_FACTS[variantId] ? (
        <div className="mt-4">
          <SectionTitle>
            {def.variants.find((item) => item.id === variantId)?.label} 的复杂度与稳定性
          </SectionTitle>
          <Panel className="grid grid-cols-3 divide-x divide-line">
            <div className="px-3 py-2.5 text-center">
              <div className="text-[11px] text-ink-3">平均复杂度</div>
              <div className="mt-0.5 text-[14px] font-semibold">{SORT_FACTS[variantId].avg}</div>
            </div>
            <div className="px-3 py-2.5 text-center">
              <div className="text-[11px] text-ink-3">空间</div>
              <div className="mt-0.5 text-[14px] font-semibold">{SORT_FACTS[variantId].space}</div>
            </div>
            <div className="px-3 py-2.5 text-center">
              <div className="text-[11px] text-ink-3">稳定性</div>
              <div
                className={cx(
                  'mt-0.5 text-[14px] font-semibold',
                  SORT_FACTS[variantId].stable === '稳定' ? 'text-good' : 'text-again',
                )}
              >
                {SORT_FACTS[variantId].stable}
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-ink-3">
        进度条可以直接拖到任意一步回看 · 每个动画都能用链接分享
      </p>

      <Toast message={toast} />
    </div>
  );
}

/** 可视化列表页 */
export function VisualListPage() {
  return (
    <div className="px-4 pt-5 pb-6">
      <h1 className="text-[19px] font-semibold">可视化演示</h1>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
        每个算法都能单步、回看、变速，参数可以自己改。
      </p>
      <div className="mt-4 space-y-2.5">
        {VISUALS.map((visual) => (
          <Panel
            key={visual.id}
            className="flex cursor-pointer items-center gap-3 px-3.5 py-3.5 active:bg-surface-2"
            onClick={() => navigate(`/visual/${visual.id}`)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14.5px] font-medium">{visual.title}</span>
                <Chip tone="brand">{subjectMeta(visual.subject).short}</Chip>
              </div>
              <div className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{visual.blurb}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {visual.variants.map((variant) => (
                  <Chip key={variant.id}>{variant.label}</Chip>
                ))}
              </div>
            </div>
            <Icon name="chevronRight" size={18} className="shrink-0 text-ink-3" />
          </Panel>
        ))}
      </div>
      <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-3">
        目前共 {VISUALS.length} 个可视化 · 每个都能单步、回看、变速、分享
        <br />
        后续还会加：图的拓扑排序与最短路、B 树插入删除、路由聚合…
      </p>
    </div>
  );
}
