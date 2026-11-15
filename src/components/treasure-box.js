/**
 * src/components/treasure-box.js
 * 算数探検ラボ - パワーアップ宝箱 (TreasureBox)
 *
 * Dual capability:
 * 1. Pure state management functions matching TreasureBoxReference for headless Node.js
 * 2. Interactive DOM TreasureBox class for tablet browser displaying quarantined
 *    error problems, variation reviews, and 2-consecutive correct mastery progression.
 */

import * as CurriculumEngine from '../services/curriculum-engine.js';
import * as SoundEffects from '../services/sound-effects.js';
import * as GamificationEngine from '../services/gamification-engine.js';
import { showToast } from './toast-feedback.js';

let _itemCounter = 0;

// --- PURE STATE MANAGEMENT FUNCTIONS (HEADLESS COMPATIBLE) ---

/**
 * 誤答問題を宝箱に追加（重複プロンプトは上書き更新）
 * @param {{ items: Array }} box 宝箱データオブジェクト
 * @param {object} problem 誤答したMathProblem
 * @returns {object} 追加または更新された宝箱アイテム
 */
export function addItem(box, problem) {
  if (!box) return null;
  if (!Array.isArray(box.items)) {
    box.items = [];
  }

  const promptText = problem?.prompt || `${problem?.operands?.[0]} ${problem?.operator} ${problem?.operands?.[1]}`;
  const existing = box.items.find(i => {
    const itemPrompt = i?.originalProblem?.prompt ||
      `${i?.originalProblem?.operands?.[0]} ${i?.originalProblem?.operator} ${i?.originalProblem?.operands?.[1]}`;
    return itemPrompt === promptText;
  });

  if (existing) {
    existing.capturedAt = new Date().toISOString();
    return existing;
  }

  _itemCounter += 1;
  const rawStage = problem?.stageId ?? 1;
  const rawWorld = problem?.worldId ?? Math.ceil(Number(rawStage) / 3);

  const stageId = String(rawStage).startsWith('stage-') ? rawStage : `stage-${rawStage}`;
  const worldId = String(rawWorld).startsWith('world-') ? rawWorld : `world-${rawWorld}`;

  const item = {
    id: `tb-${Date.now()}-${_itemCounter}-${Math.random().toString(36).slice(2, 7)}`,
    stageId,
    worldId,
    originalProblem: JSON.parse(JSON.stringify(problem)),
    capturedAt: new Date().toISOString(),
    masteryLevel: 0, // 0: raw, 1: polish 1, 2: fully mastered
    consecutiveCorrect: 0
  };

  box.items.push(item);
  return item;
}

/**
 * 類題復習の解答結果を記録
 * 正解時:
 *   consecutiveCorrect += 1
 *   consecutiveCorrect >= 2 のとき masteryLevel = 2 (完全マスター)
 *   それ以外は masteryLevel = 1
 * 不正解時:
 *   consecutiveCorrect = 0
 *   masteryLevel = 0 にリセット
 * @param {object} item 宝箱アイテム
 * @param {boolean} isCorrect
 * @returns {object} 更新されたアイテムコピー
 */
export function recordAttempt(item, isCorrect) {
  if (!item) return null;

  if (isCorrect) {
    item.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
    if (item.consecutiveCorrect >= 2) {
      item.masteryLevel = 2; // 完全マスター！
    } else {
      item.masteryLevel = 1;
    }
  } else {
    item.consecutiveCorrect = 0;
    item.masteryLevel = 0;
  }

  return { ...item };
}

// --- DOM CLASS FOR BROWSER RUNTIME ---

export class TreasureBox {
  constructor(options = {}) {
    this.container = options.container || null;
    this.progress = options.progress || null;
    this.onStartReview = options.onStartReview || null;
    this.onSave = options.onSave || null;
    this.onUpdateHeader = options.onUpdateHeader || null;
    this.rootEl = null;
    this.reviewModalEl = null;
    this.reviewTimer = null;
  }

  mount(container) {
    this.container = container;
    this.render();
    return this;
  }

  update(progress) {
    this.progress = progress;
    if (this.rootEl && this.rootEl.parentNode) {
      const parent = this.rootEl.parentNode;
      const newEl = this.render();
      if (newEl) {
        parent.replaceChild(newEl, this.rootEl);
        this.rootEl = newEl;
      }
    }
  }

