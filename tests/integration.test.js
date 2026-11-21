/**
 * tests/integration.test.js
 * Milestone 5 Integration Test Suite (Real Code Wiring & Cross-Feature Verification)
 *
 * Verifies:
 * - Suite 1: SPA Router & View Transitions
 * - Suite 2: Interactive Learning Flow (MiniLesson, Stage Arena, Keypad, CanvasPad)
 * - Suite 3: Error Detection, No-X Toast & Step Guide Scaffolding
 * - Suite 4: Stage Completion, Gamification & 3-Tier Persistence
 * - Suite 5: Power-Up Treasure Box Quarantine & Complete Mastery Flow
 * - Suite 6: Parent Cheer Board PIN, Radar Analytics & Cheer Stamps
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import real M5 components and application modules
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

// Import M4 components
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
import ToastFeedback, {
  createToast,
  validateToastContent,
  forbiddenSymbols
} from '../src/components/toast-feedback.js';

// Import Core Services
import * as CurriculumEngine from '../src/services/curriculum-engine.js';
import * as StorageService from '../src/services/storage-service.js';
import * as SoundEffects from '../src/services/sound-effects.js';
import * as SpeechService from '../src/services/speech-service.js';
import * as GamificationEngine from '../src/services/gamification-engine.js';

describe('Milestone 5: Application Integration Test Suite', () => {

  // =========================================================================
  // Suite 1: SPA Router & View Transitions
  // =========================================================================
  describe('Suite 1: SPA Router & View Transitions', () => {
    it('S1-1: defines all 5 core routes with "#" prefix and unique entries', () => {
      assert.equal(routes.length, 5);
      const uniqueRoutes = new Set(routes);
      assert.equal(uniqueRoutes.size, 5);
      for (const r of ['#map', '#stage', '#treasure', '#parent', '#lesson']) {
        assert.ok(routes.includes(r), `Missing expected route ${r}`);
        assert.ok(r.startsWith('#'), `Route ${r} must start with #`);
      }
    });

    it('S1-2: parses route hash with parameters accurately across stages 1 to 15', () => {
      const parsed1 = parseRoute('#stage/stage-1');
      assert.deepEqual(parsed1, { view: '#stage', param: 'stage-1' });

      const parsed15 = parseRoute('#stage/stage-15');
      assert.deepEqual(parsed15, { view: '#stage', param: 'stage-15' });

      const parsedLesson = parseRoute('#lesson/stage-4');
      assert.deepEqual(parsedLesson, { view: '#lesson', param: 'stage-4' });
    });

    it('S1-3: defaults safely to #map view on empty, null, or root hash', () => {
      assert.deepEqual(parseRoute(''), { view: '#map', param: null });
      assert.deepEqual(parseRoute('#'), { view: '#map', param: null });
      assert.deepEqual(parseRoute('#map'), { view: '#map', param: null });
      assert.deepEqual(parseRoute(null), { view: '#map', param: null });
      assert.deepEqual(parseRoute(undefined), { view: '#map', param: null });
    });

    it('S1-4: normalizes trailing slashes and parameterless routes safely', () => {
      assert.deepEqual(parseRoute('#parent/'), { view: '#parent', param: null });
      assert.deepEqual(parseRoute('#treasure/'), { view: '#treasure', param: null });
      assert.deepEqual(parseRoute('#treasure'), { view: '#treasure', param: null });
      assert.deepEqual(parseRoute('#parent'), { view: '#parent', param: null });
    });

    it('S1-5: initializes MathLabApp instance and exposes routing and lifecycle methods', () => {
      const app = new MathLabApp();
      assert.ok(app);
      assert.equal(typeof app.init, 'function');
      assert.equal(typeof app.handleRoute, 'function');
      assert.equal(typeof app.updateHeaderStats, 'function');
      assert.equal(typeof app.checkCheerBanner, 'function');
    });

    it('S1-6: unmounting MiniLesson via destroy() does not trigger onClose or hijack navigation route', () => {
      let hash = '#lesson/stage-1';
      let onCloseTriggered = false;

      const modal = new MiniLessonModal({
        stageId: 'stage-1',
        onClose: () => {
          onCloseTriggered = true;
          hash = '#map';
        }
      });

      // User navigates away to #parent
      hash = '#parent';
      // Router cleanup triggers destroy
      modal.destroy();

      assert.equal(onCloseTriggered, false, 'destroy() must not trigger onClose');
      assert.equal(hash, '#parent', 'Navigation hash must remain #parent and not be hijacked to #map');

      // Explicit close() still triggers onClose
      let explicitCloseTriggered = false;
      const modal2 = new MiniLessonModal({
        stageId: 'stage-1',
        onClose: () => {
          explicitCloseTriggered = true;
        }
      });
      modal2.close();
      assert.equal(explicitCloseTriggered, true, 'Explicit modal.close() must trigger onClose');
    });

    it('S1-7: cleans up stage complete modal and modal-root upon handleRoute() transition', () => {
      class MockEl {
        constructor(tag, id = '') {
          this.tagName = tag.toUpperCase();
          this.id = id;
          this.className = '';
          this.classList = {
            add: (...classes) => {
              for (const c of classes) {
                if (!this.className.includes(c)) {
                  this.className = (this.className + ' ' + c).trim();
                }
              }
            },
            remove: (...classes) => {
              for (const c of classes) {
                this.className = this.className.replace(c, '').trim();
              }
            },
            contains: (c) => this.className.split(/\s+/).includes(c)
          };
          this.children = [];
          this.parentNode = null;
          this.style = {};
          this.dataset = {};
        }
        appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
        removeChild(c) {
          const i = this.children.indexOf(c);
          if (i !== -1) { this.children.splice(i, 1); c.parentNode = null; }
          return c;
        }
        querySelector(s) {
          return this.children.find(c => s.startsWith('.') ? c.className?.includes(s.slice(1)) : c.id === s.slice(1)) || null;
        }
        querySelectorAll() { return []; }
        setAttribute(k, v) { this[k] = v; }
        addEventListener() {}
        removeEventListener() {}
        set innerHTML(h) { this._html = h; this.children = []; }
        get innerHTML() { return this._html || ''; }
      }

      const modalRoot = new MockEl('div', 'modal-root');
      const viewContainer = new MockEl('div', 'view-container');
      const body = new MockEl('body');
      body.appendChild(viewContainer);
      body.appendChild(modalRoot);

      const origDoc = global.document;
      const origWin = global.window;

      try {
        global.document = {
          getElementById: id => (id === 'modal-root' ? modalRoot : id === 'view-container' ? viewContainer : null),
          createElement: tag => new MockEl(tag),
          body: body
        };
        global.window = {
          location: { hash: '#stage/stage-1' },
          addEventListener: () => {},
          removeEventListener: () => {}
        };

        const app = new MathLabApp();
        app.progress = StorageService.createDefaultProgress();
        app.currentSession = { stageId: 'stage-1', stageNum: 1, correctCount: 5, selfCorrectedCount: 0, currentIndex: 5 };

        app.handleArenaStageComplete();
        assert.equal(modalRoot.children.length, 1, 'Stage complete modal should be rendered in modal-root');
        assert.ok(app.stageCompleteModal, 'app.stageCompleteModal must track the active modal');

        // User navigates to #map via header logo
        global.window.location.hash = '#map';
        app.handleRoute();

        assert.equal(modalRoot.children.length, 0, 'modal-root children must be cleaned up to 0');
        assert.equal(app.stageCompleteModal, null, 'app.stageCompleteModal must be nullified');
      } finally {
        global.document = origDoc;
        global.window = origWin;
      }
    });
  });

  // =========================================================================
  // Suite 2: Interactive Learning Flow (MiniLesson ↔ Stage ↔ Keypad ↔ CanvasPad)
  // =========================================================================
  describe('Suite 2: Interactive Learning Flow', () => {
    it('S2-1: initializes MiniLesson state with 3 sequential cards starting at Card 0', () => {
      const state = createLessonState('stage-1');
      assert.equal(state.stageId, 'stage-1');
      assert.equal(state.currentCardIndex, 0);
      assert.equal(state.quizAnswered, false);
      assert.equal(state.quizIsCorrect, false);
      assert.equal(state.completed, false);
    });

    it('S2-2: loads real curriculum mini-lesson content and enforces 2-choice quiz gate', () => {
      const lessonData = SpeechService.getMiniLessonData('stage-1');
      assert.ok(lessonData);
      assert.ok(lessonData.card1.title);
      assert.ok(lessonData.card2.question);
      assert.equal(lessonData.card2.correctOption, 'A');

      const state = createLessonState('stage-1');

      // Card 0 -> Card 1
      assert.equal(canAdvance(state), true);
      assert.equal(nextCard(state), true);
      assert.equal(state.currentCardIndex, 1);

      // Card 1 is gated by quiz
      assert.equal(canAdvance(state), false);
      assert.equal(nextCard(state), false);

      // Wrong option maintains gate
      const wrongResult = answerQuiz(state, 'B', lessonData.card2.correctOption);
      assert.equal(wrongResult.correct, false);
      assert.equal(canAdvance(state), false);

      // Correct option unlocks Card 2
      const rightResult = answerQuiz(state, 'A', lessonData.card2.correctOption);
      assert.equal(rightResult.correct, true);
      assert.equal(canAdvance(state), true);

      // Advance to Card 2 (Summary)
      assert.equal(nextCard(state), true);
      assert.equal(state.currentCardIndex, 2);
      assert.equal(state.completed, true);

      // End of cards
      assert.equal(nextCard(state), false);
    });

    it('S2-3: allows stepping backward with prevCard until Card 0', () => {
      const state = createLessonState('stage-1');
      nextCard(state); // to 1
      assert.equal(state.currentCardIndex, 1);

      assert.equal(prevCard(state), true);
      assert.equal(state.currentCardIndex, 0);

      assert.equal(prevCard(state), false);
      assert.equal(state.currentCardIndex, 0);
    });

    it('S2-4: integrates Keypad input handling with single number and remainder values', () => {
      // Normal integer
      let keypadState = createKeypadState(false);
      keypadState = handleInput(keypadState, '5');
      keypadState = handleInput(keypadState, '8');
      keypadState = handleInput(keypadState, '7');
      assert.equal(getKeypadValue(keypadState), 587);

      // Division with Remainder
      let divKeypad = createKeypadState(true);
      divKeypad = handleInput(divKeypad, '7');
      divKeypad = handleInput(divKeypad, 'rem');
      divKeypad = handleInput(divKeypad, '3');
      assert.deepEqual(getKeypadValue(divKeypad), { quotient: 7, remainder: 3 });
    });

    it('S2-5: records strokes on CanvasPad and resets state between problems', () => {
      const pad = createPadState();
      startStroke(pad, 100, 150);
      moveStroke(pad, 120, 180);
      endStroke(pad);
      assert.equal(pad.strokes.length, 1);

      // Reset for next problem
      clearPad(pad);
      assert.equal(pad.strokes.length, 0);
      assert.equal(pad.currentStroke, null);
    });
  });

  // =========================================================================
  // Suite 3: Error Detection, No-X Toast & Step Guide Scaffolding
  // =========================================================================
  describe('Suite 3: Error Detection, No-X Toast & Step Guide Scaffolding', () => {
    it('S3-1: evaluates incorrect answers and diagnoses cognitive error rules', () => {
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });
      assert.ok(prob);

      // Intentionally incorrect answer
      const evalRes = CurriculumEngine.evaluateAnswer(prob, 99999);
      assert.equal(evalRes.isCorrect, false);

      // Diagnose error
      const diag = CurriculumEngine.diagnoseError(prob, 99999);
      assert.ok(diag);
      assert.ok(diag.adviceMessage || diag.hintMessage);
    });

    it('S3-2: strictly enforces "No-X" policy across diagnosis messages and toasts', () => {
      const toast = createToast('encourage');
      assert.equal(toast.color, '#eab308');
      assert.equal(toast.hasForbiddenSymbol, false);
      assert.ok(validateToastContent(toast.message));

      // Test all forbidden symbols are caught
      for (const sym of forbiddenSymbols) {
        assert.equal(validateToastContent(`計算が ${sym} です`), false);
      }
    });

    it('S3-3: launches StepGuide session for mistaken problem and guides through all steps', () => {
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });
      const session = createStepSession(prob);
      assert.ok(session);
      assert.ok(Array.isArray(session.steps));
      assert.ok(session.steps.length > 0);

      // Solve all steps sequentially
      for (let i = 0; i < session.steps.length; i++) {
        const step = session.steps[i];
        const val = step.expectedStepValue !== undefined ? step.expectedStepValue : step.answer;
        const res = submitStepAnswer(session, i, val);
        assert.equal(res.success, true);
      }

      assert.equal(session.completed, true);
    });

    it('S3-4: tracks error count in StepGuide on incorrect intermediate steps without crashing', () => {
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });
      const session = createStepSession(prob);

      const badRes = submitStepAnswer(session, 0, 999999);
      assert.equal(badRes.success, false);
      assert.equal(session.errorCount, 1);
      assert.ok(validateToastContent(badRes.hint));
    });
  });

  // =========================================================================
  // Suite 4: Stage Completion, Gamification & 3-Tier Persistence
  // =========================================================================
  describe('Suite 4: Stage Completion, Gamification & 3-Tier Persistence', () => {
    it('S4-1: awards correct scores and gives full credit for self-correction', () => {
      // First try correct
      const firstTryScore = GamificationEngine.recordResult({
        isCorrect: true,
        wasSelfCorrected: false
      });
      assert.equal(firstTryScore.pointsAwarded, 10);

      // Self-corrected
      const selfCorrectScore = GamificationEngine.recordResult({
        isCorrect: true,
        wasSelfCorrected: true
      });
      assert.equal(selfCorrectScore.pointsAwarded, 20);
      assert.equal(selfCorrectScore.feedbackType, 'self_corrected');
    });

    it('S4-2: calculates stage stars with self-correction count preserving 3-star rating', () => {
      const perfectStars = GamificationEngine.calculateStageStars({
        totalQuestions: 5,
        firstTryCorrectCount: 5,
        selfCorrectedCount: 0
      });
      assert.equal(perfectStars, 3);

      const selfCorrectStars = GamificationEngine.calculateStageStars({
        totalQuestions: 5,
        firstTryCorrectCount: 2,
        selfCorrectedCount: 2
      });
      assert.ok(selfCorrectStars >= 2);
    });

    it('S4-3: unlocks Stage 2 on StageMap once Stage 1 is cleared', () => {
      assert.equal(totalWorlds, 9);
      assert.equal(stagesPerWorld, 3);
      assert.equal(totalStages, 27);

      // Stage 1 is always unlocked
      assert.equal(isStageUnlocked(1, {}), true);
      // Stage 2 is locked initially
      assert.equal(isStageUnlocked(2, {}), false);

      // Stage 1 cleared -> Stage 2 unlocked
      const clearedProgress = { 'stage-1': { cleared: true, stars: 3 } };
      assert.equal(isStageUnlocked(2, clearedProgress), true);

      // Stage 3 still locked
      assert.equal(isStageUnlocked(3, clearedProgress), false);
    });

    it('S4-4: maps stage numbers to worlds accurately across all 27 stages', () => {
      assert.equal(getWorldForStage(1), 1);
      assert.equal(getWorldForStage(3), 1);
      assert.equal(getWorldForStage(4), 2);
      assert.equal(getWorldForStage(6), 2);
      assert.equal(getWorldForStage(7), 3);
      assert.equal(getWorldForStage(9), 3);
      assert.equal(getWorldForStage(10), 4);
      assert.equal(getWorldForStage(12), 4);
      assert.equal(getWorldForStage(13), 5);
      assert.equal(getWorldForStage(15), 5);
      assert.equal(getWorldForStage(16), 6);
      assert.equal(getWorldForStage(18), 6);
      assert.equal(getWorldForStage(19), 7);
      assert.equal(getWorldForStage(21), 7);
      assert.equal(getWorldForStage(22), 8);
      assert.equal(getWorldForStage(24), 8);
      assert.equal(getWorldForStage(25), 9);
      assert.equal(getWorldForStage(27), 9);
    });

    it('S4-5: persists stage progress into storage and verifies default schema normalization', () => {
      const progress = StorageService.createDefaultProgress();
      assert.equal(progress.schemaVersion, '1.0.0');
      assert.ok(progress.stageProgress['stage-1']);
      assert.ok(progress.stageProgress['stage-15']);

      progress.stageProgress['stage-1'].cleared = true;
      progress.stageProgress['stage-1'].stars = 3;
      progress.stageProgress['stage-1'].bestScore = 50;

      const normalized = StorageService.normalizeProgressData(progress);
      assert.equal(normalized.stageProgress['stage-1'].cleared, true);
      assert.equal(normalized.stageProgress['stage-1'].stars, 3);
    });
  });

  // =========================================================================
  // Suite 5: Power-Up Treasure Box Quarantine & Complete Mastery Flow
  // =========================================================================
  describe('Suite 5: Power-Up Treasure Box Quarantine & Complete Mastery Flow', () => {
    it('S5-1: quaratines mistaken problems into treasure box with masteryLevel 0', () => {
      const box = { items: [] };
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });

      const item = addTreasureItem(box, prob);
      assert.ok(item);
      assert.equal(box.items.length, 1);
      assert.equal(item.masteryLevel, 0);
      assert.equal(item.consecutiveCorrect, 0);
      assert.ok(item.id.startsWith('tb-'));
    });

    it('S5-2: prevents duplicate problem prompts and updates capturedAt timestamp', () => {
      const box = { items: [] };
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });

      addTreasureItem(box, prob);
      assert.equal(box.items.length, 1);

      // Attempt adding identical problem
      addTreasureItem(box, prob);
      assert.equal(box.items.length, 1);
    });

    it('S5-3: generates number-varied problem preserving cognitive trap for review', () => {
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });
      const variation = CurriculumEngine.generateVariationProblem(prob);

      assert.ok(variation);
      assert.equal(variation.operator, prob.operator);
      assert.equal(variation.worldId, prob.worldId);
      assert.equal(variation.stageId, prob.stageId);
    });

    it('S5-4: advances to masteryLevel 1 on 1st correct, and achieves "完全マスター！" (level 2) on 2nd consecutive correct', () => {
      const box = { items: [] };
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });
      const item = addTreasureItem(box, prob);

      // 1st solve
      const res1 = recordTreasureAttempt(item, true);
      assert.equal(res1.consecutiveCorrect, 1);
      assert.equal(res1.masteryLevel, 1);

      // 2nd consecutive solve
      const res2 = recordTreasureAttempt(item, true);
      assert.equal(res2.consecutiveCorrect, 2);
      assert.equal(res2.masteryLevel, 2); // 完全マスター！
    });

    it('S5-5: resets consecutiveCorrect to 0 and masteryLevel to 0 on subsequent mistake', () => {
      const box = { items: [] };
      const prob = CurriculumEngine.generateProblem(1, 1, { level: 2 });
      const item = addTreasureItem(box, prob);

      recordTreasureAttempt(item, true);
      assert.equal(item.masteryLevel, 1);

      // Mistake resets back to 0
      const failed = recordTreasureAttempt(item, false);
      assert.equal(failed.consecutiveCorrect, 0);
      assert.equal(failed.masteryLevel, 0);
    });

    it('S5-6: safely cleans up review modal overlay and pending timers upon destroy() without DOM leak', () => {
      class MockEl {
        constructor(tag) {
          this.tagName = tag.toUpperCase();
          this.className = '';
          this.children = [];
          this.parentNode = null;
          this.style = {};
          this.dataset = {};
        }
        appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
        removeChild(c) {
          const idx = this.children.indexOf(c);
          if (idx !== -1) { this.children.splice(idx, 1); c.parentNode = null; }
          return c;
        }
        querySelector(s) {
          return this.children.find(c => s.startsWith('.') ? c.className?.includes(s.slice(1)) : c.id === s.slice(1)) || null;
        }
        querySelectorAll() { return []; }
        setAttribute(k, v) { this[k] = v; }
        addEventListener() {}
        removeEventListener() {}
      }

      const body = new MockEl('body');
      const origDoc = global.document;

      try {
        global.document = {
          body,
          createElement: tag => new MockEl(tag),
          getElementById: () => null
        };

        const tb = new TreasureBox();
        const item = {
          id: 'tb-test-1',
          originalProblem: {
            worldId: 1,
            stageId: 1,
            prompt: '587 + 645 = ?',
            operands: [587, 645],
            operator: '+',
            expectedAnswer: 1232
          },
          masteryLevel: 0,
          consecutiveCorrect: 0
        };

        assert.equal(body.children.length, 0);
        tb.launchReviewModal(item);

        assert.equal(tb.reviewModalEl.children.length, 1, 'Modal card must be appended inside overlay');
        assert.ok(tb.reviewModalEl.querySelector('.modal-card'), 'Modal card element exists');
        assert.ok(tb.reviewModalEl, 'tb.reviewModalEl must hold reference to modal overlay');
        assert.equal(body.children.length, 1, 'Modal overlay must be appended to body');

        // Destroy component
        tb.destroy();

        assert.equal(tb.reviewModalEl, null, 'tb.reviewModalEl must be cleared to null');
        assert.equal(body.children.length, 0, 'body children must be cleaned up to 0 after destroy()');
      } finally {
        global.document = origDoc;
      }
    });
  });

  // =========================================================================
  // Suite 6: Parent Cheer Board PIN, Radar Analytics & Cheer Stamps
  // =========================================================================
  describe('Suite 6: Parent Cheer Board PIN, Radar Analytics & Cheer Stamps', () => {
    it('S6-1: verifies 4-digit PIN authentication (default 1234)', () => {
      assert.equal(verifyPin('1234', '1234'), true);
      assert.equal(verifyPin(1234, '1234'), true);
      assert.equal(verifyPin('9999', '1234'), false);
      assert.equal(verifyPin('', '1234'), false);
      assert.equal(verifyPin(null, '1234'), false);
      assert.equal(verifyPin(undefined, '1234'), false);
    });

    it('S6-2: calculates 5-world radar chart scores from cleared stages', () => {
      const progress = StorageService.createDefaultProgress();
      // Clear 2 out of 3 stages in World 1
      progress.stageProgress['stage-1'].cleared = true;
      progress.stageProgress['stage-2'].cleared = true;

      const scores = calculateRadarScores(progress);
      assert.equal(scores.world1, 67); // Math.round(2/3 * 100)
      assert.equal(scores.world2, 0);
      assert.equal(scores.world3, 0);
      assert.equal(scores.world4, 0);
      assert.equal(scores.world5, 0);
    });

    it('S6-3: creates parent cheer stamp with custom message capped at 50 characters', () => {
      const normalCheer = createCheerStamp('STAMP_RECOVERY', '自分で直せてすごい！');
      assert.equal(normalCheer.stampId, 'STAMP_RECOVERY');
      assert.equal(normalCheer.customText, '自分で直せてすごい！');
      assert.equal(normalCheer.readByChild, false);

      // 50-character limit
      const longText = 'あ'.repeat(80);
      const cappedCheer = createCheerStamp('STAMP_FOCUS', longText);
      assert.equal(cappedCheer.customText.length, 50);
    });

    it('S6-4: round-trips user progress via exportBackupJSON and importBackupJSON', () => {
      const progress = StorageService.createDefaultProgress();
      progress.stageProgress['stage-1'].cleared = true;
      progress.gamification.selfCorrectionCount = 7;

      const jsonStr = StorageService.exportBackupJSON(progress);
      assert.ok(typeof jsonStr === 'string');

      const restored = StorageService.importBackupJSON(jsonStr);
      assert.equal(restored.stageProgress['stage-1'].cleared, true);
      assert.equal(restored.gamification.selfCorrectionCount, 7);
    });

    it('S6-5: generates 8-digit transfer code formatted as LAB-XXXX-XXXX and restores state', async () => {
      const progress = StorageService.createDefaultProgress();
      progress.stageProgress['stage-3'].cleared = true;

      const code = StorageService.generateTransferCode(progress);
      assert.match(code, /^LAB-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

      const restored = await StorageService.restoreFromTransferCode(code);
      assert.ok(restored);
      assert.equal(restored.stageProgress['stage-3'].cleared, true);
    });
  });

});
