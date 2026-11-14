import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import serverContract, {
  defaultPort,
  mimeTypes,
  sanitizePath,
  validateAtomicPayload,
  startServer,
  stopServer
} from '../server.js';
import {
  createDefaultProgress,
  loadProgress,
  saveProgress,
  restoreFromTransferCode,
  TRANSFER_TTL_MS
} from '../src/services/storage-service.js';

describe('Milestone 2: Node.js Backend Server (server.js)', () => {
  let tmpRoot;
  let tmpDataDir;
  let dataFile;
  let backupFile;
  let transfersFile;
  let server;
  let baseUrl;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'math-lab-srv-test-'));
    tmpDataDir = path.join(tmpRoot, 'data');
    dataFile = path.join(tmpDataDir, 'progress.json');
    backupFile = path.join(tmpDataDir, 'progress.backup.json');
    transfersFile = path.join(tmpDataDir, 'transfers.json');

    // Create sample static assets in tmpRoot for static serving tests
    await fs.mkdir(path.join(tmpRoot, 'src', 'styles'), { recursive: true });
    await fs.mkdir(path.join(tmpRoot, '.agents'), { recursive: true });
    await fs.writeFile(path.join(tmpRoot, 'index.html'), '<!doctype html><title>算数探検ラボ</title>', 'utf-8');
    await fs.writeFile(path.join(tmpRoot, 'app.js'), 'export const hello = "lab";', 'utf-8');
    await fs.writeFile(path.join(tmpRoot, 'src', 'styles', 'main.css'), 'body { color: #1e293b; }', 'utf-8');
    await fs.writeFile(path.join(tmpRoot, 'badge.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf-8');
    await fs.writeFile(path.join(tmpRoot, 'icon.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await fs.writeFile(path.join(tmpRoot, '.agents', 'secret.md'), 'top secret', 'utf-8');

    server = await startServer(0, {
      rootDir: tmpRoot,
      dataDir: tmpDataDir,
      dataFile,
      backupFile,
      transfersFile,
      maxBodySize: 64 * 1024 // 64KB limit for fast 413 test
    });

    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    await stopServer(server);
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // 1. Server Contract Helpers (Unit Tests)
  // =========================================================================
  describe('Server Contract Helpers', () => {
    it('exports defaultPort 3000 and standard UTF-8 MIME types', () => {
      assert.equal(defaultPort, 3000);
      assert.equal(serverContract.defaultPort, 3000);
      assert.equal(mimeTypes['.html'], 'text/html; charset=utf-8');
      assert.equal(mimeTypes['.js'], 'text/javascript; charset=utf-8');
      assert.equal(mimeTypes['.css'], 'text/css; charset=utf-8');
      assert.equal(mimeTypes['.json'], 'application/json; charset=utf-8');
      assert.equal(mimeTypes['.svg'], 'image/svg+xml');
      assert.equal(mimeTypes['.png'], 'image/png');
    });

    it('sanitizes valid paths and blocks directory traversal or hidden dotfiles', () => {
      const root = '/home/antigravity';
      assert.equal(sanitizePath('index.html', root), '/home/antigravity/index.html');
      assert.equal(sanitizePath('/src/main.js?v=123#top', root), '/home/antigravity/src/main.js');

      assert.throws(() => sanitizePath('../../etc/passwd', root), /Path traversal/);
      assert.throws(() => sanitizePath('/%2e%2e/%2e%2e/etc/passwd', root), /Path traversal/);
      assert.throws(() => sanitizePath('/.agents/ORIGINAL_REQUEST.md', root), /Path traversal/);
      assert.throws(() => sanitizePath('/index.html\0.png', root), /Path traversal/);
    });

    it('validates atomic progress payloads and rejects unsupported versions', () => {
      const valid = createDefaultProgress();
      assert.equal(validateAtomicPayload(valid), true);

      assert.throws(() => validateAtomicPayload(null), /Invalid JSON payload/);
      assert.throws(() => validateAtomicPayload([]), /Invalid JSON payload/);
      assert.throws(() => validateAtomicPayload({ schemaVersion: '999.0' }), /Unsupported schema version/);
    });
  });

  // =========================================================================
  // 2. Static File Serving & Security
  // =========================================================================
  describe('Static File Serving & Security', () => {
    it('serves root / as index.html and static assets with exact MIME types', async () => {
      const htmlRes = await fetch(`${baseUrl}/`);
      assert.equal(htmlRes.status, 200);
      assert.equal(htmlRes.headers.get('content-type'), 'text/html; charset=utf-8');
      const htmlText = await htmlRes.text();
      assert.match(htmlText, /算数探検ラボ/);

      const jsRes = await fetch(`${baseUrl}/app.js`);
      assert.equal(jsRes.status, 200);
      assert.equal(jsRes.headers.get('content-type'), 'text/javascript; charset=utf-8');

      const cssRes = await fetch(`${baseUrl}/src/styles/main.css`);
      assert.equal(cssRes.status, 200);
      assert.equal(cssRes.headers.get('content-type'), 'text/css; charset=utf-8');

      const svgRes = await fetch(`${baseUrl}/badge.svg`);
      assert.equal(svgRes.status, 200);
      assert.equal(svgRes.headers.get('content-type'), 'image/svg+xml');

      const pngRes = await fetch(`${baseUrl}/icon.png`);
      assert.equal(pngRes.status, 200);
      assert.equal(pngRes.headers.get('content-type'), 'image/png');
    });

    it('blocks directory traversal and hidden directory requests with 403 Forbidden', async () => {
      const travRes = await fetch(`${baseUrl}/%252e%252e/%252e%252e/etc/passwd`);
      assert.equal(travRes.status, 403);

      const hiddenRes = await fetch(`${baseUrl}/.agents/secret.md`);
      assert.equal(hiddenRes.status, 403);
    });

    it('returns 404 for nonexistent static files and 405 for unsupported static methods', async () => {
      const notFound = await fetch(`${baseUrl}/does-not-exist.html`);
      assert.equal(notFound.status, 404);

      const badMethod = await fetch(`${baseUrl}/index.html`, { method: 'DELETE' });
      assert.equal(badMethod.status, 405);
    });

    it('responds 204 No Content with CORS headers on OPTIONS preflight', async () => {
      const optRes = await fetch(`${baseUrl}/api/progress`, { method: 'OPTIONS' });
      assert.equal(optRes.status, 204);
      assert.equal(optRes.headers.get('access-control-allow-origin'), '*');
    });
  });

  // =========================================================================
  // 3. GET & POST /api/progress (Atomic Write, Backup & Concurrency)
  // =========================================================================
  describe('GET & POST /api/progress Persistence & Atomic Writes', () => {
    it('returns clean default progress on GET /api/progress when progress.json does not exist yet', async () => {
      const res = await fetch(`${baseUrl}/api/progress`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
      const data = await res.json();
      assert.equal(data.schemaVersion, '1.0.0');
      assert.equal(data.stageProgress['stage-1'].unlocked, true);
      assert.equal(data.stageProgress['stage-15'].unlocked, false);
    });

    it('atomically saves progress via POST /api/progress and creates progress.backup.json on update', async () => {
      const p1 = createDefaultProgress();
      p1.gamification.totalScore = 250;
      p1.userProfile.userName = 'たろう';

      const post1 = await fetch(`${baseUrl}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p1)
      });
      assert.equal(post1.status, 200);
      const body1 = await post1.json();
      assert.equal(body1.success, true);
      assert.equal(body1.data.gamification.totalScore, 250);

      // Update with a second write so backupFile is created from the first write
      const p2 = createDefaultProgress();
      p2.gamification.totalScore = 500;
      p2.userProfile.userName = 'たろう';

      const post2 = await fetch(`${baseUrl}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p2)
      });
      assert.equal(post2.status, 200);

      // Verify dataFile has 500 and backupFile has 250
      const savedOnDisk = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
      const backupOnDisk = JSON.parse(await fs.readFile(backupFile, 'utf-8'));
      assert.equal(savedOnDisk.gamification.totalScore, 500);
      assert.equal(backupOnDisk.gamification.totalScore, 250);

      // Verify no temporary .tmp files remain in tmpDataDir
      const filesInDataDir = await fs.readdir(tmpDataDir);
      assert.ok(filesInDataDir.every((f) => !f.includes('.tmp.')));
    });

    it('serializes 10 concurrent POST /api/progress requests without corrupting JSON or racing', async () => {
      const requests = Array.from({ length: 10 }, (_, idx) => {
        const payload = createDefaultProgress();
        payload.gamification.totalScore = (idx + 1) * 100;
        payload.gamification.selfCorrectionCount = idx + 1;
        return fetch(`${baseUrl}/api/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      });

      const responses = await Promise.all(requests);
      for (const r of responses) {
        assert.equal(r.status, 200);
      }

      // Verify the resulting progress.json on disk is valid JSON and no temp files remain
      const rawDisk = await fs.readFile(dataFile, 'utf-8');
      const parsedDisk = JSON.parse(rawDisk);
      assert.equal(parsedDisk.schemaVersion, '1.0.0');
      assert.ok(parsedDisk.gamification.totalScore >= 100);

      const filesInDataDir = await fs.readdir(tmpDataDir);
      assert.ok(filesInDataDir.every((f) => !f.includes('.tmp.')));
    });

    it('rejects malformed JSON (400), invalid schemaVersion (400), oversized body (413), and bad method (405)', async () => {
      const badJsonRes = await fetch(`${baseUrl}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ corrupted json'
      });
      assert.equal(badJsonRes.status, 400);

      const badSchemaRes = await fetch(`${baseUrl}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaVersion: '0.1.0' })
      });
      assert.equal(badSchemaRes.status, 400);

      // Oversized payload > 64KB configured in beforeEach
      const hugePayload = createDefaultProgress();
      hugePayload.userProfile.notes = 'A'.repeat(80 * 1024);
      const largeRes = await fetch(`${baseUrl}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hugePayload)
      });
      assert.equal(largeRes.status, 413);

      const badMethodRes = await fetch(`${baseUrl}/api/progress`, {
        method: 'DELETE'
      });
      assert.equal(badMethodRes.status, 405);
    });
  });

  // =========================================================================
  // 4. Transfer Code Endpoints & End-to-End Integration with StorageService
  // =========================================================================
  describe('Server Transfer Endpoints & StorageService Integration', () => {
    it('generates and claims transfer code via /api/transfer/generate and /api/transfer/claim', async () => {
      const progress = createDefaultProgress();
      progress.gamification.totalScore = 1500;
      progress.gamification.labRank = 6;

      const genRes = await fetch(`${baseUrl}/api/transfer/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: progress })
      });
      assert.equal(genRes.status, 200);
      const genBody = await genRes.json();
      assert.equal(genBody.success, true);
      assert.match(genBody.code, /^LAB-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);

      // Claim via StorageService using transferApiUrl
      const restored = await restoreFromTransferCode(genBody.code.toLowerCase(), {
        useServer: true,
        transferApiUrl: `${baseUrl}/api/transfer/claim`
      });
      assert.equal(restored.gamification.totalScore, 1500);
      assert.equal(restored.gamification.labRank, 6);
    });

    it('returns 410 Gone when claiming an expired transfer code and 404 when not found', async () => {
      const progress = createDefaultProgress();
      const baseNow = 1_700_000_000_000;

      const genRes = await fetch(`${baseUrl}/api/transfer/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: progress,
          now: baseNow,
          expiresAt: baseNow + TRANSFER_TTL_MS
        })
      });
      const { code } = await genRes.json();

      const expiredRes = await fetch(`${baseUrl}/api/transfer/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          now: baseNow + TRANSFER_TTL_MS + 1000
        })
      });
      assert.equal(expiredRes.status, 410);

      const unknownRes = await fetch(`${baseUrl}/api/transfer/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'LAB-2345-6789' })
      });
      assert.equal(unknownRes.status, 404);
    });

    it('integrates seamlessly with StorageService.saveProgress and loadProgress over real HTTP', async () => {
      const apiUrl = `${baseUrl}/api/progress`;
      const progress = createDefaultProgress();
      progress.gamification.totalScore = 920;
      progress.stageProgress['stage-4'].unlocked = true;
      progress.stageProgress['stage-4'].stars = 2;

      const savedOk = await saveProgress(progress, { apiUrl, immediate: true });
      assert.equal(savedOk, true);

      const loaded = await loadProgress({ apiUrl });
      assert.equal(loaded.gamification.totalScore, 920);
      assert.equal(loaded.stageProgress['stage-4'].unlocked, true);
      assert.equal(loaded.stageProgress['stage-4'].stars, 2);
    });
  });
});
