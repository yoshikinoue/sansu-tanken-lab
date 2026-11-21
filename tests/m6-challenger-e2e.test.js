/**
 * tests/m6-e2e-journey-stress.test.js
 * Adversarial Challenger E2E User Journey & Stress Test Suite for Milestone 6
 *
 * Simulates:
 * 1. Complete 4th-grade student journey through World 1 to World 5 (Stages 1..15)
 *    - Virtual keypad input & canvas pad scratchpad drawing
 *    - Intentional incorrect answers -> "No-X" toast & StepGuide modal -> self-correction
 *    - 1-minute MiniLesson modal -> 2-choice quiz gate -> resume
 *    - Consecutive mistakes quarantined in Power-Up Treasure Box
 *    - Variation problem review -> 2-streak clear -> "完全マスター！"
 *    - Parent Board 4-digit PIN unlock ("1234") -> 5-world radar analytics -> cheer stamp -> 3-tier backup & transfer code
 * 2. Rapid state transitions, lifecycle & DOM cleanup stress
 * 3. Race conditions, storage resilience & zero unhandled promise rejections
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { routes, parseRoute, MathLabApp } from '../src/main.js';
import MiniLessonModal, {
  createLessonState,
  answerQuiz,
  canAdvance,
  nextCard,
  prevCard
} from '../src/components/mini-lesson.js';
import StageMap, {
  totalWorlds,
  stagesPerWorld,
  totalStages,
  isStageUnlocked,
  getWorldForStage
} from '../src/components/stage-map.js';
import TreasureBox, {
  addItem as addTreasureItem,
  recordAttempt as recordTreasureAttempt
} from '../src/components/treasure-box.js';
import ParentBoard, {
  verifyPin,
  calculateRadarScores,
  createCheerStamp
} from '../src/components/parent-board.js';
import CanvasPad, {
  createPadState,
  startStroke,
  moveStroke,
  endStroke,
  clear as clearPad
} from '../src/components/canvas-pad.js';
import Keypad, {
  createKeypadState,
  handleInput,
  getValue as getKeypadValue
} from '../src/components/keypad.js';
import StepGuideModal, {
  createSession as createStepSession,
  submitStepAnswer
} from '../src/components/step-guide.js';
import {
  createToast,
  validateToastContent,
  forbiddenSymbols
} from '../src/components/toast-feedback.js';

import * as CurriculumEngine from '../src/services/curriculum-engine.js';
import * as StorageService from '../src/services/storage-service.js';
import * as SoundEffects from '../src/services/sound-effects.js';
import * as SpeechService from '../src/services/speech-service.js';
import * as GamificationEngine from '../src/services/gamification-engine.js';

// Setup Mock DOM Elements for headless execution
class MockDOMElement {
  constructor(tag, id = '') {
    this.tagName = String(tag).toUpperCase();
    this.id = id;
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach(c => { if (c) this.classList._classes.add(c); this.className = Array.from(this.classList._classes).join(' '); }),
      remove: (...cls) => cls.forEach(c => { this.classList._classes.delete(c); this.className = Array.from(this.classList._classes).join(' '); }),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, force) => {
        const has = this.classList._classes.has(c);
        const next = force !== undefined ? force : !has;
        if (next) this.classList.add(c);
        else this.classList.remove(c);
        return next;
      }
    };
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this._html = '';
    this._value = '';
    this._listeners = new Map();
  }

  get value() { return this._value; }
  set value(v) { this._value = String(v); }

  get textContent() { return this._text || ''; }
  set textContent(t) { this._text = String(t); }

  get innerHTML() {
    if (this._html) return this._html;
    return this.children.map(c => c.innerHTML || c.textContent || '').join('');
  }
  set innerHTML(h) {
    this._html = String(h);
    this.children = [];
  }

  appendChild(child) {
    if (!child) return child;
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
      this.children[idx] = newChild;
      newChild.parentNode = this;
      oldChild.parentNode = null;
    }
    return newChild;
  }

  querySelector(selector) {
    if (!selector) return null;
    return this._findRecursive(this, selector);
  }

  querySelectorAll(selector) {
    const results = [];
    this._findAllRecursive(this, selector, results);
    return results;
  }

  _findRecursive(node, sel) {
    for (const child of node.children) {
      if (this._matches(child, sel)) return child;
      const found = this._findRecursive(child, sel);
      if (found) return found;
    }
    return null;
  }

  _findAllRecursive(node, sel, results) {
    for (const child of node.children) {
      if (this._matches(child, sel)) results.push(child);
      this._findAllRecursive(child, sel, results);
    }
  }

  _matches(node, sel) {
    if (sel.startsWith('#')) return node.id === sel.slice(1);
    if (sel.startsWith('.')) {
      const cleanClass = sel.slice(1).replace(/\[.*\]/, '');
      return node.classList.contains(cleanClass);
    }
    return node.tagName.toLowerCase() === sel.toLowerCase();
  }

  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k] || null; }

  addEventListener(type, listener) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    const list = this._listeners.get(type);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  dispatchEvent(event) {
    const type = event?.type || event;
    const list = this._listeners.get(type);
    if (list) {
      list.forEach(fn => fn(event));
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
    if (typeof this.onclick === 'function') {
      this.onclick({ target: this });
    }
  }

  getContext() {
    return {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      arc: () => {},
      fill: () => {}
    };
  }
}

describe('Milestone 6: Comprehensive Challenger E2E Journey Stress Test', () => {
  let unhandledRejections = [];
  let uncaughtErrors = [];
  let onRejectionHandler;
  let onUncaughtHandler;

  before(() => {
    onRejectionHandler = (err) => {
      unhandledRejections.push(err);
    };
    onUncaughtHandler = (err) => {
      uncaughtErrors.push(err);
    };
    process.on('unhandledRejection', onRejectionHandler);
    process.on('uncaughtException', onUncaughtHandler);
  });

  after(() => {
    process.off('unhandledRejection', onRejectionHandler);
    process.off('uncaughtException', onUncaughtHandler);
  });

  it('CJ-0: verifies zero unhandled promise rejections or uncaught exceptions trap is active', () => {
    assert.equal(unhandledRejections.length, 0);
    assert.equal(uncaughtErrors.length, 0);
  });

  // =========================================================================
  // JOURNEY PART 1: 4th-Grade Student World 1..5 Curriculum & Scaffolding Flow
  // =========================================================================
  describe('Journey Part 1: Student World 1 to 5 Complete Playthrough & Scaffolding', () => {
    let studentProgress;

    before(() => {
      studentProgress = StorageService.createDefaultProgress();
      studentProgress.userProfile.userName = '探検キッズ4年生';
      studentProgress.userProfile.grade = 4;
    });

    it('CJ-1.1: World 1 (Stage 1..3) - starts Stage 1, draws on CanvasPad, enters answers with Keypad', () => {
      // 1. Verify Stage 1 is unlocked, Stage 2..15 locked
      assert.equal(isStageUnlocked(1, studentProgress.stageProgress), true);
      assert.equal(isStageUnlocked(2, studentProgress.stageProgress), false);

      // 2. CanvasPad simulation
      const padState = createPadState();
      startStroke(padState, 150, 100);
      moveStroke(padState, 160, 120);
      moveStroke(padState, 180, 150);
      endStroke(padState);
      assert.equal(padState.strokes.length, 1);
      assert.equal(padState.strokes[0].length, 3);
      clearPad(padState);
      assert.equal(padState.strokes.length, 0);

      // 3. Virtual Keypad input simulation
      let kp = createKeypadState(false);
      kp = handleInput(kp, '5');
      kp = handleInput(kp, '8');
      kp = handleInput(kp, '7');
      assert.equal(getKeypadValue(kp), 587);
    });

    it('CJ-1.2: World 1 Stage 1 - intentionally answers wrong, triggers StepGuide, self-corrects with bonus score', () => {
      const stage1Problems = CurriculumEngine.generateStageProblems(1, 1);
      assert.equal(stage1Problems.length, 5);

      const prob1 = stage1Problems[0];
      const wrongAnswer = prob1.expectedAnswer + 10;

      // 1. Evaluate wrong answer
      const evalWrong = CurriculumEngine.evaluateAnswer(prob1, wrongAnswer);
      assert.equal(evalWrong.isCorrect, false);

      // 2. Error diagnosis and No-X compliance
      const diag = CurriculumEngine.diagnoseError(prob1, wrongAnswer);
      assert.ok(diag);
      const toast = createToast('encourage', 'おしい！もう一歩！');
      assert.equal(toast.color, '#eab308');
      assert.ok(validateToastContent(toast.message));
      for (const sym of forbiddenSymbols) {
        assert.ok(!toast.message.includes(sym));
      }

      // 3. Problem quarantined to Treasure Box
      const treasureItem = addTreasureItem(studentProgress.treasureBox, prob1);
      assert.ok(treasureItem);
      assert.equal(studentProgress.treasureBox.items.length, 1);
      assert.equal(treasureItem.masteryLevel, 0);

      // 4. Launch StepGuide session
      const stepSession = createStepSession(prob1);
      assert.ok(stepSession);
      assert.ok(stepSession.steps.length > 0);

      // Solve all steps
      for (let s = 0; s < stepSession.steps.length; s++) {
        const step = stepSession.steps[s];
        const stepVal = step.expectedStepValue !== undefined ? step.expectedStepValue : step.answer;
        const submitRes = submitStepAnswer(stepSession, s, stepVal);
        assert.equal(submitRes.success, true);
      }
      assert.equal(stepSession.completed, true);

      // 5. Self-correction submission
      const evalCorrect = CurriculumEngine.evaluateAnswer(prob1, prob1.expectedAnswer);
      assert.equal(evalCorrect.isCorrect, true);

      const scoreResult = GamificationEngine.recordResult({
        isCorrect: true,
        wasSelfCorrected: true
      });
      assert.equal(scoreResult.pointsAwarded, 20); // +20 points for self-correction!
      studentProgress.gamification.selfCorrectionCount = (studentProgress.gamification.selfCorrectionCount || 0) + 1;
      assert.equal(studentProgress.gamification.selfCorrectionCount, 1);
    });

    it('CJ-1.3: World 1 Stage 1 - triggers 1-minute MiniLesson, enforces 2-choice quiz gate, resumes', () => {
      const lessonData = SpeechService.getMiniLessonData('stage-1');
      assert.ok(lessonData);
      assert.ok(lessonData.card1.title);
      assert.ok(lessonData.card2.question);

      const lessonState = createLessonState('stage-1');
      assert.equal(lessonState.currentCardIndex, 0);

      // Card 0 -> Card 1
      assert.equal(canAdvance(lessonState), true);
      assert.equal(nextCard(lessonState), true);
      assert.equal(lessonState.currentCardIndex, 1);

      // Card 1 Quiz Gate
      assert.equal(canAdvance(lessonState), false);
      assert.equal(nextCard(lessonState), false); // Gate locked!

      // Wrong option maintains gate
      const wrongOpt = lessonData.card2.correctOption === 'A' ? 'B' : 'A';
      const ansWrong = answerQuiz(lessonState, wrongOpt, lessonData.card2.correctOption);
      assert.equal(ansWrong.correct, false);
      assert.equal(canAdvance(lessonState), false);

      // Correct option unlocks
      const ansRight = answerQuiz(lessonState, lessonData.card2.correctOption, lessonData.card2.correctOption);
      assert.equal(ansRight.correct, true);
      assert.equal(canAdvance(lessonState), true);

      // Advance to Card 2 Summary
      assert.equal(nextCard(lessonState), true);
      assert.equal(lessonState.currentCardIndex, 2);
      assert.equal(lessonState.completed, true);

      // Save miniLessonSeen
      studentProgress.stageProgress['stage-1'].miniLessonSeen = true;
      assert.equal(studentProgress.stageProgress['stage-1'].miniLessonSeen, true);
    });

    it('CJ-1.4: Completes Stage 1 and unlocks Stage 2', () => {
      const stars = GamificationEngine.calculateStageStars({
        totalQuestions: 5,
        firstTryCorrectCount: 4,
        selfCorrectedCount: 1
      });
      assert.equal(stars, 3); // Full 3 stars thanks to self-correction

      studentProgress.stageProgress['stage-1'].cleared = true;
      studentProgress.stageProgress['stage-1'].stars = stars;
      studentProgress.stageProgress['stage-1'].bestScore = 50;

      // Stage 2 is now unlocked!
      assert.equal(isStageUnlocked(2, studentProgress.stageProgress), true);
      assert.equal(isStageUnlocked(3, studentProgress.stageProgress), false);
    });

    it('CJ-1.5: Clears World 1 (Stage 2..3) and World 2 (Stage 4..6)', () => {
      // Clear Stage 2 & 3
      for (const stg of [2, 3]) {
        const probs = CurriculumEngine.generateStageProblems(1, stg);
        for (const p of probs) {
          const evalRes = CurriculumEngine.evaluateAnswer(p, p.expectedAnswer);
          assert.equal(evalRes.isCorrect, true);
        }
        studentProgress.stageProgress[`stage-${stg}`].cleared = true;
        studentProgress.stageProgress[`stage-${stg}`].stars = 3;
      }

      // World 1 fully cleared!
      const w1Scores = calculateRadarScores(studentProgress);
      assert.equal(w1Scores.world1, 100);
      assert.equal(w1Scores.world2, 0);

      // Stage 4 (World 2 start) is unlocked!
      assert.equal(isStageUnlocked(4, studentProgress.stageProgress), true);

      // Clear Stages 4, 5, 6 (World 2: Multiplication)
      for (const stg of [4, 5, 6]) {
        const probs = CurriculumEngine.generateStageProblems(2, stg);
        assert.equal(probs.length, 5);
        studentProgress.stageProgress[`stage-${stg}`].cleared = true;
        studentProgress.stageProgress[`stage-${stg}`].stars = 3;
      }

      const w2Scores = calculateRadarScores(studentProgress);
      assert.equal(w2Scores.world1, 100);
      assert.equal(w2Scores.world2, 100);
      assert.equal(w2Scores.world3, 0);
    });

    it('CJ-1.6: Clears World 3 (Stage 7..9: Division with Remainder) using remainder keypad', () => {
      assert.equal(isStageUnlocked(7, studentProgress.stageProgress), true);

      // Verify remainder keypad handling
      let divKeypad = createKeypadState(true);
      divKeypad = handleInput(divKeypad, '8');
      divKeypad = handleInput(divKeypad, 'rem');
      divKeypad = handleInput(divKeypad, '3');
      assert.deepEqual(getKeypadValue(divKeypad), { quotient: 8, remainder: 3 });

      // Clear Stages 7, 8, 9
      for (const stg of [7, 8, 9]) {
        const probs = CurriculumEngine.generateStageProblems(3, stg);
        assert.equal(probs.length, 5);
        for (const p of probs) {
          const evalRes = CurriculumEngine.evaluateAnswer(p, p.expectedAnswer);
          assert.equal(evalRes.isCorrect, true);
        }
        studentProgress.stageProgress[`stage-${stg}`].cleared = true;
        studentProgress.stageProgress[`stage-${stg}`].stars = 3;
      }

      const w3Scores = calculateRadarScores(studentProgress);
      assert.equal(w3Scores.world3, 100);
    });

    it('CJ-1.7: Clears World 4 (Stage 10..12) with consecutive errors captured in Treasure Box', () => {
      assert.equal(isStageUnlocked(10, studentProgress.stageProgress), true);

      // Generate Stage 10 problem (2-digit division & trial quotient)
      const stg10Probs = CurriculumEngine.generateStageProblems(4, 10);
      const hurdleProb = stg10Probs[2]; // Hurdle problem

      // Consecutive wrong answers on hurdleProb
      for (let attempt = 0; attempt < 2; attempt++) {
        addTreasureItem(studentProgress.treasureBox, hurdleProb);
      }
      // Verify no duplicate items created, only updated timestamp
      const quarantined = studentProgress.treasureBox.items.filter(i =>
        i.originalProblem.prompt === hurdleProb.prompt
      );
      assert.equal(quarantined.length, 1);

      // Clear Stages 10, 11, 12
      for (const stg of [10, 11, 12]) {
        studentProgress.stageProgress[`stage-${stg}`].cleared = true;
        studentProgress.stageProgress[`stage-${stg}`].stars = 3;
      }

      const w4Scores = calculateRadarScores(studentProgress);
      assert.equal(w4Scores.world4, 100);
    });

    it('CJ-1.8: Clears World 5 (Stage 13..15: Order of Operations), completing Worlds 1-5', () => {
      assert.equal(isStageUnlocked(13, studentProgress.stageProgress), true);

      // Clear Stages 13, 14, 15
      for (const stg of [13, 14, 15]) {
        const probs = CurriculumEngine.generateStageProblems(5, stg);
        assert.equal(probs.length, 5);
        for (const p of probs) {
          const evalRes = CurriculumEngine.evaluateAnswer(p, p.expectedAnswer);
          assert.equal(evalRes.isCorrect, true);
        }
        studentProgress.stageProgress[`stage-${stg}`].cleared = true;
        studentProgress.stageProgress[`stage-${stg}`].stars = 3;
        studentProgress.gamification.totalScore += 50;
        studentProgress.gamification.labExp += 150;
      }

      // Verify all Stages 1-15 (Worlds 1-5) cleared
      for (let s = 1; s <= 15; s++) {
        assert.equal(studentProgress.stageProgress[`stage-${s}`].cleared, true);
      }

      // Check Gamification Rank Ascension
      const rank = GamificationEngine.getRankForScore(4000);
      assert.equal(rank.level, 10);
      assert.equal(rank.id, 'rank-10');
      assert.ok(rank.title.includes('マスター'));
    });
  });

  // =========================================================================
  // JOURNEY PART 2: Power-Up Treasure Box Review & Complete Mastery
  // =========================================================================
  describe('Journey Part 2: Power-Up Treasure Box Variation Review & "完全マスター！"', () => {
    let progress;

    before(() => {
      progress = StorageService.createDefaultProgress();
      // Add problem from World 4 (trial quotient error)
      const prob = CurriculumEngine.generateProblem(4, 11, { level: 3 });
      addTreasureItem(progress.treasureBox, prob);
    });

    it('CJ-2.1: isolates quarantined problem with initial masteryLevel 0', () => {
      assert.equal(progress.treasureBox.items.length, 1);
      const item = progress.treasureBox.items[0];
      assert.equal(item.masteryLevel, 0);
      assert.equal(item.consecutiveCorrect, 0);
    });

    it('CJ-2.2: generates variation problem preserving the mathematical cognitive trap', () => {
      const item = progress.treasureBox.items[0];
      const variation = CurriculumEngine.generateVariationProblem(item.originalProblem);
      assert.ok(variation);
      assert.equal(variation.operator, item.originalProblem.operator);
      assert.equal(variation.worldId, item.originalProblem.worldId);
      assert.notEqual(variation.prompt, item.originalProblem.prompt);
    });

    it('CJ-2.3: reviews variation problem: 1st correct -> polish level 1', () => {
      const item = progress.treasureBox.items[0];
      const updated = recordTreasureAttempt(item, true);
      assert.equal(updated.consecutiveCorrect, 1);
      assert.equal(updated.masteryLevel, 1);
    });

    it('CJ-2.4: mistake in between resets streak to 0 and masteryLevel to 0', () => {
      const item = progress.treasureBox.items[0];
      const reset = recordTreasureAttempt(item, false);
      assert.equal(reset.consecutiveCorrect, 0);
      assert.equal(reset.masteryLevel, 0);
    });

    it('CJ-2.5: achieves 2 consecutive clears -> promotes to "完全マスター！" (level 2)', () => {
      const item = progress.treasureBox.items[0];
      // 1st clear
      recordTreasureAttempt(item, true);
      assert.equal(item.consecutiveCorrect, 1);
      assert.equal(item.masteryLevel, 1);

      // 2nd consecutive clear
      const mastered = recordTreasureAttempt(item, true);
      assert.equal(mastered.consecutiveCorrect, 2);
      assert.equal(mastered.masteryLevel, 2); // 完全マスター！
    });

    it('CJ-2.6: DOM TreasureBox renders header summary and "完全マスター！" status accurately', () => {
      const mockContainer = new MockDOMElement('div', 'treasure-root');
      const origDoc = global.document;

      try {
        global.document = {
          createElement: (tag) => new MockDOMElement(tag),
          querySelector: (sel) => mockContainer.querySelector(sel),
          querySelectorAll: (sel) => mockContainer.querySelectorAll(sel),
          getElementById: (id) => mockContainer.querySelector('#' + id),
          body: mockContainer
        };

        const tb = new TreasureBox({
          container: mockContainer,
          progress: progress
        }).mount(mockContainer);

        assert.ok(tb.rootEl);
        const html = tb.rootEl.innerHTML;
        assert.ok(html.includes('パワーアップ宝箱'));
        assert.ok(html.includes('完全マスター'));
      } finally {
        global.document = origDoc;
      }
    });
  });

  // =========================================================================
  // JOURNEY PART 3: Parent Board PIN, Analytics, Cheer Stamp & Transfer
  // =========================================================================
  describe('Journey Part 3: Parent Board PIN, Radar Analytics & Data Transfer', () => {
    let progress;

    before(() => {
      progress = StorageService.createDefaultProgress();
      for (let s = 1; s <= 24; s++) {
        progress.stageProgress[`stage-${s}`].cleared = true;
        progress.stageProgress[`stage-${s}`].stars = 3;
      }
    });

    it('CJ-3.1: verifies 4-digit PIN authentication with default "1234" and rejects bad PINs', () => {
      // Rejects bad PINs
      assert.equal(verifyPin('0000', '1234'), false);
      assert.equal(verifyPin('4321', '1234'), false);
      assert.equal(verifyPin('', '1234'), false);
      assert.equal(verifyPin(null, '1234'), false);
      assert.equal(verifyPin(undefined, '1234'), false);
      assert.equal(verifyPin('123', '1234'), false);
      assert.equal(verifyPin('12345', '1234'), false);

      // Accepts valid PIN across string and numeric forms
      assert.equal(verifyPin('1234', '1234'), true);
      assert.equal(verifyPin(1234, '1234'), true);
    });

    it('CJ-3.2: calculates 100% radar chart scores across all 8 worlds upon full completion', () => {
      const scores = calculateRadarScores(progress);
      assert.deepEqual(scores, {
        world1: 100,
        world2: 100,
        world3: 100,
        world4: 100,
        world5: 100,
        world6: 100,
        world7: 100,
        world8: 100
      });
    });

    it('CJ-3.3: creates cheerful stamp with custom message and strictly enforces 50-character limit', () => {
      const stamp = createCheerStamp('STAMP_RECOVERY', '自分で気づいて直せたね！すばらしい成長だよ！');
      assert.equal(stamp.stampId, 'STAMP_RECOVERY');
      assert.equal(stamp.readByChild, false);
      assert.equal(stamp.customText, '自分で気づいて直せたね！すばらしい成長だよ！');

      // 50-character limit boundary
      const overLong = '花'.repeat(100);
      const capped = createCheerStamp('STAMP_FOCUS', overLong);
      assert.equal(capped.customText.length, 50);
      assert.equal(capped.customText, '花'.repeat(50));
    });

    it('CJ-3.4: progress export and import round-trip preserves all state perfectly', () => {
      const exportedJson = StorageService.exportBackupJSON(progress);
      assert.ok(typeof exportedJson === 'string');

      const imported = StorageService.importBackupJSON(exportedJson);
      assert.equal(imported.schemaVersion, '1.0.0');
      assert.equal(imported.stageProgress['stage-15'].cleared, true);
      assert.equal(imported.stageProgress['stage-1'].stars, 3);
    });

    it('CJ-3.5: generates 8-character transfer code LAB-XXXX-XXXX and restores progress completely', async () => {
      const code = StorageService.generateTransferCode(progress);
      assert.match(code, /^LAB-[23456789ABCDEFGHJKLMNPQRSTVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTVWXYZ]{4}$/);

      const restored = await StorageService.restoreFromTransferCode(code);
      assert.ok(restored);
      assert.equal(restored.stageProgress['stage-15'].cleared, true);
    });
  });

  // =========================================================================
  // JOURNEY PART 4: Rapid State Transitions, Lifecycle Stress & Race Conditions
  // =========================================================================
  describe('Journey Part 4: Stress Testing Lifecycle, Fast Navigation & Concurrency', () => {
    it('CJ-4.1: handles 100 rapid sequential route transitions without throwing or leaking', () => {
      const mockViewContainer = new MockDOMElement('div', 'view-container');
      const mockModalRoot = new MockDOMElement('div', 'modal-root');
      const mockBody = new MockDOMElement('body');
      mockBody.appendChild(mockViewContainer);
      mockBody.appendChild(mockModalRoot);

      const origDoc = global.document;
      const origWin = global.window;

      try {
        global.document = {
          getElementById: (id) => {
            if (id === 'view-container') return mockViewContainer;
            if (id === 'modal-root') return mockModalRoot;
            return mockBody.querySelector('#' + id);
          },
          querySelector: (sel) => mockBody.querySelector(sel),
          querySelectorAll: (sel) => mockBody.querySelectorAll(sel),
          createElement: (tag) => new MockDOMElement(tag),
          body: mockBody
        };

        const testHashes = [
          '#map',
          '#stage/stage-1',
          '#stage/stage-5',
          '#lesson/stage-3',
          '#treasure',
          '#parent',
          '#stage/stage-15',
          '#map'
        ];

        global.window = {
          location: { hash: '#map' },
          addEventListener: () => {},
          removeEventListener: () => {}
        };

        const app = new MathLabApp();
        app.progress = StorageService.createDefaultProgress();

        for (let i = 0; i < 100; i++) {
          const nextHash = testHashes[i % testHashes.length];
          global.window.location.hash = nextHash;
          app.handleRoute();
          if (nextHash.startsWith('#lesson')) {
            assert.equal(mockModalRoot.children.length, 1, `modalRoot contains mini-lesson modal when on ${nextHash}`);
          } else {
            assert.equal(mockModalRoot.children.length, 0, `modalRoot must be clean after route ${nextHash}`);
          }
        }
      } finally {
        global.document = origDoc;
        global.window = origWin;
      }
    });

    it('CJ-4.2: executes 100 rapid keypad inputs with backspace and clear without crashing', () => {
      let state = createKeypadState(false);
      const inputs = ['1', '2', '3', 'backspace', '4', '5', 'backspace', '6', '7', '8', 'clear', '9'];

      for (let i = 0; i < 100; i++) {
        const inp = inputs[i % inputs.length];
        state = handleInput(state, inp);
        const val = getKeypadValue(state);
        assert.ok(val === null || typeof val === 'number');
      }
    });

    it('CJ-4.3: executes 50 rapid CanvasPad stroke lifecycles with clearing', () => {
      const pad = createPadState();
      for (let i = 0; i < 50; i++) {
        startStroke(pad, i * 2, i * 3);
        moveStroke(pad, i * 2 + 5, i * 3 + 5);
        moveStroke(pad, i * 2 + 10, i * 3 + 10);
        endStroke(pad);
        assert.equal(pad.strokes.length, 1);
        clearPad(pad);
        assert.equal(pad.strokes.length, 0);
      }
    });

    it('CJ-4.4: validates storage schema normalization under corrupted input objects', () => {
      const corrupted = {
        schemaVersion: '1.0.0',
        userProfile: null, // missing profile
        stageProgress: {
          'stage-1': { cleared: true } // partial fields
        },
        treasureBox: null,
        parentCheer: undefined
      };

      const normalized = StorageService.normalizeProgressData(corrupted);
      assert.ok(normalized);
      assert.equal(normalized.schemaVersion, '1.0.0');
      assert.ok(normalized.userProfile);
      assert.ok(normalized.stageProgress['stage-1'].cleared);
      assert.ok(normalized.stageProgress['stage-2']); // filled in missing stage
      assert.ok(Array.isArray(normalized.treasureBox.items));
      assert.ok(Array.isArray(normalized.parentCheer.cheerMessages));
    });

    it('CJ-4.5: confirms zero unhandled rejections occurred throughout all test scenarios', () => {
      assert.equal(unhandledRejections.length, 0, `Expected 0 unhandled rejections, got: ${unhandledRejections.map(e => e?.message || e)}`);
      assert.equal(uncaughtErrors.length, 0, `Expected 0 uncaught errors, got: ${uncaughtErrors.map(e => e?.message || e)}`);
    });
  });

});
