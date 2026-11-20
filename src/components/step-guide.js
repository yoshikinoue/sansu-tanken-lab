/**
 * src/components/step-guide.js
 * 算数探検ラボ - ハイブリッド・ステップ穴埋めガイド (StepGuide)
 *
 * Dual capability:
 * 1. Pure session management functions matching StepGuideReference for headless Node.js
 * 2. Interactive DOM StepGuideModal controller for scaffolded step-by-step guidance.
 */

// --- PURE SESSION MANAGEMENT FUNCTIONS (HEADLESS COMPATIBLE) ---

export function createSession(problem) {
  const steps = problem && Array.isArray(problem.stepGuide)
    ? [...problem.stepGuide]
    : [];

  return {
    problemId: problem?.id || 'unknown',
    steps,
    currentStepIndex: 0,
    completed: false,
    stepAnswers: {},
    errorCount: 0
  };
}

export function submitStepAnswer(session, stepIndex, val) {
  if (!session || !Array.isArray(session.steps) || session.steps.length === 0) {
    return false;
  }
  if (typeof stepIndex !== 'number' || stepIndex < 0 || stepIndex >= session.steps.length) {
    return false;
  }
  const step = session.steps[stepIndex];
  if (!step) return false;

  const isEmptyInput =
    val === null ||
    val === undefined ||
    typeof val === 'boolean' ||
    (typeof val === 'string' && val.trim() === '');
  const numericVal = isEmptyInput ? NaN : Number(val);
  const rawExpected = step.expectedStepValue !== undefined
    ? step.expectedStepValue
    : (step.expectedValue !== undefined ? step.expectedValue : step.answer);
  const expectedVal = Number(rawExpected);
  const isCorrect = !isNaN(numericVal) && numericVal === expectedVal;

  if (isCorrect) {
    session.stepAnswers[stepIndex] = val;
    if (stepIndex + 1 < session.steps.length) {
      session.currentStepIndex = stepIndex + 1;
    } else {
      session.completed = true;
    }
    return {
      success: true,
      nextStep: session.currentStepIndex,
      completed: session.completed
    };
  } else {
    session.errorCount++;
    return {
      success: false,
      hint: step.hint || 'もう一度確認してみよう！',
      errorCount: session.errorCount
    };
  }
}

// --- DOM MODAL CONTROLLER CLASS FOR BROWSER RUNTIME ---

export class StepGuideModal {
  constructor(options = {}) {
    this.problem = options.problem || null;
    this.diagnosis = options.diagnosis || null;
    this.session = options.session || (options.problem ? createSession(options.problem) : null);
    this.onComplete = options.onComplete || null;
    this.onFinish = options.onFinish || null;
    this.onStepSuccess = options.onStepSuccess || null;
    this.onStepError = options.onStepError || null;
    this.onClose = options.onClose || null;
    this.container = options.container || null;
    this.modalEl = null;
    this.isOpen = false;
    this._completedNotified = false;
    this._openFocusTimer = null;
    this._adaptStepsToDiagnosis();
  }

  setProblem(problem, diagnosis = null) {
    this.problem = problem;
    this.diagnosis = diagnosis;
    this.session = createSession(problem);
    this._completedNotified = false;
    this._adaptStepsToDiagnosis();
    if (this.isOpen) {
      this.refresh();
    }
  }

  /**
   * BUG-008: the generated step guide narrates the problem's designed trap
   * (e.g. a trial quotient that is too big). When the learner's actual error
   * is the opposite correction (too small instead of too big, or vice versa),
   * step 1 kept telling the wrong story. Rewrite step 1 from the learner's
   * actual answer (diagnosis.userAnswer) so the text matches what they did.
   * The expected step value (the correct quotient) does not change.
   */
  _adaptStepsToDiagnosis() {
    if (!this.session || !Array.isArray(this.session.steps) || !this.problem) return;
    const ua = this.diagnosis?.userAnswer;
    if (!ua) return;
    const [A, B] = this.problem.operands || [];
    if (!Number.isFinite(A) || !Number.isFinite(B) || !B) return;
    const userQ = Number(ua.value);
    const userR = Number(ua.remainder ?? 0);
    if (!Number.isFinite(userQ) || !Number.isFinite(userR)) return;

    const actualTooSmall = userR >= B;
    const actualTooBig = userQ * B > A;
    if (!actualTooSmall && !actualTooBig) return;

    this.session.steps = this.session.steps.map((step) => {
      const trigger = step?.correctionTrigger;
      if (!trigger) return step;
      if (trigger.condition === 'product_greater_than_dividend' && actualTooSmall) {
        return {
          ...step,
          explanation: `${A} ÷ ${B} で、あなたがたてた商「${userQ}」だと、あまりが ${userR} になって、わる数 ${B} より大きいね！商が小さすぎたから、1大きく修正するといくつ？`,
          hint: `あまりが わる数 ${B} より大きいときは、商を1増やしてみよう！`
        };
      }
      if (trigger.condition === 'difference_gte_divisor' && actualTooBig) {
        return {
          ...step,
          explanation: `${A} ÷ ${B} で、あなたがたてた商「${userQ}」だと、積が ${userQ * B} になって ${A} から引けないね！商が大きすぎたから、1小さく修正するといくつ？`,
          hint: `積が わられる数 ${A} より大きいときは、商を1減らしてみよう！`
        };
      }
      return step;
    });
  }

