import { defineEcConfig } from 'astro-expressive-code'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections'

export default defineEcConfig({
    plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
    themes: ['monokai'],
    defaultProps: {
        showLineNumbers: false,
    },
    styleOverrides: {
        frames: {
            tooltipSuccessForeground: 'var(--color-ink-light)',
            tooltipSuccessBackground: 'var(--color-bg)',
        },
        collapsibleSections: {
            closedBackgroundColor: 'var(--color-bg-code)',
            closedBorderColor: 'var(--color-border)',
            closedTextColor: 'var(--color-ink-light)',
        },
        codeBackground: 'var(--color-bg-code)',
    },
})