  render() {
    if (typeof document === 'undefined') return null;

    const containerEl = document.createElement('div');
    containerEl.className = 'treasure-view';

    const items = this.progress?.treasureBox?.items || [];
    const totalCount = items.length;
    const masteredCount = items.filter(i => i.masteryLevel === 2).length;
    const inProgressCount = totalCount - masteredCount;

    // Header Summary
    const header = document.createElement('div');
    header.className = 'treasure-header card-dark';
    header.style.padding = '24px';
    header.style.borderRadius = 'var(--radius-xl)';
    header.style.border = '1px solid var(--color-card-border)';
    header.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="font-size:1.5rem; display:flex; align-items:center; gap:8px;">
            <span>💎</span>
            <span>パワーアップ宝箱</span>
          </h2>
          <p style="color:var(--color-text-muted); margin-top:4px;">
            まちがえた問題をお宝として特訓！思考トラップを克服して2回連続正解で「完全マスター！」を目指そう。
          </p>
        </div>
        <div style="display:flex; gap:16px; font-weight:700;">
          <div style="background:rgba(14,165,233,0.15); padding:10px 16px; border-radius:var(--radius-lg); border:1px solid rgba(14,165,233,0.3);">
            お宝ストック: <span style="color:var(--color-accent-cyan); font-size:1.2rem;">${totalCount}</span> 問
          </div>
          <div style="background:rgba(16,185,129,0.15); padding:10px 16px; border-radius:var(--radius-lg); border:1px solid rgba(16,185,129,0.3);">
            完全マスター: <span style="color:var(--color-emerald-success); font-size:1.2rem;">${masteredCount}</span> 問
          </div>
        </div>
      </div>
    `;
    containerEl.appendChild(header);

    // Items Grid
    if (totalCount === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'treasure-empty-state card-dark';
      emptyState.style.padding = '48px 24px';
      emptyState.style.textAlign = 'center';
      emptyState.style.borderRadius = 'var(--radius-xl)';
      emptyState.style.border = '1px dashed var(--color-card-border)';
      emptyState.innerHTML = `
        <div style="font-size:3rem; margin-bottom:12px;">✨</div>
        <h3 style="font-size:1.2rem; margin-bottom:8px;">お宝問題はまだありません！</h3>
        <p style="color:var(--color-text-muted); max-width:480px; margin:0 auto;">
          問題を解いて間違えたとき、自動でここにお宝としてストックされます。<br>
          弱点を克服してパワーアップするチャンスになるよ！
        </p>
      `;
      containerEl.appendChild(emptyState);
    } else {
      const grid = document.createElement('div');
      grid.className = 'treasure-grid';

      items.forEach(item => {
        const isMastered = item.masteryLevel === 2;
        const fillPercent = isMastered ? 100 : (item.masteryLevel === 1 ? 50 : 0);

        const card = document.createElement('div');
        card.className = `treasure-item-card ${isMastered ? 'mastered' : ''}`;
        card.dataset.itemId = item.id;

        const orig = item.originalProblem || {};
        const promptStr = orig.prompt || `${orig.operands?.[0] || '?'} ${orig.operator || ''} ${orig.operands?.[1] || '?'} = ?`;

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.8rem; font-weight:700; color:var(--color-accent-cyan);">
              ${item.worldId?.toUpperCase() || 'WORLD'} · ${item.stageId?.toUpperCase() || 'STAGE'}
            </span>
            <span style="font-size:0.85rem; font-weight:700; color:${isMastered ? 'var(--color-emerald-success)' : 'var(--color-amber-warm)'};">
              ${isMastered ? '👑 完全マスター！' : (item.consecutiveCorrect === 1 ? 'あと1回正解！' : '特訓待機中')}
            </span>
          </div>

          <div style="font-size:1.3rem; font-weight:700; font-family:monospace; margin:8px 0; text-align:center; background:rgba(0,0,0,0.2); padding:12px; border-radius:var(--radius-md);">
            ${promptStr}
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-text-muted); margin-bottom:4px;">
              <span>マスター度</span>
              <span>${item.consecutiveCorrect || 0} / 2 連続正解</span>
            </div>
            <div class="mastery-progress-bar">
              <div class="mastery-progress-fill" style="width: ${fillPercent}%;"></div>
            </div>
          </div>

          <div style="margin-top:8px;">
            ${isMastered
              ? `<button type="button" class="btn btn-outline btn-review-item" style="width:100%; border-color:var(--color-emerald-success); color:var(--color-emerald-success);">
                   ✨ 復習してみる
                 </button>`
              : `<button type="button" class="btn btn-primary btn-review-item" style="width:100%;">
                   ⚔️ 類題で特訓する！
                 </button>`
            }
          </div>
        `;

        const reviewBtn = card.querySelector('.btn-review-item');
        if (reviewBtn) {
          reviewBtn.addEventListener('click', () => {
            SoundEffects.playSound('tap');
            if (typeof this.onStartReview === 'function') {
              this.onStartReview(item);
            } else {
              this.launchReviewModal(item);
            }
          });
        }

        grid.appendChild(card);
      });

      containerEl.appendChild(grid);
    }

    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(containerEl);
    }

    this.rootEl = containerEl;
    return containerEl;
  }

  launchReviewModal(item) {
    if (typeof document === 'undefined') return;

    // Clean up any existing review modal first
    if (this.reviewModalEl && this.reviewModalEl.parentNode) {
      this.reviewModalEl.parentNode.removeChild(this.reviewModalEl);
      this.reviewModalEl = null;
    }

    // Generate variation problem
    const variation = CurriculumEngine.generateVariationProblem(item.originalProblem);
    this.currentVariation = variation;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    this.reviewModalEl = overlay;

    const card = document.createElement('div');
    card.className = 'modal-card';
    card.style.maxWidth = '500px';

    card.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">
          <span>⚔️</span>
          <span>お宝類題特訓！</span>
        </div>
        <button type="button" class="btn btn-secondary modal-close-btn" aria-label="閉じる">✕</button>
      </div>
      <div class="modal-body" style="text-align:center; padding:24px;">
        <p style="color:var(--color-text-muted); margin-bottom:12px;">思考トラップを破れるかな？計算してみよう！</p>
        <div style="font-size:1.8rem; font-weight:700; font-family:monospace; margin:16px 0; background:rgba(0,0,0,0.3); padding:16px; border-radius:var(--radius-lg);">
          ${variation.prompt || `${variation.operands?.[0]} ${variation.operator} ${variation.operands?.[1]} = ?`}
        </div>

        <div style="margin:20px 0;">
          ${variation.hasRemainder
            ? `<div style="display:flex; gap:12px; justify-content:center;">
                 <input type="number" class="review-quotient-input" placeholder="商" style="font-size:1.3rem; width:100px; padding:10px; text-align:center; border-radius:var(--radius-md); border:1px solid var(--color-card-border); background:var(--color-card-dark); color:white;">
                 <span style="font-size:1.3rem; align-self:center;">あまり</span>
                 <input type="number" class="review-remainder-input" placeholder="余り" style="font-size:1.3rem; width:100px; padding:10px; text-align:center; border-radius:var(--radius-md); border:1px solid var(--color-card-border); background:var(--color-card-dark); color:white;">
               </div>`
            : `<input type="number" class="review-answer-input" placeholder="こたえ" style="font-size:1.5rem; width:180px; padding:10px; text-align:center; border-radius:var(--radius-md); border:1px solid var(--color-card-border); background:var(--color-card-dark); color:white;">`
          }
        </div>

        <div class="review-feedback" style="display:none; padding:10px; font-weight:700; border-radius:var(--radius-md); margin-top:12px;"></div>
      </div>
      <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:12px;">
        <button type="button" class="btn btn-secondary review-cancel-btn">やめる</button>
        <button type="button" class="btn btn-primary review-submit-btn">決定！ 👉</button>
      </div>
    `;

    const closeBtn = card.querySelector('.modal-close-btn');
    const cancelBtn = card.querySelector('.review-cancel-btn');
    const submitBtn = card.querySelector('.review-submit-btn');
    const feedbackBox = card.querySelector('.review-feedback');
    const singleInput = card.querySelector('.review-answer-input');
    const quotientInput = card.querySelector('.review-quotient-input');
    const remainderInput = card.querySelector('.review-remainder-input');

    const closeModal = () => {
      if (this.reviewTimer) {
        clearTimeout(this.reviewTimer);
        this.reviewTimer = null;
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (this.reviewModalEl === overlay) {
        this.reviewModalEl = null;
      }
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const handleSubmitReview = () => {
      let answerVal;
      if (variation.hasRemainder) {
        const qRaw = String(quotientInput?.value ?? '').trim();
        const rRaw = String(remainderInput?.value ?? '').trim();
        if (qRaw === '') {
          if (feedbackBox) {
            feedbackBox.style.display = 'block';
            feedbackBox.style.background = 'rgba(234,179,8,0.2)';
            feedbackBox.style.color = 'var(--color-amber-warm)';
            feedbackBox.innerHTML = '💡 商（こたえ）の数字を入力してから「決定！」をおしてね！';
          }
          quotientInput?.focus?.();
          return;
        }
        answerVal = { quotient: Number(qRaw), remainder: rRaw === '' ? 0 : Number(rRaw) };
      } else {
        const raw = String(singleInput?.value ?? '').trim();
        if (raw === '') {
          if (feedbackBox) {
            feedbackBox.style.display = 'block';
            feedbackBox.style.background = 'rgba(234,179,8,0.2)';
            feedbackBox.style.color = 'var(--color-amber-warm)';
            feedbackBox.innerHTML = '💡 数字を入力してから「決定！」をおしてね！';
          }
          singleInput?.focus?.();
          return;
        }
        answerVal = Number(raw);
      }

      const evalResult = CurriculumEngine.evaluateAnswer(variation, answerVal);

      if (evalResult.isCorrect) {
        const wasMasteredBefore = item.masteryLevel === 2;
        recordAttempt(item, true);

        if (item.masteryLevel === 2) {
          SoundEffects.playSound('stage_clear');
          if (feedbackBox) {
            feedbackBox.style.display = 'block';
            feedbackBox.style.background = 'rgba(16,185,129,0.2)';
            feedbackBox.style.color = 'var(--color-emerald-success)';
            feedbackBox.innerHTML = '🎉 2回連続正解！完全マスター達成！';
          }
          if (!wasMasteredBefore) {
            GamificationEngine.recordTreasureMastered();
          }
          showToast(null, 'success', '完全マスター達成！お宝を自分のものにしたよ！');
        } else {
          SoundEffects.playSound('correct');
          if (feedbackBox) {
            feedbackBox.style.display = 'block';
            feedbackBox.style.background = 'rgba(14,165,233,0.2)';
            feedbackBox.style.color = 'var(--color-accent-cyan)';
            feedbackBox.innerHTML = '✨ 正解！あと1回正解で完全マスター！';
          }
        }

        if (typeof this.onSave === 'function' && this.progress) {
          this.onSave(this.progress);
        }
        if (typeof this.onUpdateHeader === 'function') {
          this.onUpdateHeader();
        }

        this.reviewTimer = setTimeout(() => {
          closeModal();
          this.update(this.progress);
        }, 1200);
      } else {
        SoundEffects.playSound('near_miss');
        recordAttempt(item, false);
        const diag = evalResult.diagnosis || CurriculumEngine.diagnoseError(variation, answerVal);

        if (feedbackBox) {
          feedbackBox.style.display = 'block';
          feedbackBox.style.background = 'rgba(234,179,8,0.2)';
          feedbackBox.style.color = 'var(--color-amber-warm)';
          feedbackBox.innerHTML = `💡 ${diag?.adviceMessage || 'おしい！もう一度落ち着いて解いてみよう！'}`;
        }

        // Clear wrong inputs so the student can re-enter cleanly
        if (singleInput) {
          singleInput.value = '';
          singleInput.focus?.();
        }
        if (quotientInput) {
          quotientInput.value = '';
          quotientInput.focus?.();
        }
        if (remainderInput) {
          remainderInput.value = '';
        }

        if (typeof this.onSave === 'function' && this.progress) {
          this.onSave(this.progress);
        }
      }
    };

    if (submitBtn) {
      submitBtn.onclick = handleSubmitReview;
    }

    [singleInput, quotientInput, remainderInput].forEach((inp) => {
      if (inp) {
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault?.();
            e.stopPropagation?.();
            handleSubmitReview();
          }
        });
      }
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    (quotientInput || singleInput)?.focus?.();
  }

  destroy() {
    if (this.reviewTimer) {
      clearTimeout(this.reviewTimer);
      this.reviewTimer = null;
    }
    if (this.reviewModalEl && this.reviewModalEl.parentNode) {
      this.reviewModalEl.parentNode.removeChild(this.reviewModalEl);
    }
    this.reviewModalEl = null;

    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
    this.rootEl = null;
  }
}

export const TreasureBoxView = TreasureBox;
export default TreasureBox;
