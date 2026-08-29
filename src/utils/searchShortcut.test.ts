import assert from 'node:assert/strict';
import test from 'node:test';

import { isSearchShortcut } from './searchShortcut';

const keyboardEvent = (
  overrides: Partial<Parameters<typeof isSearchShortcut>[0]> = {}
) => ({
  altKey: false,
  code: '',
  ctrlKey: false,
  key: '',
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

test('matches Command-K and Ctrl-K', () => {
  assert.equal(
    isSearchShortcut(keyboardEvent({ key: 'k', metaKey: true })),
    true
  );
  assert.equal(
    isSearchShortcut(keyboardEvent({ key: 'k', ctrlKey: true })),
    true
  );
});

test('matches uppercase and layout-adjusted KeyK events', () => {
  assert.equal(
    isSearchShortcut(keyboardEvent({ key: 'K', metaKey: true })),
    true
  );
  assert.equal(
    isSearchShortcut(keyboardEvent({ code: 'KeyK', key: 'к', metaKey: true })),
    true
  );
});

test('does not consume other modified shortcuts', () => {
  assert.equal(
    isSearchShortcut(
      keyboardEvent({ key: 'k', metaKey: true, shiftKey: true })
    ),
    false
  );
  assert.equal(
    isSearchShortcut(keyboardEvent({ key: 'k', ctrlKey: true, altKey: true })),
    false
  );
  assert.equal(
    isSearchShortcut(keyboardEvent({ key: 'j', metaKey: true })),
    false
  );
});
