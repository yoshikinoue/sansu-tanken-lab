/**
 * src/components/keypad.js
 * 算数探検ラボ - 大型バーチャル10キー (Keypad)
 *
 * Dual capability:
 * 1. Pure state management functions for headless Node.js test environment
 * 2. Interactive DOM Keypad class generating tablet-optimized button elements
 *    (min 48px targets, remainder toggle tab, active field highlighting, physical keyboard listeners, audio hooks).
 */

export const minTouchSizePx = 48;
export const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'rem', 'del', 'clear', 'enter'];

// --- PURE STATE MANAGEMENT FUNCTIONS (HEADLESS COMPATIBLE) ---

export function createKeypadState(hasRemainder = false, hasDecimal = false) {
  return {
    hasRemainder: Boolean(hasRemainder),
    hasDecimal: Boolean(hasDecimal),
    activeField: 'quotient', // 'quotient' | 'remainder'
    quotientText: '',
    remainderText: ''
  };
}

export function handleInput(state, key) {
  const next = { ...state };

  if (key === 'del') {
    if (next.activeField === 'quotient') {
      next.quotientText = next.quotientText.slice(0, -1);
    } else {
      next.remainderText = next.remainderText.slice(0, -1);
    }
  } else if (key === 'clear') {
    next.quotientText = '';
    next.remainderText = '';
    next.activeField = 'quotient';
  } else if (key === 'rem') {
    if (next.hasRemainder) {
      next.activeField = (next.activeField === 'quotient') ? 'remainder' : 'quotient';
    }
  } else if (key === '.') {
    // 小数点は小数モードの商フィールドでのみ入力可 (1つまで)。空のときは '0.' を補う
    if (next.hasDecimal && next.activeField === 'quotient' && !next.quotientText.includes('.') && next.quotientText.length < 6) {
      next.quotientText = next.quotientText === '' ? '0.' : `${next.quotientText}.`;
    }
  } else if (/^[0-9]$/.test(key)) {
    if (next.activeField === 'quotient') {
      if (next.quotientText.length < 6) next.quotientText += key;
    } else {
      if (next.remainderText.length < 4) next.remainderText += key;
    }
  }

  return next;
}

export function getValue(state) {
  if (state.hasRemainder) {
    return {
      quotient: state.quotientText === '' ? 0 : Number(state.quotientText),
      remainder: state.remainderText === '' ? 0 : Number(state.remainderText)
    };
  }
  return state.quotientText === '' ? 0 : Number(state.quotientText);
}

export function resolveAnswerLabel({
  operator = null,
  hasRemainder = false,
  prompt = '',
  answerLabel = null
} = {}) {
  if (answerLabel) {
    return String(answerLabel);
  }
  if (Boolean(hasRemainder) || operator === '÷' || operator === '/') {
    return '商 (こたえ)';
  }
  if ((typeof prompt === 'string' && prompt.includes('□')) || operator === 'mixed') {
    return 'こたえ';
  }
  if (operator === '+') {
    return '和 (こたえ)';
  }
  if (operator === '-' || operator === '−') {
    return '差 (こたえ)';
  }
  if (operator === '×' || operator === '*') {
    return '積 (こたえ)';
  }
  return 'こたえ';
}

// --- DOM CONTROLLER CLASS FOR BROWSER RUNTIME ---

export class Keypad {
  static minTouchSizePx = minTouchSizePx;
  static keys = keys;

  constructor(options = {}) {
    this.options = {
      hasRemainder: false,
      hasDecimal: false,
      operator: null,
      prompt: '',
      answerLabel: null,
      onInput: null,    // (key, state) => void
      onChange: null,   // (value, state) => void
      onSubmit: null,   // (value, state) => void
      onSound: null,    // (effectName) => void
      ...options
    };

    this.state = createKeypadState(this.options.hasRemainder, this.options.hasDecimal);
    this.locked = false;
    this.container = null;
    this.displayQuotientEl = null;
    this.displayRemainderEl = null;
    this.quotientRowEl = null;
    this.remainderRowEl = null;
    this.displayBoxEl = null;
    this._boundClickHandler = null;
    this._boundKeyDownHandler = null;
  }

  mount(target) {
    if (typeof document === 'undefined') return this;
    const container = typeof target === 'string' ? document.querySelector(target) : target;
    if (!container) return this;

    this.container = container;
    this.render();
    this.setupEvents();
    this.updateDisplay();
    return this;
  }

