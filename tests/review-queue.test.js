import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REVIEW_INTERVAL_DAYS,
  createReviewQueue,
  ensureReviewQueue,
  buildReviewKey,
  enqueueFromTreasureItem,
  isDue,
  getDueEntries,
  countDueReviews,
  recordReviewResult
} from '../src/services/review-queue.js';
import { addItem as addTreasureItem } from '../src/components/treasure-box.js';
import {
  createDefaultProgress,
  normalizeProgressData
} from '../src/services/storage-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-11-21T09:00:00.000Z');

function makeProblem(overrides = {}) {
  return {
    id: 'w2_s1_q1_test',
    worldId: 2,
    stageId: 1,
    globalStageId: 'stage-4',
    prompt: '40 × 50 = ?',
    expression: '40 × 50',
    operands: [40, 50],
    operator: '×',
    patternType: 'tens_times_tens_extra_zero',
    hasRemainder: false,
    correctAnswer: { value: 2000, quotient: 2000, remainder: 0 },
    trapMetadata: {},
    ...overrides
  };
}

function makeProgressWithItem(problemOverrides = {}) {
  const progress = createDefaultProgress();
  const item = addTreasureItem(progress.treasureBox, makeProblem(problemOverrides));
  return { progress, item };
}

describe('Issue #20: Review Queue (spaced repetition)', () => {
  describe('enqueue', () => {
    it('creates an entry due 1 day later when a problem is missed', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);

      assert.ok(entry);
      assert.equal(progress.reviewQueue.entries.length, 1);
      assert.equal(entry.stepIndex, 0);
      assert.equal(entry.status, 'active');
      assert.equal(Date.parse(entry.dueAt), T0 + 1 * DAY_MS);
      assert.equal(entry.stageId, 'stage-4');
      assert.equal(entry.patternType, 'tens_times_tens_extra_zero');
      assert.equal(entry.treasureItemId, item.id);
      // The stored problem copy matches the treasure item format (variation source)
      assert.equal(entry.originalProblem.prompt, '40 × 50 = ?');
      assert.notEqual(entry.originalProblem, item.originalProblem, 'must be a copy, not a reference');
    });

    it('does not duplicate or reschedule when the same problem is missed again', () => {
      const { progress, item } = makeProgressWithItem();
      const first = enqueueFromTreasureItem(progress, item, T0);
      const again = enqueueFromTreasureItem(progress, item, T0 + 12 * 60 * 60 * 1000);

      assert.equal(progress.reviewQueue.entries.length, 1);
      assert.equal(again, first);
      assert.equal(Date.parse(again.dueAt), T0 + 1 * DAY_MS, 'due date must not move');
    });

    it('builds the same key from a problem and from its treasure item', () => {
      const problem = makeProblem();
      const box = { items: [] };
      const item = addTreasureItem(box, problem);
      assert.equal(buildReviewKey(item), buildReviewKey(problem));
      assert.ok(buildReviewKey(problem).startsWith('stage-4|tens_times_tens_extra_zero|'));
    });

    it('reactivates a mastered entry from step 0 when the problem is missed again', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);
      entry.status = 'mastered';
      entry.stepIndex = 2;
      entry.dueAt = null;
      entry.masteredAt = new Date(T0).toISOString();

      const t1 = T0 + 30 * DAY_MS;
      const reactivated = enqueueFromTreasureItem(progress, item, t1);
      assert.equal(reactivated.status, 'active');
      assert.equal(reactivated.stepIndex, 0);
      assert.equal(Date.parse(reactivated.dueAt), t1 + 1 * DAY_MS);
      assert.equal(reactivated.masteredAt, null);
      assert.equal(progress.reviewQueue.entries.length, 1);
    });
  });

  describe('due filtering', () => {
    it('returns only entries whose due date has arrived, sorted by dueAt', () => {
      const progress = createDefaultProgress();
      const box = progress.treasureBox;
      const itemA = addTreasureItem(box, makeProblem());
      const itemB = addTreasureItem(box, makeProblem({
        prompt: '70 × 70 = ?', operands: [70, 70], patternType: 'tens_times_tens_extra_zero'
      }));
      enqueueFromTreasureItem(progress, itemA, T0);
      enqueueFromTreasureItem(progress, itemB, T0 - 2 * DAY_MS);

      assert.equal(countDueReviews(progress, T0), 1, 'only the older entry is due at T0');
      const due = getDueEntries(progress, T0 + 1 * DAY_MS);
      assert.equal(due.length, 2);
      assert.ok(Date.parse(due[0].dueAt) <= Date.parse(due[1].dueAt), 'sorted by dueAt ascending');
      assert.equal(isDue(due[0], T0 + 1 * DAY_MS), true);
    });

    it('excludes mastered entries from due results', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);
      entry.status = 'mastered';
      entry.dueAt = null;
      assert.equal(countDueReviews(progress, T0 + 365 * DAY_MS), 0);
    });
  });

  describe('schedule progression (1d → 3d → 7d → mastered)', () => {
    it('advances steps only on due correct answers and masters at the final step', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);
      const key = entry.key;

      // Step 0 due at T0+1d: correct → step 1, due +3d from the answer time
      const t1 = T0 + 1 * DAY_MS;
      let res = recordReviewResult(progress, key, true, t1);
      assert.equal(res.outcome, 'advanced');
      assert.equal(res.entry.stepIndex, 1);
      assert.equal(Date.parse(res.entry.dueAt), t1 + 3 * DAY_MS);

      // Step 1 due at t1+3d: correct → step 2, due +7d
      const t2 = t1 + 3 * DAY_MS;
      res = recordReviewResult(progress, key, true, t2);
      assert.equal(res.outcome, 'advanced');
      assert.equal(res.entry.stepIndex, 2);
      assert.equal(Date.parse(res.entry.dueAt), t2 + 7 * DAY_MS);

      // Step 2 due at t2+7d: correct → mastered
      const t3 = t2 + 7 * DAY_MS;
      res = recordReviewResult(progress, key, true, t3);
      assert.equal(res.outcome, 'mastered');
      assert.equal(res.entry.status, 'mastered');
      assert.equal(res.entry.dueAt, null);
      assert.equal(res.entry.masteredAt, new Date(t3).toISOString());
      assert.equal(countDueReviews(progress, t3 + 365 * DAY_MS), 0);
    });

    it('does not advance the step when answered before the due date', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);

      const res = recordReviewResult(progress, entry.key, true, T0 + 12 * 60 * 60 * 1000);
      assert.equal(res.outcome, 'early');
      assert.equal(res.entry.stepIndex, 0);
      assert.equal(Date.parse(res.entry.dueAt), T0 + 1 * DAY_MS, 'due date unchanged');
      assert.equal(res.entry.status, 'active');
    });

    it('steps back one step on a due wrong answer and reschedules with that step interval', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);
      const key = entry.key;

      // Advance to step 2 first
      recordReviewResult(progress, key, true, T0 + 1 * DAY_MS);
      const t2 = T0 + 1 * DAY_MS + 3 * DAY_MS;
      recordReviewResult(progress, key, true, t2);
      assert.equal(entry.stepIndex, 2);

      // Wrong at step 2 due date → back to step 1, due +3d from now
      const t3 = t2 + 7 * DAY_MS;
      const res = recordReviewResult(progress, key, false, t3);
      assert.equal(res.outcome, 'steppedBack');
      assert.equal(res.entry.stepIndex, 1);
      assert.equal(Date.parse(res.entry.dueAt), t3 + REVIEW_INTERVAL_DAYS[1] * DAY_MS);
      assert.equal(res.entry.status, 'active');
    });

    it('never steps below the first step on wrong answers', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);

      const res = recordReviewResult(progress, entry.key, false, T0 + 1 * DAY_MS);
      assert.equal(res.outcome, 'steppedBack');
      assert.equal(res.entry.stepIndex, 0);
      assert.equal(Date.parse(res.entry.dueAt), T0 + 1 * DAY_MS + 1 * DAY_MS);
    });

    it('returns notFound for unknown keys and mastered entries', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);
      assert.equal(recordReviewResult(progress, 'no-such-key', true, T0).outcome, 'notFound');
      entry.status = 'mastered';
      assert.equal(recordReviewResult(progress, entry.key, true, T0 + DAY_MS).outcome, 'notFound');
    });
  });

  describe('storage integration', () => {
    it('default progress includes an empty review queue', () => {
      const progress = createDefaultProgress();
      assert.deepEqual(progress.reviewQueue, { entries: [] });
    });

    it('normalize fills the default for legacy saves without reviewQueue', () => {
      const legacy = createDefaultProgress();
      delete legacy.reviewQueue;
      legacy.treasureBox.items.push({ id: 'tb-legacy' });

      const normalized = normalizeProgressData(legacy);
      assert.deepEqual(normalized.reviewQueue, { entries: [] });
      assert.equal(normalized.treasureBox.items.length, 1, 'legacy data is preserved');
    });

    it('normalize preserves valid entries and drops malformed ones', () => {
      const data = createDefaultProgress();
      data.reviewQueue = {
        entries: [
          { key: 'stage-4|p|40 × 50 = ?', stepIndex: 1, status: 'active', dueAt: '2026-11-25T09:00:00.000Z' },
          { noKey: true },
          null,
          'garbage'
        ]
      };
      const normalized = normalizeProgressData(data);
      assert.equal(normalized.reviewQueue.entries.length, 1);
      assert.equal(normalized.reviewQueue.entries[0].key, 'stage-4|p|40 × 50 = ?');
    });

    it('ensureReviewQueue repairs a missing or malformed queue in place', () => {
      const progress = {};
      const queue = ensureReviewQueue(progress);
      assert.deepEqual(queue, { entries: [] });
      assert.deepEqual(progress.reviewQueue, { entries: [] });

      progress.reviewQueue = { entries: 'not-an-array' };
      assert.deepEqual(ensureReviewQueue(progress), { entries: [] });
      assert.deepEqual(createReviewQueue(), { entries: [] });
    });
  });

  describe('standalone bundle parity', () => {
    it('bundle carries the review queue module and banner wiring', () => {
      const html = fs.readFileSync(path.join(ROOT_DIR, 'sansu_tanken_lab.html'), 'utf8');
      assert.ok(html.includes("services/review-queue.js"), 'bundle must register the review-queue module');
      assert.ok(html.includes('REVIEW_INTERVAL_DAYS'), 'bundle must include the interval table');
      assert.ok(html.includes('今日の復習'), 'bundle must include the review banner');
      assert.ok(html.includes('launchScheduledReviewModal'), 'bundle must include the scheduled review modal');
      assert.ok(html.includes('定着'), 'bundle must include the mastered (定着) messaging');
    });

    it('bundle review-queue module body matches src modulo import/export transforms', () => {
      const srcText = fs.readFileSync(path.join(ROOT_DIR, 'src/services/review-queue.js'), 'utf8');
      const html = fs.readFileSync(path.join(ROOT_DIR, 'sansu_tanken_lab.html'), 'utf8');

      // src 側: export 構文だけを取り除く（バンドル化の変換に相当）
      const normalizeSrc = (text) => text
        .replace(/^export default .*;$/gm, '')
        .replace(/^export \{[^}]*\};?$/gm, '')
        .replace(/^export (?=(async )?(function|const|let|var|class) )/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // バンドル側: __mods ブロックを取り出し、末尾に付く return 文だけ除く
      const marker = "__mods['services/review-queue.js'] = (function() {";
      const start = html.indexOf(marker);
      assert.ok(start !== -1, 'bundle must register the review-queue module');
      const bodyStart = start + marker.length;
      const end = html.indexOf('\n  })();', bodyStart);
      assert.ok(end !== -1, 'bundle review-queue module block must be closed');
      const bundleBody = html.slice(bodyStart, end)
        .replace(/\n\s*return \{[^}]*\};?\s*$/, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      assert.equal(bundleBody, normalizeSrc(srcText),
        'bundle copy of review-queue.js must stay in sync with src');
    });
  });

  describe('Pi review hardening (regressions)', () => {
    it('clamps out-of-range stepIndex when normalizing saved data', () => {
      const data = createDefaultProgress();
      data.reviewQueue = {
        entries: [
          { key: 'stage-4|p|a', stepIndex: 9, status: 'active', dueAt: '2026-11-20T09:00:00.000Z' },
          { key: 'stage-5|p|b', stepIndex: -3, status: 'active', dueAt: '2026-11-20T09:00:00.000Z' },
          { key: 'stage-6|p|c', stepIndex: 'oops', status: 'active', dueAt: '2026-11-20T09:00:00.000Z' }
        ]
      };
      const normalized = normalizeProgressData(data);
      assert.equal(normalized.reviewQueue.entries[0].stepIndex, REVIEW_INTERVAL_DAYS.length - 1);
      assert.equal(normalized.reviewQueue.entries[1].stepIndex, 0);
      assert.equal(normalized.reviewQueue.entries[2].stepIndex, 0);
    });

    it('recordReviewResult survives a raw out-of-range stepIndex (9) without RangeError', () => {
      const progress = createDefaultProgress();
      progress.reviewQueue.entries.push({
        key: 'k9',
        treasureItemId: null,
        stageId: 'stage-4',
        worldId: 'world-2',
        patternType: 'p',
        originalProblem: makeProblem(),
        stepIndex: 9,
        status: 'active',
        dueAt: new Date(T0 - DAY_MS).toISOString(),
        createdAt: new Date(T0).toISOString(),
        updatedAt: new Date(T0).toISOString(),
        lastAttemptAt: null,
        masteredAt: null,
        attempts: 0,
        correctCount: 0
      });

      let res;
      assert.doesNotThrow(() => { res = recordReviewResult(progress, 'k9', true, T0); });
      // クランプされて最終ステップ扱いになるため、正解で mastered になる
      assert.equal(res.outcome, 'mastered');
      assert.equal(res.entry.stepIndex, REVIEW_INTERVAL_DAYS.length - 1);
      assert.equal(res.entry.status, 'mastered');
    });

    it('ensureReviewQueue clamps stepIndex in place', () => {
      const progress = { reviewQueue: { entries: [{ key: 'k', stepIndex: 42, status: 'active' }] } };
      ensureReviewQueue(progress);
      assert.equal(progress.reviewQueue.entries[0].stepIndex, REVIEW_INTERVAL_DAYS.length - 1);
    });

    it('treats an unparseable dueAt as not due', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);
      entry.dueAt = 'not-a-date';

      assert.equal(isDue(entry, T0 + 365 * DAY_MS), false);
      assert.equal(countDueReviews(progress, T0 + 365 * DAY_MS), 0);
      assert.deepEqual(getDueEntries(progress, T0 + 365 * DAY_MS), []);
    });

    it('throws TypeError when "now" cannot be interpreted', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);

      assert.throws(() => recordReviewResult(progress, entry.key, true, 'garbage'), TypeError);
      assert.throws(() => getDueEntries(progress, 'garbage'), TypeError);
      assert.throws(() => countDueReviews(progress, {}), TypeError);
      assert.throws(() => enqueueFromTreasureItem(progress, item, undefined), TypeError);
      assert.throws(() => isDue(entry, null), TypeError);
    });

    it('resets attempts/correctCount when a mastered entry is reactivated', () => {
      const { progress, item } = makeProgressWithItem();
      const entry = enqueueFromTreasureItem(progress, item, T0);
      entry.status = 'mastered';
      entry.stepIndex = 2;
      entry.dueAt = null;
      entry.masteredAt = new Date(T0).toISOString();
      entry.attempts = 7;
      entry.correctCount = 3;

      const reactivated = enqueueFromTreasureItem(progress, item, T0 + 30 * DAY_MS);
      assert.equal(reactivated.status, 'active');
      assert.equal(reactivated.attempts, 0);
      assert.equal(reactivated.correctCount, 0);
    });

    it('strips a "stage-" prefix from stageId when building the fallback stage key', () => {
      const key = buildReviewKey({ worldId: 2, stageId: 'stage-3', patternType: 'p', prompt: 'x' });
      assert.ok(key.startsWith('stage-6|p|x'), `unexpected key: ${key}`);
    });
  });
});
