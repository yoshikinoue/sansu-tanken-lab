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
import { WORLDS_METADATA } from '../services/curriculum-engine.js';

const LESSON_VISUALS = {
  'stage-1': {
    badge: 'ひっ算の例：257 + 128',
    diagramLines: [
      '    2  5¹ 7   ← 7 + 8 = 15',
      '  + 1  2  8      十の位へ「1」お引っ越し！',
      '  ─────────',
      '    3  8  5'
    ],
    tip: '10をこえたら、すぐ左の位の上に小さく「1」をメモしよう！'
  },
  'stage-2': {
    badge: 'ひっ算の例：402 - 157',
    diagramLines: [
      '    3  9  12  ← 百の位から10をリレー！',
      '    4̶  0̶  2',
      '  - 1  5  7      十の位 0 は「9」に変身',
      '  ─────────',
      '    2  4  5'
    ],
    tip: '引けない時はとなりから「10」借りる！0をまたぐ時は「9」になるよ。'
  },
  'stage-3': {
    badge: '逆算の例：□ を見つける！',
    diagramLines: [
      '  248 + □ = 615  ⇒  □ = 615 - 248 = 367',
      '  □ - 184 = 356  ⇒  □ = 356 + 184 = 540'
    ],
    tip: 'たし算の逆はひき算、ひき算の逆はたし算で□が見つかる！'
  },
  'stage-4': {
    badge: 'かけ算の例：60 × 40',
    diagramLines: [
      '  ① 0をかくす → 6 × 4 = 24',
      '  ② かくした0を合体 → 24 に 0 を2こ → 2400'
    ],
    tip: 'まず0をかくして九九を計算し、最後に0の個数を右につけよう！'
  },
  'stage-5': {
    badge: 'ひっ算の例：408 × 6',
    diagramLines: [
      '    4  0⁴ 8   ← 一の位: 8 × 6 = 48（4くり上がり）',
      '  ×       6      十の位: 0 × 6 + 4 = 4',
      '  ─────────',
      '  2 4  4  8'
    ],
    tip: '九九をかけたあとに、くり上がりのメモを足し忘れないように！'
  },
  'stage-6': {
    badge: 'ひっ算の例：23 × 14',
    diagramLines: [
      '       2 3',
      '    ×  1 4',
      '    ──────',
      '       9 2   ← 1段目：23 × 4',
      '  +  2 3 ⬚   ← 2段目：十の位の下から書く！',
      '    ──────',
      '     3 2 2'
    ],
    tip: '十の位をかけた2段目は、左に1マスずらして十の位の下から書こう！'
  },
  'stage-7': {
    badge: '検算の例：53 ÷ 7',
    diagramLines: [
      '  53 ÷ 7 = 7 あまり 4',
      '  ✔ ルール: あまり(4) ＜ わる数(7)',
      '  ✔ 検算:   7 × 7 + 4 = 53'
    ],
    tip: 'あまりは必ずわる数より小さい！「わる数×商＋あまり」で確かめよう！'
  },
  'stage-8': {
    badge: 'わり算筆算の4ステップ：76 ÷ 3',
    diagramLines: [
      '  ① たてる → ② かける → ③ ひく → ④ おろす',
      '  例：76 ÷ 3 → 25 あまり 1  (3 × 25 + 1 = 76)'
    ],
    tip: '上の位から「たてる・かける・ひく・おろす」の4拍子を繰り返そう！'
  },
  'stage-9': {
    badge: 'ひっ算の例：624 ÷ 3',
    diagramLines: [
      '     2 0 8   ← 十の位: 2 ÷ 3 は割れないので「0」!',
      '  3 ) 6 2 4',
      '      6',
      '      ───',
      '        2 4  ← 4をおろして 24 ÷ 3 = 8'
    ],
    tip: 'おろしても割れないときは、商に「0」をたてて位を守ろう！'
  },
  'stage-10': {
    badge: '工夫の例：170 ÷ 30',
    diagramLines: [
      '  ① 両方から0を1個かくす → 17 ÷ 3 = 5 あまり 2',
      '  ② あまりには0を戻す   → 答え：5 あまり 20'
    ],
    tip: '商は0を消したまま計算、あまりには消した0を戻すのがルール！'
  },
  'stage-11': {
    badge: '見積もりの例：84 ÷ 21',
    diagramLines: [
      '  わる数 21 → 「およそ 20」と考える',
      '  80 ÷ 20 = 4 → 仮の商を「4」に見当づけ！（21 × 4 = 84）'
    ],
    tip: 'わる数を「およそ何十」と丸めると、最初の商の見当が一発でつくよ！'
  },
  'stage-12': {
    badge: '修正の例：87 ÷ 29',
    diagramLines: [
      '  × 商を4にすると → 29 × 4 = 116（87から引けない！）',
      '  ○ 商を1減らす  → 29 × 3 = 87 （ぴったり！）'
    ],
    tip: 'かけて引けないときは商を「-1」、あまりが大きすぎたら「+1」しよう！'
  },
  'stage-13': {
    badge: '順序の例：100 - (35 + 28)',
    diagramLines: [
      '  ① カッコの中を最優先：35 + 28 = 63',
      '  ② 外を計算する：     100 - 63 = 37'
    ],
    tip: '式の中に ( ) があったら、どんな場所でも真っ先に計算しよう！'
  },
  'stage-14': {
    badge: '優先の例：20 + 15 × 3',
    diagramLines: [
      '  ① かけ算・わり算が先：15 × 3 = 45',
      '  ② たし算・ひき算は後：20 + 45 = 65'
    ],
    tip: '＋－より ×÷ の方が強い！左から順番とは限らないので注意しよう！'
  },
  'stage-15': {
    badge: '工夫の例：100のまとまり！',
    diagramLines: [
      '  25 × 36 = (25 × 4) × 9 = 100 × 9 = 900',
      '  37 × 4 + 63 × 4 = (37 + 63) × 4 = 100 × 4 = 400'
    ],
    tip: '「25×4=100」や同じ数をまとめる工夫で暗算レベルにスピードアップ！'
  },
  'stage-16': {
    badge: '小数の仕組み：0.1の世界！',
    diagramLines: [
      '  0.1 が 10 こ = 1',
      '  0.1 が 23 こ = 2.3 (一の位 2、0.1の位 3)',
      '  3.47 = 0.01 が 347 こ分'
    ],
    tip: '0.1が10こで1、0.01が10こで0.1！位に分けると小数の正体が見えるよ。'
  },
  'stage-17': {
    badge: '小数のたし算：3.25 + 1.48',
    diagramLines: [
      '    3 . 2 5',
      '  + 1 . 4 8   ← 小数点をそろえる！',
      '  ─────────',
      '    4 . 7 3   0.01の位: 5+8=13 → 3を書いて1くり上がり'
    ],
    tip: '小数点をたてにそろえて位ごとに計算。答えにも小数点を忘れずに！'
  },
  'stage-18': {
    badge: '小数のひき算：0.52 - 0.27',
    diagramLines: [
      '    0 . 4 12  ← 0.1の位から10を借りた！',
      '  - 0 . 2  7',
      '  ─────────',
      '    0 . 2  5   貸した0.1の位は 5 → 4 に減る'
    ],
    tip: '引けない時は上の位から10を借りる。貸した位は1減らそう！'
  },
  'stage-19': {
    badge: '分数の仕組み：3/7 の読み方！',
    diagramLines: [
      '  1 を 7 等分 → 1つ分が 1/7',
      '  3/7 = 1/7 が 3 こ分',
      '  分母 7 = 等分した数、分子 3 = 何こ分'
    ],
    tip: '分母は「何等分したか」、分子は「何こ分」。単位分数の数で分数を読もう！'
  },
  'stage-20': {
    badge: '同分母のたし算：2/7 + 3/7',
    diagramLines: [
      '  2/7 は 1/7 が 2 こ分',
      '  3/7 は 1/7 が 3 こ分',
      '  合わせて 5 こ分 → 5/7（分母は 7 のまま！）'
    ],
    tip: '分母はそのまま、分子だけを足す。分母同士は足さないよ！'
  },
  'stage-21': {
    badge: '同分母のひき算：1と2/7 - 4/7',
    diagramLines: [
      '  1と2/7 を仮分数に直す → 9/7',
      '  9/7 - 4/7 = 5/7',
      '  引けない時は仮分数に変身させる！'
    ],
    tip: '分子が引けない時は、帯分数を仮分数に直してから分子だけ引こう！'
  },
  'stage-22': {
    badge: '大きな数：位取り表で読む！',
    diagramLines: [
      '  6,045,030,000,000',
      '  兆の位は右から13番目！',
      '  1億 = 1万が 10,000 こ分'
    ],
    tip: '右から4桁ずつ区切ると、万・億・兆のまとまりで読みやすいよ！'
  },
  'stage-23': {
    badge: '四捨五入：3,567 のがい数',
    diagramLines: [
      '  百の位までのがい数 → 十の位の 6 を見る',
      '  6 は5以上だから切り上げ！',
      '  3,567 → 約 3,600'
    ],
    tip: '見るのは残したい位の1つ下。4以下は切り捨て、5以上は切り上げ！'
  },
  'stage-24': {
    badge: '概算：買い物の見積もり',
    diagramLines: [
      '  298円 → 約300円',
      '  512円 → 約500円',
      '  合わせて 約800円！'
    ],
    tip: '値段をがい数に直してから計算すると、暗算で見当がつくよ！'
  },
  'stage-25': {
    badge: '文章題：言葉がヒント！',
    diagramLines: [
      '  ぜんぶで → たし算',
      '  残り → ひき算',
      '  ○ずつ△つ分 → かけ算',
      '  同じ数ずつ分ける → わり算'
    ],
    tip: 'もんだいの言葉から計算を見つけて、式を立てよう！'
  },
  'stage-26': {
    badge: 'あまりの判断：23 ÷ 5',
    diagramLines: [
      '  23 ÷ 5 = 4 あまり 3',
      '  全員乗るには もう1台必要！',
      '  答えは 5台（切り上げ）'
    ],
    tip: 'あまりの扱いは場面で決まるよ！'
  },
  'stage-27': {
    badge: '単位換算：2m 30cm',
    diagramLines: [
      '  2m = 200cm',
      '  200 + 30 = 230',
      '  答えは 230cm！'
    ],
    tip: 'まず単位をそろえてから計算しよう！'
  }
};

