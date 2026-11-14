/**
 * @file m6-network-concurrency-persistence.test.js
 * @description Adversarial Challenger Test Harness for Milestone 6:
 *   1. Storage service offline fallback, localStorage failures, and sync pending flags
 *   2. Server down simulation, network reconnection, and timestamp conflict resolution
 *   3. Corrupted JSON recovery, backup import resilience, and transfer code stress
 *   4. High-frequency concurrent API calls to /api/progress with atomic write integrity
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import storage, {
  STORAGE_KEY,
  TRANSFER_STORE_KEY,
  SYNC_PENDING_KEY,
  SCHEMA_VERSION,
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
  getStorageBackend
} from '../src/services/storage-service.js';

import serverContract, {
  createAppServer,
  startServer,
  stopServer,
  atomicWriteProgress
} from '../server.js';

describe('Milestone 6: Network, Concurrency & Persistence Stress Harness', () => {
  beforeEach(() => {
    resetStorageState();
  });

  // =========================================================================
  // 1. Storage Service Offline Fallback & LocalStorage Fault Injection
  // =========================================================================
  describe('1. Storage Service Offline Fallback & LocalStorage Fault Injection', () => {
    it('handles total localStorage unavailability or SecurityError via in-memory fallback', () => {
      // Mock storage that throws SecurityError on any access (e.g. sandboxed iframe or disabled cookies)
      const securityThrowingStorage = {
        getItem() {
          const err = new Error('SecurityError: Access to localStorage is denied');
          err.name = 'SecurityError';
          throw err;
        },
        setItem() {
          const err = new Error('SecurityError: Access to localStorage is denied');
          err.name = 'SecurityError';
          throw err;
        },
        removeItem() {
          const err = new Error('SecurityError: Access to localStorage is denied');
          err.name = 'SecurityError';
          throw err;
        }
      };

      // Storage backend resolution handles fallback
      const backend = getStorageBackend({ storage: securityThrowingStorage });
      assert.ok(backend, 'Must return a storage backend');

      // saveProgress and readLocalProgress should execute using fallback storage
      const progress = createDefaultProgress();
      progress.userProfile.userName = 'オフライン探検隊';

      assert.doesNotThrow(() => {
        saveProgress(progress, { storage: securityThrowingStorage, skipServer: true });
      });

      // Verification: progress is readable from fallback storage
      const loaded = readLocalProgress({ storage: securityThrowingStorage });
      assert.ok(loaded, 'Should read progress from in-memory fallback');
      assert.equal(loaded.userProfile.userName, 'オフライン探検隊');
    });

    it('recovers from QuotaExceededError by pruning mastered items and falling back to memoryStore', () => {
      let quotaActive = true;
      const limitedStore = new Map();
      const quotaStorage = {
        getItem(k) {
          return limitedStore.get(k) || null;
        },
        setItem(k, v) {
          if (quotaActive && String(v).length > 2500) {
            const err = new Error('QuotaExceededError');
            err.name = 'QuotaExceededError';
            err.code = 22;
            throw err;
          }
          limitedStore.set(k, String(v));
        },
        removeItem(k) {
          limitedStore.delete(k);
        }
      };

      const bigProgress = createDefaultProgress();
      // Add 15 mastered items and 5 unmastered items
      for (let i = 1; i <= 15; i++) {
        bigProgress.treasureBox.items.push({
          id: `mastered-${i}`,
          problemText: `12 × ${i} の筆算`,
          mastered: true,
          streak: 2
        });
      }
      for (let i = 1; i <= 5; i++) {
        bigProgress.treasureBox.items.push({
          id: `active-${i}`,
          problemText: `24 × ${i} の筆算`,
          mastered: false,
          streak: 1
        });
      }
      // Add cheer messages
      for (let i = 1; i <= 20; i++) {
        bigProgress.parentCheer.cheerMessages.push({
          id: `msg-${i}`,
          text: `がんばったね！応援メッセージその${i}`,
          timestamp: new Date().toISOString()
        });
      }

      // saveProgress triggers quota recovery
      assert.doesNotThrow(() => {
        saveProgress(bigProgress, { storage: quotaStorage, skipServer: true });
      });

      // After pruning, mastered items should have been discarded
      const saved = readLocalProgress({ storage: quotaStorage });
      assert.ok(saved);
      const remainingItems = saved.treasureBox.items;
      assert.equal(remainingItems.every((item) => !item.mastered), true, 'Mastered items must be pruned');
      assert.ok(remainingItems.length <= 20, 'Items capped');
      assert.ok(saved.parentCheer.cheerMessages.length <= 10, 'Cheer messages capped');
    });

    it('safely tolerates and recovers from corrupted, non-JSON, and malformed LocalStorage contents', () => {
      const mockStorage = {
        store: new Map(),
        getItem(k) {
          return this.store.get(k) || null;
        },
        setItem(k, v) {
          this.store.set(k, String(v));
        },
        removeItem(k) {
          this.store.delete(k);
        }
      };

      const corruptedSamples = [
        '',
        '   ',
        '{ invalid json syntax }',
        '{"schemaVersion": "1.0.0", "unclosed": ',
        'null',
        '12345',
        '"just a string"',
        '["array", "of", "items"]',
        '{"schemaVersion": "999.0.0"}',
        '{"schemaVersion": "1.0.0", "stageProgress": "corrupted-type"}'
      ];

      for (const sample of corruptedSamples) {
        mockStorage.setItem(STORAGE_KEY, sample);

        // readLocalProgress should return null safely without throwing
        assert.equal(
          readLocalProgress({ storage: mockStorage }),
          null,
          `Failed to safely handle corrupt sample: ${sample}`
        );

        // loadProgress should repair corrupted state with clean default progress
        assert.doesNotReject(async () => {
          const recovered = await loadProgress({ storage: mockStorage, skipServer: true });
          assert.equal(recovered.schemaVersion, '1.0.0');
          assert.equal(recovered.stageProgress['stage-1'].unlocked, true);
        });
      }
    });
  });

  // =========================================================================
  // 2. Server Down Simulation, Network Failure & Reconnection Sync
  // =========================================================================
  describe('2. Server Down Simulation, Network Failure & Reconnection Sync', () => {
    it('handles server down (ECONNREFUSED) gracefully: saves locally and flags syncPending', async () => {
      const mockStorage = {
        store: new Map(),
        getItem(k) { return this.store.get(k) || null; },
        setItem(k, v) { this.store.set(k, String(v)); },
        removeItem(k) { this.store.delete(k); }
      };

      const progress = createDefaultProgress();
      progress.gamification.totalScore = 500;

      // Point to closed dead port on localhost
      const deadPort = 59123;
      const deadUrl = `http://127.0.0.1:${deadPort}/api/progress`;

      // Call saveProgress with dead server
      const result = await saveProgress(progress, {
        storage: mockStorage,
        apiUrl: deadUrl,
        immediate: true
      });

      // Sync returns false (server uncontactable)
      assert.equal(result, false, 'Sync result must be false when server is down');

      // Local storage must have the updated score intact
      const local = readLocalProgress({ storage: mockStorage });
      assert.ok(local);
      assert.equal(local.gamification.totalScore, 500);

      // Sync pending must be marked
      assert.equal(isSyncPending({ storage: mockStorage }), true, 'syncPending must be true');
      assert.equal(mockStorage.getItem(SYNC_PENDING_KEY), 'true');
    });

    it('recovers after transient server 500 errors and syncs pending data once server is back', async () => {
      let failCount = 3;
      let postReceived = null;

      // Mock fetch implementation that fails failCount times with 500
      const mockFetch = async (url, opts) => {
        if (opts && opts.method === 'POST') {
          if (failCount > 0) {
            failCount--;
            return { ok: false, status: 500, json: async () => ({ error: 'Internal Server Error' }) };
          }
          postReceived = JSON.parse(opts.body);
          return { ok: true, status: 200, json: async () => ({ success: true }) };
        }
        return { ok: true, status: 200, json: async () => ({ schemaVersion: '1.0.0' }) };
      };

      const mockStorage = {
        store: new Map(),
        getItem(k) { return this.store.get(k) || null; },
        setItem(k, v) { this.store.set(k, String(v)); },
        removeItem(k) { this.store.delete(k); }
      };

      const progress = createDefaultProgress();
      progress.gamification.totalScore = 777;

      // First call: fails with 500
      const sync1 = await saveProgress(progress, {
        storage: mockStorage,
        fetchImpl: mockFetch,
        immediate: true
      });
      assert.equal(sync1, false);
      assert.equal(isSyncPending({ storage: mockStorage }), true);

      // Second call: fails with 500
      progress.gamification.totalScore = 888;
      const sync2 = await saveProgress(progress, {
        storage: mockStorage,
        fetchImpl: mockFetch,
        immediate: true
      });
      assert.equal(sync2, false);
      assert.equal(isSyncPending({ storage: mockStorage }), true);

      // Third call: fails with 500
      progress.gamification.totalScore = 999;
      const sync3 = await saveProgress(progress, {
        storage: mockStorage,
        fetchImpl: mockFetch,
        immediate: true
      });
      assert.equal(sync3, false);
      assert.equal(isSyncPending({ storage: mockStorage }), true);

      // Server recovers! Next sync succeeds!
      assert.equal(failCount, 0, 'Failures exhausted');
      const recovered = await flushPendingSync({
        storage: mockStorage,
        fetchImpl: mockFetch
      });
      assert.equal(recovered, true, 'Reconnected sync must succeed');
      assert.equal(isSyncPending({ storage: mockStorage }), false, 'syncPending must clear');
      assert.equal(mockStorage.getItem(SYNC_PENDING_KEY), null);
      assert.equal(postReceived.gamification.totalScore, 999, 'Server must receive latest state');
    });

    it('resolves timestamp conflicts correctly across offline client and server', () => {
      const olderData = createDefaultProgress();
      olderData.lastUpdated = '2026-11-12T08:00:00.000Z';
      olderData.gamification.totalScore = 100;

      const newerData = createDefaultProgress();
      newerData.lastUpdated = '2026-11-12T10:00:00.000Z';
      newerData.gamification.totalScore = 300;

      // Case 1: Client has newer data -> local wins
      const res1 = resolveProgressConflict(newerData, olderData);
      assert.equal(res1.source, 'local');
      assert.equal(res1.winner.gamification.totalScore, 300);

      // Case 2: Server has newer data (e.g. updated from another tablet) -> server wins
      const res2 = resolveProgressConflict(olderData, newerData);
      assert.equal(res2.source, 'server');
      assert.equal(res2.winner.gamification.totalScore, 300);

      // Case 3: Invalid / malformed timestamp handles safely
      const malformedTimestampData = createDefaultProgress();
      malformedTimestampData.lastUpdated = 'invalid-date-format';
      malformedTimestampData.gamification.totalScore = 50;

      const res3 = resolveProgressConflict(malformedTimestampData, newerData);
      assert.equal(res3.source, 'server');
      assert.equal(res3.winner.gamification.totalScore, 300);
    });
  });

  // =========================================================================
  // 3. Corrupted JSON Recovery, Transfer Code Generation & Import Stress
  // =========================================================================
  describe('3. Corrupted JSON Recovery, Transfer Code Generation & Import Stress', () => {
    it('survives hostile backup JSON import attempts without corrupting existing state', () => {
      const mockStorage = {
        store: new Map(),
        getItem(k) { return this.store.get(k) || null; },
        setItem(k, v) { this.store.set(k, String(v)); },
        removeItem(k) { this.store.delete(k); }
      };

      // Set up a pristine baseline progress
      const pristine = createDefaultProgress();
      pristine.userProfile.userName = '守られたユーザー';
      pristine.gamification.totalScore = 9999;
      saveProgress(pristine, { storage: mockStorage, skipServer: true });

      const hostileImports = [
        '',
        'null',
        '{ bad json }',
        '{"schemaVersion": "99.0.0"}',
        '{"schemaVersion": "1.0.0", "userProfile": "corrupted"}',
        '{"schemaVersion": "1.0.0", "gamification": 12345}',
        '{"data": {"schemaVersion": "invalid"}}'
      ];

      for (const hostile of hostileImports) {
        assert.throws(
          () => importBackupJSON(hostile, { storage: mockStorage }),
          /JSONインポート失敗/
        );

        // Verify pristine state was never corrupted or deleted!
        const check = readLocalProgress({ storage: mockStorage });
        assert.equal(check.userProfile.userName, '守られたユーザー');
        assert.equal(check.gamification.totalScore, 9999);
      }
    });

    it('generates 300 transfer codes, enforcing strict format and unambiguous character set', () => {
      const codes = new Set();
      const mockStorage = {
        store: new Map(),
        getItem(k) { return this.store.get(k) || null; },
        setItem(k, v) { this.store.set(k, String(v)); },
        removeItem(k) { this.store.delete(k); }
      };

      const progress = createDefaultProgress();
      progress.userProfile.userName = 'コード発行テスト';

      for (let i = 0; i < 300; i++) {
        const code = generateTransferCode(progress, { storage: mockStorage });

        // Format check: LAB-XXXX-XXXX
        assert.match(
          code,
          /^LAB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/,
          `Transfer code ${code} does not match required format`
        );

        // Unambiguous characters check: must never contain 0, O, 1, I
        assert.equal(/[0O1I]/.test(code), false, `Code contains ambiguous characters: ${code}`);

        codes.add(code);
      }

      // High entropy check: across 300 iterations, collision should be virtually impossible
      assert.equal(codes.size, 300, 'Collisions detected in random transfer code generator');
    });

    it('validates flexible transfer code normalization and rejects illegal or expired codes', () => {
      const mockStorage = {
        store: new Map(),
        getItem(k) { return this.store.get(k) || null; },
        setItem(k, v) { this.store.set(k, String(v)); },
        removeItem(k) { this.store.delete(k); }
      };

      const baseNow = Date.now();
      const progress = createDefaultProgress();
      progress.gamification.totalScore = 4321;

      const code = generateTransferCode(progress, {
        storage: mockStorage,
        now: baseNow
      });

      // Permutations of valid inputs
      const validVariations = [
        code,                                    // exact 'LAB-XXXX-XXXX'
        code.toLowerCase(),                      // 'lab-xxxx-xxxx'
        code.replace(/-/g, ' '),                 // 'LAB XXXX XXXX'
        code.replace(/-/g, ''),                  // 'LABXXXXXXXX'
        code.replace(/^LAB-/, '')                // 'XXXXXXXX' (8 chars)
      ];

      for (const variation of validVariations) {
        const restored = restoreFromTransferCode(variation, {
          storage: mockStorage,
          now: baseNow + 1000
        });
        assert.equal(restored.gamification.totalScore, 4321);
      }

      // Expiration check: at 48 hours + 1 ms -> must be rejected
      assert.throws(
        () => {
          restoreFromTransferCode(code, {
            storage: mockStorage,
            now: baseNow + TRANSFER_TTL_MS + 1
          });
        },
        /有効期限（48時間）が切れています/
      );

      // Illegal character or malformed format checks
      const badCodes = [
        'LAB-0000-1111', // Contains 0 and 1
        'LAB-OOOO-IIII', // Contains O and I
        'LAB-ABCD',      // Too short
        'LAB-ABCDEFGHIJ',// Too long
        '',
        'INVALID-CODE'
      ];

      for (const bad of badCodes) {
        assert.throws(
          () => restoreFromTransferCode(bad, { storage: mockStorage, now: baseNow }),
          /無効な引き継ぎコード形式|引き継ぎコードを入力してください/
        );
      }
    });
  });

  // =========================================================================
  // 4. High-Frequency API Calls, Concurrency & Atomic Writes
  // =========================================================================
  describe('4. High-Frequency API Calls, Concurrency & Atomic Writes', () => {
    let tmpDir;
    let dataFile;
    let backupFile;
    let transfersFile;
    let server;
    let baseUrl;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'math-lab-m6-stress-'));
      const dataDir = path.join(tmpDir, 'data');
      dataFile = path.join(dataDir, 'progress.json');
      backupFile = path.join(dataDir, 'progress.backup.json');
      transfersFile = path.join(dataDir, 'transfers.json');

      server = await startServer(0, {
        rootDir: tmpDir,
        dataDir,
        dataFile,
        backupFile,
        transfersFile
      });

      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
    });

    afterEach(async () => {
      await stopServer(server);
      if (tmpDir) {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('handles 60 concurrent POST /api/progress requests with mutex serialization and zero JSON corruption', async () => {
      const concurrency = 60;
      const tasks = [];

      for (let i = 0; i < concurrency; i++) {
        const payload = createDefaultProgress();
        payload.gamification.totalScore = (i + 1) * 10;
        payload.stageProgress['stage-1'].stars = (i % 3) + 1;
        payload.lastUpdated = new Date(Date.now() + i * 10).toISOString();

        tasks.push(
          fetch(`${baseUrl}/api/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(async (res) => {
            assert.equal(res.status, 200, `POST ${i} failed`);
            const json = await res.json();
            assert.equal(json.success, true);
            return json;
          })
        );
      }

      const results = await Promise.all(tasks);
      assert.equal(results.length, concurrency);

      // Verify progress.json on disk is 100% valid JSON and parseable
      const fileContent = await fs.readFile(dataFile, 'utf-8');
      assert.doesNotThrow(() => JSON.parse(fileContent), 'progress.json on disk must be valid JSON');

      const parsedFile = JSON.parse(fileContent);
      assert.equal(parsedFile.schemaVersion, '1.0.0');
      assert.ok(parsedFile.gamification.totalScore > 0);

      // Verify backup file exists and is valid JSON
      const backupContent = await fs.readFile(backupFile, 'utf-8');
      assert.doesNotThrow(() => JSON.parse(backupContent), 'progress.backup.json must be valid JSON');
    });

    it('safely serves concurrent interleaved GET and POST requests without race condition', async () => {
      const operations = [];

      // 30 POSTs and 30 GETs fired concurrently in mixed order
      for (let i = 0; i < 30; i++) {
        // Enqueue POST
        const payload = createDefaultProgress();
        payload.gamification.totalScore = 100 + i;
        operations.push(
          fetch(`${baseUrl}/api/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(async (res) => {
            assert.equal(res.status, 200);
            return 'post';
          })
        );

        // Enqueue GET
        operations.push(
          fetch(`${baseUrl}/api/progress`, {
            method: 'GET',
            headers: { Accept: 'application/json' }
          }).then(async (res) => {
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.schemaVersion, '1.0.0');
            assert.ok(typeof data.gamification.totalScore === 'number');
            return 'get';
          })
        );
      }

      const completed = await Promise.all(operations);
      assert.equal(completed.length, 60);
    });

    it('rejects malformed and oversized payloads on POST /api/progress with exact HTTP status codes', async () => {
      // 1. Malformed JSON syntax
      const res1 = await fetch(`${baseUrl}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"corrupted": '
      });
      assert.equal(res1.status, 400);

      // 2. Unsupported schema version
      const res2 = await fetch(`${baseUrl}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaVersion: '2.5.0' })
      });
      assert.equal(res2.status, 400);

      // 3. Unsupported HTTP Method (DELETE)
      const res3 = await fetch(`${baseUrl}/api/progress`, {
        method: 'DELETE'
      });
      assert.equal(res3.status, 405);
    });

    it('coalesces rapid client saveProgress calls via debouncing into a minimal number of HTTP POSTs', async () => {
      let postCount = 0;
      let lastBody = null;

      // Track POST requests to server
      const clientMockFetch = async (url, opts) => {
        if (opts && opts.method === 'POST') {
          postCount++;
          lastBody = JSON.parse(opts.body);
          return { ok: true, status: 200, json: async () => ({ success: true }) };
        }
        return { ok: true, status: 200, json: async () => ({ schemaVersion: '1.0.0' }) };
      };

      const mockStorage = {
        store: new Map(),
        getItem(k) { return this.store.get(k) || null; },
        setItem(k, v) { this.store.set(k, String(v)); },
        removeItem(k) { this.store.delete(k); }
      };

      const promises = [];
      const calls = 40;

      // Burst 40 saves within 10ms with 40ms debounce
      for (let i = 0; i < calls; i++) {
        const progress = createDefaultProgress();
        progress.gamification.totalScore = (i + 1) * 25;
        promises.push(
          saveProgress(progress, {
            storage: mockStorage,
            fetchImpl: clientMockFetch,
            debounceMs: 40
          })
        );
      }

      // Wait for all callers to resolve
      const allResults = await Promise.all(promises);

      // All 40 callers resolved true
      assert.equal(allResults.length, calls);
      assert.equal(allResults.every((r) => r === true), true);

      // Verify coalescing: only 1 HTTP POST actually fired!
      assert.equal(postCount, 1, `Expected 1 coalesced POST, got ${postCount}`);
      assert.equal(lastBody.gamification.totalScore, calls * 25, 'Final state must match the 40th call');
    });
  });
});
