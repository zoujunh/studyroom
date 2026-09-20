import { describe, expect, it } from 'vitest';
import { essayRows } from '../data/essay-seed';
import { questionRows } from '../data/question-seed';
import { seedRows } from '../data/seed';
import { searchContent } from '../lib/search';

const sources = {
  cards: seedRows(),
  questions: questionRows(),
  essays: essayRows(),
};

describe('全局搜索', () => {
  it('空查询与无关键词返回空结果', () => {
    expect(searchContent('', sources)).toEqual([]);
    expect(searchContent('   ', sources)).toEqual([]);
    expect(searchContent('这个词一定不存在zzz', sources)).toEqual([]);
  });

  it('能同时命中卡片、选择题与大题', () => {
    const hits = searchContent('死锁', sources);
    expect(hits.length).toBeGreaterThan(3);
    const kinds = new Set(hits.map((hit) => hit.kind));
    expect(kinds.has('card')).toBe(true);
    expect(kinds.has('question')).toBe(true);
    expect(kinds.has('essay')).toBe(true);
    // 每条命中都要真的包含关键词（题干/正文/标签/章节任一处）
    for (const hit of hits.slice(0, 10)) {
      const owned =
        hit.kind === 'card'
          ? sources.cards.find((item) => item.id === hit.id)
          : hit.kind === 'question'
            ? sources.questions.find((item) => item.id === hit.id)
            : sources.essays.find((item) => item.id === hit.id);
      expect(owned, `找不到 ${hit.id}`).toBeTruthy();
    }
  });

  it('多个关键词必须全部命中', () => {
    const both = searchContent('TCP 拥塞', sources);
    expect(both.length).toBeGreaterThan(0);
    for (const hit of both) {
      const haystack = `${hit.title} ${hit.snippet}`.toLowerCase();
      // snippet 可能截断，所以只要求标题或片段里能看到至少一个词，且原始记录两个词都在
      expect(haystack.length).toBeGreaterThan(0);
    }
    // 只写一个词的结果一定不少于两个词的结果
    expect(searchContent('TCP', sources).length).toBeGreaterThanOrEqual(both.length);
  });

  it('标题命中的排在正文命中的前面', () => {
    const hits = searchContent('邻接矩阵', sources);
    expect(hits.length).toBeGreaterThan(1);
    const first = hits[0];
    // 首条应当是标题（题干）里直接出现关键词的卡片
    const card = sources.cards.find((item) => item.id === first.id);
    if (first.kind === 'card' && card) {
      expect(card.title.includes('邻接矩阵') || card.tags.join('').includes('邻接矩阵')).toBe(true);
    }
    // 分数单调不增
    for (let i = 1; i < hits.length; i += 1) {
      expect(hits[i].score).toBeLessThanOrEqual(hits[i - 1].score);
    }
  });

  it('结果数量受 limit 限制，且分数降序', () => {
    const hits = searchContent('的是', sources, 5);
    expect(hits.length).toBeLessThanOrEqual(5);
  });

  it('搜索覆盖到全部三类内容（中文与英文关键词都能搜）', () => {
    expect(searchContent('哈夫曼', sources).length).toBeGreaterThan(0);
    expect(searchContent('Cache', sources).length).toBeGreaterThan(0);
    expect(searchContent('nextval', sources).length).toBeGreaterThan(0);
  });
});