function getCurriculumLessonMeta(stageId) {
  if (!Array.isArray(WORLDS_METADATA)) return null;
  const normalizedId = String(stageId || 'stage-1').toLowerCase();
  for (const world of WORLDS_METADATA) {
    for (const stage of (world.stages || [])) {
      if (stage.globalId === normalizedId || `stage-${stage.globalStageNumber}` === normalizedId) {
        return stage.miniLesson || null;
      }
    }
  }
  return null;
}

/**
 * ステージの図解データ (LESSON_VISUALS) を返す。未登録なら null
 * @param {string|number} stageId 例: 'stage-19', 19
 * @returns {object|null}
 */
export function getLessonVisual(stageId) {
  const key = String(stageId || '').toLowerCase();
  return LESSON_VISUALS[key] || null;
}

function renderLessonVisual(stageId) {
  const data = getLessonVisual(stageId) || LESSON_VISUALS['stage-1'];
  return `
    <div class="lesson-visual-diagram">
      <div class="lesson-visual-header">✏️ ${data.badge}</div>
      <div class="lesson-visual-rows">
        ${data.diagramLines.map(line => `<div class="lesson-visual-row">${line}</div>`).join('')}
      </div>
      <div class="lesson-visual-tip">🌟 ポイント: ${data.tip}</div>
    </div>
  `;
}

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
    this.curriculumLessonData = getCurriculumLessonMeta(this.lessonData?.stageId || this.stageId);
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
    this.curriculumLessonData = getCurriculumLessonMeta(this.lessonData?.stageId || stageId);
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
    if (!this.container) {
      this.container = target;
    }

    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.classList.add('open');
    } else {
      const el = this.render();
      if (el) {
        target.appendChild(el);
        this.modalEl = el;
      }
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

    const card2 = this.lessonData?.card2 || {};
    const currCard2 = this.curriculumLessonData?.cards?.[1] || null;
    const chosenChoice = currCard2?.choices?.find(c => c.id === optId);
    if (chosenChoice?.feedback) {
      this.lastFeedback = chosenChoice.feedback;
    } else if (result.correct) {
      this.lastFeedback = card2.correctFeedback || result.feedback;
    } else {
      this.lastFeedback = card2.incorrectFeedback || result.feedback;
    }

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

  handleStepDotClick(targetIdx) {
    if (!Number.isInteger(targetIdx) || targetIdx < 0 || targetIdx > 2) return;
    const currentIdx = this.state.currentCardIndex;
    if (targetIdx === currentIdx) return;

    if (targetIdx < currentIdx) {
      this.state.currentCardIndex = targetIdx;
      SoundEffects.playSound('tap');
      this.refresh();
      if (this.autoPlaySpeech) {
        this.speakCurrentCard();
      }
      return;
    }

    if (targetIdx === currentIdx + 1) {
      if (canAdvance(this.state)) {
        this.handleNext();
      } else {
        SoundEffects.playSound('near_miss');
      }
    }
  }

  refresh() {
    if (this.modalEl && this.modalEl.parentNode) {
      const oldEl = this.modalEl;
      const parent = oldEl.parentNode;
      const newEl = this.render();
      if (newEl && oldEl.parentNode === parent && newEl !== oldEl) {
        parent.replaceChild(newEl, oldEl);
        this.modalEl = newEl;
      }
      return;
    }

    if (this.isOpen && this.container) {
      const newEl = this.render();
      if (newEl) {
        this.container.appendChild(newEl);
        this.modalEl = newEl;
      }
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
      <div class="step-dot ${currentIdx === 0 ? 'active' : (currentIdx > 0 ? 'completed' : '')}" data-step-index="0" role="button" tabindex="0">1. ひらめき</div>
      <div class="step-dot ${currentIdx === 1 ? 'active' : (currentIdx > 1 ? 'completed' : '')}" data-step-index="1" role="button" tabindex="0">2. クイズ</div>
      <div class="step-dot ${currentIdx === 2 ? 'active' : ''}" data-step-index="2" role="button" tabindex="0">3. まとめ</div>
    `;
    stepProgress.querySelectorAll('.step-dot').forEach((dot) => {
      const rawIdx = dot.dataset?.stepIndex ?? dot.getAttribute?.('data-step-index');
      const targetIdx = Number(rawIdx);
      if (targetIdx < currentIdx || (targetIdx === currentIdx + 1 && canAdvance(this.state))) {
        dot.style.cursor = 'pointer';
      }
      dot.onclick = () => this.handleStepDotClick(targetIdx);
      dot.addEventListener?.('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault?.();
          this.handleStepDotClick(targetIdx);
        }
      });
    });
    body.appendChild(stepProgress);

    // Card Content
    const lessonCard = document.createElement('div');
    lessonCard.className = 'mini-lesson-card';

    if (currentIdx === 0) {
      // Card 0: Insight
      const card1 = this.lessonData?.card1 || { title: '着眼点', text: '' };
      const currCard1 = this.curriculumLessonData?.cards?.[0] || null;
      const conceptTitle = currCard1?.title || card1.title || 'ひらめきポイント';
      const conceptBody = currCard1?.body && currCard1.body !== card1.text ? currCard1.body : '';
      const visualHtml = renderLessonVisual(this.lessonData?.stageId || this.stageId);
      lessonCard.innerHTML = `
        <div class="lesson-image-placeholder">
          <div class="lesson-concept-badge">💡 ${card1.title || '【着眼点・ひらめきカード】'}</div>
          <h4 class="lesson-concept-title">${conceptTitle}</h4>
          ${visualHtml}
          <p class="lesson-text">${card1.text || ''}</p>
          ${conceptBody ? `<p class="lesson-detail-body">${conceptBody}</p>` : ''}
        </div>
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
          const hintText = this.curriculumLessonData?.cards?.[1]?.hint || '';
          feedbackEl.style.background = 'rgba(234, 179, 8, 0.15)';
          feedbackEl.style.color = 'var(--color-amber-warm)';
          feedbackEl.innerHTML = `💡 ${this.lastFeedback}${hintText ? `<div style="margin-top:6px; font-size:0.9rem; font-weight:600;">🔍 ヒント: ${hintText}</div>` : ''}`;
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

    if (!this.modalEl || !this.modalEl.parentNode) {
      this.modalEl = overlay;
    }
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
