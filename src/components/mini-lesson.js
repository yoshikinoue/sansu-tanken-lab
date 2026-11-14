/**
 * src/components/mini-lesson.js
 * 算数探検ラボ - 1分図解ミニ授業 (MiniLesson)
 *
 * Dual capability:
 * 1. Pure state management functions matching MiniLessonReference for headless Node.js
 * 2. Interactive DOM MiniLessonModal class for tablet browser with Web Speech API TTS,
 *    audio chimes, 3-step scaffold cards, and 2-choice quiz gate.
 */

import * as SpeechService from '../services/speech-service.js';
import * as SoundEffects from '../services/sound-effects.js';

// --- PURE STATE MANAGEMENT FUNCTIONS (HEADLESS COMPATIBLE) ---

/**
 * レッスン状態オブジェクトを生成
 * @param {string|number} stageId 例: 'stage-1', 1
 * @returns {object} { stageId, currentCardIndex: 0, quizAnswered: false, quizIsCorrect: false, completed: false }
 */
export function createLessonState(stageId) {
  return {
    stageId: typeof stageId === 'number' ? `stage-${stageId}` : String(stageId || 'stage-1'),
    currentCardIndex: 0, // 0: insight, 1: quiz, 2: summary
    quizAnswered: false,
    quizIsCorrect: false,
    completed: false
  };
}

/**
 * 2択クイズの解答判定とフィードバック
 * @param {object} state レッスン状態
 * @param {string} chosenOption 選択肢ID ('A' | 'B')
 * @param {string} correctOption 正解選択肢ID ('A' | 'B')
 * @returns {{ correct: boolean, feedback: string }}
 */
export function answerQuiz(state, chosenOption, correctOption) {
  if (!state) return { correct: false, feedback: 'おしい！もう一度考えてみよう！' };

  if (chosenOption === correctOption) {
    state.quizAnswered = true;
    state.quizIsCorrect = true;
    return {
      correct: true,
      feedback: '大正解！その調子！'
    };
  } else {
    state.quizIsCorrect = false;
    return {
      correct: false,
      feedback: 'おしい！もう一度考えてみよう！'
    };
  }
}

/**
 * 次のカードへ進めるかどうかのゲート判定
 * Card 0: 常に true
 * Card 1: quizIsCorrect === true のときのみ true（不正解・未解答はブロック）
 * Card 2: 常に true
 * @param {object} state
 * @returns {boolean}
 */
export function canAdvance(state) {
  if (!state) return false;
  if (state.currentCardIndex === 0) return true;
  if (state.currentCardIndex === 1) return Boolean(state.quizIsCorrect);
  return true;
}

/**
 * 次のカードへ進む
 * 進めない場合、または既に Card 2 (末尾) の場合は false を返す
 * Card 2 に到達した時点で state.completed = true となる
 * @param {object} state
 * @returns {boolean}
 */
export function nextCard(state) {
  if (!canAdvance(state)) return false;
  if (state.currentCardIndex < 2) {
    state.currentCardIndex++;
    if (state.currentCardIndex === 2) {
      state.completed = true;
    }
    return true;
  }
  return false;
}

/**
 * 前のカードへ戻る
 * Card 0 のときは false を返す
 * @param {object} state
 * @returns {boolean}
 */
export function prevCard(state) {
  if (!state) return false;
  if (state.currentCardIndex > 0) {
    state.currentCardIndex--;
    return true;
  }
  return false;
}

// --- DOM MODAL CONTROLLER CLASS FOR BROWSER RUNTIME ---

export class MiniLessonModal {
  constructor(options = {}) {
    this.stageId = options.stageId || 'stage-1';
    this.container = options.container || null;
    this.progress = options.progress || null;
    this.autoPlaySpeech = options.autoPlaySpeech !== false;
    this.onComplete = options.onComplete || null;
    this.onClose = options.onClose || null;
    this.onQuizResult = options.onQuizResult || null;

    this.state = createLessonState(this.stageId);
    this.lessonData = SpeechService.getMiniLessonData(this.stageId);
    this.modalEl = null;
    this.isOpen = false;
    this.selectedOption = null;
    this.lastFeedback = '';
  }

  mount(container) {
    this.container = container;
    this.open(container);
    return this;
  }

  setStage(stageId) {
    this.stageId = stageId;
    this.state = createLessonState(stageId);
    this.lessonData = SpeechService.getMiniLessonData(stageId);
    this.selectedOption = null;
    this.lastFeedback = '';
    if (this.isOpen) {
      this.refresh();
      if (this.autoPlaySpeech) {
        this.speakCurrentCard();
      }
    }
  }