  render() {
    const hasRem = this.state.hasRemainder;
    const hasDec = Boolean(this.state.hasDecimal) && !hasRem;
    const answerLabel = resolveAnswerLabel({
      operator: this.options.operator,
      hasRemainder: hasRem,
      prompt: this.options.prompt,
      answerLabel: this.options.answerLabel
    });

    // BUG-009 hardening: render() rebuilds this DOM node, so the locked
    // appearance is re-applied from this.locked on every render. The JS
    // state and the visuals can no longer diverge (a re-render while
    // locked used to restore the clickable look while input stayed dead).
    this.container.innerHTML = `
      <div class="keypad-container${this.locked ? ' keypad-locked' : ''}">
        <!-- Display Section with Interactive Tabs -->
        <div class="keypad-display" id="keypad-display">
          <div class="display-field-row ${this.state.activeField === 'quotient' ? 'active' : ''}" data-field="quotient">
            <span class="display-label">${answerLabel}</span>
            <span class="display-value" data-bind="quotient">0</span>
          </div>
          <div class="display-field-row remainder-row ${this.state.activeField === 'remainder' ? 'active' : ''}" data-field="remainder" style="display: ${hasRem ? 'flex' : 'none'};">
            <span class="display-label">あまり</span>
            <span class="display-value" data-bind="remainder">0</span>
          </div>
        </div>

        <!-- 10-Key Grid (3-Column Layout with min 48px touch targets) -->
        <div class="keypad-grid">
          <!-- Row 1 -->
          <button type="button" class="key-btn" data-key="7">7</button>
          <button type="button" class="key-btn" data-key="8">8</button>
          <button type="button" class="key-btn" data-key="9">9</button>

          <!-- Row 2 -->
          <button type="button" class="key-btn" data-key="4">4</button>
          <button type="button" class="key-btn" data-key="5">5</button>
          <button type="button" class="key-btn" data-key="6">6</button>

          <!-- Row 3 -->
          <button type="button" class="key-btn" data-key="1">1</button>
          <button type="button" class="key-btn" data-key="2">2</button>
          <button type="button" class="key-btn" data-key="3">3</button>

          <!-- Row 4 -->
          ${hasRem ? `
            <button type="button" class="key-btn action-btn rem-btn" data-key="rem">あまり</button>
          ` : hasDec ? `
            <button type="button" class="key-btn action-btn decimal-btn" data-key=".">.</button>
          ` : `
            <button type="button" class="key-btn action-btn clear-btn" data-key="clear">クリア</button>
          `}
          <button type="button" class="key-btn" data-key="0">0</button>
          <button type="button" class="key-btn action-btn del-btn" data-key="del">⌫</button>

          <!-- Row 5 -->
          ${hasRem || hasDec ? `
            <button type="button" class="key-btn action-btn clear-btn" data-key="clear" style="grid-column: span 1;">クリア</button>
            <button type="button" class="key-btn key-submit" data-key="enter" style="grid-column: span 2;">決定！</button>
          ` : `
            <button type="button" class="key-btn key-submit" data-key="enter" style="grid-column: span 3;">決定！</button>
          `}
        </div>
      </div>
    `;

    this.displayBoxEl = this.container.querySelector('.keypad-display');
    this.quotientRowEl = this.container.querySelector('.display-field-row[data-field="quotient"]');
    this.remainderRowEl = this.container.querySelector('.display-field-row[data-field="remainder"]');
    this.displayQuotientEl = this.container.querySelector('[data-bind="quotient"]');
    this.displayRemainderEl = this.container.querySelector('[data-bind="remainder"]');
  }

