import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypeFormatFootnotes from './rehype-format-footnotes.mjs';
import rehypeUltrathink from './rehype-ultrathink.mjs';
import remarkExternalLinks from './remark-external-links.mjs';

/** @type {import('@astrojs/markdown-remark').UnifiedProcessorOptions} */
export const markdownPlugins = {
  remarkPlugins: [remarkExternalLinks],
  rehypePlugins: [
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      {
        behavior: 'wrap',
        properties: {
          className: ['heading-link-wrapper'],
        },
      },
    ],
    rehypeFormatFootnotes,
    rehypeUltrathink,
  ],
};

/** @type {Pick<import('@astrojs/markdown-remark').AstroMarkdownOptions, 'syntaxHighlight' | 'shikiConfig'>} */
export const markdownSyntaxOptions = {
  syntaxHighlight: {
    type: 'shiki',
    excludeLangs: ['d2'],
  },
  shikiConfig: {
    theme: 'monokai',
    wrap: true,
  },
};
