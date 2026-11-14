import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import StorageService, {
  STORAGE_KEY,
  SYNC_PENDING_KEY,
  createDefaultProgress,
  loadProgress,
  saveProgress,
  flushPendingSync,
  isSyncPending,
  resetStorageState,
  isStaticHostingEnvironment
} from '../src/services/storage-service.js';
import { ParentBoard } from '../src/components/parent-board.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function createMockLocalStorage() {
  const store = new Map();
  return {
    store,
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

function createMockDocument() {
  const createNode = (tag) => ({
    tagName: String(tag || 'div').toUpperCase(),
    className: '',
    style: {},
    innerHTML: '',
    children: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  });
  return {
    createElement: createNode
  };
}

describe('Static Hosting, PWA Manifest & GitHub Pages Support', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetStorageState();
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
    if (originalDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
    resetStorageState();
  });

  describe('isStaticHostingEnvironment()', () => {
    it('returns false in Node.js when window is undefined and no skipServer option is set', () => {
      delete globalThis.window;
      assert.equal(isStaticHostingEnvironment(), false);
      assert.equal(StorageService.isStaticHostingEnvironment(), false);
    });

    it('returns true for GitHub Pages (.github.io and github.io), Cloudflare Pages, Netlify, Vercel, and file: protocol', () => {
      const staticLocations = [
        { protocol: 'https:', hostname: 'yoshikinoue.github.io' },
        { protocol: 'https:', hostname: 'github.io' },
        { protocol: 'https:', hostname: 'sansu-lab.pages.dev' },
        { protocol: 'https:', hostname: 'sansu-lab.netlify.app' },
        { protocol: 'https:', hostname: 'sansu-lab.vercel.app' },
        { protocol: 'file:', hostname: '' }
      ];

      for (const loc of staticLocations) {
        globalThis.window = { location: loc };
        assert.equal(
          isStaticHostingEnvironment(),
          true,
          `Expected static hosting true for ${loc.protocol}//${loc.hostname}`
        );
      }
    });

    it('returns false for localhost and LAN IP addresses so server.js continues to work', () => {
      const serverLocations = [
        { protocol: 'http:', hostname: 'localhost' },
        { protocol: 'http:', hostname: '127.0.0.1' },
        { protocol: 'http:', hostname: '192.168.1.42' },
        { protocol: 'http:', hostname: '10.0.0.5' }
      ];

      for (const loc of serverLocations) {
        globalThis.window = { location: loc };
        assert.equal(
          isStaticHostingEnvironment(),
          false,
          `Expected static hosting false for ${loc.protocol}//${loc.hostname}`
        );
      }
    });

    it('respects explicit options.skipServer, options.apiUrl, and options.fetchImpl overrides', () => {
      globalThis.window = { location: { protocol: 'https:', hostname: 'yoshikinoue.github.io' } };

      assert.equal(isStaticHostingEnvironment({ skipServer: false }), false);
      assert.equal(isStaticHostingEnvironment({ apiUrl: 'http://localhost:3000/api/progress' }), false);
      assert.equal(isStaticHostingEnvironment({ fetchImpl: async () => ({ ok: true }) }), false);

      globalThis.window = { location: { protocol: 'http:', hostname: 'localhost' } };
      assert.equal(isStaticHostingEnvironment({ skipServer: true }), true);
    });
  });

  describe('StorageService static hosting behavior on .github.io', () => {
    it('skips fetch on .github.io during saveProgress, loadProgress, and flushPendingSync while persisting to localStorage', async () => {
      globalThis.window = {
        location: {
          protocol: 'https:',
          hostname: 'yoshikinoue.github.io',
          origin: 'https://yoshikinoue.github.io'
        }
      };

      let fetchCallCount = 0;
      globalThis.fetch = async () => {
        fetchCallCount += 1;
        return { ok: false, status: 404 };
      };

      const storage = createMockLocalStorage();
      const progress = createDefaultProgress();
      progress.gamification.totalStars = 12;

      const saved = await saveProgress(progress, { storage, immediate: true });
      assert.equal(saved, true);
      assert.equal(fetchCallCount, 0, 'saveProgress must not call fetch on .github.io');
      assert.equal(isSyncPending({ storage }), false, 'SYNC_PENDING_KEY must not be set on static hosting');
      assert.equal(storage.getItem(SYNC_PENDING_KEY), null);
      assert.ok(storage.getItem(STORAGE_KEY), 'Progress must still be saved in localStorage');

      const loaded = await loadProgress({ storage });
      assert.equal(fetchCallCount, 0, 'loadProgress must not call fetch on .github.io');
      assert.equal(loaded.gamification.totalStars, 12);

      const flushed = await flushPendingSync({ storage });
      assert.equal(flushed, true);
      assert.equal(fetchCallCount, 0, 'flushPendingSync must not call fetch on .github.io');
    });
  });

  describe('ParentBoard static hosting guide UI', () => {
    const GUIDE_TEXT =
      '現在は端末内保存モードで動作中です。別のタブレットへデータを引き継ぐ場合は、JSONバックアップファイル書き出しをご利用ください。';

    it('renders the local storage mode guide and static Tier 2 status when on .github.io', () => {
      globalThis.window = {
        location: { protocol: 'https:', hostname: 'yoshikinoue.github.io' }
      };
      globalThis.document = createMockDocument();

      const board = new ParentBoard({ progress: createDefaultProgress() });
      const dashboard = board.renderDashboardView();
      const allHtml = dashboard.children.map((c) => c.innerHTML || '').join('\n');

      assert.ok(allHtml.includes(GUIDE_TEXT), 'Expected static hosting guide text in ParentBoard');
      assert.ok(allHtml.includes('⚪ 端末内保存モード（サーバー同期なし）'));
      assert.equal(allHtml.includes('🟢 /api/progress 同期完了'), false);
    });

    it('does not render the local storage mode guide and keeps server sync status when on localhost', () => {
      globalThis.window = {
        location: { protocol: 'http:', hostname: 'localhost' }
      };
      globalThis.document = createMockDocument();

      const board = new ParentBoard({ progress: createDefaultProgress() });
      const dashboard = board.renderDashboardView();
      const allHtml = dashboard.children.map((c) => c.innerHTML || '').join('\n');

      assert.equal(allHtml.includes(GUIDE_TEXT), false);
      assert.ok(allHtml.includes('🟢 /api/progress 同期完了'));
    });
  });

  describe('PWA manifest.json and index.html relative paths', () => {
    it('manifest.json is valid JSON with standalone display, relative paths, and Japanese title', () => {
      const manifestPath = path.join(ROOT_DIR, 'manifest.json');
      const raw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);

      assert.equal(manifest.display, 'standalone');
      assert.equal(manifest.start_url, './');
      assert.equal(manifest.scope, './');
      assert.equal(manifest.short_name, '算数探検ラボ');
      assert.ok(manifest.name.includes('算数探検ラボ'));
      assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0);
      assert.equal(manifest.icons[0].src, './assets/icon.svg');
      assert.equal(manifest.icons[0].type, 'image/svg+xml');
    });

    it('index.html uses ./ relative paths for src, manifest, and icon without root-relative /src/ paths', () => {
      const indexPath = path.join(ROOT_DIR, 'index.html');
      const html = fs.readFileSync(indexPath, 'utf8');

      assert.equal(html.includes('"/src/'), false, 'index.html must not contain root-relative "/src/"');
      assert.equal(html.includes("'/src/"), false, "index.html must not contain root-relative '/src/'");
      assert.ok(html.includes('./src/styles/variables.css'));
      assert.ok(html.includes('./src/styles/base.css'));
      assert.ok(html.includes('./src/styles/components.css'));
      assert.ok(html.includes('./src/styles/tablet.css'));
      assert.ok(html.includes('./src/main.js'));
      assert.ok(html.includes('<link rel="manifest" href="./manifest.json">'));
      assert.ok(html.includes('<link rel="icon" type="image/svg+xml" href="./assets/icon.svg">'));
      assert.ok(html.includes('<link rel="apple-touch-icon" href="./assets/icon.svg">'));
      assert.ok(html.includes('<meta name="apple-mobile-web-app-title" content="算数探検ラボ">'));
    });
  });
});
