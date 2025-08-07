export interface Hotkey {
  key: string;
  modifiers?: ('cmd' | 'ctrl' | 'shift' | 'alt')[];
  description: string;
  action?: string;
}

export interface HotkeyConfig {
  global: Hotkey[];
  pageSpecific?: {
    posts?: Hotkey[];
    logs?: Hotkey[];
    til?: Hotkey[];
    search?: Hotkey[];
    projects?: Hotkey[];
    feeds?: Hotkey[];
    uses?: Hotkey[];
    now?: Hotkey[];
    [key: string]: Hotkey[] | undefined;
  };
}

export const hotkeyConfig: HotkeyConfig = {
  global: [
    {
      key: 'k',
      modifiers: ['cmd'],
      description: 'Open search',
      action: 'search',
    },
    {
      key: 'm',
      modifiers: ['cmd', 'shift'],
      description: 'Toggle dark/light theme',
      action: 'toggleTheme',
    },
    {
      key: '?',
      modifiers: ['shift'],
      description: 'Show keyboard shortcuts',
      action: 'showShortcuts',
    },
  ],
  pageSpecific: {
    posts: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous post',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next post',
        action: 'navigateNext',
      },
    ],
    postsList: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous page',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next page',
        action: 'navigateNext',
      },
    ],
    logs: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous day',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next day',
        action: 'navigateNext',
      },
    ],
    logsYear: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous year',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next year',
        action: 'navigateNext',
      },
    ],
    logsMonth: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous month',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next month',
        action: 'navigateNext',
      },
    ],
    til: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous TIL',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next TIL',
        action: 'navigateNext',
      },
    ],
    tilList: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous page',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next page',
        action: 'navigateNext',
      },
    ],
    projects: [
      {
        key: 'ArrowLeft',
        description: 'Go to previous project',
        action: 'navigatePrev',
      },
      {
        key: 'ArrowRight',
        description: 'Go to next project',
        action: 'navigateNext',
      },
    ],
  },
};

export function getHotkeysForPage(pageType?: string): Hotkey[] {
  const globalHotkeys = hotkeyConfig.global;
  const pageHotkeys = (pageType && hotkeyConfig.pageSpecific?.[pageType]) || [];
  return [...globalHotkeys, ...pageHotkeys];
}

export function formatHotkeyDisplay(hotkey: Hotkey): string {
  const parts: string[] = [];
  const isMac =
    typeof window !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (hotkey.modifiers) {
    // Use a Set to avoid duplicates
    const uniqueModifiers = new Set<string>();

    hotkey.modifiers.forEach((mod) => {
      switch (mod) {
        case 'cmd':
          if (isMac) uniqueModifiers.add('⌘');
          break;
        case 'ctrl':
          if (!isMac) uniqueModifiers.add('Ctrl');
          break;
        case 'shift':
          uniqueModifiers.add('⇧');
          break;
        case 'alt':
          uniqueModifiers.add(isMac ? '⌥' : 'Alt');
          break;
      }
    });

    parts.push(...Array.from(uniqueModifiers));
  }

  parts.push(
    hotkey.key === 'ArrowLeft'
      ? '←'
      : hotkey.key === 'ArrowRight'
        ? '→'
        : hotkey.key === 'ArrowUp'
          ? '↑'
          : hotkey.key === 'ArrowDown'
            ? '↓'
            : hotkey.key.toUpperCase()
  );

  return parts.join(' ');
}
