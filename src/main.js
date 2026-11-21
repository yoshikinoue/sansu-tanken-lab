/**
 * src/main.js
 * 算数探検ラボ - Main Application Controller & SPA Router
 *
 * Dual capability:
 * 1. Headless pure Router contract (routes, parseRoute) matching RouterReference
 * 2. Full browser SPA controller (MathLabApp) managing hash router (#map, #stage, #lesson, #treasure, #parent),
 *    offline/online sync, speech/audio lifecycles, and 5-stage interactive arena.
 */

import * as CurriculumEngine from './services/curriculum-engine.js';
import * as StorageService from './services/storage-service.js';
import * as SoundEffects from './services/sound-effects.js';
import * as SpeechService from './services/speech-service.js';
import * as GamificationEngine from './services/gamification-engine.js';

import CanvasPad, { clear as clearPad } from './components/canvas-pad.js';
import Keypad, { getValue as getKeypadValue } from './components/keypad.js';
import StepGuideModal from './components/step-guide.js';
import { showToast, createToast } from './components/toast-feedback.js';
import MiniLessonModal from './components/mini-lesson.js';
import StageMap from './components/stage-map.js';
import TreasureBox, { addItem as addTreasureItem } from './components/treasure-box.js';
import ParentBoard from './components/parent-board.js';
import {
  DEFAULT_CHARACTER_ID,
  INITIAL_UNLOCKED_CHARACTERS,
  getCharacterById,
  renderCharacterSvg,
  MascotCompanionWidget,
  CharacterBookModal
} from './components/cute-characters.js';
import { BackroomsBonusModal } from './components/backrooms-bonus.js';

// --- HEADLESS COMPATIBLE ROUTER REFERENCE CONTRACT ---

export const routes = ['#map', '#stage', '#treasure', '#parent', '#lesson'];

/**
 * ハッシュルートを解析してビューとパラメータを抽出
 * @param {string} hash 例: '#stage/stage-1', '#map', ''
 * @returns {{ view: string, param: string|null }}
 */
export function parseRoute(hash) {
  if (!hash || typeof hash !== 'string') {
    return { view: '#map', param: null };
  }

  const clean = hash.startsWith('#') ? hash : '#' + hash;
  const [pathPart, idPart] = clean.split('/');
  const view = pathPart || '#map';
  const param = idPart || null;

  const safeView = routes.includes(view) ? view : '#map';
  return { view: safeView, param };
}

// --- GLOBAL APPLICATION CONTROLLER ---

export class MathLabApp {
  constructor() {
    this.progress = null;
    this.currentRoute = { view: '#map', param: null };
    this.activeViewComponent = null;
    this.currentSession = null;
    this.isMuted = false;
    this.arenaCanvasPad = null;
    this.arenaKeypad = null;
    this.arenaStepGuide = null;
    this.arenaMascotWidget = null;
    this.arenaAdvanceTimer = null;
    this.stageCompleteModal = null;
    this.bonusModal = null;
    this.characterBookModal = null;
  }

  syncGamificationProgress() {
    if (!this.progress) return;
    if (!this.progress.gamification || typeof this.progress.gamification !== 'object') {
      this.progress.gamification = {};
    }
    const exported = GamificationEngine.exportGamificationState();
    this.progress.gamification.totalScore = exported.totalScore;
    this.progress.gamification.labExp = exported.labExp;
    this.progress.gamification.labRank = exported.labRank;
    this.progress.gamification.selfCorrectionCount = exported.selfCorrectionCount;
    this.progress.gamification.unlockedBadges = exported.unlockedBadges;
    this.progress.gamification.stageStars = { ...(exported.stageStars || {}) };

    const exportedStarsTotal = Object.values(exported.stageStars || {}).reduce(
      (sum, s) => sum + (Number(s) || 0),
      0
    );
    const stageProgressStarsTotal = Object.values(this.progress.stageProgress || {}).reduce(
      (sum, sp) => sum + (Number(sp?.stars) || 0),
      0
    );
    this.progress.gamification.totalStars = Math.max(exportedStarsTotal, stageProgressStarsTotal);
  }

  ensureBonusState() {
    if (!this.progress) {
      this.progress = StorageService.createDefaultProgress();
    }
    if (!this.progress.bonusGame || typeof this.progress.bonusGame !== 'object') {
      this.progress.bonusGame = {
        tickets: 1,
        totalPlayed: 0,
        totalEscapes: 0,
        selectedCharacterId: DEFAULT_CHARACTER_ID,
        unlockedCharacters: [...INITIAL_UNLOCKED_CHARACTERS]
      };
    }
    if (!Array.isArray(this.progress.bonusGame.unlockedCharacters) || this.progress.bonusGame.unlockedCharacters.length === 0) {
      this.progress.bonusGame.unlockedCharacters = [...INITIAL_UNLOCKED_CHARACTERS];
    }
    if (!this.progress.bonusGame.selectedCharacterId) {
      this.progress.bonusGame.selectedCharacterId = DEFAULT_CHARACTER_ID;
    }
    if (typeof this.progress.bonusGame.tickets !== 'number') {
      this.progress.bonusGame.tickets = 1;
    }
    return this.progress.bonusGame;
  }

