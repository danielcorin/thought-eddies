export interface SearchShortcutEvent {
  altKey: boolean;
  code: string;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
}

export function isSearchShortcut(event: SearchShortcutEvent): boolean {
  const hasPrimaryModifier = event.metaKey || event.ctrlKey;
  const isK = event.code === 'KeyK' || event.key.toLowerCase() === 'k';

  return hasPrimaryModifier && !event.altKey && !event.shiftKey && isK;
}