  open(container = null) {
    this.isOpen = true;
    const target = container || this.container || (typeof document !== 'undefined' ? document.body : null);
    if (!target) return this;

    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.classList.add('open');
    } else {
      const el = this.render();
      if (el) target.appendChild(el);
    }

    if (this.autoPlaySpeech) {
      this.speakCurrentCard();
    }
    return this;
  }

  close(notify = true) {
    this.isOpen = false;
    this.stopAudio();
    if (this.modalEl) {
      this.modalEl.classList.remove('open');
    }
    if (notify && typeof this.onClose === 'function') {
      this.onClose();
    }
  }

  speakCurrentCard() {
    if (!this.lessonData) return;
    const idx = this.state.currentCardIndex;
    let text = '';
    if (idx === 0) {
      text = this.lessonData.card1?.ttsText || this.lessonData.card1?.text || '';
    } else if (idx === 1) {
      text = this.lessonData.card2?.ttsText || this.lessonData.card2?.question || '';
    } else if (idx === 2) {
      text = this.lessonData.card3?.ttsText || this.lessonData.card3?.rule || '';
    }
    if (text) {
      SpeechService.speakText(text, { rate: 0.95, pitch: 1.05 });
    }
  }

  startAudio() {
    this.speakCurrentCard();
  }

  stopAudio() {
    SpeechService.stopSpeech();
  }

  handleOptionClick(optId) {
    if (this.state.currentCardIndex !== 1) return;
    this.selectedOption = optId;
    const correctOpt = this.lessonData?.card2?.correctOption || 'A';
    const result = answerQuiz(this.state, optId, correctOpt);

    this.lastFeedback = result.feedback;
    if (result.correct) {
      SoundEffects.playSound('correct');
    } else {
      SoundEffects.playSound('near_miss');
    }

    if (typeof this.onQuizResult === 'function') {
      this.onQuizResult(result);
    }

    this.refresh();
  }

  handleNext() {
    if (this.state.currentCardIndex === 2) {
      // Finished all cards, advance to stage
      this.close(false);
      if (typeof this.onComplete === 'function') {
        this.onComplete(this.stageId);
      }
      return;
    }

    const moved = nextCard(this.state);
    if (moved) {
      SoundEffects.playSound('tap');
      this.refresh();
      if (this.autoPlaySpeech) {
        this.speakCurrentCard();
      }
    } else {
      SoundEffects.playSound('near_miss');
    }
  }

  handlePrev() {
    const moved = prevCard(this.state);
    if (moved) {
      SoundEffects.playSound('tap');
      this.refresh();
      if (this.autoPlaySpeech) {
        this.speakCurrentCard();
      }
    }
  }

  refresh() {
    if (!this.modalEl || !this.modalEl.parentNode) return;
    const parent = this.modalEl.parentNode;
    const newEl = this.render();
    if (newEl) {
      parent.replaceChild(newEl, this.modalEl);
      this.modalEl = newEl;
    }
  }

  render() {
    if (typeof document === 'undefined') return null;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay' + (this.isOpen ? ' open' : '');

    const card = document.createElement('div');
    card.className = 'modal-card mini-lesson-modal';

    const lessonTitle = this.lessonData?.title || '1分図解ミニ授業';
    const currentIdx = this.state.currentCardIndex;

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <div class="modal-title">
        <span>📖</span>
        <span>1分図解ミニ授業: ${lessonTitle}</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-sm btn-outline tts-replay-btn" aria-label="もう一度聞く">🔊 もう一度聞く</button>
        <button type="button" class="btn btn-secondary modal-close-btn" aria-label="閉じる">✕</button>
      </div>
    `;

    const replayBtn = header.querySelector('.tts-replay-btn');
    if (replayBtn) {
      replayBtn.onclick = () => this.speakCurrentCard();
    }
    const closeBtn = header.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';

    // Step dots
    const stepProgress = document.createElement('div');
    stepProgress.className = 'step-progress-indicator';
    stepProgress.innerHTML = `
      <div class="step-dot ${currentIdx === 0 ? 'active' : (currentIdx > 0 ? 'completed' : '')}">1. ひらめき</div>
      <div class="step-dot ${currentIdx === 1 ? 'active' : (currentIdx > 1 ? 'completed' : '')}">2. クイズ</div>
      <div class="step-dot ${currentIdx === 2 ? 'active' : ''}">3. まとめ</div>
    `;
    body.appendChild(stepProgress);

    // Card Content
    const lessonCard = document.createElement('div');
    lessonCard.className = 'mini-lesson-card';

    if (currentIdx === 0) {
      // Card 0: Insight
      const card1 = this.lessonData?.card1 || { title: '着眼点', text: '' };
      lessonCard.innerHTML = `
        <div class="lesson-image-placeholder">💡 ${card1.title || 'ひらめきポイント'}</div>
        <p class="lesson-text" style="font-size:1.15rem; line-height:1.7; padding:12px 0;">${card1.text || ''}</p>
      `;
    } else if (currentIdx === 1) {
      // Card 1: 2-Choice Quiz
      const card2 = this.lessonData?.card2 || {
        question: 'クイズを解いてみよう',
        options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
        correctOption: 'A'
      };
      const quizContainer = document.createElement('div');
      quizContainer.className = 'quiz-container';

      const questionEl = document.createElement('h4');
      questionEl.className = 'quiz-question';
      questionEl.style.fontSize = '1.15rem';
      questionEl.style.marginBottom = '16px';
      questionEl.textContent = `❓ ${card2.question || ''}`;
      quizContainer.appendChild(questionEl);

      const optionsGrid = document.createElement('div');
      optionsGrid.className = 'quiz-options';

      const options = card2.options || [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }];
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline quiz-btn';
        btn.dataset.option = opt.id;
        btn.textContent = `${opt.id}: ${opt.label}`;

        if (this.selectedOption === opt.id) {
          if (this.state.quizIsCorrect) {
            btn.classList.add('btn-primary');
            btn.style.borderColor = 'var(--color-emerald-success)';
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
          } else {
            btn.style.borderColor = 'var(--color-amber-warm)';
            btn.style.background = 'rgba(234, 179, 8, 0.15)';
          }
        }

        btn.onclick = () => this.handleOptionClick(opt.id);
        optionsGrid.appendChild(btn);
      });
      quizContainer.appendChild(optionsGrid);

      if (this.lastFeedback) {
        const feedbackEl = document.createElement('div');
        feedbackEl.className = 'quiz-feedback';
        feedbackEl.style.marginTop = '16px';
        feedbackEl.style.padding = '12px 16px';
        feedbackEl.style.borderRadius = 'var(--radius-md)';
        feedbackEl.style.fontWeight = '700';

        if (this.state.quizIsCorrect) {
          feedbackEl.style.background = 'rgba(16, 185, 129, 0.15)';
          feedbackEl.style.color = 'var(--color-emerald-success)';
          feedbackEl.innerHTML = `✨ ${this.lastFeedback}`;
        } else {
          feedbackEl.style.background = 'rgba(234, 179, 8, 0.15)';
          feedbackEl.style.color = 'var(--color-amber-warm)';
          feedbackEl.innerHTML = `💡 ${this.lastFeedback}`;
        }
        quizContainer.appendChild(feedbackEl);
      }

      lessonCard.appendChild(quizContainer);
    } else if (currentIdx === 2) {
      // Card 2: Summary
      const card3 = this.lessonData?.card3 || { title: 'まとめ', rule: '' };
      lessonCard.innerHTML = `
        <div class="summary-box" style="background:rgba(14,165,233,0.1); border:2px solid var(--color-primary-lab); border-radius:var(--radius-lg); padding:24px;">
          <h4 style="color:var(--color-accent-cyan); margin-bottom:12px; font-size:1.2rem;">🏆 ${card3.title || 'まとめのルール'}</h4>
          <p class="summary-rule" style="font-size:1.15rem; line-height:1.7;">${card3.rule || ''}</p>
        </div>
      `;
    }

    body.appendChild(lessonCard);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.gap = '12px';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn btn-secondary prev-card-btn';
    prevBtn.textContent = '◀ 前へ';
    prevBtn.disabled = currentIdx === 0;
    prevBtn.onclick = () => this.handlePrev();

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-primary next-card-btn';

    if (currentIdx === 2) {
      nextBtn.textContent = '探検スタート！ 🚀';
    } else {
      nextBtn.textContent = '次へ進む 👉';
    }

    if (currentIdx === 1 && !this.state.quizIsCorrect) {
      nextBtn.disabled = true;
    }

    nextBtn.onclick = () => this.handleNext();

    footer.appendChild(prevBtn);
    footer.appendChild(nextBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    overlay.appendChild(card);

    this.modalEl = overlay;
    return overlay;
  }

  destroy() {
    this.isOpen = false;
    this.stopAudio();
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
    this.modalEl = null;
  }
}

export const MiniLesson = MiniLessonModal;
export default MiniLessonModal;