  async init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return this;
    }

    // 1. Load User Progress (localStorage <-> server /api/progress)
    try {
      this.progress = await StorageService.loadProgress();
    } catch {
      this.progress = StorageService.createDefaultProgress();
    }

    if (!this.progress) {
      this.progress = StorageService.createDefaultProgress();
    }

    GamificationEngine.loadGamificationState(this.progress);

    // 2. Setup Global UI Elements & Event Listeners
    this.setupGlobalEvents();
    this.updateHeaderStats();
    this.checkCheerBanner();

    // 3. Initialize Router on current initial hash
    this.handleRoute();

    return this;
  }

  updateOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    if (typeof StorageService.getOfflineBannerText === 'function') {
      banner.textContent = StorageService.getOfflineBannerText();
    }
  }

  setupGlobalEvents() {
    // Hash router listener
    window.addEventListener('hashchange', () => this.handleRoute());

    this.updateOfflineBanner();
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const banner = document.getElementById('offline-banner');
      if (banner) banner.classList.add('visible');
    }

    // Online / Offline sync listeners
    window.addEventListener('online', () => {
      this.updateOfflineBanner();
      const banner = document.getElementById('offline-banner');
      if (banner) banner.classList.remove('visible');
      if (typeof StorageService.isStaticHostingEnvironment !== 'function' || !StorageService.isStaticHostingEnvironment()) {
        StorageService.flushPendingSync().catch(() => {});
      }
    });
    window.addEventListener('offline', () => {
      this.updateOfflineBanner();
      const banner = document.getElementById('offline-banner');
      if (banner) banner.classList.add('visible');
    });

    // Sound toggle button
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.isMuted = SoundEffects.toggleMute();
        soundBtn.textContent = this.isMuted ? '🔇' : '🔊';
        soundBtn.setAttribute('aria-label', this.isMuted ? '音声をオンにする' : '音声をミュートする');
      });
    }

    // Header Navigation buttons
    const logoHome = document.getElementById('header-logo');
    if (logoHome) {
      logoHome.addEventListener('click', () => {
        window.location.hash = '#map';
      });
    }

    const btnTreasure = document.getElementById('btn-nav-treasure');
    if (btnTreasure) {
      btnTreasure.addEventListener('click', () => {
        window.location.hash = '#treasure';
      });
    }

    const btnParent = document.getElementById('btn-nav-parent');
    if (btnParent) {
      btnParent.addEventListener('click', () => {
        window.location.hash = '#parent';
      });
    }

    const btnCharBook = document.getElementById('btn-nav-charbook');
    if (btnCharBook) {
      btnCharBook.addEventListener('click', () => {
        SoundEffects.playSound('tap');
        this.openCharacterBook();
      });
    }

    const btnBonus = document.getElementById('btn-nav-bonus');
    if (btnBonus) {
      btnBonus.addEventListener('click', () => {
        SoundEffects.playSound('tap');
        this.openBonusGame();
      });
    }
  }

  updateHeaderStats() {
    if (!this.progress) return;
    const rankTitleEl = document.getElementById('header-rank-title');
    const selfCorrectEl = document.getElementById('header-self-correct-count');

    const profile = GamificationEngine.getUserProfile(this.progress.gamification);
    const rankTitle = profile?.labRank?.title || profile?.rank?.title || profile?.rankTitle;
    if (rankTitleEl && rankTitle) {
      rankTitleEl.textContent = rankTitle;
    }
    if (selfCorrectEl) {
      const count = Math.max(
        Number(profile?.selfCorrectionCount) || 0,
        Number(this.progress?.gamification?.selfCorrectionCount) || 0
      );
      selfCorrectEl.textContent = String(count);
    }
  }

  checkCheerBanner() {
    const banner = document.getElementById('cheer-banner');
    if (!banner || !this.progress?.parentCheer) return;

    const unread = this.progress.parentCheer.cheerMessages?.find(m => !m.readByChild);
    if (unread) {
      banner.style.display = 'flex';
      const textEl = document.getElementById('cheer-banner-text');
      if (textEl) {
        textEl.textContent = unread.customText || 'おうちの人から応援スタンプが届いています！';
      }
      const btn = document.getElementById('btn-read-cheer');
      if (btn) {
        btn.onclick = () => {
          unread.readByChild = true;
          banner.style.display = 'none';
          SoundEffects.playSound('stamp');
          StorageService.saveProgress(this.progress).catch(() => {});
        };
      }
    } else {
      banner.style.display = 'none';
    }
  }

  handleRoute() {
    SpeechService.stopSpeech();
    const route = parseRoute(window.location.hash);
    this.currentRoute = route;

    const container = document.getElementById('view-container');
    if (!container) return;

    // Cleanup active view component
    if (this.activeViewComponent && typeof this.activeViewComponent.destroy === 'function') {
      this.activeViewComponent.destroy();
    }
    this.activeViewComponent = null;

    // Cleanup arena subcomponents
    if (this.arenaCanvasPad && typeof this.arenaCanvasPad.destroy === 'function') {
      this.arenaCanvasPad.destroy();
    }
    this.arenaCanvasPad = null;

    if (this.arenaKeypad) {
      // BUG-009 hardening: release the lock before teardown so a locked
      // state never outlives the arena that set it.
      this.arenaKeypad.setLocked(false);
      if (typeof this.arenaKeypad.destroy === 'function') {
        this.arenaKeypad.destroy();
      }
    }
    this.arenaKeypad = null;

    if (this.arenaStepGuide && typeof this.arenaStepGuide.destroy === 'function') {
      this.arenaStepGuide.destroy();
    }
    this.arenaStepGuide = null;

    if (this.arenaAdvanceTimer) {
      clearTimeout(this.arenaAdvanceTimer);
      this.arenaAdvanceTimer = null;
    }

    if (this.arenaMascotWidget && typeof this.arenaMascotWidget.destroy === 'function') {
      this.arenaMascotWidget.destroy();
    }
    this.arenaMascotWidget = null;

    if (this.bonusModal && typeof this.bonusModal.destroy === 'function') {
      this.bonusModal.destroy();
    }
    this.bonusModal = null;

    if (this.characterBookModal && typeof this.characterBookModal.destroy === 'function') {
      this.characterBookModal.destroy();
    }
    this.characterBookModal = null;

    // Cleanup stage complete modal
    if (this.stageCompleteModal) {
      if (this.stageCompleteModal.parentNode) {
        this.stageCompleteModal.parentNode.removeChild(this.stageCompleteModal);
      }
      this.stageCompleteModal = null;
    }

    // Safeguard: Ensure modal-root has no leaked modal overlays
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      modalRoot.innerHTML = '';
    }

    switch (route.view) {
      case '#map':
        this.renderStageMap(container);
        break;
      case '#stage':
        this.renderStageArena(container, route.param);
        break;
      case '#lesson':
        this.renderMiniLesson(container, route.param);
        break;
      case '#treasure':
        this.renderTreasureBox(container);
        break;
      case '#parent':
        this.renderParentBoard(container);
        break;
      default:
        this.renderStageMap(container);
        break;
    }

    this.updateHeaderStats();
    this.checkCheerBanner();
  }

  // --- VIEW RENDERERS ---

  renderStageMap(container) {
    this.activeViewComponent = new StageMap({
      container,
      progress: this.progress,
      onSelectStage: (stageId) => {
        window.location.hash = `#stage/${stageId}`;
      },
      onOpenLesson: (stageId) => {
        window.location.hash = `#lesson/${stageId}`;
      },
      onOpenBonusGame: () => {
        this.openBonusGame();
      },
      onOpenCharacterBook: () => {
        this.openCharacterBook();
      }
    }).mount(container);
  }

  renderMiniLesson(container, stageId = 'stage-1') {
    const sId = stageId || 'stage-1';
    const modalRoot = document.getElementById('modal-root') || container;

    this.activeViewComponent = new MiniLessonModal({
      stageId: sId,
      progress: this.progress,
      onComplete: (completedStageId) => {
        if (this.progress?.stageProgress?.[completedStageId]) {
          this.progress.stageProgress[completedStageId].miniLessonSeen = true;
          StorageService.saveProgress(this.progress).catch(() => {});
        }
        window.location.hash = `#stage/${completedStageId}`;
      },
      onClose: () => {
        window.location.hash = '#map';
      }
    }).mount(modalRoot);
  }

  renderStageArena(container, stageParam = 'stage-1') {
    const stageStr = stageParam || 'stage-1';
    let stageNum = 1;
    const totalStages = CurriculumEngine.WORLDS_METADATA.reduce((n, w) => n + w.stages.length, 0);
    const match = stageStr.match(/\d+/);
    if (match) {
      stageNum = Math.max(1, Math.min(totalStages, Number(match[0])));
    }
    const worldId = CurriculumEngine.getWorldIdByGlobalStage(stageNum);
    const stageId = `stage-${stageNum}`;

    // Generate 5 adaptive problems
    const problems = CurriculumEngine.generateStageProblems(worldId, stageNum);

    this.currentSession = {
      stageNum,
      worldId,
      stageId,
      problems,
      currentIndex: 0,
      attempts: 0,
      wasSelfCorrected: false,
      correctCount: 0,
      firstTryCount: 0,
      selfCorrectedCount: 0,
      isAdvancing: false,
      lastCompletedSteps: null,
      lastDiagnosis: null,
      history: []
    };

    container.innerHTML = `
      <div class="problem-arena">
        <!-- Left: Header, Problem, Canvas Pad -->
        <div class="arena-left">
          <div class="problem-header-bar">
            <button type="button" class="btn btn-sm btn-secondary btn-arena-back">◀ マップ</button>
            <div class="problem-progress">
              <span style="color:var(--color-accent-cyan);">STAGE ${stageNum}</span>
              <div class="question-pills">
                <div class="q-dot active" data-q="0"></div>
                <div class="q-dot" data-q="1"></div>
                <div class="q-dot" data-q="2"></div>
                <div class="q-dot" data-q="3"></div>
                <div class="q-dot" data-q="4"></div>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline btn-arena-lesson">📖 ミニ授業</button>
          </div>

          <div class="problem-display-card">
            <div class="problem-prompt" id="arena-problem-prompt"></div>
            <div class="arena-step-summary" id="arena-step-summary" style="display:none;"></div>
          </div>

          <div id="arena-mascot-container"></div>

          <div id="arena-canvas-container" style="flex:1; min-height:240px;"></div>
        </div>

        <!-- Right: Keypad -->
        <div class="arena-right">
          <div id="arena-keypad-container" style="height:100%;"></div>
        </div>
      </div>
    `;

    // Back to map button
    const backBtn = container.querySelector('.btn-arena-back');
    if (backBtn) {
      backBtn.onclick = () => {
        window.location.hash = '#map';
      };
    }

    // Mini lesson button
    const lessonBtn = container.querySelector('.btn-arena-lesson');
    if (lessonBtn) {
      lessonBtn.onclick = () => {
        window.location.hash = `#lesson/${stageId}`;
      };
    }

    const bonusState = this.ensureBonusState();

    // Initialize MascotCompanionWidget (Momonga by default, switchable anytime)
    const mascotContainer = container.querySelector('#arena-mascot-container');
    if (mascotContainer) {
      this.arenaMascotWidget = new MascotCompanionWidget({
        selectedCharacterId: bonusState.selectedCharacterId,
        unlockedCharacters: bonusState.unlockedCharacters,
        onSelectCharacter: (newCharId) => {
          this.setSelectedCharacter(newCharId);
        },
        onOpenBook: () => {
          this.openCharacterBook();
        }
      }).mount(mascotContainer);
    }

    // Initialize CanvasPad
    const canvasContainer = container.querySelector('#arena-canvas-container');
    if (canvasContainer) {
      this.arenaCanvasPad = new CanvasPad({
        dpr: (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 2,
        gridMode: 'none',
        watermarkCharacterId: bonusState.selectedCharacterId,
        onDrawStart: () => {
          this.arenaMascotWidget?.setMood('focus');
        }
      }).mount(canvasContainer);
    }

    // Initialize Keypad
    const keypadContainer = container.querySelector('#arena-keypad-container');
    const currentProblem = problems[0];
    const hasRemainder = Boolean(currentProblem?.hasRemainder);
    const stageMeta = CurriculumEngine.getStageMetadata(worldId, stageNum);
    // 小数ステージ (メタデータ usesDecimal) では小数点キーを有効化する
    const hasDecimal = Boolean(stageMeta?.usesDecimal);
    // 分数問題では分子・分母の2欄入力キーを有効化する (問題ごとの hasFraction)
    const hasFraction = Boolean(currentProblem?.hasFraction);

    if (keypadContainer) {
      this.arenaKeypad = new Keypad({
        hasRemainder,
        hasDecimal,
        hasFraction,
        operator: currentProblem?.operator || null,
        prompt: currentProblem?.prompt || '',
        answerLabel: stageMeta?.answerLabel || null,
        onSound: (snd) => SoundEffects.playSound(snd),
        onSubmit: (value) => this.handleArenaSubmit(value)
      }).mount(keypadContainer);
    }

    this.updateArenaProblemDisplay();
  }

  updateArenaProblemDisplay() {
    const session = this.currentSession;
    if (!session) return;

    const prob = session.problems[session.currentIndex];
    if (!prob) return;

    const promptEl = document.getElementById('arena-problem-prompt');
    if (promptEl) {
      const promptText = prob.prompt || `${prob.operands?.[0]} ${prob.operator} ${prob.operands?.[1]} = ?`;
      promptEl.innerHTML = `<span>${promptText}</span>`;
    }

    const summaryEl = document.getElementById('arena-step-summary');
    if (summaryEl) {
      summaryEl.style.display = 'none';
      summaryEl.innerHTML = '';
    }

    // Update dots
    for (let i = 0; i < 5; i++) {
      const dot = document.querySelector(`.q-dot[data-q="${i}"]`);
      if (dot) {
        dot.className = 'q-dot';
        if (i < session.currentIndex) {
          dot.classList.add('completed');
        } else if (i === session.currentIndex) {
          dot.classList.add('active');
        }
      }
    }

    // Reset keypad to match problem remainder mode and operator label
    if (this.arenaKeypad) {
      const stageMeta = CurriculumEngine.getStageMetadata(session.worldId, session.stageNum);
      this.arenaKeypad.reset(Boolean(prob.hasRemainder), {
        hasDecimal: Boolean(stageMeta?.usesDecimal),
        hasFraction: Boolean(prob.hasFraction),
        operator: prob.operator || null,
        prompt: prob.prompt || '',
        answerLabel: stageMeta?.answerLabel || null
      });
      // BUG-009: the new problem is on screen; accept input again.
      this.arenaKeypad.setLocked(false);
    }

    // Clear canvas between problems
    if (this.arenaCanvasPad && this.arenaCanvasPad.state) {
      clearPad(this.arenaCanvasPad.state);
      this.arenaCanvasPad.clearCanvas?.();
    }

    session.attempts = 0;
    session.wasSelfCorrected = false;
    session.isAdvancing = false;
    session.lastCompletedSteps = null;
    session.lastDiagnosis = null;
  }

  renderArenaStepSummary() {
    const summaryEl = document.getElementById('arena-step-summary');
    const session = this.currentSession;
    if (!summaryEl || !session) return;

    const prob = session.problems[session.currentIndex];
    const steps = Array.isArray(session.lastCompletedSteps) ? session.lastCompletedSteps : [];
    const diag = session.lastDiagnosis;

    if (steps.length === 0 && !diag) {
      summaryEl.style.display = 'none';
      summaryEl.innerHTML = '';
      return;
    }

    const stepChips = steps
      .map((s) => `<span class="step-summary-chip">${s.title}: <strong>${s.value}</strong></span>`)
      .join(' ');
    const diagText = diag?.adviceMessage || diag?.diagnosis || '';

    summaryEl.style.display = 'flex';
    summaryEl.innerHTML = `
      <div class="step-summary-info">
        ${steps.length > 0 ? `<div class="step-summary-chips">🔍 ステップメモ: ${stepChips}</div>` : ''}
        ${steps.length === 0 && diagText ? `<div class="step-summary-diag">💡 ${diagText}</div>` : ''}
      </div>
      <button type="button" class="btn btn-sm btn-outline btn-reopen-step-guide">🔍 ステップを見る</button>
    `;

    const reopenBtn = summaryEl.querySelector('.btn-reopen-step-guide');
    if (reopenBtn && prob) {
      reopenBtn.onclick = () => {
        SoundEffects.playSound('tap');
        this.launchStepGuide(prob, diag);
      };
    }
  }

  handleArenaSubmit(answerValue) {
    const session = this.currentSession;
    if (!session || session.isAdvancing) return;

    const prob = session.problems[session.currentIndex];
    if (!prob) return;

    const result = CurriculumEngine.evaluateAnswer(prob, answerValue);

    if (result.isCorrect) {
      // Correct!
      session.correctCount++;
      const isFirstTry = session.attempts === 0;
      if (isFirstTry) {
        session.firstTryCount++;
      }
      if (session.wasSelfCorrected) {
        session.selfCorrectedCount = (session.selfCorrectedCount || 0) + 1;
      }

      // Gamification scoring
      GamificationEngine.recordResult({
        problemId: prob.id,
        worldId: prob.worldId || session.worldId,
        stageId: session.stageId,
        isCorrect: true,
        wasSelfCorrected: session.wasSelfCorrected,
        isStageComplete: false
      });
      this.syncGamificationProgress();
      StorageService.saveProgress(this.progress).catch(() => {});

      if (session.wasSelfCorrected) {
        SoundEffects.playSound('self_correct');
        showToast(null, 'self-correct', '自分で気づいて直せたね！すばらしい！');
        this.arenaMascotWidget?.setMood('selfCorrect');
      } else {
        SoundEffects.playSound('correct');
        showToast(null, 'encourage', '大正解！その調子！');
        this.arenaMascotWidget?.setMood('happy');
      }

      this.updateHeaderStats();

      // Advance to next problem or clear stage
      session.currentIndex++;
      if (session.currentIndex >= 5) {
        this.handleArenaStageComplete();
      } else {
        session.isAdvancing = true;
        // BUG-009: clear the just-submitted answer immediately and lock the
        // keypad for the advance window, so input during the window is
        // visibly refused instead of being silently discarded.
        if (this.arenaKeypad) {
          this.arenaKeypad.clear();
          this.arenaKeypad.setLocked(true);
        }
        if (this.arenaAdvanceTimer) {
          clearTimeout(this.arenaAdvanceTimer);
        }
        this.arenaAdvanceTimer = setTimeout(() => {
          this.arenaAdvanceTimer = null;
          // BUG-009 hardening: the advance window always ends by releasing
          // the keypad lock, even when the display update below is skipped
          // (session replaced / route changed). Unlocking must not depend
          // solely on updateArenaProblemDisplay() being reached.
          if (this.arenaKeypad) {
            this.arenaKeypad.setLocked(false);
          }
          if (this.currentSession === session && this.currentRoute.view === '#stage') {
            this.updateArenaProblemDisplay();
          }
        }, 600);
      }
    } else {
      // Incorrect - NEVER show X!
      session.attempts++;
      SoundEffects.playSound('near_miss');
      this.arenaMascotWidget?.setMood('cheer');

      // Diagnose error & preserve for follow-up StepGuideModal
      const diagnosis = result.diagnosis || CurriculumEngine.diagnoseError(prob, answerValue);
      session.lastDiagnosis = diagnosis;

      // Clear keypad immediately so old wrong digits / remainder activeField do not persist on return
      if (this.arenaKeypad) {
        this.arenaKeypad.clear();
      }

      GamificationEngine.recordResult({
        problemId: prob.id,
        worldId: prob.worldId || session.worldId,
        stageId: session.stageId,
        isCorrect: false,
        isStageComplete: false
      });
      this.syncGamificationProgress();

      // Quarantine problem in Power-Up Treasure Box
      if (this.progress?.treasureBox) {
        addTreasureItem(this.progress.treasureBox, prob);
        StorageService.saveProgress(this.progress).catch(() => {});
      }

      // Show warm amber encouragement toast
      const toastMsg = diagnosis?.adviceMessage || 'おしい！もう一歩！';
      showToast(null, 'encourage', toastMsg);

      // Open StepGuideModal for scaffolding self-correction
      this.launchStepGuide(prob, diagnosis);
    }
  }

  launchStepGuide(problem, diagnosis = null) {
    const modalRoot = document.getElementById('modal-root') || document.body;

    if (this.arenaStepGuide && typeof this.arenaStepGuide.destroy === 'function') {
      this.arenaStepGuide.destroy();
      this.arenaStepGuide = null;
    }

    const activeDiagnosis = diagnosis || this.currentSession?.lastDiagnosis || null;

    this.arenaStepGuide = new StepGuideModal({
      problem,
      diagnosis: activeDiagnosis,
      onStepSuccess: ({ session }) => {
        SoundEffects.playSound('tap');
        if (this.currentSession && session) {
          this.currentSession.lastCompletedSteps = session.steps
            .map((st, idx) => ({
              title: st.title || st.label || `ステップ${idx + 1}`,
              value: session.stepAnswers[idx]
            }))
            .filter((item) => item.value !== undefined);
        }
      },
      onStepError: () => {
        SoundEffects.playSound('near_miss');
      },
      onComplete: ({ session }) => {
        if (this.currentSession) {
          this.currentSession.wasSelfCorrected = true;
          if (session) {
            this.currentSession.lastCompletedSteps = session.steps
              .map((st, idx) => ({
                title: st.title || st.label || `ステップ${idx + 1}`,
                value: session.stepAnswers[idx]
              }))
              .filter((item) => item.value !== undefined);
          }
        }
        if (this.arenaKeypad) {
          this.arenaKeypad.clear();
        }
        SoundEffects.playSound('self_correct');
        // Keep the modal open so the completion banner and 「問題へ戻る」 button are shown to the user.
      },
      onClose: () => {
        if (this.arenaKeypad) {
          this.arenaKeypad.clear();
        }
        if (this.currentSession?.wasSelfCorrected) {
          showToast(null, 'hint', 'ステップ完了！もう一度問題に挑戦しよう！');
        }
        this.renderArenaStepSummary();
        this.arenaStepGuide?.destroy();
        this.arenaStepGuide = null;
      }
    });

    this.arenaStepGuide.open(modalRoot);
  }

  handleArenaStageComplete() {
    const session = this.currentSession;
    if (!session) return;

    SoundEffects.playSound('stage_clear');

    // Calculate stars across all 5 questions (including all self-corrected items)
    const stars = GamificationEngine.calculateStageStars({
      totalQuestions: 5,
      firstTryCorrectCount: session.firstTryCount,
      selfCorrectedCount: session.selfCorrectedCount || 0
    });

    // Update progress
    if (!this.progress.stageProgress) {
      this.progress.stageProgress = {};
    }
    const prev = this.progress.stageProgress[session.stageId] || {};
    this.progress.stageProgress[session.stageId] = {
      ...prev,
      cleared: true,
      stars: Math.max(prev.stars || 0, stars),
      firstTryCorrectCount: Math.max(prev.firstTryCorrectCount || 0, session.firstTryCount),
      selfCorrectedCount: Math.max(prev.selfCorrectedCount || 0, session.selfCorrectedCount || 0),
      totalAttempts: (prev.totalAttempts || 0) + 5 + session.attempts,
      bestScore: Math.max(prev.bestScore || 0, session.correctCount * 10),
      lastPlayed: new Date().toISOString()
    };

    // Award +1 Backrooms Bonus Ticket on every stage clear
    const bonusState = this.ensureBonusState();
    bonusState.tickets = (bonusState.tickets || 0) + 1;

    if (typeof GamificationEngine.recordStageClear === 'function') {
      GamificationEngine.recordStageClear({
        stageId: session.stageId,
        worldId: session.worldId,
        stars: this.progress.stageProgress[session.stageId].stars,
        firstTryCorrectCount: session.firstTryCount,
        selfCorrectedCount: session.selfCorrectedCount || 0
      });
    }

    this.syncGamificationProgress();
    // Save progress
    StorageService.saveProgress(this.progress).catch(() => {});
    this.updateHeaderStats();

    // Show completion modal
    const modalRoot = document.getElementById('modal-root') || document.body;

    if (this.stageCompleteModal && this.stageCompleteModal.parentNode) {
      this.stageCompleteModal.parentNode.removeChild(this.stageCompleteModal);
      this.stageCompleteModal = null;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';

    const card = document.createElement('div');
    card.className = 'modal-card';
    card.style.maxWidth = '480px';
    card.style.textAlign = 'center';
    card.style.padding = '32px';

    const starString = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const activeChar = getCharacterById(bonusState.selectedCharacterId);

    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:8px;">
        <span style="font-size:2.8rem;">🏆</span>
        ${renderCharacterSvg(activeChar.id, 'happy', 68)}
      </div>
      <h2 style="font-size:1.6rem; color:var(--color-accent-cyan);">ステージクリア！</h2>
      <p style="color:var(--color-text-muted); margin:8px 0;">STAGE ${session.stageNum} を見事に攻略しました！</p>
      <div style="font-size:2.2rem; letter-spacing:4px; color:var(--color-amber-warm); margin:12px 0;">
        ${starString}
      </div>
      <div style="background:rgba(0,0,0,0.3); padding:14px; border-radius:var(--radius-lg); margin-bottom:14px;">
        <div style="font-size:1.1rem; font-weight:700;">正解数: ${session.correctCount} / 5 問</div>
      </div>
      <div class="stage-bonus-ticket-banner">
        🎫 バックルーム探検チケット <strong>+1枚</strong> ゲット！（合計 ${bonusState.tickets}枚）
      </div>
      <button type="button" class="btn btn-accent btn-stage-bonus" style="width:100%; padding:14px; font-size:1.1rem; margin-bottom:10px;">
        🎮 ボーナスゲーム（バックルーム）で遊ぶ！
      </button>
      <button type="button" class="btn btn-primary btn-stage-finish" style="width:100%; padding:14px; font-size:1.05rem;">
        マップへ戻る 🗺️
      </button>
    `;

    const bonusBtn = card.querySelector('.btn-stage-bonus');
    if (bonusBtn) {
      bonusBtn.onclick = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this.stageCompleteModal = null;
        this.openBonusGame();
      };
    }

    const finishBtn = card.querySelector('.btn-stage-finish');
    if (finishBtn) {
      finishBtn.onclick = () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this.stageCompleteModal = null;
        window.location.hash = '#map';
      };
    }

    overlay.appendChild(card);
    modalRoot.appendChild(overlay);
    this.stageCompleteModal = overlay;
  }

  setSelectedCharacter(charId) {
    const bonusState = this.ensureBonusState();
    const char = getCharacterById(charId);
    bonusState.selectedCharacterId = char.id;
    if (!bonusState.unlockedCharacters.includes(char.id)) {
      bonusState.unlockedCharacters.push(char.id);
    }

    if (this.arenaCanvasPad && typeof this.arenaCanvasPad.setWatermarkCharacter === 'function') {
      this.arenaCanvasPad.setWatermarkCharacter(char.id);
    }
    if (this.arenaMascotWidget && this.arenaMascotWidget.characterId !== char.id) {
      this.arenaMascotWidget.setCharacter(char.id);
    }
    if (this.currentRoute.view === '#map' && this.activeViewComponent && typeof this.activeViewComponent.update === 'function') {
      this.activeViewComponent.update(this.progress);
    }

    StorageService.saveProgress(this.progress).catch(() => {});
    showToast(null, 'success', `応援キャラを「${char.name}」に変更したよ！`);
  }

  openCharacterBook() {
    const bonusState = this.ensureBonusState();
    const modalRoot = document.getElementById('modal-root') || document.body;
    if (this.characterBookModal) {
      this.characterBookModal.destroy();
      this.characterBookModal = null;
    }
    this.characterBookModal = new CharacterBookModal({
      selectedCharacterId: bonusState.selectedCharacterId,
      unlockedCharacters: bonusState.unlockedCharacters,
      onSelectCharacter: (charId) => {
        this.setSelectedCharacter(charId);
      },
      onOpenBonusGame: () => {
        this.openBonusGame();
      },
      onClose: () => {
        this.characterBookModal = null;
      }
    }).open(modalRoot);
  }

  openBonusGame() {
    const bonusState = this.ensureBonusState();
    const modalRoot = document.getElementById('modal-root') || document.body;
    if (this.bonusModal) {
      this.bonusModal.destroy();
      this.bonusModal = null;
    }

    if (bonusState.tickets > 0) {
      bonusState.tickets -= 1;
    }
    bonusState.totalPlayed = (bonusState.totalPlayed || 0) + 1;
    StorageService.saveProgress(this.progress).catch(() => {});

    this.bonusModal = new BackroomsBonusModal({
      progress: this.progress,
      selectedCharacterId: bonusState.selectedCharacterId,
      unlockedCharacters: bonusState.unlockedCharacters,
      onComplete: ({ score, rescuedCharacterId }) => {
        bonusState.totalEscapes = (bonusState.totalEscapes || 0) + 1;
        if (rescuedCharacterId && !bonusState.unlockedCharacters.includes(rescuedCharacterId)) {
          bonusState.unlockedCharacters.push(rescuedCharacterId);
        }
        if (this.progress.gamification) {
          this.progress.gamification.totalScore = (this.progress.gamification.totalScore || 0) + Math.max(0, Number(score) || 0);
        }
        this.arenaMascotWidget?.setUnlockedCharacters(bonusState.unlockedCharacters);
        StorageService.saveProgress(this.progress).catch(() => {});
        this.updateHeaderStats();
      },
      onOpenBook: () => {
        this.bonusModal = null;
        this.openCharacterBook();
      },
      onClose: () => {
        this.bonusModal = null;
        if (this.currentRoute.view === '#map' && this.activeViewComponent && typeof this.activeViewComponent.update === 'function') {
          this.activeViewComponent.update(this.progress);
        }
        if (this.arenaMascotWidget && this.arenaMascotWidget.characterId !== bonusState.selectedCharacterId) {
          this.arenaMascotWidget.setCharacter(bonusState.selectedCharacterId);
          this.arenaCanvasPad?.setWatermarkCharacter(bonusState.selectedCharacterId);
        }
      }
    }).open(modalRoot);
  }

  renderTreasureBox(container) {
    this.activeViewComponent = new TreasureBox({
      container,
      progress: this.progress,
      onSave: (p) => StorageService.saveProgress(p),
      onUpdateHeader: () => {
        this.syncGamificationProgress();
        this.updateHeaderStats();
      }
    }).mount(container);
  }

  renderParentBoard(container) {
    const configuredPin = this.progress?.parentCheer?.pinConfigured
      ? this.progress.parentCheer.parentPinHash
      : undefined;
    this.activeViewComponent = new ParentBoard({
      container,
      progress: this.progress,
      pin: configuredPin,
      onSave: (p) => StorageService.saveProgress(p),
      onTransferRestored: (newProgress) => {
        this.progress = newProgress;
        GamificationEngine.loadGamificationState(this.progress);
        this.updateHeaderStats();
        showToast(null, 'success', '学習データを引き継ぎました！');
      }
    }).mount(container);
  }
}

// Auto-boot in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const app = new MathLabApp();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }
}

export default MathLabApp;
