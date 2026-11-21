/**
 * tests/adversarial-lifecycle.test.js
 * Adversarial Challenger Stress & Teardown Test Suite for Milestone 5
 *
 * Rigorously validates:
 * 1. Interaction between TreasureBox, MiniLesson, StageMap, ParentBoard, and main.js router.
 * 2. Rapid route switching between #stages, #treasure, #parent, #stage, #lesson, and #map.
 * 3. Active modal teardown (MiniLessonModal, TreasureBox Review Modal, StepGuideModal, StageCompleteModal).
 * 4. Verification that no lingering event listeners, audio synthesis timers, or DOM nodes remain active after navigating away.
 * 5. High-frequency interleaved operations (concurrent timer cancellation, speech interruption, state persistence).
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { routes, parseRoute, MathLabApp } from '../src/main.js';
import MiniLessonModal, { createLessonState, answerQuiz, nextCard, getLessonVisual } from '../src/components/mini-lesson.js';
import StageMap, { isStageUnlocked, getWorldForStage } from '../src/components/stage-map.js';
import TreasureBox, { addItem as addTreasureItem, recordAttempt as recordTreasureAttempt } from '../src/components/treasure-box.js';
import ParentBoard, { verifyPin, calculateRadarScores, createCheerStamp } from '../src/components/parent-board.js';
import StepGuideModal from '../src/components/step-guide.js';
import CanvasPad from '../src/components/canvas-pad.js';
import Keypad from '../src/components/keypad.js';

import * as StorageService from '../src/services/storage-service.js';
import * as SoundEffects from '../src/services/sound-effects.js';
import * as SpeechService from '../src/services/speech-service.js';
import * as CurriculumEngine from '../src/services/curriculum-engine.js';
import * as GamificationEngine from '../src/services/gamification-engine.js';

// --- ROBUST IN-MEMORY DOM MOCK FOR HEADLESS LIFECYCLE AUDITING ---

function matches(el, selector) {
  if (!el || !selector) return false;
  const trimmed = selector.trim();

  // Handle #id
  if (trimmed.startsWith('#') && !trimmed.includes('.') && !trimmed.includes('[')) {
    return el.id === trimmed.slice(1);
  }

  // Handle compound: tag.class1.class2[data-x="y"]
  const re = /^([a-zA-Z0-9\-]+)?((?:\.[a-zA-Z0-9\-_]+)*)((?:\[[^\]]+\])*)$/;
  const m = trimmed.match(re);
  if (!m) return false;

  const [, tag, classesStr, attrsStr] = m;
  if (tag && el.tagName.toLowerCase() !== tag.toLowerCase()) return false;

  if (classesStr) {
    const classes = classesStr.split('.').filter(Boolean);
    for (const c of classes) {
      if (!el.classList.contains(c)) return false;
    }
  }

  if (attrsStr) {
    const attrRe = /\[([a-zA-Z0-9\-]+)(?:=["']([^"']*)["'])?\]/g;
    let am;
    while ((am = attrRe.exec(attrsStr)) !== null) {
      const [, k, v] = am;
      if (k.startsWith('data-')) {
        const rawKey = k.slice(5);
        const camelKey = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const actual = el.dataset[rawKey] !== undefined ? el.dataset[rawKey] : el.dataset[camelKey];
        if (v !== undefined) {
          if (actual !== v && el.getAttribute(k) !== v) return false;
        } else {
          if (actual === undefined && el.getAttribute(k) === null) return false;
        }
      } else if (v !== undefined) {
        if (el.getAttribute(k) !== v) return false;
      } else {
        if (el.getAttribute(k) === null) return false;
      }
    }
  }

  return true;
}

class MockDOMTokenList {
  constructor(node) {
    this._node = node;
    this._classes = new Set();
  }
  add(...classes) {
    for (const c of classes) {
      if (c) this._classes.add(c);
    }
    this._sync();
  }
  remove(...classes) {
    for (const c of classes) {
      this._classes.delete(c);
    }
    this._sync();
  }
  contains(c) {
    return this._classes.has(c);
  }
  toggle(c, force) {
    if (force !== undefined) {
      if (force) this.add(c);
      else this.remove(c);
      return force;
    }
    if (this.contains(c)) {
      this.remove(c);
      return false;
    } else {
      this.add(c);
      return true;
    }
  }
  _sync() {
    this._node._className = Array.from(this._classes).join(' ');
  }
  _initFromClass(str) {
    this._classes.clear();
    if (str && typeof str === 'string') {
      str.split(/\s+/).filter(Boolean).forEach(c => this._classes.add(c));
    }
    this._sync();
  }
}

class MockElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this._className = '';
    this.classList = new MockDOMTokenList(this);
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map(); // event -> Set of handler functions
    this.value = '';
    this.disabled = false;
    this._textContent = '';
    this._innerHTML = '';
  }

  get className() {
    return this._className;
  }
  set className(val) {
    this._className = val || '';
    this.classList._initFromClass(this._className);
  }

  get textContent() {
    return this._textContent;
  }
  set textContent(val) {
    this._textContent = String(val ?? '');
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(html) {
    this._innerHTML = html || '';
    this.children = [];
    if (!html) return;
    parseHTMLToChildren(html, this);
  }

  appendChild(child) {
    if (!child) return child;
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      if (newChild.parentNode) {
        newChild.parentNode.removeChild(newChild);
      }
      this.children[idx] = newChild;
      newChild.parentNode = this;
      oldChild.parentNode = null;
      return oldChild;
    }
    throw new Error('NotFoundError: The node to be replaced is not a child of this node');
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
    if (k === 'id') this.id = String(v);
    if (k === 'class') this.className = String(v);
    if (k === 'value') this.value = String(v);
    if (k === 'disabled') this.disabled = true;
    if (k.startsWith('data-')) {
      const rawKey = k.slice(5);
      const camelKey = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[rawKey] = String(v);
      this.dataset[camelKey] = String(v);
    }
  }
  getAttribute(k) {
    return this.attributes.get(k) ?? null;
  }
  removeAttribute(k) {
    this.attributes.delete(k);
    if (k === 'disabled') this.disabled = false;
    if (k.startsWith('data-')) {
      const rawKey = k.slice(5);
      const camelKey = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      delete this.dataset[rawKey];
      delete this.dataset[camelKey];
    }
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(handler);
  }

  removeEventListener(type, handler) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(handler);
    }
  }

  click() {
    if (typeof this.onclick === 'function') {
      this.onclick({ target: this, currentTarget: this });
    }
    const handlers = this.listeners.get('click');
    if (handlers) {
      for (const h of handlers) {
        h({ target: this, currentTarget: this, preventDefault() {} });
      }
    }
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (matches(curr, selector)) return curr;
      curr = curr.parentNode;
    }
    return null;
  }

  querySelector(selector) {
    const results = this.querySelectorAll(selector);
    return results[0] || null;
  }

  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    let currentSet = [this];

    for (const part of parts) {
      const nextSet = [];
      for (const node of currentSet) {
        const walk = (n) => {
          for (const child of n.children) {
            if (matches(child, part)) {
              nextSet.push(child);
            }
            walk(child);
          }
        };
        walk(node);
      }
      currentSet = nextSet;
    }

    return currentSet;
  }

  focus() {}
  getContext() {
    return {
      save() {},
      restore() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      stroke() {},
      fillRect() {},
      clearRect() {},
      setLineDash() {}
    };
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 600, height: 400 };
  }
}

function parseHTMLToChildren(html, parent) {
  const stack = [parent];
  const tagRegex = /<!--[\s\S]*?-->|<(\/)?([a-zA-Z0-9\-]+)([^>]*?)(\/)?>|([^<]+)/g;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const [full, isClosing, tagName, attrStr, isSelfClosing, text] = match;
    if (full.startsWith('<!--')) continue;

    if (text) {
      const clean = text.trim();
      if (clean) {
        const top = stack[stack.length - 1];
        top._textContent = (top._textContent ? top._textContent + ' ' : '') + clean;
      }
      continue;
    }

    if (isClosing) {
      if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName.toLowerCase()) {
        stack.pop();
      }
    } else {
      const el = new MockElement(tagName);
      if (attrStr) {
        const attrRegex = /([a-zA-Z0-9\-]+)(?:=["']([^"']*)["'])?/g;
        let am;
        while ((am = attrRegex.exec(attrStr)) !== null) {
          el.setAttribute(am[1], am[2] !== undefined ? am[2] : '');
        }
      }
      stack[stack.length - 1].appendChild(el);

      const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
      if (!isSelfClosing && !voidTags.has(tagName.toLowerCase())) {
        stack.push(el);
      }
    }
  }
}

function setupMockEnvironment() {
  const modalRoot = new MockElement('div', 'modal-root');
  const viewContainer = new MockElement('main', 'view-container');
  const toastContainer = new MockElement('div', 'toast-container');
  const offlineBanner = new MockElement('div', 'offline-banner');
  const cheerBanner = new MockElement('div', 'cheer-banner');
  const cheerBannerText = new MockElement('span', 'cheer-banner-text');
  const btnReadCheer = new MockElement('button', 'btn-read-cheer');
  cheerBanner.appendChild(cheerBannerText);
  cheerBanner.appendChild(btnReadCheer);

  const headerLogo = new MockElement('div', 'header-logo');
  const btnNavTreasure = new MockElement('button', 'btn-nav-treasure');
  const btnNavParent = new MockElement('button', 'btn-nav-parent');
  const btnSoundToggle = new MockElement('button', 'btn-sound-toggle');
  const headerRankTitle = new MockElement('span', 'header-rank-title');
  const headerSelfCorrectCount = new MockElement('span', 'header-self-correct-count');

  const body = new MockElement('body');
  body.appendChild(headerLogo);
  body.appendChild(btnNavTreasure);
  body.appendChild(btnNavParent);
  body.appendChild(btnSoundToggle);
  body.appendChild(headerRankTitle);
  body.appendChild(headerSelfCorrectCount);
  body.appendChild(offlineBanner);
  body.appendChild(cheerBanner);
  body.appendChild(viewContainer);
  body.appendChild(modalRoot);
  body.appendChild(toastContainer);

  const elementsById = new Map([
    ['modal-root', modalRoot],
    ['view-container', viewContainer],
    ['toast-container', toastContainer],
    ['offline-banner', offlineBanner],
    ['cheer-banner', cheerBanner],
    ['cheer-banner-text', cheerBannerText],
    ['btn-read-cheer', btnReadCheer],
    ['header-logo', headerLogo],
    ['btn-nav-treasure', btnNavTreasure],
    ['btn-nav-parent', btnNavParent],
    ['btn-sound-toggle', btnSoundToggle],
    ['header-rank-title', headerRankTitle],
    ['header-self-correct-count', headerSelfCorrectCount]
  ]);

  const windowListeners = new Map();

  const mockDocument = {
    body,
    getElementById: (id) => elementsById.get(id) || body.querySelector('#' + id),
    createElement: (tag) => new MockElement(tag),
    querySelector: (sel) => body.querySelector(sel),
    querySelectorAll: (sel) => body.querySelectorAll(sel)
  };

  const mockWindow = {
    location: { hash: '#map' },
    addEventListener: (evt, fn) => {
      if (!windowListeners.has(evt)) windowListeners.set(evt, new Set());
      windowListeners.get(evt).add(fn);
    },
    removeEventListener: (evt, fn) => {
      if (windowListeners.has(evt)) windowListeners.get(evt).delete(fn);
    },
    dispatchEvent: (evt) => {
      const handlers = windowListeners.get(evt.type);
      if (handlers) {
        for (const h of handlers) h(evt);
      }
    },
    speechSynthesis: {
      speaking: false,
      paused: false,
      speak: () => {},
      cancel: () => {},
      getVoices: () => []
    },
    AudioContext: class {
      constructor() {
        this.state = 'running';
      }
      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
          start() {},
          stop() {}
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {}
        };
      }
      get destination() { return {}; }
      resume() { return Promise.resolve(); }
    },
    devicePixelRatio: 2
  };

  class MockSpeechUtterance {
    constructor(text = '') {
      this.text = text;
      this.lang = 'ja-JP';
      this.rate = 1.0;
      this.pitch = 1.0;
    }
  }

  SpeechService.setSpeechSynthesisProvider({
    speechSynthesis: mockWindow.speechSynthesis,
    SpeechSynthesisUtterance: MockSpeechUtterance
  });

  return {
    mockDocument,
    mockWindow,
    elementsById,
    modalRoot,
    viewContainer,
    cheerBanner,
    btnSoundToggle
  };
}

describe('Adversarial Lifecycle, Modal Teardown & Router Stress Testing', () => {
  let env;
  let origDoc;
  let origWin;
  let app;

  beforeEach(async () => {
    origDoc = global.document;
    origWin = global.window;

    env = setupMockEnvironment();
    global.document = env.mockDocument;
    global.window = env.mockWindow;

    app = new MathLabApp();
    await app.init();
  });

  afterEach(() => {
    if (app && app.activeViewComponent && typeof app.activeViewComponent.destroy === 'function') {
      app.activeViewComponent.destroy();
    }
    SpeechService.stopSpeech();
    global.document = origDoc;
    global.window = origWin;
  });

  // =========================================================================
  // Challenge 1: Cross-Component Interaction & Router Integration
  // =========================================================================
  describe('1. Cross-Component Router Wiring & Contract Interaction', () => {
    it('initializes default progress and mounts StageMap at #map with all worlds', () => {
      assert.ok(app.progress);
      assert.equal(app.currentRoute.view, '#map');
      assert.ok(app.activeViewComponent instanceof StageMap);
      assert.equal(env.viewContainer.children.length, 1);
      assert.equal(env.modalRoot.children.length, 0);
    });

    it('navigates to StageArena on #stage/stage-1, mounts keypad and canvas pad without modal leaks', () => {
      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();

      assert.equal(app.currentRoute.view, '#stage');
      assert.equal(app.currentRoute.param, 'stage-1');
      assert.ok(app.arenaKeypad);
      assert.ok(app.arenaCanvasPad);
      assert.equal(app.activeViewComponent, null, 'Arena does not use activeViewComponent');
      assert.equal(env.modalRoot.children.length, 0);
    });

    it('navigates to MiniLesson on #lesson/stage-1, mounts MiniLessonModal into modal-root', () => {
      global.window.location.hash = '#lesson/stage-1';
      app.handleRoute();

      assert.equal(app.currentRoute.view, '#lesson');
      assert.equal(app.currentRoute.param, 'stage-1');
      assert.ok(app.activeViewComponent instanceof MiniLessonModal);
      assert.equal(app.activeViewComponent.isOpen, true);
      assert.equal(env.modalRoot.children.length, 1);
    });

    it('completes MiniLesson, marks stage miniLessonSeen=true and routes to #stage/stage-1', () => {
      global.window.location.hash = '#lesson/stage-1';
      app.handleRoute();

      const modal = app.activeViewComponent;
      assert.ok(modal);

      // Advance through card 0
      modal.handleNext();
      assert.equal(modal.state.currentCardIndex, 1);

      // Answer quiz correctly
      const correctOpt = modal.lessonData?.card2?.correctOption || 'A';
      modal.handleOptionClick(correctOpt);
      assert.equal(modal.state.quizIsCorrect, true);

      // Advance to card 2 (Summary)
      modal.handleNext();
      assert.equal(modal.state.currentCardIndex, 2);

      // Final step: trigger onComplete -> navigates to #stage/stage-1
      modal.handleNext();

      assert.equal(global.window.location.hash, '#stage/stage-1');
      assert.equal(app.progress.stageProgress['stage-1']?.miniLessonSeen, true);
    });

    it('navigates to TreasureBox on #treasure, mounts TreasureBox and supports quarantined review', () => {
      // Seed a quarantined problem
      const prob = CurriculumEngine.generateProblem(1, 1, 1);
      addTreasureItem(app.progress.treasureBox, prob);

      global.window.location.hash = '#treasure';
      app.handleRoute();

      assert.equal(app.currentRoute.view, '#treasure');
      assert.ok(app.activeViewComponent instanceof TreasureBox);
      assert.equal(env.modalRoot.children.length, 0);
    });

    it('navigates to ParentBoard on #parent, verifies PIN unlock, radar charts, and cheer stamps', () => {
      global.window.location.hash = '#parent';
      app.handleRoute();

      assert.equal(app.currentRoute.view, '#parent');
      assert.ok(app.activeViewComponent instanceof ParentBoard);

      const board = app.activeViewComponent;
      assert.equal(board.isAuthenticated, false);

      // Enter valid PIN
      board.storedPin = '1234';
      const pinSuccess = verifyPin('1234', board.storedPin);
      assert.equal(pinSuccess, true);
      board.isAuthenticated = true;

      // Verify radar calculations across all worlds (count derived from metadata)
      const scores = calculateRadarScores(app.progress);
      assert.equal(typeof scores.world1, 'number');
      assert.equal(typeof scores.world5, 'number');
      assert.equal(typeof scores.world6, 'number');
      assert.equal(Object.keys(scores).length, CurriculumEngine.WORLDS_METADATA.length);

      // Create cheer stamp
      const stamp = createCheerStamp('STAMP_RECOVERY', '応援しているよ！');
      assert.equal(stamp.stampId, 'STAMP_RECOVERY');
      assert.equal(stamp.customText, '応援しているよ！');
      assert.equal(stamp.readByChild, false);

      app.progress.parentCheer.cheerMessages.push(stamp);
      app.checkCheerBanner();
      assert.equal(env.cheerBanner.style.display, 'flex');
    });

    it('renders exactly one learning scope card on the parent dashboard (Issue #22)', () => {
      global.window.location.hash = '#parent';
      app.handleRoute();

      const board = app.activeViewComponent;
      assert.ok(board instanceof ParentBoard);
      board.setupInitialPin('4321');

      const scopeCards = env.viewContainer.querySelectorAll('.learning-scope-card');
      assert.equal(scopeCards.length, 1, 'dashboard must contain exactly one .learning-scope-card');
      assert.ok(scopeCards[0].innerHTML.includes('このアプリの対象範囲'), 'scope card must show its title');
      assert.ok(scopeCards[0].innerHTML.includes('対象外'), 'scope card must mention out-of-scope topics');
    });
  });

  // =========================================================================
  // Challenge 2: Rapid Route Switching & Teardown Under Stress
  // =========================================================================
  describe('2. Rapid Route Switching & Boundary Resilience', () => {
    it('executes 100 rapid route switches across canonical routes, malformed hashes, and #stages without error', () => {
      const stressRoutes = [
        '#stages',             // Must safely fallback to #map
        '#treasure',
        '#parent',
        '#stage/stage-1',
        '#lesson/stage-2',
        '#map',
        '#stages/',            // Malformed with slash
        '#invalid-route',      // Unknown route
        '',                    // Empty
        '#',                   // Bare hash
        '#stage/stage-15',
        '#lesson/stage-15',
        '#treasure',
        '#parent',
        '#stage/stage-999'     // Out of range stage clamped to the last stage
      ];

      for (let i = 0; i < 100; i++) {
        const nextHash = stressRoutes[i % stressRoutes.length];
        global.window.location.hash = nextHash;
        assert.doesNotThrow(() => {
          app.handleRoute();
        }, `Route transition to "${nextHash}" at iteration ${i} threw an error`);

        // Assert invariant: modal-root must always be clean
        assert.equal(
          env.modalRoot.children.length <= 1,
          true,
          `modal-root should never accumulate leaked modals during route "${nextHash}"`
        );
      }

      // Final settling on #map
      global.window.location.hash = '#map';
      app.handleRoute();
      assert.equal(app.currentRoute.view, '#map');
      assert.ok(app.activeViewComponent instanceof StageMap);
      assert.equal(env.modalRoot.children.length, 0);
    });

    it('safely handles "#stages" as an alias falling back to #map view', () => {
      global.window.location.hash = '#stages';
      app.handleRoute();

      assert.equal(app.currentRoute.view, '#map');
      assert.ok(app.activeViewComponent instanceof StageMap);
      assert.equal(env.viewContainer.children.length, 1);
    });
  });

  // =========================================================================
  // Challenge 3: Active Modal Teardowns & Cancellation of Running Timers
  // =========================================================================
  describe('3. Active Modal Teardowns & Running Timer Cancellation', () => {
    it('abruptly navigates away while TreasureBox review timer is pending without leaking or executing callback', () => {
      global.window.location.hash = '#treasure';
      app.handleRoute();

      const treasureBox = app.activeViewComponent;
      assert.ok(treasureBox instanceof TreasureBox);

      const prob = CurriculumEngine.generateProblem(1, 1, 1);
      const item = addTreasureItem(app.progress.treasureBox, prob);

      treasureBox.launchReviewModal(item);
      assert.ok(treasureBox.reviewModalEl);
      assert.equal(treasureBox.reviewModalEl.parentNode, global.document.body);

      // Simulate correct answer triggering setTimeout (1200ms)
      let timerCallbackFired = false;
      const originalSetTimeout = global.setTimeout;
      let recordedTimerId = null;

      global.setTimeout = (fn, ms) => {
        const id = originalSetTimeout(() => {
          timerCallbackFired = true;
          fn();
        }, ms);
        recordedTimerId = id;
        return id;
      };

      try {
        const submitBtn = treasureBox.reviewModalEl.querySelector('.review-submit-btn');
        const ansInput = treasureBox.reviewModalEl.querySelector('.review-answer-input');
        const promptDiv = treasureBox.reviewModalEl.querySelector('.modal-body div');
        const match = (promptDiv?._textContent || promptDiv?.textContent || '').match(/(\d+)\s*([\+\-×÷])\s*(\d+)/);
        let expAns = 0;
        if (match) {
          const n1 = Number(match[1]);
          const op = match[2];
          const n2 = Number(match[3]);
          if (op === '+') expAns = n1 + n2;
          else if (op === '-') expAns = n1 - n2;
          else if (op === '×') expAns = n1 * n2;
          else if (op === '÷') expAns = Math.floor(n1 / n2);
        }
        if (ansInput) ansInput.value = String(expAns);

        // Click submit to activate reviewTimer
        submitBtn?.click();
        assert.ok(treasureBox.reviewTimer, 'reviewTimer must be active');

        // ABRUPT ROUTE TRANSITION TO #parent BEFORE TIMER COMPLETES
        global.window.location.hash = '#parent';
        app.handleRoute();

        // Verify TreasureBox destroy was called: reviewTimer cleared and modal removed
        assert.equal(treasureBox.reviewTimer, null, 'reviewTimer must be cleared to null');
        assert.equal(treasureBox.reviewModalEl, null, 'reviewModalEl must be nullified');
        assert.equal(
          global.document.body.children.includes(treasureBox.reviewModalEl),
          false,
          'Modal must be detached from document.body'
        );
      } finally {
        global.setTimeout = originalSetTimeout;
        if (recordedTimerId) clearTimeout(recordedTimerId);
      }
    });

    it('BUG-010: closing the review modal manually after a correct answer still refreshes the treasure list immediately', async () => {
      // Isolate storage: without this, items trained by earlier tests in this
      // file linger in the shared in-memory fallback storage and the first
      // card in the list may be a leftover item, making this test pass even
      // when the refresh is broken (mutation testing, issue #13).
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#treasure';
      app.handleRoute();

      const treasureBox = app.activeViewComponent;
      assert.ok(treasureBox instanceof TreasureBox);

      const prob = CurriculumEngine.generateProblem(1, 1, 1);
      const item = addTreasureItem(app.progress.treasureBox, prob);
      treasureBox.update(app.progress);

      // Judge only this test's own card, identified by its item id.
      const ownCard = () => treasureBox.rootEl
        .querySelectorAll('.treasure-item-card')
        .find(c => c.dataset.itemId === item.id);
      assert.ok(ownCard(), 'own treasure card must be rendered');
      assert.ok(ownCard().innerHTML.includes('0 / 2 連続正解'), ownCard().innerHTML);

      treasureBox.launchReviewModal(item);
      assert.ok(treasureBox.reviewModalEl);

      const submitBtn = treasureBox.reviewModalEl.querySelector('.review-submit-btn');
      const ansInput = treasureBox.reviewModalEl.querySelector('.review-answer-input');
      const promptDiv = treasureBox.reviewModalEl.querySelector('.modal-body div');
      const match = (promptDiv?._textContent || promptDiv?.textContent || '').match(/(\d+)\s*([\+\-×÷])\s*(\d+)/);
      assert.ok(match, 'variation prompt must be parseable');
      const n1 = Number(match[1]);
      const op = match[2];
      const n2 = Number(match[3]);
      let expAns = 0;
      if (op === '+') expAns = n1 + n2;
      else if (op === '-') expAns = n1 - n2;
      else if (op === '×') expAns = n1 * n2;
      else if (op === '÷') expAns = Math.floor(n1 / n2);
      if (ansInput) ansInput.value = String(expAns);
      submitBtn?.click();

      assert.equal(item.consecutiveCorrect, 1);
      assert.ok(treasureBox.reviewTimer, 'auto-close timer must be pending after a correct answer');

      // Close manually via the ✕ button before the 1200ms auto-close fires.
      const closeBtn = treasureBox.reviewModalEl.querySelector('.modal-close-btn');
      closeBtn?.click();

      assert.equal(treasureBox.reviewModalEl, null);
      assert.equal(treasureBox.reviewTimer, null);
      // The list must already show the recorded progress, without a reload.
      // (Assert on this test's own card only: see the isolation note above.)
      const card = ownCard();
      assert.ok(card, 'own treasure card must be re-rendered after manual close');
      assert.ok(card.innerHTML.includes('1 / 2 連続正解'), card.innerHTML);
      assert.ok(card.innerHTML.includes('あと1回正解'), card.innerHTML);
    });

    it('BUG-010: closing the review modal manually after a wrong answer reflects the reset progress immediately', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#treasure';
      app.handleRoute();
      const treasureBox = app.activeViewComponent;
      assert.ok(treasureBox instanceof TreasureBox);

      const prob = CurriculumEngine.generateProblem(1, 1, 1);
      const item = addTreasureItem(app.progress.treasureBox, prob);
      // Start from 1 / 2 so a wrong answer visibly resets the card to 0 / 2.
      item.consecutiveCorrect = 1;
      item.masteryLevel = 1;
      treasureBox.update(app.progress);

      const ownCard = () => treasureBox.rootEl
        .querySelectorAll('.treasure-item-card')
        .find(c => c.dataset.itemId === item.id);
      assert.ok(ownCard().innerHTML.includes('1 / 2 連続正解'), ownCard().innerHTML);

      treasureBox.launchReviewModal(item);
      assert.ok(treasureBox.reviewModalEl);
      const submitBtn = treasureBox.reviewModalEl.querySelector('.review-submit-btn');
      const ansInput = treasureBox.reviewModalEl.querySelector('.review-answer-input');
      const quotientInput = treasureBox.reviewModalEl.querySelector('.review-quotient-input');
      const promptDiv = treasureBox.reviewModalEl.querySelector('.modal-body div');
      const match = (promptDiv?._textContent || promptDiv?.textContent || '').match(/(\d+)\s*([\+\-×÷])\s*(\d+)/);
      assert.ok(match, 'variation prompt must be parseable');
      const n1 = Number(match[1]);
      const op = match[2];
      const n2 = Number(match[3]);
      let expAns = 0;
      if (op === '+') expAns = n1 + n2;
      else if (op === '-') expAns = n1 - n2;
      else if (op === '×') expAns = n1 * n2;
      else if (op === '÷') expAns = Math.floor(n1 / n2);
      // Submit a deliberately wrong answer.
      if (ansInput) ansInput.value = String(expAns + 9);
      else if (quotientInput) quotientInput.value = String(expAns + 9);
      submitBtn?.click();
      assert.equal(item.consecutiveCorrect, 0, 'wrong answer must reset the streak');

      // Close manually via the cancel button; the list must show the reset.
      const cancelBtn = treasureBox.reviewModalEl.querySelector('.review-cancel-btn');
      cancelBtn?.click();
      assert.equal(treasureBox.reviewModalEl, null);
      const card = ownCard();
      assert.ok(card, 'own treasure card must be re-rendered after manual close');
      assert.ok(card.innerHTML.includes('0 / 2 連続正解'), card.innerHTML);
      assert.ok(card.innerHTML.includes('特訓待機中'), card.innerHTML);
    });

    it('BUG-009 guard: arena submissions are ignored while advancing to the next problem', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();
      const session = app.currentSession;
      assert.ok(session, 'arena session must exist');
      const prob = session.problems[session.currentIndex];

      // During the 600ms advance window a submission must be a silent no-op
      // (this is the guard whose absence/presence decides BUG-009 reports).
      session.isAdvancing = true;
      app.handleArenaSubmit(prob.correctAnswer.value);
      assert.equal(session.correctCount, 0);
      assert.equal(session.attempts, 0);
      assert.equal(session.currentIndex, 0);

      // Once advancing finishes, the same submission is accepted.
      session.isAdvancing = false;
      app.handleArenaSubmit(prob.correctAnswer.value);
      assert.equal(session.correctCount, 1);
      if (app.arenaAdvanceTimer) {
        clearTimeout(app.arenaAdvanceTimer);
        app.arenaAdvanceTimer = null;
      }
    });

    it('Issue #21: wrong arena answers are recorded in the diagnosis log and shown on the parent board', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();
      const session = app.currentSession;
      const prob = session.problems[session.currentIndex];

      assert.deepEqual(app.progress.diagnosisLog, []);
      app.handleArenaSubmit(prob.correctAnswer.value + 999);

      // The diagnosed pattern is appended with context and a timestamp.
      assert.equal(app.progress.diagnosisLog.length, 1);
      const logged = app.progress.diagnosisLog[0];
      assert.equal(logged.category, session.lastDiagnosis.reasonCategory);
      assert.equal(logged.worldId, session.worldId);
      assert.equal(logged.stageId, session.stageId);
      assert.ok(Number.isFinite(Date.parse(logged.at)), 'log entry must carry an ISO timestamp');

      // Correct answers do not add log entries.
      if (app.arenaStepGuide) {
        app.arenaStepGuide.destroy();
        app.arenaStepGuide = null;
      }
      app.handleArenaSubmit(prob.correctAnswer.value);
      assert.equal(app.progress.diagnosisLog.length, 1);
      if (app.arenaAdvanceTimer) {
        clearTimeout(app.arenaAdvanceTimer);
        app.arenaAdvanceTimer = null;
      }

      // Seed a resolved pattern (3 occurrences, all over 14 days old) and
      // verify the parent board renders focus + resolved sections.
      const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      for (let i = 0; i < 3; i++) {
        app.progress.diagnosisLog.push({ category: 'borrow_forgotten', worldId: 1, stageId: 'stage-2', at: old });
      }
      const board = new ParentBoard({ progress: app.progress, pin: '4321' });
      const dashboard = board.renderDashboardView();
      const dashHtml = dashboard.children.map((c) => c.innerHTML || '').join('\n');
      assert.ok(dashHtml.includes('つまずきパターンの記録'), 'diagnosis card title must render');
      assert.ok(dashHtml.includes('今の重点パターン'), 'focus section must render');
      assert.ok(dashHtml.includes('解消したパターン'), 'resolved section must render');
      assert.ok(dashHtml.includes('くり下がり忘れ'), 'resolved pattern label must render');
    });

    it('Issue #21: empty keypad submissions do not add diagnosis log entries', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();
      const session = app.currentSession;
      const prob = session.problems[session.currentIndex];
      const wrongValue = prob.correctAnswer.value + 999;

      // 決定 pressed with an untouched keypad (both text fields empty):
      // not a real mistake, so nothing is recorded.
      app.handleArenaSubmit(wrongValue, { quotientText: '', remainderText: '', hasRemainder: false });
      assert.equal(app.progress.diagnosisLog.length, 0);
      if (app.arenaStepGuide) {
        app.arenaStepGuide.destroy();
        app.arenaStepGuide = null;
      }

      // The same wrong value with actual keypad input is recorded.
      app.handleArenaSubmit(wrongValue, { quotientText: String(wrongValue), remainderText: '', hasRemainder: false });
      assert.equal(app.progress.diagnosisLog.length, 1);
      if (app.arenaStepGuide) {
        app.arenaStepGuide.destroy();
        app.arenaStepGuide = null;
      }
    });

    it('Issue #21: diagnosis log is persisted on wrong answers even without a treasure box', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();
      const session = app.currentSession;
      const prob = session.problems[session.currentIndex];

      // Legacy-style progress with no treasure box: the wrong-answer save
      // used to be skipped entirely for this shape, losing the log entry.
      delete app.progress.treasureBox;
      app.handleArenaSubmit(prob.correctAnswer.value + 999);
      assert.equal(app.progress.diagnosisLog.length, 1);

      // The Tier 1 write is synchronous, so the entry must already be
      // persisted by the time handleArenaSubmit returns.
      const persisted = StorageService.readLocalProgress();
      assert.ok(persisted, 'progress must be persisted after a wrong answer');
      assert.equal(persisted.diagnosisLog.length, 1);
      assert.equal(persisted.diagnosisLog[0].category, app.progress.diagnosisLog[0].category);
      if (app.arenaStepGuide) {
        app.arenaStepGuide.destroy();
        app.arenaStepGuide = null;
      }
    });

    it('Issue #21: parent board shows an empty state when no diagnosis log exists', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      const board = new ParentBoard({ progress: app.progress, pin: '4321' });
      const dashboard = board.renderDashboardView();
      const dashHtml = dashboard.children.map((c) => c.innerHTML || '').join('\n');
      assert.ok(dashHtml.includes('つまずきパターンの記録'));
      assert.ok(dashHtml.includes('まだ記録がありません'), 'empty state must render');
    });

    it('abruptly navigates away while MiniLessonModal TTS speech is active, stopping audio immediately', () => {
      let speechCanceled = false;
      const origCancel = global.window.speechSynthesis.cancel;
      global.window.speechSynthesis.cancel = () => {
        speechCanceled = true;
        if (origCancel) origCancel();
      };
      global.speechSynthesis = global.window.speechSynthesis;

      try {
        global.window.location.hash = '#lesson/stage-2';
        app.handleRoute();

        const lessonModal = app.activeViewComponent;
        assert.ok(lessonModal instanceof MiniLessonModal);
        assert.equal(lessonModal.isOpen, true);
        assert.equal(env.modalRoot.children.length, 1);

        // Simulate speaking
        lessonModal.startAudio();

        // ABRUPT ROUTE TRANSITION TO #stage/stage-2
        global.window.location.hash = '#stage/stage-2';
        app.handleRoute();

        // Verify audio stopped, modal destroyed and modalRoot cleared
        assert.equal(speechCanceled, true, 'Speech synthesis must be canceled');
        assert.equal(lessonModal.isOpen, false);
        assert.equal(lessonModal.modalEl, null);
        assert.equal(env.modalRoot.children.length, 0);
      } finally {
        global.window.speechSynthesis.cancel = origCancel;
      }
    });

    it('abruptly navigates away while StepGuideModal is open in StageArena without lingering modal overlay', () => {
      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();

      assert.ok(app.arenaKeypad);
      const prob = app.currentSession.problems[0];

      // Launch StepGuideModal (e.g. after mistake)
      app.launchStepGuide(prob);
      assert.ok(app.arenaStepGuide);
      assert.equal(env.modalRoot.children.length, 1);

      // ABRUPT ROUTE TRANSITION TO #stages
      global.window.location.hash = '#stages';
      app.handleRoute();

      assert.equal(app.arenaStepGuide, null, 'arenaStepGuide must be nullified');
      assert.equal(env.modalRoot.children.length, 0, 'modal-root must be completely cleared');
    });

    it('BUG-009: step guide does not close on backdrop click, only via the close button', () => {
      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();

      const prob = app.currentSession.problems[0];
      app.launchStepGuide(prob);
      const guide = app.arenaStepGuide;
      assert.ok(guide);
      assert.equal(guide.isOpen, true);
      const overlay = guide.modalEl;
      assert.ok(overlay);

      // A click on the backdrop itself must NOT dismiss the guide: a stray
      // click right after opening used to erase every visible trace of the
      // wrong answer (BUG-009 root cause).
      overlay.click();
      assert.equal(guide.isOpen, true, 'backdrop click must not close the step guide');
      assert.equal(env.modalRoot.children.length, 1);

      // The explicit close button still closes it.
      const closeBtn = overlay.querySelector('.modal-close-btn');
      assert.ok(closeBtn, 'step guide must keep an explicit close button');
      closeBtn.click();
      assert.equal(guide.isOpen, false);
    });

    it('abruptly navigates away while StageCompleteModal is open, cleanly detaching the dialog', () => {
      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();

      // Trigger stage complete
      app.currentSession.correctCount = 5;
      app.handleArenaStageComplete();

      assert.ok(app.stageCompleteModal);
      assert.equal(env.modalRoot.children.length, 1);

      // Navigate to #treasure
      global.window.location.hash = '#treasure';
      app.handleRoute();

      assert.equal(app.stageCompleteModal, null, 'stageCompleteModal must be nullified');
      assert.equal(env.modalRoot.children.length, 0);
    });
  });

  // =========================================================================
  // Challenge 4: No Lingering Event Listeners & Clean Subcomponent Teardown
  // =========================================================================
  describe('4. Lingering Event Listeners & Resource Teardown Audit', () => {
    it('verifies CanvasPad cleans up all event listeners upon destroy()', () => {
      const container = new MockElement('div');
      const pad = new CanvasPad().mount(container);

      assert.ok(pad.canvas);
      assert.ok(pad._boundPointerDown);
      assert.ok(pad._boundPointerMove);
      assert.ok(pad._boundPointerUp);

      // Destroy CanvasPad
      pad.destroy();

      assert.equal(pad.canvas.listeners.get('pointerdown')?.size || 0, 0);
      assert.equal(pad.canvas.listeners.get('pointermove')?.size || 0, 0);
      assert.equal(pad.canvas.listeners.get('pointerup')?.size || 0, 0);
      assert.equal(pad.canvas.listeners.get('pointercancel')?.size || 0, 0);
      assert.equal(pad.toolbar.listeners.get('click')?.size || 0, 0);
    });

    it('verifies Keypad cleans up container click listener upon destroy()', () => {
      const container = new MockElement('div');
      const kp = new Keypad().mount(container);

      assert.ok(kp._boundClickHandler);
      assert.equal(container.listeners.get('click')?.size, 1);

      kp.destroy();

      assert.equal(container.listeners.get('click')?.size, 0);
    });

    it('BUG-009 hardening: keypad lock appearance survives re-render while locked', () => {
      const container = new MockElement('div');
      const kp = new Keypad().mount(container);

      kp.setLocked(true);
      let root = container.querySelector('.keypad-container');
      assert.ok(root, 'keypad root must exist after mount');
      assert.equal(root.classList.contains('keypad-locked'), true);

      // reset() re-renders (innerHTML rebuild): the fresh root must still
      // carry the locked appearance, matching the JS lock state. Before the
      // hardening, the class was lost here while input stayed blocked —
      // the exact "looks usable but does not react" shape of BUG-009.
      kp.reset(false, {});
      root = container.querySelector('.keypad-container');
      assert.equal(kp.locked, true);
      assert.equal(root.classList.contains('keypad-locked'), true, 're-render must re-apply the locked class');
      kp.pressKey('5');
      assert.equal(kp.state.quotientText, '', 'input stays blocked while locked');

      kp.setLocked(false);
      root = container.querySelector('.keypad-container');
      assert.equal(root.classList.contains('keypad-locked'), false);
      kp.destroy();
    });

    it('verifies sound effects toggle and mute state persistence across view transitions', () => {
      assert.equal(app.isMuted, false);

      // Click sound toggle button
      env.btnSoundToggle.click();
      assert.equal(app.isMuted, true);
      assert.equal(env.btnSoundToggle.textContent, '🔇');

      // Navigate across multiple routes
      global.window.location.hash = '#treasure';
      app.handleRoute();
      assert.equal(app.isMuted, true);

      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();
      assert.equal(app.isMuted, true);

      // Toggle sound back on
      env.btnSoundToggle.click();
      assert.equal(app.isMuted, false);
      assert.equal(env.btnSoundToggle.textContent, '🔊');
    });

    it('handles parent cheer unread message banner acknowledgment and state persistence', async () => {
      // Add unread cheer message
      app.progress.parentCheer.cheerMessages.push({
        id: 'cheer-test-1',
        stampId: 'STAMP_EFFORT',
        customText: 'がんばってるね！',
        sentAt: new Date().toISOString(),
        readByChild: false
      });

      app.checkCheerBanner();
      assert.equal(env.cheerBanner.style.display, 'flex');

      // Child clicks "確認する"
      const readBtn = env.elementsById.get('btn-read-cheer');
      assert.ok(readBtn);
      readBtn.click();

      assert.equal(env.cheerBanner.style.display, 'none');
      const msg = app.progress.parentCheer.cheerMessages.find(m => m.id === 'cheer-test-1');
      assert.equal(msg.readByChild, true);
    });
  });

  // =========================================================================
  // Challenge 5: Problem Failure Follow-Up & Self-Correction E2E Flow
  // =========================================================================
  describe('5. Problem Failure Follow-Up & Self-Correction E2E Flow', () => {
    let origSetTimeout;
    let origClearTimeout;

    function routeTo(hash) {
      global.window.location.hash = hash;
      app.handleRoute();
    }

    function getAllText(el) {
      if (!el) return '';
      let txt = el._textContent || '';
      for (const child of el.children || []) {
        txt += ' ' + getAllText(child);
      }
      return txt.trim();
    }

    function domClick(el) {
      assert.ok(el, 'Expected element for domClick');
      let stopped = false;
      let curr = el;
      while (curr && !stopped) {
        const evt = {
          type: 'click',
          target: el,
          currentTarget: curr,
          preventDefault() {},
          stopPropagation() { stopped = true; }
        };
        if (typeof curr.onclick === 'function') {
          curr.onclick(evt);
        }
        const handlers = curr.listeners?.get('click');
        if (handlers) {
          for (const h of Array.from(handlers)) {
            h(evt);
          }
        }
        curr = curr.parentNode;
      }
    }

    function getExpectedInput(prob) {
      const ea = prob.expectedAnswer || prob.correctAnswer || {};
      if (prob.hasRemainder || ea.remainder !== undefined) {
        return { quotient: Number(ea.quotient ?? 0), remainder: Number(ea.remainder ?? 0) };
      }
      const val = ea.value !== undefined ? ea.value : (prob.answer ?? 0);
      return Number(val);
    }

    function getWrongInput(prob) {
      const exp = getExpectedInput(prob);
      if (typeof exp === 'object') {
        return { quotient: exp.quotient + 1, remainder: exp.remainder + 1 };
      }
      return exp + 17;
    }

    function clickKeypadKey(viewContainer, key) {
      const btn = viewContainer.querySelector(`.key-btn[data-key="${key}"]`)
        || viewContainer.querySelectorAll('button').find(b => b.dataset.key === key || b.getAttribute('data-key') === key);
      assert.ok(btn, `Expected keypad button for key "${key}"`);
      domClick(btn);
    }

    function submitKeypadAnswer(viewContainer, answer) {
      clickKeypadKey(viewContainer, 'clear');
      if (typeof answer === 'object' && answer !== null) {
        for (const ch of String(answer.quotient)) clickKeypadKey(viewContainer, ch);
        clickKeypadKey(viewContainer, 'rem');
        for (const ch of String(answer.remainder)) clickKeypadKey(viewContainer, ch);
      } else {
        for (const ch of String(answer)) clickKeypadKey(viewContainer, ch);
      }
      clickKeypadKey(viewContainer, 'enter');
    }

    function pressEnterOnElement(el) {
      const evt = {
        type: 'keydown',
        key: 'Enter',
        target: el,
        currentTarget: el,
        preventDefault() {},
        stopPropagation() {}
      };
      const handlers = el.listeners.get('keydown');
      if (handlers) {
        for (const h of Array.from(handlers)) h(evt);
      }
    }

    function pressWindowKey(key, target = env.mockDocument.body) {
      env.mockWindow.dispatchEvent({
        type: 'keydown',
        key,
        target,
        preventDefault() {},
        stopPropagation() {}
      });
    }

    function solveStepGuideModal(stepGuide) {
      assert.ok(stepGuide, 'Expected active StepGuideModal');
      const total = stepGuide.session.steps.length;
      for (let i = 0; i < total; i++) {
        const expected = stepGuide.session.steps[stepGuide.session.currentStepIndex].expectedStepValue;
        const input = env.modalRoot.querySelector('.step-card.current .step-input')
          || env.modalRoot.querySelector('.step-input');
        const checkBtn = env.modalRoot.querySelector('.step-card.current .step-check-btn')
          || env.modalRoot.querySelector('.step-check-btn');
        assert.ok(input, `Expected .step-input for step ${i}`);
        assert.ok(checkBtn, `Expected .step-check-btn for step ${i}`);
        input.value = String(expected);
        domClick(checkBtn);
      }
    }

    function setupTimerCapture() {
      let nextId = 10000;
      const byId = new Map();
      origSetTimeout = global.setTimeout;
      origClearTimeout = global.clearTimeout;

      global.setTimeout = (fn, delay = 0, ...args) => {
        if (delay >= 500 && typeof fn === 'function') {
          const id = ++nextId;
          byId.set(id, () => {
            byId.delete(id);
            fn(...args);
          });
          return id;
        }
        return origSetTimeout(fn, delay, ...args);
      };
      global.clearTimeout = (id) => {
        if (byId.has(id)) {
          byId.delete(id);
          return;
        }
        return origClearTimeout(id);
      };
      return {
        byId,
        has(id) {
          return byId.has(id);
        },
        flushAdvance() {
          const id = app.arenaAdvanceTimer;
          assert.ok(id !== null && id !== undefined, 'Expected app.arenaAdvanceTimer to be set');
          assert.ok(byId.has(id), 'Expected app.arenaAdvanceTimer to be registered in timers');
          const fn = byId.get(id);
          fn();
        }
      };
    }

    beforeEach(() => {
      GamificationEngine.resetGamificationState();
      app.syncGamificationProgress();
      app.updateHeaderStats();
    });

    afterEach(() => {
      if (origSetTimeout) {
        global.setTimeout = origSetTimeout;
        origSetTimeout = null;
      }
      if (origClearTimeout) {
        global.clearTimeout = origClearTimeout;
        origClearTimeout = null;
      }
      if (app.arenaStepGuide) {
        app.arenaStepGuide.destroy();
        app.arenaStepGuide = null;
      }
      if (app.arenaAdvanceTimer) {
        clearTimeout(app.arenaAdvanceTimer);
        app.arenaAdvanceTimer = null;
      }
    });

    it('clears arenaKeypad immediately on wrong answer and opens StepGuideModal with prompt and diagnosis', () => {
      routeTo('#stage/stage-1');
      const prob = app.currentSession.problems[0];
      submitKeypadAnswer(env.viewContainer, getWrongInput(prob));

      // Keypad must be cleared right away so wrong digits never linger
      assert.equal(app.arenaKeypad.state.quotientText, '');
      assert.equal(app.arenaKeypad.state.remainderText, '');

      // Modal opened with problem prompt and diagnosis banner
      assert.equal(env.modalRoot.children.length, 1);
      const overlay = env.modalRoot.querySelector('.modal-overlay.open');
      assert.ok(overlay);
      const banner = env.modalRoot.querySelector('.step-guide-problem-banner');
      assert.ok(banner);
      const promptEl = env.modalRoot.querySelector('.step-guide-problem-prompt');
      const diagEl = env.modalRoot.querySelector('.step-guide-diagnosis');
      assert.ok(promptEl);
      assert.ok(diagEl);
      assert.ok(getAllText(promptEl).length > 0);
      assert.ok(getAllText(diagEl).length > 0);
    });

    it('ignores physical window keydown events ("9" and "Enter") for background arenaKeypad while modal is open', () => {
      routeTo('#stage/stage-1');
      const prob = app.currentSession.problems[0];
      submitKeypadAnswer(env.viewContainer, getWrongInput(prob));

      assert.ok(env.modalRoot.querySelector('.modal-overlay.open'));
      assert.equal(app.arenaKeypad.state.quotientText, '');

      pressWindowKey('9');
      pressWindowKey('7');
      assert.equal(app.arenaKeypad.state.quotientText, '');

      const attemptsBefore = app.currentSession.attempts;
      pressWindowKey('Enter');
      const stepInput = env.modalRoot.querySelector('.step-input');
      pressWindowKey('5', stepInput);
      pressWindowKey('Enter', stepInput);

      assert.equal(app.arenaKeypad.state.quotientText, '');
      assert.equal(app.currentSession.attempts, attemptsBefore);
      assert.equal(env.modalRoot.children.length, 1);
    });

    it('blocks empty or whitespace-only step input submission in StepGuideModal DOM even when expectedStepValue is 0', () => {
      const zeroProb = {
        id: 'dom-zero-step',
        prompt: '10 ÷ 2 = ?',
        stepGuide: [
          { stepTitle: '余りを書こう', hint: '割り切れるときは 0 だよ', expectedStepValue: 0 }
        ]
      };
      const modal = new StepGuideModal({ problem: zeroProb });
      modal.open(env.modalRoot);

      const input = env.modalRoot.querySelector('.step-input');
      const checkBtn = env.modalRoot.querySelector('.step-check-btn');
      assert.ok(input && checkBtn);

      // Empty string must NOT coerce via Number("") === 0 and must not increment errorCount
      input.value = '';
      domClick(checkBtn);
      assert.equal(modal.session.completed, false);
      assert.equal(modal.session.stepAnswers[0], undefined);
      assert.equal(modal.session.errorCount, 0);
      assert.ok(getAllText(env.modalRoot.querySelector('.step-hint-box')).length > 0);

      // Whitespace-only Enter keydown must also be rejected
      const currentInput = env.modalRoot.querySelector('.step-input');
      currentInput.value = '   ';
      pressEnterOnElement(currentInput);
      assert.equal(modal.session.completed, false);
      assert.equal(modal.session.stepAnswers[0], undefined);
      assert.equal(modal.session.errorCount, 0);

      // Actual "0" must pass cleanly
      const finalInput = env.modalRoot.querySelector('.step-input');
      finalInput.value = '0';
      domClick(env.modalRoot.querySelector('.step-check-btn'));
      assert.equal(modal.session.completed, true);
      assert.ok(env.modalRoot.querySelector('.step-guide-complete-banner'));
      assert.ok(env.modalRoot.querySelector('.step-finish-btn'));

      modal.destroy();
    });

    it('clears wrong step input, keeps completion banner open until .step-finish-btn click, shows summary, and avoids digit concatenation on retry', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const prob = app.currentSession.problems[0];
      submitKeypadAnswer(env.viewContainer, getWrongInput(prob));

      const stepGuide = app.arenaStepGuide;
      assert.ok(stepGuide);

      // Submit a wrong step value first
      const firstExpected = stepGuide.session.steps[0].expectedStepValue;
      const firstInput = env.modalRoot.querySelector('.step-card.current .step-input');
      firstInput.value = String(firstExpected + 99);
      domClick(env.modalRoot.querySelector('.step-card.current .step-check-btn'));

      assert.equal(stepGuide.session.errorCount, 1);
      assert.ok(getAllText(env.modalRoot.querySelector('.step-hint-box')).length > 0);
      // On wrong answer, the active .step-input must be cleared cleanly
      assert.equal(env.modalRoot.querySelector('.step-card.current .step-input').value, '');

      // Complete all steps
      solveStepGuideModal(stepGuide);

      // Completion banner & "問題へ戻る" button stay visible BEFORE click; no premature close or self-correction credit
      assert.ok(app.arenaStepGuide, 'StepGuideModal should remain open on completion banner');
      assert.ok(env.modalRoot.querySelector('.modal-overlay.open'));
      assert.ok(env.modalRoot.querySelector('.step-guide-complete-banner'));
      const finishBtn = env.modalRoot.querySelector('.step-finish-btn');
      assert.ok(finishBtn);
      assert.equal(app.currentSession.wasSelfCorrected, true);
      assert.equal(app.progress.gamification.selfCorrectionCount, 0);

      // Click "問題へ戻る"
      domClick(finishBtn);
      assert.equal(app.arenaStepGuide, null);
      assert.equal(env.modalRoot.children.length, 0);
      assert.equal(app.arenaKeypad.state.quotientText, '');
      assert.equal(app.arenaKeypad.state.remainderText, '');

      // Summary banner populated in arena
      const summary = env.viewContainer.querySelector('#arena-step-summary');
      assert.ok(summary);
      assert.ok(getAllText(summary).length > 0);

      // Re-submit the exact correct answer via keypad without digit concatenation
      submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
      assert.equal(app.currentSession.selfCorrectedCount, 1);
      assert.equal(app.progress.gamification.selfCorrectionCount, 1);
      assert.ok(getAllText(env.elementsById.get('header-self-correct-count')).includes('1'));
      assert.ok(timers.has(app.arenaAdvanceTimer));
      timers.flushAdvance();
    });

    it('prevents double-submission during arenaAdvanceTimer and cancels timer on route change', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const prob = app.currentSession.problems[0];

      submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
      assert.equal(app.currentSession.isAdvancing, true);
      assert.equal(app.currentSession.correctCount, 1);
      const firstTimerId = app.arenaAdvanceTimer;
      assert.ok(firstTimerId !== null && timers.has(firstTimerId));

      // Second submission while advancing must be ignored
      submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
      assert.equal(app.currentSession.correctCount, 1);
      assert.equal(app.arenaAdvanceTimer, firstTimerId);

      // Route change must cancel the pending advance timer
      routeTo('#map');
      assert.equal(app.arenaAdvanceTimer, null);
      assert.equal(timers.has(firstTimerId), false);
    });

    it('BUG-009: correct submit clears the keypad and locks it until the next problem renders', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const prob = app.currentSession.problems[0];

      submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
      assert.equal(app.currentSession.correctCount, 1);
      assert.equal(app.currentSession.isAdvancing, true);
      // The just-submitted answer disappears immediately and the keypad
      // refuses further input for the rest of the advance window.
      assert.equal(app.arenaKeypad.locked, true);
      assert.equal(app.arenaKeypad.state.quotientText, '');
      app.arenaKeypad.pressKey('9');
      assert.equal(app.arenaKeypad.state.quotientText, '', 'locked keypad must not register digits');

      // When the advance timer renders the next problem, input works again.
      timers.flushAdvance();
      assert.equal(app.currentSession.isAdvancing, false);
      assert.equal(app.arenaKeypad.locked, false);
      app.arenaKeypad.pressKey('9');
      assert.equal(app.arenaKeypad.state.quotientText, '9');
    });

    it('resets activeField from remainder back to quotient on Stage 7 division-with-remainder failure and self-correction', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-7');
      const prob = app.currentSession.problems[0];
      assert.equal(app.arenaKeypad.state.hasRemainder, true);

      // Fail while activeField is 'remainder'
      const wrong = getWrongInput(prob);
      submitKeypadAnswer(env.viewContainer, wrong);

      // Both fields cleared AND activeField reset back to 'quotient'
      assert.equal(app.arenaKeypad.state.quotientText, '');
      assert.equal(app.arenaKeypad.state.remainderText, '');
      assert.equal(app.arenaKeypad.state.activeField, 'quotient');

      solveStepGuideModal(app.arenaStepGuide);
      domClick(env.modalRoot.querySelector('.step-finish-btn'));

      assert.equal(app.arenaKeypad.state.quotientText, '');
      assert.equal(app.arenaKeypad.state.remainderText, '');
      assert.equal(app.arenaKeypad.state.activeField, 'quotient');

      // Now enter the true quotient and remainder
      submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
      assert.equal(app.currentSession.selfCorrectedCount, 1);
      assert.equal(app.progress.gamification.selfCorrectionCount, 1);
      timers.flushAdvance();
    });

    it('tracks multiple self-corrections across a full 5-question stage and persists exact stars and counts', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const total = app.currentSession.problems.length;
      assert.equal(total, 5);

      for (let i = 0; i < total; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        if (i < 3) {
          // Fail first, walk through StepGuideModal, finish back to arena, then enter right answer
          submitKeypadAnswer(env.viewContainer, getWrongInput(prob));
          solveStepGuideModal(app.arenaStepGuide);
          domClick(env.modalRoot.querySelector('.step-finish-btn'));
        }
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < total - 1) {
          assert.ok(timers.has(app.arenaAdvanceTimer));
          timers.flushAdvance();
        }
      }

      assert.equal(app.currentSession.selfCorrectedCount, 3);
      assert.equal(app.currentSession.firstTryCount, 2);
      assert.equal(app.progress.stageProgress['stage-1'].cleared, true);
      assert.equal(app.progress.stageProgress['stage-1'].selfCorrectedCount, 3);
      assert.equal(app.progress.stageProgress['stage-1'].firstTryCorrectCount, 2);
      assert.equal(app.progress.stageProgress['stage-1'].stars, 3);
      assert.equal(app.progress.gamification.selfCorrectionCount, 3);
    });

    it('Issue #23: perfect first-try clear offers a challenge set recorded per stage without touching stars', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const total = app.currentSession.problems.length;

      for (let i = 0; i < total; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < total - 1) timers.flushAdvance();
      }

      // The normal clear record is already finalized when the offer appears
      assert.equal(app.currentSession.firstTryCount, total);
      assert.equal(app.progress.stageProgress['stage-1'].stars, 3);
      assert.ok(app.stageCompleteModal, 'stage complete modal must be open');

      const challengeBtn = app.stageCompleteModal.querySelector('.btn-stage-challenge');
      assert.ok(challengeBtn, 'challenge button must be offered on a perfect first-try clear');
      assert.equal(app.stageCompleteModal.querySelector('.btn-stage-training'), null);

      // Snapshot every side-effect channel the extra session must not touch
      const scoreBefore = app.progress.gamification.totalScore;
      const expBefore = app.progress.gamification.labExp;
      const selfCorrBefore = app.progress.gamification.selfCorrectionCount;
      const ticketsBefore = app.progress.bonusGame.tickets;
      const treasureBefore = app.progress.treasureBox.items.length;

      domClick(challengeBtn);
      assert.equal(app.stageCompleteModal, null);
      assert.equal(app.currentSession.mode, 'challenge');
      assert.equal(app.currentSession.problems.length, 3);
      assert.ok(app.currentSession.problems.every((p) => p.difficultyLevel === 'challenge'));

      for (let i = 0; i < 3; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        if (i === 0) {
          // Miss once and self-correct: extra sessions record first-try
          // performance, so this must lower the recorded first-try count
          // (a plain correct count would stay a meaningless perfect 3).
          submitKeypadAnswer(env.viewContainer, getWrongInput(prob));
          solveStepGuideModal(app.arenaStepGuide);
          domClick(env.modalRoot.querySelector('.step-finish-btn'));
        }
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < 2) timers.flushAdvance();
      }

      const sp = app.progress.stageProgress['stage-1'];
      assert.equal(sp.challenge.played, true);
      assert.equal(sp.challenge.attempts, 1);
      assert.equal(sp.challenge.lastFirstTryCount, 2);
      assert.equal(sp.challenge.bestFirstTryCount, 2);
      assert.equal(sp.challenge.lastSelfCorrectedCount, 1);
      assert.equal(sp.stars, 3, 'challenge results must not change stars');
      // No side effects: misses in extra sessions never enter the treasure
      // box, and no score / EXP / self-correction / ticket counters move.
      assert.equal(app.progress.treasureBox.items.length, treasureBefore, 'extra-session misses must not enter the treasure box');
      assert.equal(app.progress.gamification.totalScore, scoreBefore, 'extra sessions must not award score');
      assert.equal(app.progress.gamification.labExp, expBefore, 'extra sessions must not award EXP');
      assert.equal(app.progress.gamification.selfCorrectionCount, selfCorrBefore, 'extra sessions must not count self-corrections');
      assert.equal(app.progress.bonusGame.tickets, ticketsBefore, 'extra sessions must not award tickets');
      assert.ok(app.stageCompleteModal, 'extra-session result modal must be open');
      assert.ok(app.stageCompleteModal.querySelector('.btn-extra-finish'));
    });

    it('Issue #23: missing the same category twice offers targeted training recorded per stage', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const total = app.currentSession.problems.length;

      for (let i = 0; i < total; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        if (i < 2) {
          submitKeypadAnswer(env.viewContainer, getWrongInput(prob));
          solveStepGuideModal(app.arenaStepGuide);
          domClick(env.modalRoot.querySelector('.step-finish-btn'));
        }
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < total - 1) timers.flushAdvance();
      }

      const records = app.currentSession.errorRecords;
      assert.equal(records.length, 2);
      const category = records[0].reasonCategory;
      assert.equal(records[1].reasonCategory, category, 'both misses must share one category for this scenario');
      assert.equal(app.currentSession.firstTryCount, 3);

      assert.ok(app.stageCompleteModal, 'stage complete modal must be open');
      const trainingBtn = app.stageCompleteModal.querySelector('.btn-stage-training');
      assert.ok(trainingBtn, 'training button must be offered when a category was missed twice');
      assert.equal(app.stageCompleteModal.querySelector('.btn-stage-challenge'), null);

      // Snapshot every side-effect channel the extra session must not touch
      // (the 2 normal-session misses already added 2 treasure items).
      const scoreBefore = app.progress.gamification.totalScore;
      const expBefore = app.progress.gamification.labExp;
      const ticketsBefore = app.progress.bonusGame.tickets;
      const treasureBefore = app.progress.treasureBox.items.length;

      domClick(trainingBtn);
      assert.equal(app.currentSession.mode, 'training');
      assert.equal(app.currentSession.trainingCategory, category);
      assert.equal(app.currentSession.problems.length, 3);
      assert.ok(app.currentSession.problems.every((p) => p.variationOf), 'training problems must be variations of missed problems');

      for (let i = 0; i < 3; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < 2) timers.flushAdvance();
      }

      const sp = app.progress.stageProgress['stage-1'];
      assert.equal(sp.training.sessions, 1);
      assert.equal(sp.training.lastCategory, category);
      assert.equal(sp.training.lastFirstTryCount, 3);
      assert.equal(sp.training.bestFirstTryCount, 3);
      assert.equal(sp.training.lastSelfCorrectedCount, 0);
      assert.equal(sp.cleared, true);
      // No side effects from the extra session itself
      assert.equal(app.progress.treasureBox.items.length, treasureBefore, 'extra sessions must not add treasure items');
      assert.equal(app.progress.gamification.totalScore, scoreBefore, 'extra sessions must not award score');
      assert.equal(app.progress.gamification.labExp, expBefore, 'extra sessions must not award EXP');
      assert.equal(app.progress.bonusGame.tickets, ticketsBefore, 'extra sessions must not award tickets');
      assert.ok(app.stageCompleteModal.querySelector('.btn-extra-finish'));
    });

    it('Issue #23: designed trap values on two different problems offer training for that specific category', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const total = app.currentSession.problems.length;

      for (let i = 0; i < total; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        if (i < 2) {
          // Answer with the problem's designed trap value so the diagnosis
          // lands on the specific trap category (stage 1-1 addition traps
          // are carry_forgotten), not the general_recheck fallback.
          const trap = prob.commonTrap;
          assert.ok(trap && trap.mistakeValue !== undefined, 'problem must carry a designed trap');
          assert.equal(trap.reasonCategory, 'carry_forgotten');
          submitKeypadAnswer(env.viewContainer, trap.mistakeValue);
          solveStepGuideModal(app.arenaStepGuide);
          domClick(env.modalRoot.querySelector('.step-finish-btn'));
        }
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < total - 1) timers.flushAdvance();
      }

      const records = app.currentSession.errorRecords;
      assert.equal(records.length, 2);
      assert.notEqual(records[0].problem.id, records[1].problem.id, 'misses must be on two different problems');
      assert.equal(records[0].reasonCategory, 'carry_forgotten', 'trap value must diagnose as the specific category');
      assert.equal(records[1].reasonCategory, 'carry_forgotten');

      assert.ok(app.stageCompleteModal, 'stage complete modal must be open');
      const trainingBtn = app.stageCompleteModal.querySelector('.btn-stage-training');
      assert.ok(trainingBtn, 'training button must be offered for the specific trap category');
      assert.ok(
        getAllText(trainingBtn).includes('くり上がり'),
        'training button must name the specific category'
      );
      assert.equal(app.stageCompleteModal.querySelector('.btn-stage-challenge'), null);

      domClick(trainingBtn);
      assert.equal(app.currentSession.mode, 'training');
      assert.equal(app.currentSession.trainingCategory, 'carry_forgotten');
      assert.equal(app.currentSession.problems.length, 3);
    });

    it('Issue #23: missing the same problem twice does not offer training (distinct-problem rule)', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const total = app.currentSession.problems.length;

      for (let i = 0; i < total; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        if (i === 0) {
          // Miss the SAME problem twice (two error records, one problem)
          for (let miss = 0; miss < 2; miss++) {
            submitKeypadAnswer(env.viewContainer, getWrongInput(prob));
            solveStepGuideModal(app.arenaStepGuide);
            domClick(env.modalRoot.querySelector('.step-finish-btn'));
          }
        }
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < total - 1) timers.flushAdvance();
      }

      assert.equal(app.currentSession.errorRecords.length, 2, 'both misses are recorded');
      assert.equal(
        app.currentSession.errorRecords[0].problem.id,
        app.currentSession.errorRecords[1].problem.id,
        'both misses belong to the same problem'
      );
      assert.equal(
        app.currentSession.errorRecords[0].reasonCategory,
        app.currentSession.errorRecords[1].reasonCategory
      );
      assert.ok(app.stageCompleteModal, 'stage complete modal must be open');
      assert.equal(
        app.stageCompleteModal.querySelector('.btn-stage-training'),
        null,
        'one problem missed twice must not qualify for targeted training'
      );
      assert.equal(app.stageCompleteModal.querySelector('.btn-stage-challenge'), null);
    });

    it('Issue #23: no adaptation offers appear without a perfect clear or a repeated category', () => {
      const timers = setupTimerCapture();
      routeTo('#stage/stage-1');
      const total = app.currentSession.problems.length;

      for (let i = 0; i < total; i++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        if (i === 0) {
          submitKeypadAnswer(env.viewContainer, getWrongInput(prob));
          solveStepGuideModal(app.arenaStepGuide);
          domClick(env.modalRoot.querySelector('.step-finish-btn'));
        }
        submitKeypadAnswer(env.viewContainer, getExpectedInput(prob));
        if (i < total - 1) timers.flushAdvance();
      }

      assert.equal(app.currentSession.firstTryCount, 4);
      assert.equal(app.currentSession.errorRecords.length, 1);
      assert.ok(app.stageCompleteModal, 'stage complete modal must be open');
      assert.equal(app.stageCompleteModal.querySelector('.btn-stage-challenge'), null);
      assert.equal(app.stageCompleteModal.querySelector('.btn-stage-training'), null);
      // Pre-existing offers are untouched
      assert.ok(app.stageCompleteModal.querySelector('.btn-stage-bonus'));
      assert.ok(app.stageCompleteModal.querySelector('.btn-stage-finish'));
    });

    it('TreasureBox review modal rejects empty input without submitting 0 and clears input with diagnosis on wrong answer', () => {
      const prob = CurriculumEngine.generateSingleProblem(1, 1, 1, 2);
      const item = addTreasureItem(app.progress.treasureBox, prob);

      const tb = new TreasureBox({
        progress: app.progress,
        onUpdateHeader: () => {
          app.syncGamificationProgress();
          app.updateHeaderStats();
        }
      });
      tb.render(env.viewContainer);
      tb.launchReviewModal(item);

      const variation = tb.currentVariation;
      assert.ok(tb.reviewModalEl);
      assert.equal(tb.reviewModalEl.classList.contains('open'), true);

      const submitBtn = tb.reviewModalEl.querySelector('.review-submit-btn');
      const feedbackBox = tb.reviewModalEl.querySelector('.review-feedback');
      const qInput = tb.reviewModalEl.querySelector('.review-quotient-input');
      const rInput = tb.reviewModalEl.querySelector('.review-remainder-input');
      const sInput = tb.reviewModalEl.querySelector('.review-answer-input');
      const primaryInput = variation.hasRemainder ? qInput : sInput;
      assert.ok(submitBtn && primaryInput);

      // Empty submission must NOT pass or close modal
      primaryInput.value = '';
      if (rInput) rInput.value = '';
      domClick(submitBtn);
      assert.ok(tb.reviewModalEl);
      assert.equal(item.masteryLevel, 0);
      assert.equal(feedbackBox.style.display, 'block');

      // Wrong answer must show diagnosis feedback and clear input
      const wrong = getWrongInput(variation);
      if (variation.hasRemainder) {
        qInput.value = String(wrong.quotient);
        rInput.value = String(wrong.remainder);
      } else {
        sInput.value = String(wrong);
      }
      domClick(submitBtn);
      assert.equal(primaryInput.value, '');
      assert.equal(item.masteryLevel, 0);
      assert.ok(tb.reviewModalEl);
      assert.equal(feedbackBox.style.display, 'block');

      // Correct answer resolves review via Enter key
      const right = getExpectedInput(variation);
      if (variation.hasRemainder) {
        qInput.value = String(right.quotient);
        rInput.value = String(right.remainder);
      } else {
        sInput.value = String(right);
      }
      pressEnterOnElement(primaryInput);
      assert.equal(item.masteryLevel, 1);

      tb.destroy();
    });

    it('Issue #20: wrong answer enqueues a spaced review; due banner starts a session that advances the schedule', () => {
      routeTo('#stage/stage-1');
      const prob = app.currentSession.problems[0];
      const itemsBefore = app.progress.treasureBox.items.length;
      const entriesBefore = app.progress.reviewQueue.entries.length;
      submitKeypadAnswer(env.viewContainer, getWrongInput(prob));

      // Existing treasure quarantine plus the new review-queue entry
      assert.equal(app.progress.treasureBox.items.length, itemsBefore + 1);
      assert.equal(app.progress.reviewQueue.entries.length, entriesBefore + 1);
      const entry = app.progress.reviewQueue.entries[entriesBefore];
      const item = app.progress.treasureBox.items[itemsBefore];
      assert.equal(entry.status, 'active');
      assert.equal(entry.stepIndex, 0);
      assert.ok(Date.parse(entry.dueAt) > Date.now(), 'first review must be scheduled in the future');
      // Treasure mastery is untouched by enqueueing
      assert.equal(item.masteryLevel, 0);
      assert.equal(item.consecutiveCorrect, 0);

      // Before the due date the map shows no review banner
      routeTo('#map');
      assert.ok(!getAllText(env.viewContainer).includes('今日の復習'), 'banner must be hidden before the due date');

      // Make the entry due and re-render the map
      entry.dueAt = new Date(Date.now() - 1000).toISOString();
      routeTo('#map');
      const mapText = getAllText(env.viewContainer);
      assert.ok(mapText.includes('今日の復習'), 'banner must appear once due');
      assert.ok(mapText.includes('1件'), 'banner must show the due count');

      // Start the session from the banner and answer the variation correctly
      const startBtn = env.viewContainer.querySelector('.btn-start-review-queue');
      assert.ok(startBtn, 'review start button must exist');
      domClick(startBtn);
      const box = app.reviewSessionBox;
      assert.ok(box?.reviewModalEl, 'scheduled review modal must open');
      const variation = box.currentVariation;
      const right = getExpectedInput(variation);
      if (variation.hasRemainder) {
        box.reviewModalEl.querySelector('.review-quotient-input').value = String(right.quotient);
        box.reviewModalEl.querySelector('.review-remainder-input').value = String(right.remainder);
      } else {
        box.reviewModalEl.querySelector('.review-answer-input').value = String(right);
      }
      box.reviewModalEl.querySelector('.review-submit-btn')?.click();

      // Due correct answer advances the schedule to step 1 (+3 days), without
      // touching the treasure-box mastery counters (separate concepts)
      assert.equal(entry.stepIndex, 1);
      assert.equal(entry.status, 'active');
      assert.ok(Date.parse(entry.dueAt) > Date.now() + 2 * 24 * 60 * 60 * 1000, 'next due is about 3 days later');
      assert.equal(item.consecutiveCorrect, 0, 'treasure progression must not change');

      box.destroy();
    });
  });

  // =========================================================================
  // Challenge 6: MiniLesson Visual Card & Next/Prev Navigation E2E Flow
  // =========================================================================
  describe('6. MiniLesson Visual Card & Next/Prev Navigation E2E Flow', () => {
    function routeTo(hash) {
      global.window.location.hash = hash;
      app.handleRoute();
    }

    function getAllText(el) {
      if (!el) return '';
      let txt = el._textContent || '';
      for (const child of el.children || []) {
        txt += ' ' + getAllText(child);
      }
      return txt.trim();
    }

    function domClick(el) {
      assert.ok(el, 'Expected element for domClick');
      let stopped = false;
      let curr = el;
      while (curr && !stopped) {
        const evt = {
          type: 'click',
          target: el,
          currentTarget: curr,
          preventDefault() {},
          stopPropagation() { stopped = true; }
        };
        if (typeof curr.onclick === 'function') {
          curr.onclick(evt);
        }
        const handlers = curr.listeners?.get('click');
        if (handlers) {
          for (const h of Array.from(handlers)) {
            h(evt);
          }
        }
        curr = curr.parentNode;
      }
    }

    it('navigates MiniLesson Card 0 <-> Card 1 <-> Card 2 via DOM button clicks without replaceChild NotFoundError and enforces quiz gate', () => {
      routeTo('#lesson/stage-1');
      assert.equal(env.modalRoot.children.length, 1);

      const modal = app.activeViewComponent;
      assert.ok(modal instanceof MiniLessonModal);

      // Card 0: Concept / Flash card should have rich visual & explanation content
      const placeholder = env.modalRoot.querySelector('.lesson-image-placeholder');
      assert.ok(placeholder, 'Card 0 must render .lesson-image-placeholder');
      const badge = env.modalRoot.querySelector('.lesson-concept-badge');
      const conceptTitle = env.modalRoot.querySelector('.lesson-concept-title');
      const visualDiagram = env.modalRoot.querySelector('.lesson-visual-diagram');
      const lessonText = env.modalRoot.querySelector('.lesson-text');
      const detailBody = env.modalRoot.querySelector('.lesson-detail-body');

      assert.ok(getAllText(badge).length > 0, 'Concept badge should be non-empty');
      assert.ok(getAllText(conceptTitle).length > 0, 'Concept title should be non-empty');
      assert.ok(getAllText(visualDiagram).length > 0, 'Visual diagram should be non-empty');
      assert.ok(getAllText(lessonText).length > 0, 'Lesson text should be non-empty');
      assert.ok(getAllText(detailBody).length > 0, 'Lesson detail body should be non-empty');

      const prevBtnCard0 = env.modalRoot.querySelector('.prev-card-btn');
      const nextBtnCard0 = env.modalRoot.querySelector('.next-card-btn');
      assert.equal(prevBtnCard0.disabled, true, 'Prev button must be disabled on Card 0');
      assert.equal(nextBtnCard0.disabled, false, 'Next button must be enabled on Card 0');

      // Advance Card 0 -> Card 1 via DOM click (would throw NotFoundError before fix)
      domClick(nextBtnCard0);
      assert.equal(env.modalRoot.children.length, 1);
      assert.equal(modal.state.currentCardIndex, 1);

      const quizQuestion = env.modalRoot.querySelector('.quiz-question');
      assert.ok(getAllText(quizQuestion).length > 0, 'Card 1 must render .quiz-question');
      assert.equal(env.modalRoot.querySelector('.prev-card-btn').disabled, false, 'Prev button must be enabled on Card 1');
      assert.equal(env.modalRoot.querySelector('.next-card-btn').disabled, true, 'Next button must be locked until quiz answered correctly');

      // Navigate back Card 1 -> Card 0 via DOM click
      domClick(env.modalRoot.querySelector('.prev-card-btn'));
      assert.equal(env.modalRoot.children.length, 1);
      assert.equal(modal.state.currentCardIndex, 0);
      assert.ok(env.modalRoot.querySelector('.lesson-visual-diagram'), 'Back on Card 0 visual diagram should be rendered');

      // Advance again Card 0 -> Card 1
      domClick(env.modalRoot.querySelector('.next-card-btn'));
      assert.equal(modal.state.currentCardIndex, 1);

      const lessonData = SpeechService.getMiniLessonData('stage-1');
      const correctOpt = lessonData.card2.correctOption;
      const wrongOpt = correctOpt === 'A' ? 'B' : 'A';

      // Click wrong option -> feedback shown, next button remains disabled
      domClick(env.modalRoot.querySelector(`.quiz-btn[data-option="${wrongOpt}"]`));
      assert.equal(modal.state.currentCardIndex, 1);
      assert.equal(modal.state.quizIsCorrect, false);
      assert.ok(getAllText(env.modalRoot.querySelector('.quiz-feedback')).length > 0, 'Wrong answer must display feedback');
      assert.equal(env.modalRoot.querySelector('.next-card-btn').disabled, true, 'Next button must stay disabled after wrong answer');

      // Click correct option -> feedback shown, next button unlocks
      domClick(env.modalRoot.querySelector(`.quiz-btn[data-option="${correctOpt}"]`));
      assert.equal(modal.state.quizIsCorrect, true);
      assert.ok(getAllText(env.modalRoot.querySelector('.quiz-feedback')).length > 0, 'Correct answer must display feedback');
      assert.equal(env.modalRoot.querySelector('.next-card-btn').disabled, false, 'Next button must unlock after correct answer');

      // Advance Card 1 -> Card 2
      domClick(env.modalRoot.querySelector('.next-card-btn'));
      assert.equal(env.modalRoot.children.length, 1);
      assert.equal(modal.state.currentCardIndex, 2);
      assert.ok(env.modalRoot.querySelector('.summary-box'), 'Card 2 must render .summary-box');
      assert.ok(getAllText(env.modalRoot.querySelector('.summary-rule')).length > 0, 'Card 2 must render non-empty .summary-rule');
      assert.equal(env.modalRoot.querySelector('.next-card-btn').textContent, '探検スタート！ 🚀');

      // Navigate back Card 2 -> Card 1 -> state preserved & next still unlocked
      domClick(env.modalRoot.querySelector('.prev-card-btn'));
      assert.equal(modal.state.currentCardIndex, 1);
      assert.equal(modal.state.quizIsCorrect, true);
      assert.equal(env.modalRoot.querySelector('.next-card-btn').disabled, false);

      // Complete Card 1 -> Card 2 -> Finish
      domClick(env.modalRoot.querySelector('.next-card-btn'));
      assert.equal(modal.state.currentCardIndex, 2);
      domClick(env.modalRoot.querySelector('.next-card-btn'));

      assert.equal(app.progress.stageProgress['stage-1']?.miniLessonSeen, true);
      assert.equal(global.window.location.hash, '#stage/stage-1');
    });

    it('renders non-empty concept title, visual diagram, and explanation for all stages and completes Card 0 -> Card 1 -> Card 2 via DOM', () => {
      const totalStages = CurriculumEngine.WORLDS_METADATA.reduce((n, w) => n + w.stages.length, 0);
      for (let s = 1; s <= totalStages; s++) {
        const sId = `stage-${s}`;
        routeTo(`#lesson/${sId}`);
        assert.equal(env.modalRoot.children.length, 1, `${sId}: modal should be mounted`);

        const titleEl = env.modalRoot.querySelector('.lesson-concept-title');
        const diagramEl = env.modalRoot.querySelector('.lesson-visual-diagram');
        const textEl = env.modalRoot.querySelector('.lesson-text');
        assert.ok(getAllText(titleEl).length > 0, `${sId}: concept title must not be empty`);
        assert.ok(getAllText(diagramEl).length > 0, `${sId}: visual diagram must not be empty`);
        assert.ok(getAllText(textEl).length > 0, `${sId}: lesson text must not be empty`);

        // Card 0 -> Card 1
        domClick(env.modalRoot.querySelector('.next-card-btn'));
        const correctOpt = SpeechService.getMiniLessonData(sId).card2.correctOption;
        const rightBtn = env.modalRoot.querySelector(`.quiz-btn[data-option="${correctOpt}"]`);
        assert.ok(rightBtn, `${sId}: correct option button ${correctOpt} must exist`);
        domClick(rightBtn);

        const nextBtnCard1 = env.modalRoot.querySelector('.next-card-btn');
        assert.equal(nextBtnCard1.disabled, false, `${sId}: next button should unlock on correct option`);

        // Card 1 -> Card 2
        domClick(nextBtnCard1);
        const summaryRule = env.modalRoot.querySelector('.summary-rule');
        assert.ok(getAllText(summaryRule).length > 0, `${sId}: Card 2 summary rule must not be empty`);
        assert.equal(env.modalRoot.children.length, 1, `${sId}: modal root should still have single modal`);
      }

      routeTo('#map');
      assert.equal(env.modalRoot.children.length, 0);
    });
  });

  // =========================================================================
  // Challenge 7: Bug Report Regression Suite (BUG-001 through BUG-006)
  // =========================================================================
  describe('7. Bug Report Regression Verification (BUG-001 to BUG-006)', () => {
    function getAllText(el) {
      if (!el) return '';
      let txt = el._textContent || '';
      for (const child of el.children || []) {
        txt += ' ' + getAllText(child);
      }
      return txt.trim();
    }

    function domClick(el) {
      assert.ok(el, 'Expected element for domClick');
      let stopped = false;
      let curr = el;
      while (curr && !stopped) {
        const evt = {
          type: 'click',
          target: el,
          currentTarget: curr,
          preventDefault() {},
          stopPropagation() { stopped = true; }
        };
        if (typeof curr.onclick === 'function') {
          curr.onclick(evt);
        }
        const handlers = curr.listeners?.get('click');
        if (handlers) {
          for (const h of Array.from(handlers)) {
            h(evt);
          }
        }
        curr = curr.parentNode;
      }
    }

    it('BUG-001: navigates MiniLesson via buttons and step dots, enforces quiz gate, and recovers if detached', () => {
      global.window.location.hash = '#lesson/stage-1';
      app.handleRoute();

      const modal = app.activeViewComponent;
      assert.ok(modal instanceof MiniLessonModal);

      // Step dot click on Card 1 advances Card 0 -> Card 1
      const dot1 = env.modalRoot.querySelector('.step-dot[data-step-index="1"]');
      domClick(dot1);
      assert.equal(modal.state.currentCardIndex, 1);

      // Clicking step dot 2 before solving quiz must stay on Card 1
      const dot2Locked = env.modalRoot.querySelector('.step-dot[data-step-index="2"]');
      domClick(dot2Locked);
      assert.equal(modal.state.currentCardIndex, 1);
      assert.equal(env.modalRoot.querySelector('.next-card-btn').disabled, true);

      // Simulate accidental DOM detachment -> refresh() must recover modal inside container
      const detachedEl = modal.modalEl;
      env.modalRoot.removeChild(detachedEl);
      assert.equal(env.modalRoot.children.length, 0);

      const correctOpt = SpeechService.getMiniLessonData('stage-1').card2.correctOption;
      modal.handleOptionClick(correctOpt);
      assert.equal(env.modalRoot.children.length, 1, 'refresh() must re-mount modal if detached while open');
      assert.equal(env.modalRoot.querySelector('.next-card-btn').disabled, false);

      // Advance to summary and start stage
      domClick(env.modalRoot.querySelector('.next-card-btn'));
      assert.equal(modal.state.currentCardIndex, 2);
      domClick(env.modalRoot.querySelector('.next-card-btn'));
      assert.equal(global.window.location.hash, '#stage/stage-1');
    });

    it('BUG-002: StageMap stars match ParentBoard displayStars immediately and after reload', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#stage/stage-1';
      app.handleRoute();

      // Answer all 5 questions (1 self-corrected, 4 first-try -> 3 stars)
      for (let q = 0; q < 5; q++) {
        const prob = app.currentSession.problems[app.currentSession.currentIndex];
        if (q === 0) {
          app.handleArenaSubmit(prob.correctAnswer.value + 999);
          app.arenaStepGuide.session.steps.forEach((step, idx) => {
            app.arenaStepGuide.submit(idx, step.expectedStepValue);
          });
          domClick(env.modalRoot.querySelector('.step-finish-btn'));
        }
        app.handleArenaSubmit(prob.correctAnswer.value);
        if (q < 4) {
          clearTimeout(app.arenaAdvanceTimer);
          app.arenaAdvanceTimer = null;
          app.updateArenaProblemDisplay();
        }
      }

      const expectedStars = app.progress.stageProgress['stage-1'].stars;
      assert.equal(expectedStars, 3);
      assert.equal(app.progress.gamification.stageStars['stage-1'], 3);
      assert.equal(app.progress.gamification.totalStars, 3);
      assert.equal(GamificationEngine.getUserProfile().stars, 3);

      // Verify StageMap displays 3 stars
      global.window.location.hash = '#map';
      app.handleRoute();
      const stage1Card = env.viewContainer.querySelector('.stage-card[data-stage-id="stage-1"] .stage-stars');
      assert.equal(getAllText(stage1Card), '⭐⭐⭐');

      // Verify ParentBoard displays 3 stars without discrepancy
      global.window.location.hash = '#parent';
      app.handleRoute();
      const board = app.activeViewComponent;
      board.setupInitialPin('4321');
      const dashText = getAllText(env.viewContainer);
      assert.ok(dashText.includes('⭐ 3 個'), `ParentBoard must show ⭐ 3 個, got: ${dashText}`);

      // Simulate reload by re-hydrating GamificationEngine from saved progress
      GamificationEngine.resetGamificationState();
      const reloadedProfile = GamificationEngine.loadGamificationState(app.progress);
      assert.equal(reloadedProfile.stars, 3);

      const boardAfterReload = new ParentBoard({
        container: env.viewContainer,
        progress: app.progress,
        pin: '4321'
      }).mount(env.viewContainer);
      boardAfterReload.authenticate('4321');
      assert.ok(getAllText(env.viewContainer).includes('⭐ 3 個'));
    });

    it('BUG-003: Keypad answer label matches stage operation (和/差/積/商/こたえ)', () => {
      const checkLabelForStage = (stageNum, expectedLabel, expectedRemLabel = null) => {
        global.window.location.hash = `#stage/stage-${stageNum}`;
        app.handleRoute();
        const qLabel = env.viewContainer.querySelector('.display-field-row[data-field="quotient"] .display-label');
        const prob = app.currentSession.problems[0];
        if (stageNum === 3) {
          assert.equal(getAllText(qLabel), 'こたえ', `Stage ${stageNum} (${prob.prompt}) should show こたえ`);
        } else {
          assert.equal(getAllText(qLabel), expectedLabel, `Stage ${stageNum} (${prob.operator}) label mismatch`);
        }
        if (expectedRemLabel) {
          const rLabel = env.viewContainer.querySelector('.display-field-row[data-field="remainder"] .display-label');
          assert.equal(getAllText(rLabel), expectedRemLabel);
        }
      };

      checkLabelForStage(1, '和 (こたえ)');
      checkLabelForStage(2, '差 (こたえ)');
      checkLabelForStage(3, 'こたえ');
      checkLabelForStage(5, '積 (こたえ)');
      checkLabelForStage(7, '商 (こたえ)', 'あまり');
      checkLabelForStage(13, 'こたえ');
    });

    it('BUG-004: ParentBoard hides default PIN 1234, supports initial setup, PIN change, and 5-strike lockout', async () => {
      StorageService.resetStorageState();
      GamificationEngine.resetGamificationState();
      app = new MathLabApp();
      await app.init();

      global.window.location.hash = '#parent';
      app.handleRoute();

      // Default PIN '1234' must never appear anywhere in DOM or placeholder
      const pinInput = env.viewContainer.querySelector('.pin-input');
      assert.ok(pinInput);
      const placeholder = pinInput.getAttribute('placeholder') || '';
      assert.equal(placeholder.includes('1234'), false, 'Placeholder must not expose default PIN 1234');
      assert.equal(getAllText(env.viewContainer).includes('1234'), false, 'PIN view text must not expose 1234');

      // First-time setup with custom PIN '5678'
      pinInput.value = '12'; // invalid (< 4 digits)
      domClick(env.viewContainer.querySelector('.btn-unlock'));
      assert.equal(app.activeViewComponent.isAuthenticated, false);
      assert.equal(env.viewContainer.querySelector('.pin-error-msg').style.display, 'block');

      const pinInputRetry = env.viewContainer.querySelector('.pin-input');
      pinInputRetry.value = '5678';
      domClick(env.viewContainer.querySelector('.btn-unlock'));
      assert.equal(app.activeViewComponent.isAuthenticated, true);
      assert.equal(app.progress.parentCheer.pinConfigured, true);
      assert.equal(app.progress.parentCheer.parentPinHash, '5678');

      // Change PIN from dashboard to '9012'
      const newPinInput = env.viewContainer.querySelector('.input-new-pin');
      assert.ok(newPinInput);
      newPinInput.value = '9012';
      domClick(env.viewContainer.querySelector('.btn-change-pin'));
      assert.equal(app.progress.parentCheer.parentPinHash, '9012');

      // Lock board and confirm old PIN '5678' fails and 5 failed attempts trigger lockout
      domClick(env.viewContainer.querySelector('.btn-lock'));
      assert.equal(app.activeViewComponent.isAuthenticated, false);

      for (let i = 0; i < 5; i++) {
        const input = env.viewContainer.querySelector('.pin-input');
        input.value = '5678';
        domClick(env.viewContainer.querySelector('.btn-unlock'));
      }

      assert.equal(app.activeViewComponent.isLockedOut(), true);
      assert.equal(env.viewContainer.querySelector('.pin-input').disabled, true);
      assert.equal(env.viewContainer.querySelector('.btn-unlock').disabled, true);
      assert.equal(app.activeViewComponent.authenticate('9012'), false, 'Even valid PIN must fail while locked out');
    });

    it('BUG-005: offline/online events show GitHub Pages local-only text vs localhost sync text', () => {
      const offlineBanner = env.elementsById.get('offline-banner');
      assert.ok(offlineBanner);

      // Static GitHub Pages environment
      global.window.location.protocol = 'https:';
      global.window.location.hostname = 'yoshikinoue.github.io';

      global.window.dispatchEvent({ type: 'offline' });
      assert.equal(offlineBanner.classList.contains('visible'), true);
      assert.ok(offlineBanner.textContent.includes('この端末に保存されます'));
      assert.equal(offlineBanner.textContent.includes('自動同期されます'), false);

      global.window.dispatchEvent({ type: 'online' });
      assert.equal(offlineBanner.classList.contains('visible'), false);
      assert.equal(offlineBanner.textContent.includes('自動同期されます'), false);

      // Local server environment
      global.window.location.protocol = 'http:';
      global.window.location.hostname = 'localhost';

      global.window.dispatchEvent({ type: 'offline' });
      assert.equal(offlineBanner.classList.contains('visible'), true);
      assert.ok(offlineBanner.textContent.includes('自動同期されます'));
    });
  });

  // =========================================================================
  // Challenge 8: Issue #16 World 6 Decimal Stage Integration
  // =========================================================================
  describe('8. Issue #16: World 6 Decimal Stage (Mini-Lesson -> Arena -> Clear)', () => {
    function routeTo(hash) {
      global.window.location.hash = hash;
      app.handleRoute();
    }

    function domClick(el) {
      assert.ok(el, 'Expected element for domClick');
      let stopped = false;
      let curr = el;
      while (curr && !stopped) {
        const evt = {
          type: 'click',
          target: el,
          currentTarget: curr,
          preventDefault() {},
          stopPropagation() { stopped = true; }
        };
        if (typeof curr.onclick === 'function') {
          curr.onclick(evt);
        }
        const handlers = curr.listeners?.get('click');
        if (handlers) {
          for (const h of Array.from(handlers)) {
            h(evt);
          }
        }
        curr = curr.parentNode;
      }
    }

    // Capture >=500ms timers (the 600ms arena advance window) for manual flush
    function captureTimers() {
      const origSetTimeout = global.setTimeout;
      const origClearTimeout = global.clearTimeout;
      const pending = new Map();
      let nextId = 1;
      global.setTimeout = (fn, delay = 0, ...args) => {
        if (delay >= 500 && typeof fn === 'function') {
          const id = nextId++;
          pending.set(id, () => {
            pending.delete(id);
            fn(...args);
          });
          return id;
        }
        return origSetTimeout(fn, delay, ...args);
      };
      global.clearTimeout = (id) => {
        if (pending.has(id)) {
          pending.delete(id);
          return;
        }
        return origClearTimeout(id);
      };
      return {
        flush(id) {
          const fn = pending.get(id);
          assert.ok(fn, 'expected a captured timer to flush');
          fn();
        },
        restore() {
          global.setTimeout = origSetTimeout;
          global.clearTimeout = origClearTimeout;
        }
      };
    }

    it('completes Stage 17 mini-lesson, answers all 5 problems via the decimal keypad, and clears the stage', () => {
      const timers = captureTimers();
      try {
        // 1. Mini-lesson for Stage 17 (World 6: 小数のたし算)
        routeTo('#lesson/stage-17');
        assert.equal(env.modalRoot.children.length, 1, 'lesson modal must be mounted');
        const modal = app.activeViewComponent;
        assert.ok(modal instanceof MiniLessonModal);

        domClick(env.modalRoot.querySelector('.next-card-btn')); // Card 0 -> Card 1
        const correctOpt = SpeechService.getMiniLessonData('stage-17').card2.correctOption;
        domClick(env.modalRoot.querySelector(`.quiz-btn[data-option="${correctOpt}"]`));
        domClick(env.modalRoot.querySelector('.next-card-btn')); // Card 1 -> Card 2
        domClick(env.modalRoot.querySelector('.next-card-btn')); // Finish -> arena

        assert.equal(app.progress.stageProgress['stage-17']?.miniLessonSeen, true);

        // 2. Arena for Stage 17 with the decimal keypad enabled
        routeTo('#stage/stage-17');
        const session = app.currentSession;
        assert.ok(session, 'arena session must exist');
        assert.equal(session.stageId, 'stage-17');
        assert.equal(session.worldId, 6);
        assert.equal(session.problems.length, 5);
        assert.ok(app.arenaKeypad, 'arena keypad must exist');
        assert.equal(app.arenaKeypad.state.hasDecimal, true, 'decimal keypad mode must be on for World 6');

        // The decimal point key itself must work in the arena (then clear it)
        app.arenaKeypad.pressKey('.');
        assert.equal(app.arenaKeypad.state.quotientText, '0.');
        app.arenaKeypad.pressKey('clear');
        assert.equal(app.arenaKeypad.state.quotientText, '');

        // 3. Answer all 5 problems by typing on the keypad
        for (let q = 0; q < 5; q++) {
          const prob = session.problems[session.currentIndex];
          assert.equal(prob.worldId, 6);
          const answerText = String(prob.correctAnswer.value);
          for (const ch of answerText) {
            app.arenaKeypad.pressKey(ch);
          }
          assert.equal(app.arenaKeypad.state.quotientText, answerText);
          app.arenaKeypad.pressKey('enter');
          assert.equal(session.correctCount, q + 1, `problem ${q + 1} (${prob.expression}) must be accepted`);
          if (q < 4) {
            timers.flush(app.arenaAdvanceTimer);
            assert.equal(app.arenaKeypad.locked, false, 'keypad must unlock for the next problem');
          }
        }

        // 4. Stage clear is recorded
        assert.equal(app.progress.stageProgress['stage-17'].cleared, true);
        assert.ok(app.progress.stageProgress['stage-17'].stars >= 1);
      } finally {
        timers.restore();
        if (app.arenaAdvanceTimer) {
          clearTimeout(app.arenaAdvanceTimer);
          app.arenaAdvanceTimer = null;
        }
      }
    });

    it('drops decimal mode when remainder mode is enabled (mutually exclusive input modes)', () => {
      const container = new MockElement('div');
      const keypad = new Keypad({ hasDecimal: true }).mount(container);
      assert.equal(keypad.state.hasDecimal, true);

      keypad.setHasRemainder(true);
      assert.equal(keypad.state.hasRemainder, true);
      assert.equal(keypad.state.hasDecimal, false, 'setHasRemainder(true) must clear state.hasDecimal');
      assert.equal(keypad.options.hasDecimal, false, 'setHasRemainder(true) must clear options.hasDecimal');
      keypad.pressKey('.');
      keypad.pressKey('5');
      assert.equal(keypad.state.quotientText, '5', 'decimal point must not be entered in remainder mode');
      keypad.destroy();

      // reset() applies the same exclusivity when both flags are requested
      const keypad2 = new Keypad({ hasDecimal: true }).mount(new MockElement('div'));
      keypad2.reset(true, { hasDecimal: true });
      assert.equal(keypad2.state.hasRemainder, true);
      assert.equal(keypad2.state.hasDecimal, false, 'reset with remainder must clear decimal mode');
      keypad2.destroy();
    });

    it('shows こたえ (not 商) as the keypad answer label on Stage 16 counting problems', () => {
      const getAllText = (el) => {
        if (!el) return '';
        let txt = el._textContent || '';
        for (const child of el.children || []) {
          txt += ' ' + getAllText(child);
        }
        return txt.trim();
      };

      routeTo('#stage/stage-16');
      const session = app.currentSession;
      assert.ok(session, 'arena session must exist');
      assert.equal(session.worldId, 6);
      // Stage metadata answerLabel ('こたえ') must win over the operator-derived
      // label for every problem pattern in this counting stage (× / ÷ / mixed)
      for (let i = 0; i < session.problems.length; i++) {
        session.currentIndex = i;
        app.updateArenaProblemDisplay();
        const prob = session.problems[i];
        const qLabel = env.viewContainer.querySelector('.display-field-row[data-field="quotient"] .display-label');
        assert.ok(qLabel, 'quotient label element must exist');
        assert.equal(getAllText(qLabel), 'こたえ', `Stage 16 (${prob.patternType}) must show こたえ`);
      }
    });
  });

  // =========================================================================
  // Challenge 9: Issue #17 Pi Review Follow-ups
  // =========================================================================
  describe('9. Issue #17: Pi Review Follow-ups (Fraction Arena Guard & Visuals)', () => {
    function routeTo(hash) {
      global.window.location.hash = hash;
      app.handleRoute();
    }

    function domClick(el) {
      assert.ok(el, 'Expected element for domClick');
      let stopped = false;
      let curr = el;
      while (curr && !stopped) {
        const evt = {
          type: 'click',
          target: el,
          currentTarget: curr,
          preventDefault() {},
          stopPropagation() { stopped = true; }
        };
        if (typeof curr.onclick === 'function') {
          curr.onclick(evt);
        }
        const handlers = curr.listeners?.get('click');
        if (handlers) {
          for (const h of Array.from(handlers)) {
            h(evt);
          }
        }
        curr = curr.parentNode;
      }
    }

    it('wires hasFraction from the problem into the arena keypad on World 7 stages', () => {
      routeTo('#stage/stage-20');
      const session = app.currentSession;
      assert.ok(session, 'arena session must exist');
      assert.equal(session.worldId, 7);
      assert.ok(app.arenaKeypad, 'arena keypad must exist');
      assert.equal(
        app.arenaKeypad.state.hasFraction,
        true,
        'fraction keypad mode must be on for World 7 addition stage'
      );
      assert.equal(session.problems[0].hasFraction, true);
    });

    it('blocks arena submission while fraction fields are incomplete or the denominator is 0', () => {
      routeTo('#stage/stage-20');
      const session = app.currentSession;
      assert.ok(session, 'arena session must exist');
      const prob = session.problems[session.currentIndex];
      const fa = prob.trapMetadata.fractionAnswer;
      assert.ok(fa, 'fraction problem must carry its answer');
      const treasureCountBefore = app.progress.treasureBox?.items?.length || 0;

      // Both fields empty: submission is refused without counting an attempt,
      // launching the step guide, or quarantining the problem
      app.arenaKeypad.pressKey('enter');
      assert.equal(session.attempts, 0);
      assert.equal(session.correctCount, 0);
      assert.equal(session.currentIndex, 0);
      assert.equal(app.arenaStepGuide, null);
      assert.equal(app.progress.treasureBox?.items?.length || 0, treasureCountBefore);

      // Numerator only: still refused
      for (const ch of String(fa.numerator)) app.arenaKeypad.pressKey(ch);
      app.arenaKeypad.pressKey('enter');
      assert.equal(session.attempts, 0);
      assert.equal(session.currentIndex, 0);
      assert.equal(app.arenaStepGuide, null);

      // Denominator 0: refused as well (0 can never be a denominator)
      app.arenaKeypad.pressKey('rem');
      app.arenaKeypad.pressKey('0');
      app.arenaKeypad.pressKey('enter');
      assert.equal(session.attempts, 0);
      assert.equal(session.correctCount, 0);
      assert.equal(session.currentIndex, 0);

      // Both fields filled with the correct fraction: accepted normally
      app.arenaKeypad.pressKey('clear');
      for (const ch of String(fa.numerator)) app.arenaKeypad.pressKey(ch);
      app.arenaKeypad.pressKey('rem');
      for (const ch of String(fa.denominator)) app.arenaKeypad.pressKey(ch);
      app.arenaKeypad.pressKey('enter');
      assert.equal(session.correctCount, 1);
      if (app.arenaAdvanceTimer) {
        clearTimeout(app.arenaAdvanceTimer);
        app.arenaAdvanceTimer = null;
      }
    });

    it('TreasureBox review modal requires both fraction fields before submitting', () => {
      const prob = CurriculumEngine.generateProblem(7, 2, { difficultyLevel: 'standard' });
      const item = addTreasureItem(app.progress.treasureBox, prob);

      const tb = new TreasureBox({
        progress: app.progress,
        onUpdateHeader: () => {
          app.syncGamificationProgress();
          app.updateHeaderStats();
        }
      });
      tb.render(env.viewContainer);
      tb.launchReviewModal(item);

      const variation = tb.currentVariation;
      assert.ok(variation?.hasFraction, 'review variation must be a fraction problem');
      const nInput = tb.reviewModalEl.querySelector('.review-numerator-input');
      const dInput = tb.reviewModalEl.querySelector('.review-denominator-input');
      const submitBtn = tb.reviewModalEl.querySelector('.review-submit-btn');
      const feedbackBox = tb.reviewModalEl.querySelector('.review-feedback');
      assert.ok(nInput && dInput && submitBtn && feedbackBox);

      // Both fields empty: rejected with guidance, nothing recorded
      domClick(submitBtn);
      assert.equal(item.masteryLevel, 0);
      assert.equal(feedbackBox.style.display, 'block');
      assert.ok(tb.reviewModalEl, 'modal must stay open');

      // Numerator only: still rejected
      const fa = variation.trapMetadata.fractionAnswer;
      nInput.value = String(fa.numerator);
      domClick(submitBtn);
      assert.equal(item.masteryLevel, 0);
      assert.ok(tb.reviewModalEl, 'modal must stay open');

      // Both fields filled correctly: accepted
      dInput.value = String(fa.denominator);
      domClick(submitBtn);
      assert.equal(item.masteryLevel, 1);

      tb.destroy();
    });

    it('exposes lesson visuals for World 7 stages 19-21', () => {
      for (const stageId of ['stage-19', 'stage-20', 'stage-21']) {
        const visual = getLessonVisual(stageId);
        assert.ok(visual, `${stageId} must have a lesson visual`);
        assert.ok(visual.badge, `${stageId} visual must carry a badge`);
        assert.ok(visual.tip, `${stageId} visual must carry a tip`);
        assert.ok(
          Array.isArray(visual.diagramLines) && visual.diagramLines.length > 0,
          `${stageId} visual must carry diagram lines`
        );
      }
      assert.equal(getLessonVisual('stage-999'), null);
    });
  });
});
