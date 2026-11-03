import { defineEcConfig } from 'astro-expressive-code';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';

export default defineEcConfig({
  plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
  themes: ['monokai'],
  // Shiki has no gitignore grammar; render those blocks as plain text
  // instead of warning on every build.
  shiki: {
    langAlias: { gitignore: 'txt' },
  },
  defaultProps: {
    showLineNumbers: false,
  },
  styleOverrides: {
    frames: {
      tooltipSuccessForeground: 'var(--color-ink-light)',
      tooltipSuccessBackground: 'var(--color-bg)',
    },
    collapsibleSections: {},
  },
});
