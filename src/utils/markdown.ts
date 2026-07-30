import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import {
  markdownPlugins,
  markdownSyntaxOptions,
} from '../../plugins/markdown-options.mjs';

const processorPromise = createMarkdownProcessor({
  ...markdownPlugins,
  ...markdownSyntaxOptions,
});

export async function renderMarkdown(content: string): Promise<string> {
  const processor = await processorPromise;
  const result = await processor.render(content);
  return result.code;
}
