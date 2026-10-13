import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getContentPreview } from './text.ts';

test('keeps the prose inside a LinkedInPost', () => {
  const body = `import LinkedInPost from '@components/LinkedInPost.astro';

<LinkedInPost id="https://www.linkedin.com/feed/update/urn:li:activity:7509381312605110272/">

Because it's Friday, let's talk about fatigue.

More text.

</LinkedInPost>
`;
  assert.equal(
    getContentPreview(body),
    "Because it's Friday, let's talk about fatigue."
  );
});

test('skips entry separators when the first entry is an embed', () => {
  const body = `import { Tweet } from 'astro-embed';

<Tweet id="https://x.com/a/status/1" />

---

Second entry.

---

Third entry.
`;
  assert.equal(getContentPreview(body), 'Second entry.');
});
