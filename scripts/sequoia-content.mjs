// Sequoia `contentTransform` hook (see sequoia.json and patches/sequoia-cli*.patch).
//
// Sequoia publishes a post's raw Markdown body as the record's textContent.
// A Reprise replay post's body is only the imports and the <RepriseReplay>
// tag, so swap in the recording's final text, which is the actual post.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeRecording } from '../src/utils/reprise.ts';

const RECORDING_IMPORT =
  /^import\s+\w+\s+from\s+['"](\.{1,2}\/[^'"?]+\.reprise\.json)['"];?\s*$/m;

export default async function transformContent({ filePath, body }) {
  const match = body.match(RECORDING_IMPORT);
  if (!match) return undefined;
  const recordingPath = path.resolve(path.dirname(filePath), match[1]);
  const recording = normalizeRecording(
    JSON.parse(await readFile(recordingPath, 'utf-8')),
  );
  return recording.finalText;
}
