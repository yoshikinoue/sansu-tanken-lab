/**
 * tests/components.test.js
 * Milestone 4 Component Test Suite (Node.js Native Test Runner)
 *
 * Verifies:
 * - Feature 14: CanvasPad (src/components/canvas-pad.js)
 * - Feature 15: Keypad (src/components/keypad.js)
 * - Feature 16: StepGuide (src/components/step-guide.js)
 * - Feature 17: ToastFeedback (src/components/toast-feedback.js)
 * - Cross-Component Integration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import CanvasPad, {
  createPadState,
  setGridMode,
  startStroke,
  moveStroke,
  endStroke,
  undo,
  clear
} from '../src/components/canvas-pad.js';

import Keypad, {
  minTouchSizePx,
  keys,
  createKeypadState,
  handleInput,
  getValue,
  resolveAnswerLabel
} from '../src/components/keypad.js';

import StepGuideModal, {
  createSession,
  submitStepAnswer
} from '../src/components/step-guide.js';

import ToastFeedback, {
  forbiddenSymbols,
  positiveMessages,
  validateToastContent,
  createToast,
  showToast,
  ToastManager
} from '../src/components/toast-feedback.js';

import { CurriculumEngineReference } from './e2e/test-helpers.js';

describe('Milestone 4: UI Components Unit Tests', () => {

  // =========================================================================
  // 1. Canvas Memo Pad (Feature 14)
  // =========================================================================
  describe('1. CanvasPad (Feature 14)', () => {
    it('initializes pad state with default gridMode "none", dpr 2, and empty strokes', () => {
      const state = createPadState();
      assert.equal(state.gridMode, 'none');
      assert.equal(state.dpr, 2);
      assert.deepEqual(state.strokes, []);
      assert.equal(state.currentStroke, null);
      assert.equal(state.width, 600);
      assert.equal(state.height, 400);
    });

    it('accepts custom options in createPadState', () => {
      const state = createPadState({ dpr: 3, gridMode: 'grid', width: 800, height: 500 });
      assert.equal(state.dpr, 3);
      assert.equal(state.gridMode, 'grid');
      assert.equal(state.width, 800);
      assert.equal(state.height, 500);
    });

    it('toggles grid modes ("none" -> "grid" -> "column")', () => {
      const state = createPadState();
      setGridMode(state, 'grid');
      assert.equal(state.gridMode, 'grid');
      setGridMode(state, 'column');
      assert.equal(state.gridMode, 'column');
      setGridMode(state, 'none');
      assert.equal(state.gridMode, 'none');
    });

    it('ignores invalid grid mode strings gracefully', () => {
      const state = createPadState();
      setGridMode(state, 'invalid_mode');
      assert.equal(state.gridMode, 'none');
    });

    it('records stroke path coordinates accurately from start to end', () => {
      const state = createPadState();
      startStroke(state, 10, 15);
      assert.deepEqual(state.currentStroke, [{ x: 10, y: 15 }]);
      moveStroke(state, 20, 25);
      moveStroke(state, 30, 35);
      assert.equal(state.currentStroke.length, 3);
      endStroke(state);
      assert.equal(state.strokes.length, 1);
      assert.equal(state.strokes[0].length, 3);
      assert.equal(state.currentStroke, null);
    });

    it('ignores moveStroke when no stroke has been started (currentStroke === null)', () => {
      const state = createPadState();
      moveStroke(state, 100, 200);
      assert.equal(state.currentStroke, null);
      assert.equal(state.strokes.length, 0);
    });

    it('does not append empty strokes when endStroke is called without an active stroke', () => {
      const state = createPadState();
      endStroke(state);
      assert.equal(state.strokes.length, 0);
      assert.equal(state.currentStroke, null);
    });

    it('records single-point tap stroke (startStroke immediately followed by endStroke)', () => {
      const state = createPadState();
      startStroke(state, 120, 240);
      endStroke(state);
      assert.equal(state.strokes.length, 1);
      assert.deepEqual(state.strokes[0], [{ x: 120, y: 240 }]);
    });

    it('undoes the last drawn stroke', () => {
      const state = createPadState();
      startStroke(state, 1, 1);
      endStroke(state);
      startStroke(state, 2, 2);
      endStroke(state);
      assert.equal(state.strokes.length, 2);
      const popped = undo(state);
      assert.ok(popped);
      assert.deepEqual(popped, [{ x: 2, y: 2 }]);
      assert.equal(state.strokes.length, 1);
    });

    it('returns undefined safely when calling undo on empty pad', () => {
      const state = createPadState();
      assert.equal(undo(state), undefined);
      assert.equal(state.strokes.length, 0);
    });

    it('clears all strokes and resets active drawing state', () => {
      const state = createPadState();
      startStroke(state, 5, 5);
      endStroke(state);
      clear(state);
      assert.equal(state.strokes.length, 0);
      assert.equal(state.currentStroke, null);
    });

    it('discards in-progress currentStroke and all saved strokes when clear is called mid-stroke', () => {
      const state = createPadState();
      startStroke(state, 10, 10);
      endStroke(state);
      startStroke(state, 30, 30);
      moveStroke(state, 40, 40);
      clear(state);
      assert.equal(state.strokes.length, 0);
      assert.equal(state.currentStroke, null);
    });

    it('instantiates CanvasPad class and safely handles headless methods', () => {
      const pad = new CanvasPad({ width: 500, height: 350 });
      assert.equal(pad.state.width, 500);
      assert.equal(pad.state.height, 350);
      // Mount without document returns this safely
      assert.equal(pad.mount(null), pad);
      // Destroy does not throw
      pad.destroy();
    });
  });

  // =========================================================================
  // 2. Virtual 10-Key Keypad (Feature 15)
  // =========================================================================
  describe('2. Keypad (Feature 15)', () => {
    it('satisfies touch target minimum requirement (>=48px)', () => {
      assert.ok(minTouchSizePx >= 48);
      assert.ok(Keypad.minTouchSizePx >= 48);
    });

    it('exports all 14 standard keys', () => {
      assert.deepEqual(keys, ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'rem', 'del', 'clear', 'enter']);
      assert.deepEqual(Keypad.keys, keys);
    });

    it('creates initial keypad state with quotient active and empty strings', () => {
      const state = createKeypadState(false);
      assert.equal(state.hasRemainder, false);
      assert.equal(state.activeField, 'quotient');
      assert.equal(state.quotientText, '');
      assert.equal(state.remainderText, '');
    });

    it('enters numeric digits for quotient', () => {
      let state = createKeypadState(false);
      state = handleInput(state, '5');
      state = handleInput(state, '8');
      state = handleInput(state, '7');
      assert.equal(state.quotientText, '587');
      assert.equal(getValue(state), 587);
    });

    it('deletes digits with "del" and clears input with "clear"', () => {
      let state = createKeypadState(false);
      state = handleInput(state, '9');
      state = handleInput(state, '4');
      state = handleInput(state, 'del');
      assert.equal(state.quotientText, '9');
      state = handleInput(state, 'clear');
      assert.equal(state.quotientText, '');
      assert.equal(getValue(state), 0);
    });

    it('keeps quotientText and remainderText as "" when pressing del on empty state', () => {
      let state = createKeypadState(true);
      state = handleInput(state, 'del');
      assert.equal(state.quotientText, '');
      state = handleInput(state, 'rem');
      state = handleInput(state, 'del');
      assert.equal(state.remainderText, '');
    });

    it('returns 0 from getValue on empty single state and { quotient: 0, remainder: 0 } on empty remainder state', () => {
      const singleState = createKeypadState(false);
      const remState = createKeypadState(true);
      assert.equal(getValue(singleState), 0);
      assert.deepEqual(getValue(remState), { quotient: 0, remainder: 0 });
    });

    it('switches between quotient and remainder fields via "rem" key when hasRemainder is true', () => {
      let state = createKeypadState(true);
      assert.equal(state.activeField, 'quotient');
      state = handleInput(state, '7');
      state = handleInput(state, 'rem');
      assert.equal(state.activeField, 'remainder');
      state = handleInput(state, '2');
      assert.equal(state.remainderText, '2');
      assert.deepEqual(getValue(state), { quotient: 7, remainder: 2 });
    });

    it('does not toggle remainder field when hasRemainder is false', () => {
      let state = createKeypadState(false);
      state = handleInput(state, 'rem');
      assert.equal(state.activeField, 'quotient');
    });

    it('caps remainder field at 4 digits while capping quotient field at 6 digits', () => {
      let state = createKeypadState(true);
      for (let i = 0; i < 10; i++) state = handleInput(state, '1');
      assert.equal(state.quotientText.length, 6);
      assert.equal(state.quotientText, '111111');

      state = handleInput(state, 'rem');
      for (let i = 0; i < 10; i++) state = handleInput(state, '2');
      assert.equal(state.remainderText.length, 4);
      assert.equal(state.remainderText, '2222');
    });

    it('ignores non-digit invalid keys ("a", "-", " ", "99", "") without mutating text', () => {
      let state = createKeypadState(false);
      state = handleInput(state, '5');
      for (const badKey of ['a', '-', ' ', '99', '', '$', 'undefined']) {
        state = handleInput(state, badKey);
      }
      assert.equal(state.quotientText, '5');
    });

    it('instantiates Keypad class and handles programmatic value manipulation', () => {
      const keypad = new Keypad({ hasRemainder: true });
      assert.equal(keypad.state.hasRemainder, true);
      keypad.setValue({ quotient: 42, remainder: 3 });
      assert.deepEqual(keypad.getValue(), { quotient: 42, remainder: 3 });
      keypad.clear();
      assert.deepEqual(keypad.getValue(), { quotient: 0, remainder: 0 });
      keypad.destroy();
    });

    it('Keypad lock blocks digits and submit until unlocked (BUG-009)', () => {
      let submitCount = 0;
      const keypad = new Keypad({ onSubmit: () => { submitCount++; } });
      keypad.pressKey('4');
      keypad.pressKey('2');
      assert.equal(keypad.state.quotientText, '42');
      keypad.setLocked(true);
      assert.equal(keypad.locked, true);
      keypad.pressKey('9');
      keypad.pressKey('enter');
      assert.equal(keypad.state.quotientText, '42', 'locked keypad must not accept digits');
      assert.equal(submitCount, 0, 'locked keypad must not submit');
      keypad.setLocked(false);
      keypad.pressKey('enter');
      assert.equal(submitCount, 1, 'unlocked keypad submits again');
      keypad.destroy();
    });

    it('resolves operator-specific answer labels (和/差/積/商/こたえ) accurately (BUG-003)', () => {
      assert.equal(resolveAnswerLabel({ operator: '+', hasRemainder: false, prompt: '555 + 219 = ?' }), '和 (こたえ)');
      assert.equal(resolveAnswerLabel({ operator: '-', hasRemainder: false, prompt: '673 - 148 = ?' }), '差 (こたえ)');
      assert.equal(resolveAnswerLabel({ operator: '−', hasRemainder: false, prompt: '673 − 148 = ?' }), '差 (こたえ)');
      assert.equal(resolveAnswerLabel({ operator: '×', hasRemainder: false, prompt: '408 × 6 = ?' }), '積 (こたえ)');
      assert.equal(resolveAnswerLabel({ operator: '÷', hasRemainder: false, prompt: '624 ÷ 3 = ?' }), '商 (こたえ)');
      assert.equal(resolveAnswerLabel({ operator: '÷', hasRemainder: true, prompt: '53 ÷ 7 = ?' }), '商 (こたえ)');
      assert.equal(resolveAnswerLabel({ operator: '+', hasRemainder: false, prompt: '□ + 35 = 80' }), 'こたえ');
      assert.equal(resolveAnswerLabel({ operator: 'mixed', hasRemainder: false, prompt: '20 + 15 × 3 = ?' }), 'こたえ');
      assert.equal(resolveAnswerLabel({}), 'こたえ');
    });
  });

  // =========================================================================
  // 3. Hybrid Step Guide UI (Feature 16)
  // =========================================================================
  describe('3. StepGuide (Feature 16)', () => {
    it('creates session with correct initial state from curriculum problem', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      assert.equal(session.problemId, prob.id);
      assert.equal(session.currentStepIndex, 0);
      assert.equal(session.completed, false);
      assert.equal(session.errorCount, 0);
      assert.ok(session.steps.length > 0);
    });

    it('advances currentStepIndex on correct answer submission', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      const expected0 = session.steps[0].expectedStepValue;
      const res = submitStepAnswer(session, 0, expected0);
      assert.equal(res.success, true);
      assert.equal(session.currentStepIndex, 1);
      assert.equal(session.completed, false);
    });

    it('coerces string input to number matching expectedStepValue', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      const expectedStr = String(session.steps[0].expectedStepValue);
      const res = submitStepAnswer(session, 0, expectedStr);
      assert.equal(res.success, true);
    });

    it('returns hint and increments errorCount on wrong step answer', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      const res = submitStepAnswer(session, 0, 9999);
      assert.equal(res.success, false);
      assert.ok(res.hint.length > 0);
      assert.equal(session.errorCount, 1);
      assert.equal(session.currentStepIndex, 0);
    });

    it('increments errorCount on repeated wrong submissions without advancing currentStepIndex', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      submitStepAnswer(session, 0, -99);
      submitStepAnswer(session, 0, -98);
      const res3 = submitStepAnswer(session, 0, -97);
      assert.equal(res3.success, false);
      assert.equal(session.errorCount, 3);
      assert.equal(session.currentStepIndex, 0);
    });

    it('marks session completed when all steps are answered correctly', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      for (let i = 0; i < session.steps.length; i++) {
        const val = session.steps[i].expectedStepValue;
        submitStepAnswer(session, i, val);
      }
      assert.equal(session.completed, true);
      assert.equal(session.stepAnswers[session.steps.length - 1], session.steps[session.steps.length - 1].expectedStepValue);
    });

    it('returns false for negative or out-of-range step indices', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      assert.equal(submitStepAnswer(session, -1, 0), false);
      assert.equal(submitStepAnswer(session, session.steps.length, 0), false);
      assert.equal(submitStepAnswer(session, 999, 0), false);
    });

    it('safely handles empty problem without error', () => {
      const session = createSession({ id: 'empty-prob' });
      assert.deepEqual(session.steps, []);
      assert.equal(submitStepAnswer(session, 0, 1), false);
    });

    it('safely handles null or undefined problem in createSession', () => {
      const sessionNull = createSession(null);
      assert.equal(sessionNull.problemId, 'unknown');
      assert.deepEqual(sessionNull.steps, []);
      assert.equal(submitStepAnswer(sessionNull, 0, 1), false);

      const sessionUndef = createSession(undefined);
      assert.equal(sessionUndef.problemId, 'unknown');
      assert.deepEqual(sessionUndef.steps, []);
    });

    it('rejects empty, whitespace, null, undefined, and boolean inputs even when expectedStepValue is 0', () => {
      const zeroStepProb = {
        id: 'zero-step-prob',
        stepGuide: [
          { stepTitle: '余りを書こう', hint: '0も数字だよ', expectedStepValue: 0 }
        ]
      };
      const session = createSession(zeroStepProb);
      for (const bad of ['', '   ', null, undefined, false, true]) {
        const res = submitStepAnswer(session, 0, bad);
        assert.equal(res.success, false);
        assert.equal(session.completed, false);
        assert.equal(session.stepAnswers[0], undefined);
      }

      // Numeric 0 and "0" must still be accepted
      const sessionNum = createSession(zeroStepProb);
      const resNum = submitStepAnswer(sessionNum, 0, 0);
      assert.equal(resNum.success, true);
      assert.equal(sessionNum.completed, true);

      const sessionStr = createSession(zeroStepProb);
      const resStr = submitStepAnswer(sessionStr, 0, '0');
      assert.equal(resStr.success, true);
      assert.equal(sessionStr.completed, true);
    });

    it('instantiates StepGuideModal and handles lifecycle methods', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const modal = new StepGuideModal({ problem: prob });
      assert.ok(modal.session);
      assert.equal(modal.isOpen, false);
      // open in headless returns safely
      modal.open(null);
      modal.close();
      modal.destroy();
    });
  });

  // =========================================================================
  // 4. No-X Feedback Toast (Feature 17)
  // =========================================================================
  describe('4. ToastFeedback (Feature 17)', () => {
    it('strictly forbids red ❌ and battsu symbols in validateToastContent', () => {
      for (const sym of forbiddenSymbols) {
        assert.equal(validateToastContent(`テスト${sym}メッセージ`), false);
        assert.equal(validateToastContent(sym), false);
      }
    });

    it('rejects non-string inputs safely in validateToastContent', () => {
      assert.equal(validateToastContent(null), false);
      assert.equal(validateToastContent(undefined), false);
      assert.equal(validateToastContent(123), false);
      assert.equal(validateToastContent({}), false);
    });

    it('accepts all encouraging lab messages in validateToastContent', () => {
      for (const msg of positiveMessages) {
        assert.equal(validateToastContent(msg), true);
      }
    });

    it('creates toast metadata with warm amber color and gentle-shake animation', () => {
      const toast = createToast('encourage');
      assert.equal(toast.color, '#eab308');
      assert.notEqual(toast.color, '#ef4444');
      assert.notEqual(toast.color, '#ff0000');
      assert.equal(toast.animation, 'gentle-shake');
      assert.equal(toast.hasForbiddenSymbol, false);
    });

    it('defaults unknown toast types safely to positive encouraging message', () => {
      const toast = createToast('unknown_type');
      assert.equal(toast.message, 'おしい！もう一歩！');
      assert.equal(toast.color, '#eab308');
    });

    it('supports specific toast types: hint, rescan, challenge, and self-correct', () => {
      const hintToast = createToast('hint');
      assert.equal(hintToast.message, 'ヒントを発見！');
      const rescanToast = createToast('rescan');
      assert.equal(rescanToast.message, 'ラボデータ再スキャン！');
      const challengeToast = createToast('challenge');
      assert.equal(challengeToast.message, 'ナイスチャレンジ！もう一度考えてみよう！');
      const selfCorrectToast = createToast('self-correct');
      assert.equal(selfCorrectToast.message, 'おしい！もう一歩！');
    });

    it('sets hasForbiddenSymbol strictly to false on all generated toasts', () => {
      for (const t of ['encourage', 'hint', 'rescan', 'challenge', 'self-correct', 'other']) {
        assert.equal(createToast(t).hasForbiddenSymbol, false);
      }
    });

    it('instantiates ToastManager class and handles showToast in headless mode', () => {
      const mgr = new ToastManager();
      assert.equal(mgr.defaultDuration, 2500);
      assert.equal(showToast(null, 'encourage'), null);
      assert.equal(mgr.show('encourage'), null);
      assert.equal(mgr.hint(), null);
    });
  });

  // =========================================================================
  // 5. Cross-Component Integration
  // =========================================================================
  describe('5. Cross-Component Integration', () => {
    it('integrates Keypad input into StepGuide step verification', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      const expectedStep0 = session.steps[0].expectedStepValue;

      let keypadState = createKeypadState(false);
      const digits = String(expectedStep0).split('');
      for (const d of digits) {
        keypadState = handleInput(keypadState, d);
      }
      const enteredValue = getValue(keypadState);
      const res = submitStepAnswer(session, 0, enteredValue);
      assert.equal(res.success, true);
      assert.equal(session.currentStepIndex, 1);
    });

    it('triggers ToastFeedback on StepGuide mistake without displaying forbidden symbols', () => {
      const prob = CurriculumEngineReference.generateSingleProblem(1, 1, 1, 2);
      const session = createSession(prob);
      const res = submitStepAnswer(session, 0, 9999);
      assert.equal(res.success, false);

      const toast = createToast('encourage');
      assert.equal(validateToastContent(toast.message), true);
      assert.equal(validateToastContent(res.hint), true);
    });

    it('resets CanvasPad and clears Keypad cleanly between problem transitions', () => {
      const padState = createPadState();
      startStroke(padState, 10, 20);
      moveStroke(padState, 30, 40);
      endStroke(padState);
      assert.equal(padState.strokes.length, 1);

      let keypadState = createKeypadState(true);
      keypadState = handleInput(keypadState, '9');
      keypadState = handleInput(keypadState, 'rem');
      keypadState = handleInput(keypadState, '3');
      assert.deepEqual(getValue(keypadState), { quotient: 9, remainder: 3 });

      // Problem transition cleanup
      clear(padState);
      keypadState = handleInput(keypadState, 'clear');

      assert.equal(padState.strokes.length, 0);
      assert.equal(padState.currentStroke, null);
      assert.equal(keypadState.quotientText, '');
      assert.equal(keypadState.remainderText, '');
      assert.equal(keypadState.activeField, 'quotient');
    });
  });
});

describe('BUG-010: TreasureBox mastery counting integrity', () => {
  it('counts consecutive correct answers per item and never leaks counts across items', async () => {
    const { addItem, recordAttempt } = await import('../src/components/treasure-box.js');
    const box = { items: [] };
    const itemA = addItem(box, { prompt: '11 + 22 = ?', operands: [11, 22], operator: '+', worldId: 1, stageId: 1 });
    const itemB = addItem(box, { prompt: '55 - 33 = ?', operands: [55, 33], operator: '-', worldId: 1, stageId: 1 });
    assert.ok(itemA && itemB && itemA.id !== itemB.id);

    recordAttempt(itemA, true);
    assert.equal(itemA.consecutiveCorrect, 1);
    assert.equal(itemA.masteryLevel, 1);
    assert.equal(itemB.consecutiveCorrect, 0);
    assert.equal(itemB.masteryLevel, 0);

    recordAttempt(itemA, true);
    assert.equal(itemA.consecutiveCorrect, 2);
    assert.equal(itemA.masteryLevel, 2);
    assert.equal(itemB.consecutiveCorrect, 0);

    recordAttempt(itemA, false);
    assert.equal(itemA.consecutiveCorrect, 0);
    assert.equal(itemA.masteryLevel, 0);
  });

  it('preserves per-item counts through a save/load normalization round-trip', async () => {
    const { addItem, recordAttempt } = await import('../src/components/treasure-box.js');
    const { normalizeProgressData } = await import('../src/services/storage-service.js');
    const box = { items: [] };
    const itemA = addItem(box, { prompt: '78 ÷ 25 = ?', operands: [78, 25], operator: '÷', worldId: 4, stageId: 2 });
    const itemB = addItem(box, { prompt: '33 ÷ 11 = ?', operands: [33, 11], operator: '÷', worldId: 4, stageId: 2 });
    recordAttempt(itemA, true);
    recordAttempt(itemA, true);

    const revived = normalizeProgressData(JSON.parse(JSON.stringify({ treasureBox: box })));
    const revivedA = revived.treasureBox.items.find(i => i.id === itemA.id);
    const revivedB = revived.treasureBox.items.find(i => i.id === itemB.id);
    assert.equal(revivedA.consecutiveCorrect, 2);
    assert.equal(revivedA.masteryLevel, 2);
    assert.equal(revivedB.consecutiveCorrect, 0);
    assert.equal(revivedB.masteryLevel, 0);
  });
});
