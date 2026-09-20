import katex from 'katex';
import { Marked, type Tokens } from 'marked';

/**
 * 卡片正文渲染：Markdown + KaTeX。
 * 内容来自本仓库的种子数据或用户自己导入的 JSON，因此直接 innerHTML 输出。
 * （后续若要支持外部不可信内容，需在此接入 sanitizer。）
 */

const blockMath = {
  name: 'blockMath',
  level: 'block' as const,
  start(src: string) {
    return src.indexOf('$$');
  },
  tokenizer(src: string) {
    const match = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(src);
    if (!match) return undefined;
    return { type: 'blockMath', raw: match[0], text: match[1].trim() } as Tokens.Generic;
  },
  renderer(token: Tokens.Generic) {
    return `<div class="math-block">${katex.renderToString(String(token.text), {
      displayMode: true,
      throwOnError: false,
    })}</div>`;
  },
};

const inlineMath = {
  name: 'inlineMath',
  level: 'inline' as const,
  start(src: string) {
    return src.indexOf('$');
  },
  tokenizer(src: string) {
    const match = /^\$([^$\n]+?)\$/.exec(src);
    if (!match) return undefined;
    return { type: 'inlineMath', raw: match[0], text: match[1] } as Tokens.Generic;
  },
  renderer(token: Tokens.Generic) {
    return katex.renderToString(String(token.text), { throwOnError: false });
  },
};

const marked = new Marked({ gfm: true, breaks: false });
marked.use({ extensions: [blockMath, inlineMath] });

const cache = new Map<string, string>();
const inlineCache = new Map<string, string>();

export function renderMarkdown(source: string): string {
  const hit = cache.get(source);
  if (hit !== undefined) return hit;
  const html = marked.parse(source, { async: false }) as string;
  if (cache.size > 400) cache.clear();
  cache.set(source, html);
  return html;
}

/** 只渲染行内内容（用于卡片正面的问题、标签等单行文本）。 */
export function renderInline(source: string): string {
  const hit = inlineCache.get(source);
  if (hit !== undefined) return hit;
  const html = marked.parseInline(source, { async: false }) as string;
  if (inlineCache.size > 600) inlineCache.clear();
  inlineCache.set(source, html);
  return html;
}
