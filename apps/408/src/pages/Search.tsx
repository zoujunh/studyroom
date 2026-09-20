import { useMemo, useState } from 'react';
import { InlineMarkdown, Markdown } from '../components/Markdown';
import { Icon } from '../components/icons';
import { Button, Chip, Panel, cx } from '../components/ui';
import { subjectMeta } from '../data/curriculum';
import { navigate } from '../lib/router';
import { searchContent, SEARCH_KIND_LABEL, type SearchKind } from '../lib/search';
import { useStore } from '../state/store';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const KIND_TONE: Record<SearchKind, 'brand' | 'hard' | 'good'> = {
  card: 'brand',
  essay: 'good',
  question: 'hard',
};

const SUGGESTIONS = ['Dijkstra', '死锁', '三次握手', 'Cache', 'PV 操作', 'B 树', '拥塞控制', '哈夫曼'];

export function SearchPage() {
  const { cards, questions, essays, questionMap } = useStore();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<SearchKind | 'all'>('all');

  const hits = useMemo(
    () => searchContent(query, { cards, questions, essays }),
    [query, cards, questions, essays],
  );
  const shown = useMemo(
    () => (kindFilter === 'all' ? hits : hits.filter((hit) => hit.kind === kindFilter)),
    [hits, kindFilter],
  );

  const counts = useMemo(() => {
    const map: Record<SearchKind, number> = { card: 0, question: 0, essay: 0 };
    for (const hit of hits) map[hit.kind] += 1;
    return map;
  }, [hits]);

  return (
    <div className="px-4 pt-5 pb-6">
      <header className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate('/')}
          className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <h1 className="text-[19px] font-semibold">搜索</h1>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5">
        <Icon name="search" size={17} className="shrink-0 text-ink-3" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpenId(null);
          }}
          placeholder="搜知识点、题干、关键词…"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
        />
        {query ? (
          <button
            type="button"
            aria-label="清空"
            onClick={() => setQuery('')}
            className="shrink-0 text-ink-3"
          >
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </div>

      {!query ? (
        <>
          <p className="mt-4 text-[12px] text-ink-3">试试这些关键词：</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => setQuery(word)}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink-2 active:bg-surface-2"
              >
                {word}
              </button>
            ))}
          </div>
          <p className="mt-5 text-center text-[11.5px] leading-relaxed text-ink-3">
            在 {cards.length} 张知识点卡、{questions.length} 道选择题、{essays.length} 道大题里全文搜索。
            <br />
            多个关键词用空格分开（要全部命中）。
          </p>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-ink-3">
              命中 {hits.length} 条
              {kindFilter === 'all' && hits.length
                ? `：卡片 ${counts.card} · 选择题 ${counts.question} · 大题 ${counts.essay}`
                : ''}
            </span>
          </div>

          {hits.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['all', 'card', 'question', 'essay'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setKindFilter(kind)}
                  className={cx(
                    'rounded-lg border px-2.5 py-1.5 text-[12px] transition',
                    kindFilter === kind
                      ? 'border-brand bg-brand-soft font-medium text-brand-dark'
                      : 'border-line bg-surface text-ink-2',
                  )}
                >
                  {kind === 'all' ? `全部 ${hits.length}` : `${SEARCH_KIND_LABEL[kind]} ${counts[kind]}`}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 space-y-2.5">
            {shown.map((hit) => {
              const question = hit.kind === 'question' ? questionMap.get(hit.id) : undefined;
              const card = hit.kind === 'card' ? cards.find((item) => item.id === hit.id) : undefined;
              const open = openId === hit.id;
              return (
                <Panel key={`${hit.kind}-${hit.id}`} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full px-3.5 py-3 text-left active:bg-surface-2"
                    onClick={() => {
                      if (hit.kind === 'essay') {
                        navigate(`/essay/run?mode=single&id=${hit.id}`);
                        return;
                      }
                      setOpenId(open ? null : hit.id);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Chip tone={KIND_TONE[hit.kind]}>{SEARCH_KIND_LABEL[hit.kind]}</Chip>
                      <Chip tone="brand">{subjectMeta(hit.subject).short}</Chip>
                      <Chip>{hit.chapter}</Chip>
                    </div>
                    <div className="mt-2 text-[13.5px] leading-snug font-medium">
                      <InlineMarkdown source={hit.title.slice(0, 90)} />
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
                      {hit.snippet}
                    </div>
                  </button>

                  {open && card ? (
                    <div className="border-t border-line bg-surface-2 px-3.5 pt-2 pb-3.5">
                      <Markdown source={card.back} />
                      {card.hint ? (
                        <div className="mt-2.5 rounded-xl bg-brand-soft/70 px-3 py-2 text-[12.5px] leading-relaxed text-brand-dark">
                          <span className="font-semibold">记忆锚点 · </span>
                          {card.hint}
                        </div>
                      ) : null}
                      <Button
                        className="mt-2.5 w-full text-[12.5px]"
                        onClick={() => navigate(`/review?mode=chapter&subject=${card.subject}&chapter=${encodeURIComponent(card.chapter)}`)}
                      >
                        去刷这一章
                      </Button>
                    </div>
                  ) : null}

                  {open && question ? (
                    <div className="border-t border-line bg-surface-2 px-3.5 pt-2 pb-3.5">
                      <ul className="space-y-1 text-[12.5px] text-ink-2">
                        {question.options.map((option, index) => (
                          <li key={index} className={question.answer.includes(index) ? 'text-good' : undefined}>
                            <span className="mr-1 font-medium">{OPTION_LETTERS[index]}.</span>
                            <InlineMarkdown source={option} />
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
                        <Markdown source={question.analysis} />
                      </div>
                      <Button
                        className="mt-2.5 w-full text-[12.5px]"
                        onClick={() => navigate(`/quiz/run?mode=chapter&subject=${question.subject}&chapter=${encodeURIComponent(question.chapter)}`)}
                      >
                        去练这一章
                      </Button>
                    </div>
                  ) : null}
                </Panel>
              );
            })}

            {query && shown.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="text-[14px] text-ink-2">没搜到「{query}」</div>
                <div className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
                  换个说法试试，或者减少关键词（多个词必须同时命中）。
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
