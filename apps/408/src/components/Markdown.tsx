import { useMemo } from 'react';
import { renderInline, renderMarkdown } from '../lib/markdown';

/** 渲染卡片背面与大题题干（Markdown + KaTeX）。 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return (
    <div className={className ? `md-body ${className}` : 'md-body'} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** 渲染单行富文本（行内公式 / 粗体 / 行内代码）。 */
export function InlineMarkdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => renderInline(source), [source]);
  return (
    <span className={className ? `${className} rich-text` : 'rich-text'} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/**
 * 块级富文本的轻量包装：用于「说明、旁白、评分点要点」这类可能含公式的短文本。
 * 与 InlineMarkdown 的区别是它可以跨行（换行保留为 <br>），但不解析标题/列表等块语法。
 */
export function RichText({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => renderInline(source.replace(/\n+/g, '  \n')), [source]);
  return (
    <span className={className ? `${className} rich-text` : 'rich-text'} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
