import type { CardRow, EssayRow, QuestionRow, SubjectId } from '../types';

/**
 * 全局搜索：在卡片、选择题、大题里找关键词。
 * 规则：查询按空格拆词，**所有词都必须命中**；越靠前命中分数越高。
 */

export type SearchKind = 'card' | 'question' | 'essay';

export interface SearchHit {
  kind: SearchKind;
  id: string;
  subject: SubjectId;
  chapter: string;
  /** 卡片问题 / 题干 */
  title: string;
  /** 命中位置的上下文片段 */
  snippet: string;
  score: number;
}

export interface SearchSources {
  cards: CardRow[];
  questions: QuestionRow[];
  essays: EssayRow[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** 单个词在某段文本里的得分；不命中返回 0。 */
function termScore(haystack: string, term: string, weight: number): number {
  const index = haystack.indexOf(term);
  if (index === -1) return 0;
  // 越靠前命中分越高，最高 10 分
  return weight * (10 - Math.min(9, Math.floor(index / 25)));
}

function snippetOf(text: string, terms: string[]): string {
  const plain = text.replace(/[#*`$>]/g, '').replace(/\s+/g, ' ').trim();
  const lower = plain.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index !== -1 && (at === -1 || index < at)) at = index;
  }
  if (at === -1) return plain.slice(0, 60);
  const start = Math.max(0, at - 20);
  return `${start > 0 ? '…' : ''}${plain.slice(start, start + 70)}${start + 70 < plain.length ? '…' : ''}`;
}

export function searchContent(query: string, sources: SearchSources, limit = 40): SearchHit[] {
  const terms = normalize(query).split(' ').filter((term) => term.length > 0);
  if (!terms.length) return [];

  const hits: SearchHit[] = [];

  for (const card of sources.cards) {
    const title = normalize(card.title);
    const tags = normalize(card.tags.join(' '));
    const chapter = normalize(card.chapter);
    const body = normalize(card.back);
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const part =
        termScore(title, term, 3) + termScore(tags, term, 2) + termScore(chapter, term, 2) + termScore(body, term, 1);
      if (part === 0) {
        ok = false;
        break;
      }
      score += part;
    }
    if (ok) {
      hits.push({
        kind: 'card',
        id: card.id,
        subject: card.subject,
        chapter: card.chapter,
        title: card.title,
        snippet: snippetOf(card.back, terms),
        score,
      });
    }
  }

  for (const question of sources.questions) {
    const title = normalize(question.stem);
    const tags = normalize(question.tags.join(' '));
    const chapter = normalize(question.chapter);
    const body = normalize(`${question.options.join(' ')} ${question.analysis}`);
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const part =
        termScore(title, term, 3) + termScore(tags, term, 2) + termScore(chapter, term, 2) + termScore(body, term, 1);
      if (part === 0) {
        ok = false;
        break;
      }
      score += part;
    }
    if (ok) {
      hits.push({
        kind: 'question',
        id: question.id,
        subject: question.subject,
        chapter: question.chapter,
        title: question.stem,
        snippet: snippetOf(question.analysis, terms),
        // 选择题整体略微降权，让卡片与题目混排时更均衡
        score: score * 0.95,
      });
    }
  }

  for (const essay of sources.essays) {
    const title = normalize(essay.stem);
    const tags = normalize(essay.tags.join(' '));
    const chapter = normalize(essay.chapter);
    const body = normalize(`${essay.solution} ${essay.points.map((point) => point.label).join(' ')}`);
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const part =
        termScore(title, term, 3) + termScore(tags, term, 2) + termScore(chapter, term, 2) + termScore(body, term, 1);
      if (part === 0) {
        ok = false;
        break;
      }
      score += part;
    }
    if (ok) {
      hits.push({
        kind: 'essay',
        id: essay.id,
        subject: essay.subject,
        chapter: essay.chapter,
        title: essay.stem,
        snippet: snippetOf(essay.solution, terms),
        score,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  card: '知识点卡',
  question: '选择题',
  essay: '综合应用题',
};
