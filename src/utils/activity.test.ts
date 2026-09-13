import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DAY_MS,
  getActivityPeriods,
  getActivityStats,
  isActivityDate,
  type ActivityItem,
} from './activity';

const item = (publishedAt: string, contentLength = 10): ActivityItem => ({
  id: publishedAt,
  collection: 'logs',
  title: 'Entry',
  publishedAt,
  contentLength,
});

test('rolling periods include the whole selected day without overlapping comparisons', () => {
  const period = getActivityPeriods('2026-09-12')[0];
  const items = [
    item('2026-08-29T23:59:59.999Z'),
    item('2026-08-30T00:00:00.000Z'),
    item('2026-09-05T23:59:59.999Z'),
    item('2026-09-06T00:00:00.000Z'),
    item('2026-09-12T23:59:59.999Z', 25),
    item('2026-09-13T00:00:00.000Z'),
  ];
  const current = getActivityStats(items, period.start, period.end);
  const previous = getActivityStats(
    items,
    period.previousStart,
    period.previousEnd
  );
  assert.equal(current.total, 2);
  assert.equal(previous.total, 2);
  assert.deepEqual(current.daily, [10, 0, 0, 0, 0, 0, 25]);
  assert.deepEqual(current.dailyEntries, [1, 0, 0, 0, 0, 0, 1]);
  assert.equal(current.breakdown.logs, 2);
});

test('the calendar and yearly comparison cover exactly 365 days', () => {
  const period = getActivityPeriods('2026-09-12')[2];
  assert.equal((period.end.getTime() - period.start.getTime()) / DAY_MS, 365);
  assert.equal(period.start.toISOString(), '2025-09-13T00:00:00.000Z');
});

test('January 1 has one day of data and a valid previous-year comparison', () => {
  const period = getActivityPeriods('2026-01-01')[3];
  const stats = getActivityStats(
    [item('2026-01-01T12:00:00Z')],
    period.start,
    period.end
  );
  assert.deepEqual(stats.daily, [10]);
  assert.equal(period.previousStart.toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(period.previousEnd.toISOString(), '2025-01-02T00:00:00.000Z');
});

test('leap day compares through February 28 in a non-leap year', () => {
  const period = getActivityPeriods('2024-02-29')[3];
  assert.equal(period.previousEnd.toISOString(), '2023-03-01T00:00:00.000Z');
  assert.equal(getActivityStats([], period.start, period.end).daily.length, 60);
  assert.equal(
    getActivityStats([], period.previousStart, period.previousEnd).daily.length,
    59
  );
});

test('UTC day buckets stay consistent across daylight-saving changes', () => {
  const period = getActivityPeriods('2026-03-10')[0];
  const stats = getActivityStats(
    [item('2026-03-08T23:30:00-04:00')],
    period.start,
    period.end
  );
  assert.equal(stats.daily.length, 7);
  assert.deepEqual(stats.daily, [0, 0, 0, 0, 0, 10, 0]);
});

test('date validation rejects malformed and impossible URL dates', () => {
  for (const value of [
    null,
    '',
    'invalid',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-1-1',
  ]) {
    assert.equal(isActivityDate(value), false, String(value));
  }
  assert.equal(isActivityDate('2024-02-29'), true);
  assert.equal(isActivityDate('2026-09-12'), true);
});

test('empty periods and zero-length entries remain truthful', () => {
  const period = getActivityPeriods('2026-09-12')[0];
  assert.equal(getActivityStats([], period.start, period.end).total, 0);
  const stats = getActivityStats(
    [item('2026-09-12T12:00:00Z', 0)],
    period.start,
    period.end
  );
  assert.equal(stats.total, 1);
  assert.equal(stats.dailyEntries[6], 1);
  assert.equal(
    stats.daily.reduce((sum, value) => sum + value, 0),
    0
  );
});

test('valid early URL dates do not inherit the Date.UTC 1900 offset', () => {
  const period = getActivityPeriods('0099-01-01')[3];
  assert.equal(period.start.toISOString(), '0099-01-01T00:00:00.000Z');
  assert.equal(period.previousStart.toISOString(), '0098-01-01T00:00:00.000Z');
  assert.deepEqual(getActivityStats([], period.start, period.end).daily, [0]);
});

test('daily tooltip counts include every entry even when its writing volume is zero', () => {
  const period = getActivityPeriods('2026-09-12')[0];
  const stats = getActivityStats(
    [
      item('2026-09-11T12:00:00Z', 30),
      item('2026-09-12T00:00:00Z', 0),
      item('2026-09-12T23:59:59Z', 20),
      item('2026-09-13T00:00:00Z', 100),
    ],
    period.start,
    period.end
  );
  assert.deepEqual(stats.dailyEntries, [0, 0, 0, 0, 0, 1, 2]);
  assert.deepEqual(stats.daily, [0, 0, 0, 0, 0, 30, 20]);
  assert.equal(
    stats.dailyEntries.reduce((sum, count) => sum + count, 0),
    stats.total
  );
});
