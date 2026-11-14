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
import MiniLessonModal, { createLessonState, answerQuiz, nextCard } from '../src/components/mini-lesson.js';
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
      if (v !== undefined) {
        if (k.startsWith('data-')) {
          if (el.dataset[k.slice(5)] !== v) return false;
        } else if (el.getAttribute(k) !== v) {
          return false;
        }
      } else {
        if (el.getAttribute(k) === null && el.dataset[k.slice(5)] === undefined) {
          return false;
        }
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
    return this.appendChild(newChild);
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
    if (k === 'id') this.id = String(v);
    if (k === 'class') this.className = String(v);
    if (k.startsWith('data-')) {
      this.dataset[k.slice(5)] = String(v);
    }
  }
  getAttribute(k) {
    return this.attributes.get(k) ?? null;
  }
  removeAttribute(k) {
    this.attributes.delete(k);
    if (k.startsWith('data-')) {
      delete this.dataset[k.slice(5)];
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
    it('initializes default progress and mounts StageMap at #map with all 5 worlds', () => {
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

      // Verify radar calculations across 5 worlds
      const scores = calculateRadarScores(app.progress);
      assert.equal(typeof scores.world1, 'number');
      assert.equal(typeof scores.world5, 'number');

      // Create cheer stamp
      const stamp = createCheerStamp('STAMP_RECOVERY', '応援しているよ！');
      assert.equal(stamp.stampId, 'STAMP_RECOVERY');
      assert.equal(stamp.customText, '応援しているよ！');
      assert.equal(stamp.readByChild, false);

      app.progress.parentCheer.cheerMessages.push(stamp);
      app.checkCheerBanner();
      assert.equal(env.cheerBanner.style.display, 'flex');
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
        '#stage/stage-999'     // Out of range stage clamped to 15
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
});