  render() {
    if (typeof document === 'undefined') return null;
    if (!this.session) return null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay' + (this.isOpen ? ' open' : '');

    const card = document.createElement('div');
    card.className = 'modal-card step-guide-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <div class="modal-title">
        <span>🔍</span>
        <span>ステップで解いてみよう！</span>
      </div>
      <button type="button" class="btn btn-secondary modal-close-btn" aria-label="閉じる">✕</button>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';

    const content = document.createElement('div');
    content.className = 'step-guide-content';

    // Original Problem & Error Diagnosis Banner
    const problemPrompt = this.problem?.prompt ||
      (this.problem?.operands ? `${this.problem.operands[0]} ${this.problem.operator || ''} ${this.problem.operands[1]} = ?` : '');
    const diagMsg = this.diagnosis?.adviceMessage ||
      this.diagnosis?.diagnosis ||
      this.problem?.commonTrap?.hintMessage ||
      '';

    if (problemPrompt || diagMsg) {
      const problemBanner = document.createElement('div');
      problemBanner.className = 'step-guide-problem-banner';
      problemBanner.innerHTML = `
        ${problemPrompt ? `<div class="step-guide-problem-prompt">📝 もんだい: <strong>${problemPrompt}</strong></div>` : ''}
        ${diagMsg ? `<div class="step-guide-diagnosis">💡 ${diagMsg}</div>` : ''}
      `;
      content.appendChild(problemBanner);
    }

    this.session.steps.forEach((step, idx) => {
      const isCompleted = idx < this.session.currentStepIndex || this.session.stepAnswers[idx] !== undefined;
      const isCurrent = idx === this.session.currentStepIndex && !this.session.completed;

      const stepCard = document.createElement('div');
      stepCard.className = `step-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`;
      stepCard.dataset.stepIndex = String(idx);

      const statusBadge = isCompleted ? '✅' : isCurrent ? '👉' : '⏳';
      const answeredVal = this.session.stepAnswers[idx] !== undefined ? this.session.stepAnswers[idx] : '';
      const stepTitle = step.title || step.label || '';
      const stepExplanation = step.explanation || step.instructionText || '';

      stepCard.innerHTML = `
        <div class="step-header">
          <span class="step-title">${statusBadge} ステップ ${step.stepNumber || idx + 1}: ${stepTitle}</span>
        </div>
        <div class="step-explanation">${stepExplanation}</div>
        <div class="step-input-row">
          <input type="text"
            class="step-input"
            inputmode="numeric"
            pattern="[0-9]*"
            data-step-index="${idx}"
            value="${answeredVal}"
            placeholder="?"
            ${isCurrent ? '' : 'disabled'} />
          ${isCurrent ? '<button type="button" class="btn btn-primary step-check-btn">確認</button>' : ''}
        </div>
        <div class="step-hint-box" style="display: none;"></div>
      `;

      content.appendChild(stepCard);
    });

    // Completed Banner
    if (this.session.completed) {
      const completeBanner = document.createElement('div');
      completeBanner.className = 'step-guide-complete-banner';
      completeBanner.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h3 style="color: var(--color-emerald-success); font-size: 1.3rem;">🎉 全ステップ正解！自分の力で直せたね！</h3>
          <p style="color: var(--color-text-muted); margin-top: 8px;">もとの問題画面にもどって、10キーで答えを入力しよう！</p>
          <button type="button" class="btn btn-success btn-large step-finish-btn" style="margin-top: 16px;">問題へ戻る</button>
        </div>
      `;
      content.appendChild(completeBanner);
    }

    body.appendChild(content);
    card.appendChild(header);
    card.appendChild(body);
    overlay.appendChild(card);

    this._bindEvents(overlay);
    this.modalEl = overlay;
    return overlay;
  }

  _bindEvents(overlay) {
    overlay.querySelector('.modal-close-btn')?.addEventListener('click', () => this.close());

    const submitFromInput = (input) => {
      if (!input) return;
      const rawStepIdx = input.dataset?.stepIndex ?? input.getAttribute?.('data-step-index');
      const stepIdx = Number(rawStepIdx);
      const val = String(input.value ?? '').trim();
      if (val === '') {
        this._showStepHint(stepIdx, '数字を入力してから「確認」をおしてね！');
        input.focus?.();
        return;
      }
      this.submit(stepIdx, val);
    };

    overlay.querySelectorAll('.step-check-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.step-input-row');
        const input = row?.querySelector('.step-input');
        submitFromInput(input);
      });
    });

    overlay.querySelectorAll('.step-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault?.();
          e.stopPropagation?.();
          submitFromInput(input);
        }
      });
    });

    overlay.querySelector('.step-finish-btn')?.addEventListener('click', () => {
      if (this.session?.completed && !this._completedNotified && typeof this.onComplete === 'function') {
        this._completedNotified = true;
        this.onComplete({ session: this.session, wasSelfCorrected: true });
      }
      if (typeof this.onFinish === 'function') {
        this.onFinish({ session: this.session, wasSelfCorrected: true });
      }
      this.close();
    });

    // BUG-009: the step guide must NOT close on backdrop clicks. A stray
    // click right after the guide opens used to dismiss it instantly, which
    // made a recorded wrong answer look like the app never reacted (the
    // arena keypad was cleared on close, leaving display 0 and the same
    // problem). Close only via the explicit close/finish controls.
  }

  submit(stepIndex, val) {
    const res = submitStepAnswer(this.session, stepIndex, val);
    if (!res) return false;

    if (res.success) {
      if (typeof this.onStepSuccess === 'function') {
        this.onStepSuccess({ stepIndex, result: res, session: this.session });
      }
      this.refresh();
      if (this.session.completed && !this._completedNotified && typeof this.onComplete === 'function') {
        this._completedNotified = true;
        this.onComplete({ session: this.session, wasSelfCorrected: true });
      }
    } else {
      if (typeof this.onStepError === 'function') {
        this.onStepError({ stepIndex, result: res, session: this.session });
      }
      this._showStepHint(stepIndex, res.hint);
      const currentInput = this.modalEl?.querySelector(`.step-card[data-step-index="${stepIndex}"] .step-input`);
      if (currentInput) {
        currentInput.value = '';
        currentInput.focus?.();
      }
    }
    return res;
  }

  _showStepHint(stepIndex, hint) {
    if (!this.modalEl) return;
    const card = this.modalEl.querySelector(`.step-card[data-step-index="${stepIndex}"]`);
    if (!card) return;
    const hintBox = card.querySelector('.step-hint-box');
    if (hintBox) {
      hintBox.textContent = `💡 ヒント: ${hint}`;
      hintBox.style.display = 'block';
    }
  }

  open(container = null) {
    this.isOpen = true;
    const target = container || this.container || (typeof document !== 'undefined' ? document.body : null);
    if (!target) return;

    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.classList.add('open');
    } else {
      const el = this.render();
      if (el) target.appendChild(el);
    }

    // Auto-focus current step input or finish button
    if (this._openFocusTimer) {
      clearTimeout(this._openFocusTimer);
    }
    this._openFocusTimer = setTimeout(() => {
      this._openFocusTimer = null;
      const focusTarget = this.session?.completed
        ? this.modalEl?.querySelector('.step-finish-btn')
        : this.modalEl?.querySelector('.step-card.current .step-input');
      if (focusTarget) {
        focusTarget.focus?.();
      }
    }, 50);
  }

  close() {
    this.isOpen = false;
    if (this._openFocusTimer) {
      clearTimeout(this._openFocusTimer);
      this._openFocusTimer = null;
    }
    if (this.modalEl) {
      this.modalEl.classList.remove('open');
    }
    if (typeof this.onClose === 'function') {
      this.onClose();
    }
  }

  refresh() {
    if (!this.modalEl || !this.modalEl.parentNode) return;
    const oldEl = this.modalEl;
    const parent = oldEl.parentNode;
    const newEl = this.render();
    if (newEl) {
      parent.replaceChild(newEl, oldEl);
      this.modalEl = newEl;
      const focusTarget = this.session?.completed
        ? this.modalEl.querySelector('.step-finish-btn')
        : this.modalEl.querySelector('.step-card.current .step-input');
      if (focusTarget) {
        focusTarget.focus?.();
      }
    }
  }

  destroy() {
    if (this._openFocusTimer) {
      clearTimeout(this._openFocusTimer);
      this._openFocusTimer = null;
    }
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
    this.modalEl = null;
  }
}

export default StepGuideModal;
