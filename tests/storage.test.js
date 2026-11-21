import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import storage, {
  STORAGE_KEY,
  TRANSFER_ALPHABET,
  TRANSFER_TTL_MS,
  createDefaultProgress,
  validateProgressData,
  normalizeProgressData,
  readLocalProgress,
  resolveProgressConflict,
  loadProgress,
  saveProgress,
  flushPendingSync,
  isSyncPending,
  exportBackupJSON,
  importBackupJSON,
  normalizeTransferCode,
  generateTransferCode,
  restoreFromTransferCode,
  resetStorageState,
  DIAGNOSIS_LOG_LIMIT,
  sanitizeDiagnosisLog,
  appendDiagnosisLogEntry
} from '../src/services/storage-service.js';

/**
 * Helper to create a clean mock localStorage with optional byte quota limit.
 */
function createMockLocalStorage({ maxBytes = Infinity } = {}) {
  const store = new Map();
  return {
    store,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      const str = String(value);
      if (str.length > maxBytes) {
        const err = new Error('QuotaExceededError: Storage limit exceeded');
        err.name = 'QuotaExceededError';
        err.code = 22;
        throw err;
      }
      store.set(key, str);
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

describe('Milestone 2: 3-Tier Storage Service (storage-service.js)', () => {
  beforeEach(() => {
    resetStorageState();
  });

  // =========================================================================
  // 1. Default Schema & Validation
  // =========================================================================
  describe('Default Progress Schema & Validation', () => {
    it('creates complete default progress matching schemaVersion 1.0.0 with all 18 stages', () => {
      const def = createDefaultProgress();
      assert.equal(def.schemaVersion, '1.0.0');
      assert.equal(def.userProfile.grade, 4);
      assert.equal(typeof def.userProfile.userName, 'string');
      assert.equal(def.gamification.labRank, 1);
      assert.equal(def.gamification.totalScore, 0);
      assert.equal(def.gamification.selfCorrectionCount, 0);
      assert.ok(Array.isArray(def.gamification.unlockedBadges));

      // Verify all 18 stages exist and only stage-1 is unlocked initially
      const stageKeys = Object.keys(def.stageProgress);
      assert.equal(stageKeys.length, 18);
      for (let i = 1; i <= 18; i++) {
        const key = `stage-${i}`;
        const stg = def.stageProgress[key];
        assert.ok(stg, `Missing ${key}`);
        assert.equal(stg.stageId, key);
        assert.equal(stg.unlocked, i === 1);
        assert.equal(stg.stars, 0);
        assert.equal(stg.cleared, false);
        assert.equal(stg.firstTryCorrectCount, 0);
        assert.equal(stg.totalAttempts, 0);
        assert.equal(stg.miniLessonSeen, false);
      }

      assert.deepEqual(def.treasureBox, { items: [] });
      assert.equal(def.parentCheer.parentPinHash, '1234');
      assert.deepEqual(def.parentCheer.cheerMessages, []);
      assert.equal(def.settings.soundMuted, false);
    });

    it('validates valid progress objects and rejects invalid schemas or non-objects', () => {
      const valid = createDefaultProgress();
      assert.deepEqual(validateProgressData(valid), { valid: true });

      assert.equal(validateProgressData(null).valid, false);
      assert.equal(validateProgressData([]).valid, false);
      assert.equal(validateProgressData('string').valid, false);
      assert.equal(validateProgressData({ schemaVersion: '2.0.0' }).valid, false);
      assert.equal(validateProgressData({ schemaVersion: '1.0.0', gamification: null }).valid, false);
    });

    it('normalizes partial progress data by filling missing stages and fields', () => {
      const partial = {
        schemaVersion: '1.0.0',
        gamification: { totalScore: 350, labRank: 3 },
        stageProgress: {
          'stage-2': { unlocked: true, stars: 3, cleared: true }
        }
      };
      const normalized = normalizeProgressData(partial);
      assert.equal(normalized.gamification.totalScore, 350);
      assert.equal(normalized.gamification.labRank, 3);
      assert.equal(normalized.stageProgress['stage-1'].unlocked, true);
      assert.equal(normalized.stageProgress['stage-2'].unlocked, true);
      assert.equal(normalized.stageProgress['stage-2'].stars, 3);
      assert.equal(normalized.stageProgress['stage-2'].stageId, 'stage-2');
      assert.equal(normalized.stageProgress['stage-15'].unlocked, false);
    });
  });

  // =========================================================================
  // 2. Tier 1: Instant Synchronous localStorage Read/Write & Quota Recovery
  // =========================================================================
  describe('Tier 1: Instant localStorage Persistence & Quota Recovery', () => {
    it('synchronously writes to localStorage immediately upon calling saveProgress', async () => {
      const mockStorage = createMockLocalStorage();
      const progress = createDefaultProgress();
      progress.gamification.totalScore = 120;
      progress.gamification.selfCorrectionCount = 4;

      // Call saveProgress without awaiting first to verify synchronous Tier 1 write
      const savePromise = saveProgress(progress, { storage: mockStorage, skipServer: true });
      const rawImmediate = mockStorage.getItem(STORAGE_KEY);
      assert.ok(rawImmediate, 'Expected localStorage to be populated synchronously');
      const parsedImmediate = JSON.parse(rawImmediate);
      assert.equal(parsedImmediate.gamification.totalScore, 120);
      assert.equal(parsedImmediate.gamification.selfCorrectionCount, 4);

      const result = await savePromise;
      assert.equal(result, true);

      const loaded = readLocalProgress({ storage: mockStorage });
      assert.equal(loaded.gamification.totalScore, 120);
    });

    it('handles QuotaExceededError gracefully by pruning mastered treasureBox items and retrying', async () => {
      // Set a quota that rejects a bloated payload with 50 mastered items, but accepts pruned payload
      const bloated = createDefaultProgress();
      bloated.gamification.totalScore = 999;
      bloated.treasureBox.items = Array.from({ length: 50 }, (_, idx) => ({
        id: `trap-${idx}`,
        prompt: `${100 + idx} + ${200 + idx} = ?`,
        mastered: idx < 45, // 45 mastered items that can be pruned
        notes: 'x'.repeat(200)
      }));

      const prunedEstimate = JSON.stringify({
        ...bloated,
        treasureBox: { items: bloated.treasureBox.items.slice(45) }
      }).length;

      const mockStorage = createMockLocalStorage({ maxBytes: prunedEstimate + 500 });
      const ok = await saveProgress(bloated, { storage: mockStorage, skipServer: true });
      assert.equal(ok, true);

      const saved = readLocalProgress({ storage: mockStorage });
      assert.ok(saved);
      assert.equal(saved.gamification.totalScore, 999);
      assert.equal(saved.treasureBox.items.length, 5);
      assert.ok(saved.treasureBox.items.every((item) => !item.mastered));
    });

    it('rejects saving invalid progress payload with descriptive error', async () => {
      await assert.rejects(
        () => saveProgress({ schemaVersion: '9.9.9' }, { skipServer: true }),
        /Invalid progress data/
      );
    });
  });

  // =========================================================================
  // 3. Tier 2: Background Server Sync, Debouncing, Offline Queue & Conflict Resolution
  // =========================================================================
  describe('Tier 2: Server Sync, Debounce, Offline Queue & Conflict Resolution', () => {
    it('coalesces rapid saveProgress calls within debounceMs into a single POST request', async () => {
      const mockStorage = createMockLocalStorage();
      const postCalls = [];
      const mockFetch = async (url, init) => {
        postCalls.push({ url, body: JSON.parse(init.body) });
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      };

      const p1 = createDefaultProgress();
      p1.gamification.totalScore = 10;
      const p2 = createDefaultProgress();
      p2.gamification.totalScore = 20;
      const p3 = createDefaultProgress();
      p3.gamification.totalScore = 30;

      const [r1, r2, r3] = await Promise.all([
        saveProgress(p1, { storage: mockStorage, fetchImpl: mockFetch, debounceMs: 40 }),
        saveProgress(p2, { storage: mockStorage, fetchImpl: mockFetch, debounceMs: 40 }),
        saveProgress(p3, { storage: mockStorage, fetchImpl: mockFetch, debounceMs: 40 })
      ]);

      assert.equal(r1, true);
      assert.equal(r2, true);
      assert.equal(r3, true);
      assert.equal(postCalls.length, 1, 'Expected only 1 debounced POST call');
      assert.equal(postCalls[0].body.gamification.totalScore, 30);
    });

    it('queues pending sync when offline or fetch fails, and flushes when back online', async () => {
      const mockStorage = createMockLocalStorage();
      let serverOnline = false;
      const syncedPayloads = [];

      const mockFetch = async (_url, init) => {
        if (!serverOnline) {
          throw new Error('Network error: offline');
        }
        syncedPayloads.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      };

      const p = createDefaultProgress();
      p.gamification.totalScore = 777;

      const syncOk = await saveProgress(p, {
        storage: mockStorage,
        fetchImpl: mockFetch,
        immediate: true
      });
      assert.equal(syncOk, false);
      assert.equal(isSyncPending({ storage: mockStorage }), true);
      assert.equal(readLocalProgress({ storage: mockStorage }).gamification.totalScore, 777);

      // Now bring server online and flush pending sync
      serverOnline = true;
      const flushedOk = await flushPendingSync({
        storage: mockStorage,
        fetchImpl: mockFetch
      });
      assert.equal(flushedOk, true);
      assert.equal(isSyncPending({ storage: mockStorage }), false);
      assert.equal(syncedPayloads.length, 1);
      assert.equal(syncedPayloads[0].gamification.totalScore, 777);
    });

    it('resolves timestamp conflicts between localStorage and server by choosing the newer lastUpdated', async () => {
      const mockStorage = createMockLocalStorage();

      const olderLocal = createDefaultProgress();
      olderLocal.gamification.totalScore = 100;
      olderLocal.lastUpdated = '2026-11-10T10:00:00.000Z';
      mockStorage.setItem(STORAGE_KEY, JSON.stringify(olderLocal));

      const newerServer = createDefaultProgress();
      newerServer.gamification.totalScore = 450;
      newerServer.lastUpdated = '2026-11-11T12:00:00.000Z';

      const mockFetchServerNewer = async () => ({
        ok: true,
        status: 200,
        json: async () => newerServer
      });

      const loaded1 = await loadProgress({
        storage: mockStorage,
        fetchImpl: mockFetchServerNewer
      });
      assert.equal(loaded1.gamification.totalScore, 450);
      assert.equal(readLocalProgress({ storage: mockStorage }).gamification.totalScore, 450);

      // Now test when local is newer than server
      const newerLocal = createDefaultProgress();
      newerLocal.gamification.totalScore = 880;
      newerLocal.lastUpdated = '2026-11-12T15:00:00.000Z';
      mockStorage.setItem(STORAGE_KEY, JSON.stringify(newerLocal));

      const mockFetchServerOlder = async (_url, init) => {
        if (init && init.method === 'POST') {
          return { ok: true, status: 200, json: async () => ({ success: true }) };
        }
        return {
          ok: true,
          status: 200,
          json: async () => newerServer
        };
      };

      const loaded2 = await loadProgress({
        storage: mockStorage,
        fetchImpl: mockFetchServerOlder
      });
      assert.equal(loaded2.gamification.totalScore, 880);
    });
  });

  // =========================================================================
  // 4. Tier 3: JSON Backup Export & Import
  // =========================================================================
  describe('Tier 3: JSON Backup Export & Import', () => {
    it('round-trips user progress via exportBackupJSON and importBackupJSON', () => {
      const mockStorage = createMockLocalStorage();
      const orig = createDefaultProgress();
      orig.userProfile.userName = 'さんすうマスター';
      orig.gamification.totalScore = 640;
      orig.gamification.selfCorrectionCount = 9;
      orig.stageProgress['stage-3'].unlocked = true;
      orig.stageProgress['stage-3'].stars = 3;

      const json = exportBackupJSON(orig);
      const parsedWrapper = JSON.parse(json);
      assert.equal(parsedWrapper.app, 'sansu-tankyu-lab');
      assert.equal(parsedWrapper.version, '1.0.0');
      assert.ok(parsedWrapper.exportTime);

      const restored = importBackupJSON(json, { storage: mockStorage });
      assert.equal(restored.userProfile.userName, 'さんすうマスター');
      assert.equal(restored.gamification.totalScore, 640);
      assert.equal(restored.gamification.selfCorrectionCount, 9);
      assert.equal(restored.stageProgress['stage-3'].unlocked, true);
      assert.equal(restored.stageProgress['stage-3'].stars, 3);

      // Verify localStorage was also updated with restored data
      const persisted = readLocalProgress({ storage: mockStorage });
      assert.equal(persisted.gamification.totalScore, 640);
    });

    it('rejects malformed or wrong-version JSON on import without corrupting existing localStorage', () => {
      const mockStorage = createMockLocalStorage();
      const existing = createDefaultProgress();
      existing.gamification.totalScore = 321;
      mockStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

      assert.throws(() => {
        importBackupJSON('{ invalid json', { storage: mockStorage });
      }, /JSONインポート失敗/);

      assert.throws(() => {
        importBackupJSON(JSON.stringify({ data: { schemaVersion: '99.0' } }), {
          storage: mockStorage
        });
      }, /JSONインポート失敗/);

      assert.throws(() => {
        importBackupJSON('', { storage: mockStorage });
      }, /JSONインポート失敗/);

      // Ensure existing localStorage was untouched
      const afterFailedImport = readLocalProgress({ storage: mockStorage });
      assert.equal(afterFailedImport.gamification.totalScore, 321);
    });
  });

  // =========================================================================
  // 5. Tier 3: 8-Character Transfer Code (LAB-XXXX-XXXX)
  // =========================================================================
  describe('Tier 3: 8-Character Transfer Code Generation & Restoration', () => {
    it('generates codes strictly matching LAB-XXXX-XXXX with unambiguous alphabet across 100 iterations', () => {
      const def = createDefaultProgress();
      for (let i = 0; i < 100; i++) {
        const code = generateTransferCode(def);
        assert.match(code, /^LAB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
        // Must never contain ambiguous 0, O, 1, I outside 'LAB'
        const bodyChars = code.slice(4).replace('-', '');
        for (const ch of bodyChars) {
          assert.ok(TRANSFER_ALPHABET.includes(ch), `Unexpected char ${ch}`);
          assert.ok(!['0', 'O', '1', 'I'].includes(ch));
        }
      }
    });

    it('normalizes transfer codes regardless of case, hyphens, or spaces', () => {
      assert.equal(normalizeTransferCode('lab-7k9a-4e2w'), 'LAB7K9A4E2W');
      assert.equal(normalizeTransferCode('  LAB 7K9A 4E2W '), 'LAB7K9A4E2W');
      assert.equal(normalizeTransferCode(null), '');
    });

    it('restores progress from transfer code with case/hyphen variations and 8-char shorthand', () => {
      const mockStorage = createMockLocalStorage();
      const orig = createDefaultProgress();
      orig.gamification.totalScore = 1250;
      orig.gamification.labRank = 5;
      orig.parentCheer.cheerMessages.push({ id: 'c1', text: 'よくがんばったね！' });

      const code = generateTransferCode(orig, { storage: mockStorage });
      const lowerNoHyphen = code.toLowerCase().replace(/-/g, '');
      const restored1 = restoreFromTransferCode(lowerNoHyphen, { storage: mockStorage });
      assert.equal(restored1.gamification.totalScore, 1250);
      assert.equal(restored1.gamification.labRank, 5);
      assert.equal(restored1.parentCheer.cheerMessages.length, 1);

      // Also test 8-character body without 'LAB-' prefix
      const eightCharOnly = code.slice(4);
      const restored2 = restoreFromTransferCode(eightCharOnly, { storage: mockStorage });
      assert.equal(restored2.gamification.totalScore, 1250);
    });

    it('enforces 48-hour expiration window on transfer codes', () => {
      const baseTime = 1_700_000_000_000;
      const orig = createDefaultProgress();
      orig.gamification.totalScore = 555;

      const code = generateTransferCode(orig, { now: baseTime });

      // Valid at 47 hours 59 minutes
      const withinWindow = restoreFromTransferCode(code, {
        now: baseTime + TRANSFER_TTL_MS - 60_000
      });
      assert.equal(withinWindow.gamification.totalScore, 555);

      // Expired at 48 hours + 1 ms
      assert.throws(() => {
        restoreFromTransferCode(code, {
          now: baseTime + TRANSFER_TTL_MS + 1
        });
      }, /有効期限/);
    });

    it('rejects unknown or malformed transfer codes', () => {
      assert.throws(() => {
        restoreFromTransferCode('INVALID-CODE-0000');
      }, /無効な引き継ぎコード/);

      assert.throws(() => {
        restoreFromTransferCode('LAB-2345-6789');
      }, /引き継ぎコードが見つかりません/);

      assert.throws(() => {
        restoreFromTransferCode('');
      }, /引き継ぎコードを入力してください/);
    });
  });

  // =========================================================================
  // 6. Default Export Contract
  // =========================================================================
  describe('Default Export Contract', () => {
    it('exposes all required methods on default export StorageService', () => {
      assert.equal(typeof storage.createDefaultProgress, 'function');
      assert.equal(typeof storage.loadProgress, 'function');
      assert.equal(typeof storage.saveProgress, 'function');
      assert.equal(typeof storage.exportBackupJSON, 'function');
      assert.equal(typeof storage.importBackupJSON, 'function');
      assert.equal(typeof storage.generateTransferCode, 'function');
      assert.equal(typeof storage.restoreFromTransferCode, 'function');
      assert.equal(typeof storage.normalizeTransferCode, 'function');
    });
  });
});

describe('Issue #21: diagnosis log persistence', () => {
  const entry = (category, at) => ({ category, worldId: 2, stageId: 'stage-4', at });

  it('default progress starts with an empty diagnosis log', () => {
    assert.deepEqual(createDefaultProgress().diagnosisLog, []);
  });

  it('normalizeProgressData backfills diagnosisLog for legacy saves without one', () => {
    const legacy = createDefaultProgress();
    delete legacy.diagnosisLog;
    const normalized = normalizeProgressData(legacy);
    assert.deepEqual(normalized.diagnosisLog, []);
  });

  it('normalizeProgressData drops malformed entries and keeps well-formed ones', () => {
    const data = createDefaultProgress();
    data.diagnosisLog = [
      entry('carry_forgotten', '2026-11-20T00:00:00.000Z'),
      { category: '', at: '2026-11-20T00:00:00.000Z' },
      { category: 'shift_forgotten', at: 'garbage' },
      { at: '2026-11-20T00:00:00.000Z' },
      null,
      'junk'
    ];
    const normalized = normalizeProgressData(data);
    assert.equal(normalized.diagnosisLog.length, 1);
    assert.deepEqual(normalized.diagnosisLog[0], {
      category: 'carry_forgotten', worldId: 2, stageId: 'stage-4', at: '2026-11-20T00:00:00.000Z'
    });
  });

  it('sanitizeDiagnosisLog caps the log at DIAGNOSIS_LOG_LIMIT keeping the latest entries', () => {
    const many = [];
    for (let i = 0; i < DIAGNOSIS_LOG_LIMIT + 25; i++) {
      many.push(entry(`cat_${i}`, '2026-11-20T00:00:00.000Z'));
    }
    const cleaned = sanitizeDiagnosisLog(many);
    assert.equal(cleaned.length, DIAGNOSIS_LOG_LIMIT);
    assert.equal(cleaned[0].category, 'cat_25');
    assert.equal(cleaned[cleaned.length - 1].category, `cat_${DIAGNOSIS_LOG_LIMIT + 24}`);
    assert.deepEqual(sanitizeDiagnosisLog('nope'), []);
    assert.deepEqual(sanitizeDiagnosisLog(undefined), []);
  });

  it('appendDiagnosisLogEntry creates the log on legacy progress and appends entries', () => {
    const progress = createDefaultProgress();
    delete progress.diagnosisLog;
    appendDiagnosisLogEntry(progress, entry('quotient_too_small', '2026-11-21T00:00:00.000Z'));
    assert.equal(progress.diagnosisLog.length, 1);
    assert.equal(progress.diagnosisLog[0].category, 'quotient_too_small');
    // Invalid entries are ignored
    appendDiagnosisLogEntry(progress, { category: '', at: '2026-11-21T00:00:00.000Z' });
    appendDiagnosisLogEntry(progress, null);
    assert.equal(progress.diagnosisLog.length, 1);
    assert.equal(appendDiagnosisLogEntry(null, entry('x', '2026-11-21T00:00:00.000Z')), null);
  });

  it('appendDiagnosisLogEntry caps the log at DIAGNOSIS_LOG_LIMIT', () => {
    const progress = createDefaultProgress();
    for (let i = 0; i < DIAGNOSIS_LOG_LIMIT + 5; i++) {
      appendDiagnosisLogEntry(progress, entry(`cat_${i}`, '2026-11-20T00:00:00.000Z'));
    }
    assert.equal(progress.diagnosisLog.length, DIAGNOSIS_LOG_LIMIT);
    assert.equal(progress.diagnosisLog[0].category, 'cat_5');
  });
});