  setupEvents() {
    this._boundClickHandler = (e) => {
      // 1. Check Field Row Click (Direct active field focus tab)
      const fieldRow = e.target.closest('.display-field-row');
      if (fieldRow) {
        const field = fieldRow.dataset.field;
        this.setActiveField(field);
        if (typeof this.options.onSound === 'function') {
          this.options.onSound('tap');
        }
        return;
      }

      // 2. Check Keypad Buttons
      const keyBtn = e.target.closest('button[data-key]');
      if (keyBtn) {
        const key = keyBtn.dataset.key;
        this.pressKey(key);
      }
    };

    this.container.addEventListener('click', this._boundClickHandler);

    // Physical keyboard listener
    if (typeof window !== 'undefined') {
      this._boundKeyDownHandler = (e) => {
        // Ignore if any modal dialog is currently open
        if (typeof document !== 'undefined' && typeof document.querySelector === 'function' && document.querySelector('.modal-overlay.open')) {
          return;
        }
        // Ignore if user is typing into an input/textarea/select
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
          return;
        }
        // Ignore Enter on non-keypad buttons so focused navigation/modal controls do not double-trigger keypad
        if (e.target && e.target.tagName === 'BUTTON' && e.key === 'Enter' && !e.target.closest?.('.keypad-container')) {
          return;
        }

        if (/^[0-9]$/.test(e.key)) {
          this.pressKey(e.key);
        } else if (e.key === '.') {
          this.pressKey('.');
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          this.pressKey('del');
        } else if (e.key === 'Delete' || e.key === 'Escape') {
          this.pressKey('clear');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.pressKey('enter');
        } else if (e.key === 'r' || e.key === 'R') {
          if (this.state.hasRemainder) {
            this.pressKey('rem');
          }
        }
      };

      window.addEventListener('keydown', this._boundKeyDownHandler);
    }
  }

  // BUG-009: while locked (e.g. during the arena's advance window), all
  // input and submits are ignored visibly instead of being silently
  // discarded after registering on the display.
  setLocked(locked) {
    this.locked = Boolean(locked);
    const root = this.container?.querySelector?.('.keypad-container');
    if (root) {
      root.classList.toggle('keypad-locked', this.locked);
    }
    return this;
  }

  pressKey(key) {
    if (this.locked) return;
    if (key === 'enter') {
      if (typeof this.options.onSound === 'function') {
        this.options.onSound('tap');
      }
      if (typeof this.options.onSubmit === 'function') {
        this.options.onSubmit(this.getValue(), this.state);
      }
      return;
    }

    this.state = handleInput(this.state, key);

    if (typeof this.options.onSound === 'function') {
      this.options.onSound('tap');
    }

    this.updateDisplay();

    if (typeof this.options.onInput === 'function') {
      this.options.onInput(key, this.state);
    }
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(this.getValue(), this.state);
    }
  }

  setActiveField(field) {
    if (field === 'remainder' && !this.state.hasRemainder) return;
    this.state.activeField = field;
    this.updateDisplay();
  }

  setHasRemainder(hasRemainder) {
    this.state.hasRemainder = Boolean(hasRemainder);
    if (this.state.hasRemainder) {
      // あまり入力と小数点入力は排他: あまりを有効化したら小数点を落とし、
      // 状態と表示 (render 側の小数キー抑制) が食い違わないようにする
      this.state.hasDecimal = false;
      this.options.hasDecimal = false;
    } else {
      this.state.activeField = 'quotient';
      this.state.remainderText = '';
    }
    this.render();
    this.updateDisplay();
  }

  reset(hasRemainder = false, meta = {}) {
    this.state.hasRemainder = Boolean(hasRemainder);
    this.state.activeField = 'quotient';
    this.state.quotientText = '';
    this.state.remainderText = '';
    if (meta && typeof meta === 'object') {
      if ('hasDecimal' in meta) {
        this.options.hasDecimal = Boolean(meta.hasDecimal);
        this.state.hasDecimal = Boolean(meta.hasDecimal);
      }
      if ('operator' in meta) this.options.operator = meta.operator;
      if ('prompt' in meta) this.options.prompt = meta.prompt;
      if ('answerLabel' in meta) this.options.answerLabel = meta.answerLabel;
    }
    // setHasRemainder と対称に、あまり入力が有効な間は小数点入力を落とす
    if (this.state.hasRemainder) {
      this.state.hasDecimal = false;
      this.options.hasDecimal = false;
    }
    this.render();
    this.updateDisplay();
    return this;
  }

  updateDisplay() {
    if (!this.displayQuotientEl) return;

    this.displayQuotientEl.textContent = this.state.quotientText || '0';
    if (this.displayRemainderEl) {
      this.displayRemainderEl.textContent = this.state.remainderText || '0';
    }

    if (this.quotientRowEl) {
      this.quotientRowEl.classList.toggle('active', this.state.activeField === 'quotient');
    }
    if (this.remainderRowEl) {
      this.remainderRowEl.classList.toggle('active', this.state.activeField === 'remainder');
      this.remainderRowEl.style.display = this.state.hasRemainder ? 'flex' : 'none';
    }
    if (this.displayBoxEl) {
      this.displayBoxEl.classList.toggle('active-field-focus', this.state.activeField === 'remainder');
    }
  }

  getValue() {
    return getValue(this.state);
  }

  setValue(val) {
    if (typeof val === 'object' && val !== null) {
      this.state.hasRemainder = true;
      this.state.quotientText = String(val.quotient || '');
      this.state.remainderText = String(val.remainder || '');
    } else {
      this.state.quotientText = val !== null && val !== undefined ? String(val) : '';
    }
    this.updateDisplay();
  }

  clear() {
    this.state = handleInput(this.state, 'clear');
    this.updateDisplay();
  }

  destroy() {
    if (this.container && this._boundClickHandler) {
      this.container.removeEventListener('click', this._boundClickHandler);
    }
    if (typeof window !== 'undefined' && this._boundKeyDownHandler) {
      window.removeEventListener('keydown', this._boundKeyDownHandler);
    }
  }
}

export default Keypad;
