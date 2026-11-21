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
  isStaticHostingEnvironment,
  getOfflineBannerText
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

  describe('Offline banner text and viewport accessibility (BUG-005 & BUG-006)', () => {
    it('returns environment-appropriate offline banner text for static vs server hosting (BUG-005)', () => {
      globalThis.window = { location: { protocol: 'https:', hostname: 'yoshikinoue.github.io' } };
      const staticText = getOfflineBannerText();
      assert.ok(staticText.includes('この端末に保存されます'));
      assert.equal(staticText.includes('自動同期されます'), false);

      globalThis.window = { location: { protocol: 'http:', hostname: 'localhost' } };
      const serverText = getOfflineBannerText();
      assert.ok(serverText.includes('自動同期されます'));
    });

    it('uses non-misleading default offline banner and allows pinch-zoom in both index.html and sansu_tanken_lab.html (BUG-005 & BUG-006)', () => {
      for (const fileName of ['index.html', 'sansu_tanken_lab.html']) {
        const html = fs.readFileSync(path.join(ROOT_DIR, fileName), 'utf8');
        const viewportMatch = html.match(/<meta\s+name=["']viewport["'][^>]*>/i);
        assert.ok(viewportMatch, `${fileName} must contain viewport meta tag`);
        assert.equal(viewportMatch[0].includes('user-scalable=no'), false, `${fileName} must allow pinch-zoom (no user-scalable=no)`);
        assert.equal(viewportMatch[0].includes('maximum-scale=1.0'), false, `${fileName} must allow pinch-zoom (no maximum-scale=1.0)`);

        const bannerMatch = html.match(/<div[^>]*id=["']offline-banner["'][^>]*>([\s\S]*?)<\/div>/i);
        assert.ok(bannerMatch, `${fileName} must contain #offline-banner`);
        assert.equal(bannerMatch[1].includes('自動同期されます'), false, `${fileName} static default banner must not claim server sync`);
      }

      const tabletCss = fs.readFileSync(path.join(ROOT_DIR, 'src/styles/tablet.css'), 'utf8');
      assert.ok(tabletCss.includes('@media (max-width: 640px)'), 'tablet.css must include smartphone portrait rules');
    });
  });

  describe('Smartphone portrait layout (BUG-007)', () => {
    const readCss = (rel) => fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');

    it('toast is anchored to the bottom so it never covers modal headers or the stage bar', () => {
      const componentsCss = readCss('src/styles/components.css');
      assert.equal(componentsCss.includes('top: 80px'), false, 'toast-container must not be fixed at top: 80px (it covered modal titles and close buttons)');
      const toastBlock = componentsCss.match(/\.toast-container\s*\{([^}]*)\}/);
      assert.ok(toastBlock, 'components.css must define .toast-container');
      assert.ok(toastBlock[1].includes('bottom:'), 'toast-container must be anchored with bottom');
      assert.ok(toastBlock[1].includes('max-width:'), 'toast-container must constrain its width on narrow screens');
    });

    it('hub cards, world header, toolbar and modal header wrap instead of squeezing text into one-character columns', () => {
      const componentsCss = readCss('src/styles/components.css');
      const tabletCss = readCss('src/styles/tablet.css');

      const hubBlock = componentsCss.match(/\.hub-card\s*\{([^}]*)\}/);
      assert.ok(hubBlock && hubBlock[1].includes('flex-wrap: wrap'), '.hub-card must allow wrapping');
      assert.ok(componentsCss.includes('.world-progress-badge'), 'world progress badge needs a nowrap rule');
      const toolbarBlock = componentsCss.match(/\.canvas-toolbar\s*\{([^}]*)\}/);
      assert.ok(toolbarBlock && toolbarBlock[1].includes('flex-wrap: wrap'), '.canvas-toolbar must allow wrapping');
      const modalHeaderBlock = componentsCss.match(/\.modal-header\s*\{([^}]*)\}/);
      assert.ok(modalHeaderBlock && modalHeaderBlock[1].includes('flex-wrap: wrap'), '.modal-header must allow wrapping');

      const smartphoneBlock = tabletCss.slice(tabletCss.indexOf('@media (max-width: 640px)'));
      assert.ok(smartphoneBlock.includes('.hub-card'), 'smartphone rules must restyle .hub-card');
      assert.ok(smartphoneBlock.includes('.world-header'), 'smartphone rules must restyle .world-header');
      assert.ok(smartphoneBlock.includes('.modal-overlay'), 'smartphone rules must restyle .modal-overlay');
    });

    it('flex children that carry wide content can shrink (min-width: 0) so modal content cannot push past the card edge', () => {
      const componentsCss = readCss('src/styles/components.css');
      for (const selector of ['.modal-card', '.modal-body', '.mini-lesson-card', '.lesson-visual-diagram', '.step-guide-content']) {
        const block = componentsCss.match(new RegExp(selector.replace('.', '\\.') + '\\s*\\{([^}]*)\\}'));
        assert.ok(block, `components.css must define ${selector}`);
        assert.ok(block[1].includes('min-width: 0'), `${selector} must allow shrinking with min-width: 0`);
      }
    });

    it('standalone bundle carries the same BUG-007 CSS fixes', () => {
      const html = fs.readFileSync(path.join(ROOT_DIR, 'sansu_tanken_lab.html'), 'utf8');
      assert.equal(html.includes('top: 80px'), false, 'standalone bundle toast must not be fixed at top: 80px');
      assert.ok(html.includes('.world-progress-badge'), 'standalone bundle must include the world progress badge rule');
    });
  });

  describe('Learning scope notice (Issue #22)', () => {
    it('parent board source states the learning scope and out-of-scope topics', () => {
      const src = fs.readFileSync(path.join(ROOT_DIR, 'src/components/parent-board.js'), 'utf8');
      assert.ok(src.includes('このアプリの対象範囲'), 'parent-board.js must include the scope card title');
      assert.ok(src.includes('対象外'), 'parent-board.js must mention out-of-scope topics');
      assert.ok(src.includes('learning-scope-card'), 'parent-board.js must use the learning-scope-card class');
    });

    it('components.css defines the learning-scope-card rule instead of inline styles', () => {
      const componentsCss = fs.readFileSync(path.join(ROOT_DIR, 'src/styles/components.css'), 'utf8');
      const block = componentsCss.match(/\.learning-scope-card\s*\{([^}]*)\}/);
      assert.ok(block, 'components.css must define .learning-scope-card');
      assert.ok(block[1].includes('padding:'), '.learning-scope-card must carry the card padding');
      assert.ok(block[1].includes('border:'), '.learning-scope-card must carry the card border');
    });

    it('standalone bundle carries the same scope notice wording and CSS rule', () => {
      const html = fs.readFileSync(path.join(ROOT_DIR, 'sansu_tanken_lab.html'), 'utf8');
      assert.ok(html.includes('このアプリの対象範囲'), 'standalone bundle must include the scope card title');
      assert.ok(html.includes('対象外'), 'standalone bundle must mention out-of-scope topics');
      assert.ok(html.includes('.learning-scope-card'), 'standalone bundle must include the learning-scope-card CSS rule');
    });
  });
});
