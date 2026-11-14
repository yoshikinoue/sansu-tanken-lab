/**
 * src/components/toast-feedback.js
 * 算数探検ラボ - No-X フィードバック・トースト通知システム (ToastFeedback)
 *
 * Dual capability:
 * 1. Pure validation & message generation matching ToastFeedbackReference (headless Node.js)
 * 2. Interactive DOM Toast notification manager for encouraging student feedback.
 */

export const forbiddenSymbols = ['❌', '✖', '✕', 'ばつ', 'バツ'];

export const positiveMessages = [
  'おしい！もう一歩！',
  'ヒントを発見！',
  'ラボデータ再スキャン！',
  'ナイスチャレンジ！もう一度考えてみよう！'
];

/**
 * Validates toast message content to strictly forbid harsh red X and battsu symbols
 * @param {string} text
 * @returns {boolean}
 */
export function validateToastContent(text) {
  if (typeof text !== 'string') return false;
  return !forbiddenSymbols.some(s => text.includes(s));
}

/**
 * Pure factory creating toast metadata matching F17 specification
 * @param {string} [type='encourage']
 * @returns {object} toast
 */
export function createToast(type = 'encourage') {
  let msg = positiveMessages[0];
  if (type === 'hint') msg = positiveMessages[1];
  else if (type === 'rescan') msg = positiveMessages[2];
  else if (type === 'challenge') msg = positiveMessages[3];

  return {
    message: msg,
    animation: 'gentle-shake',
    color: '#eab308', // gentle amber/yellow (warm lab theme, never red)
    hasForbiddenSymbol: false
  };
}

/**
 * DOM Toast Notification Manager
 * @param {HTMLElement|string} [container=null]
 * @param {string} [type='encourage']
 * @param {string} [customMessage=null]
 * @param {object} [options={}]
 * @returns {HTMLElement|null}
 */
export function showToast(container = null, type = 'encourage', customMessage = null, options = {}) {
  if (typeof document === 'undefined') return null;

  // Resolve container
  let targetContainer = null;
  if (typeof container === 'string') {
    targetContainer = document.querySelector(container);
  } else if (container && container.nodeType === 1) {
    targetContainer = container;
  }

  if (!targetContainer) {
    targetContainer = document.querySelector('.toast-container');
    if (!targetContainer) {
      targetContainer = document.createElement('div');
      targetContainer.className = 'toast-container';
      document.body.appendChild(targetContainer);
    }
  }

  // Resolve message and validate
  let message = customMessage;
  if (message && typeof message === 'string') {
    if (!validateToastContent(message)) {
      message = createToast(type).message;
    }
  } else {
    message = createToast(type).message;
  }

  const duration = typeof options.duration === 'number' ? options.duration : 2500;
  const isGentleShake = type === 'encourage' || type === 'rescan' || !options.skipShake;

  // Create toast element
  const toastEl = document.createElement('div');
  const typeClass = type === 'success' ? 'success' : type === 'self-correct' ? 'self-correct' : 'encourage';
  const shakeClass = isGentleShake ? 'gentle-shake' : '';

  toastEl.className = `toast-message ${typeClass} ${shakeClass}`.trim();
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');

  const icon = type === 'success' ? '🎉' : type === 'hint' ? '💡' : type === 'rescan' ? '🔬' : '⭐';
  toastEl.innerHTML = `<span>${icon}</span><span>${message}</span>`;

  targetContainer.appendChild(toastEl);

  // Auto-dismiss
  let timerId = null;
  const dismiss = () => {
    if (timerId) clearTimeout(timerId);
    toastEl.style.opacity = '0';
    toastEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toastEl.style.transform = 'translateY(-12px) scale(0.95)';
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 250);
  };

  if (duration > 0) {
    timerId = setTimeout(dismiss, duration);
  }

  toastEl._dismiss = dismiss;
  return toastEl;
}

export class ToastManager {
  static forbiddenSymbols = forbiddenSymbols;
  static positiveMessages = positiveMessages;
  static validateToastContent = validateToastContent;
  static createToast = createToast;
  static showToast = showToast;

  constructor(options = {}) {
    this.container = options.container || null;
    this.defaultDuration = options.duration || 2500;
  }

  show(type = 'encourage', customMessage = null, options = {}) {
    return showToast(this.container, type, customMessage, {
      duration: this.defaultDuration,
      ...options
    });
  }

  encourage(message = null) {
    return this.show('encourage', message);
  }

  hint(message = null) {
    return this.show('hint', message);
  }

  rescan(message = null) {
    return this.show('rescan', message);
  }

  success(message = null) {
    return this.show('success', message);
  }

  selfCorrect(message = null) {
    return this.show('self-correct', message);
  }
}

export default {
  forbiddenSymbols,
  positiveMessages,
  validateToastContent,
  createToast,
  showToast,
  ToastManager
};
