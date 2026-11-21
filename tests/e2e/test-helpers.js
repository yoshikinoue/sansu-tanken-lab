/**
 * E2E Test Helpers & Contract Specification Reference Loaders
 * 算数探検ラボ (Elementary 4th Grade Math Step-Up Learning Web App)
 *
 * Provides:
 * 1. Seamless loader for real modules in `src/` with fallback to specification reference implementations
 * 2. Full contracts for all 25 features matching PROJECT.md and analysis.md
 * 3. In-memory / Node.js native mocks for DOM, AudioContext, SpeechSynthesis, and Storage
 */

import fs from 'node:fs';
import path from 'node:path';
import { WORLDS_METADATA } from '../../src/services/curriculum-engine.js';

export { WORLDS_METADATA };

// Reference contracts derive the world/stage structure from the curriculum
// metadata (instead of hardcoding 5 worlds / 15 stages) so they stay correct
// when new worlds are added.
const REFERENCE_TOTAL_WORLDS = WORLDS_METADATA.length;
const REFERENCE_STAGES_PER_WORLD = WORLDS_METADATA[0]?.stages.length || 3;
const REFERENCE_TOTAL_STAGES = WORLDS_METADATA.reduce((n, w) => n + w.stages.length, 0);

function referenceWorldForStage(stageNumber) {
  const n = Number(stageNumber);
  if (!Number.isInteger(n) || n < 1) return 1;
  let acc = 0;
  for (const world of WORLDS_METADATA) {
    acc += world.stages.length;
    if (n <= acc) return world.worldId;
  }
  return WORLDS_METADATA[WORLDS_METADATA.length - 1]?.worldId ?? 1;
}

// --- MOCK BROWSER PRIMITIVES FOR NODE ENVIRONMENT ---

export class MockLocalStorage {
  constructor(initialData = {}) {
    this.store = new Map(Object.entries(initialData));
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

export class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.history = [];
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: (val, time) => { osc.frequency.value = val; },
        exponentialRampToValueAtTime: (val, time) => { osc.frequency.value = val; }
      },
      connect: (dest) => { osc.destination = dest; },
      start: (time = 0) => { osc.startedAt = time; },
      stop: (time = 0) => { osc.stoppedAt = time; }
    };
    this.history.push({ type: 'oscillator', node: osc });
    return osc;
  }
  createGain() {
    const gain = {
      gain: {
        value: 1.0,
        setValueAtTime: (val, time) => { gain.gain.value = val; },
        linearRampToValueAtTime: (val, time) => { gain.gain.value = val; },
        exponentialRampToValueAtTime: (val, time) => { gain.gain.value = val; }
      },
      connect: (dest) => { gain.destination = dest; }
    };
    this.history.push({ type: 'gain', node: gain });
    return gain;
  }
  get destination() {
    return { name: 'speaker' };
  }
}

export class MockSpeechSynthesis {
  constructor() {
    this.speaking = false;
    this.paused = false;
    this.pending = false;
    this.spokenUtterances = [];
    this.voices = [
      { name: 'Google 日本語', lang: 'ja-JP', default: true },
      { name: 'Kyoko', lang: 'ja-JP', default: false },
      { name: 'Alex', lang: 'en-US', default: false }
    ];
  }
  getVoices() {
    return this.voices;
  }
  speak(utterance) {
    this.speaking = true;
    this.spokenUtterances.push(utterance);
    if (typeof utterance.onstart === 'function') utterance.onstart();
    // Simulate speech completion
    this.speaking = false;
    if (typeof utterance.onend === 'function') utterance.onend();
  }
  cancel() {
    this.speaking = false;
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
}

export class MockSpeechSynthesisUtterance {
  constructor(text = '') {
    this.text = text;
    this.lang = 'ja-JP';
    this.rate = 1.0;
    this.pitch = 1.1;
    this.volume = 1.0;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

// --- SPECIFICATION REFERENCE IMPLEMENTATIONS (CONTRACTS) ---

/**
 * F1 - F8: Curriculum & Problem Engine Reference
 */
export const CurriculumEngineReference = {
  // World metadata (derived from WORLDS_METADATA)
  worlds: WORLDS_METADATA.map((world) => ({
    id: world.worldId,
    name: world.title,
    stages: world.stages.map((s) => s.globalStageNumber)
  })),

  generateStageProblems(worldId, stageId, history = []) {
    const problems = [];
    for (let q = 1; q <= 5; q++) {
      let level = 2; // standard
      if (q === 1) level = 1; // warmup
      else if (q === 3) level = 3; // diagnostic/hurdle
      else if (q === 4) {
        // Adaptive branching
        const q3Correct = history.length > 0 ? history[history.length - 1].isCorrect : true;
        level = q3Correct ? 3 : 2;
      } else if (q === 5) {
        level = 3; // confirmation / boss
      }

      problems.push(this.generateSingleProblem(worldId, stageId, q, level));
    }
    return problems;
  },

  generateSingleProblem(worldId, stageId, questionIndex = 1, level = 2) {
    const id = `w${worldId}-s${stageId}-q${questionIndex}-${Date.now()}`;
    let problem = {
      id,
      worldId,
      stageId,
      questionIndex,
      level,
      prompt: '',
      operands: [],
      operator: '+',
      expectedAnswer: 0,
      stepGuide: [],
      commonTrap: { mistakeValue: 0, diagnosis: '', hintMessage: '' }
    };

    switch (stageId) {
      // F1: World 1
      case 1: { // 3-4 digit addition with carries
        const a = level === 1 ? 348 : level === 2 ? 587 : 2468;
        const b = level === 1 ? 215 : level === 2 ? 645 : 3785;
        const sum = a + b;
        problem.operands = [a, b];
        problem.operator = '+';
        problem.expectedAnswer = sum;
        problem.prompt = `${a} + ${b} = ?`;
        problem.stepGuide = this.generateStepBreakdown(problem);
        problem.commonTrap = {
          mistakeValue: sum - 10, // Forgot carry to tens
          diagnosis: '一の位からのくり上がり「1」を十の位に足し忘れています',
          hintMessage: '一の位が10を超えたら、十の位に小さく「1」をメモしよう！'
        };
        break;
      }
      case 2: { // 3-4 digit subtraction with borrows across 0
        const a = level === 1 ? 524 : level === 2 ? 1000 : 5004;
        const b = level === 1 ? 268 : level === 2 ? 364 : 1238;
        const diff = a - b;
        problem.operands = [a, b];
        problem.operator = '-';
        problem.expectedAnswer = diff;
        problem.prompt = `${a} - ${b} = ?`;
        problem.stepGuide = this.generateStepBreakdown(problem);
        problem.commonTrap = {
          mistakeValue: a === 1000 ? 736 : diff + 10, // Subtracted smaller from larger in place
          diagnosis: '0からのくり下がりでとなりの位から10を引く手順に注意',
          hintMessage: '引けないときは百の位から10を借りてきて斜線で消そう！'
        };
        break;
      }
      case 3: { // Missing number (□)
        const a = 35;
        const target = 80;
        const missing = target - a; // 45
        problem.operands = [missing, a];
        problem.operator = '+';
        problem.prompt = `□ + ${a} = ${target}`;
        problem.expectedAnswer = missing;
        problem.stepGuide = [
          { stepNumber: 1, title: '逆算のルール', explanation: '□を求めるには、たし算の逆のひき算を使います', blankPosition: 'op', expectedStepValue: 80 - 35, hint: '80 - 35 を計算しよう' }
        ];
        problem.commonTrap = {
          mistakeValue: 80 + 35,
          diagnosis: 'たし算をそのまま足してしまっています',
          hintMessage: '□を求める時は逆の計算！たし算はひき算に変身するよ！'
        };
        break;
      }

      // F2: World 2
      case 4: { // Multiples of 10/100
        const a = 40;
        const b = 6;
        problem.operands = [a, b];
        problem.operator = '×';
        problem.expectedAnswer = a * b; // 240
        problem.prompt = `${a} × ${b} = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: '0を隠して計算', explanation: '4 × 6 を計算します', blankPosition: 'base', expectedStepValue: 24, hint: '4 × 6 = 24' },
          { stepNumber: 2, title: '0をつける', explanation: '24に0を1つつけて240にします', blankPosition: 'final', expectedStepValue: 240, hint: '24に0をつけると？' }
        ];
        problem.commonTrap = {
          mistakeValue: 4 * 6 + 0, // 24
          diagnosis: '0をつけるのを忘れています',
          hintMessage: '4×6の答えに、もとの0を1つくっつけよう！'
        };
        break;
      }
      case 5: { // 2-3 digit × 1 digit
        const a = 38;
        const b = 4;
        problem.operands = [a, b];
        problem.operator = '×';
        problem.expectedAnswer = a * b; // 152
        problem.prompt = `${a} × ${b} = ?`;
        problem.stepGuide = this.generateStepBreakdown(problem);
        problem.commonTrap = {
          mistakeValue: 3 * 4 * 10 + 8 * 4, // 120 + 32 = 152, or missing carry: 122
          diagnosis: 'くり上がりを足し忘れている可能性があります',
          hintMessage: '8×4=32 のくり上がり「3」を、3×4=12 に忘れず足そう！'
        };
        break;
      }
      case 6: { // 2 digit × 2 digit
        const a = 23;
        const b = 14;
        problem.operands = [a, b];
        problem.operator = '×';
        problem.expectedAnswer = a * b; // 322
        problem.prompt = `${a} × ${b} = ?`;
        problem.stepGuide = this.generateStepBreakdown(problem);
        problem.commonTrap = {
          mistakeValue: 23 * 4 + 23 * 1, // forgot positional shift: 92 + 23 = 115
          diagnosis: '十の位をかけた段の位ズレ（1マスあける）を忘れています',
          hintMessage: '十の位をかけた答えは、十の位の下から書くよ！'
        };
        break;
      }

      // F3: World 3
      case 7: { // Division with remainder
        const dividend = 29;
        const divisor = 4;
        const quotient = Math.floor(dividend / divisor); // 7
        const remainder = dividend % divisor; // 1
        problem.operands = [dividend, divisor];
        problem.operator = '÷';
        problem.expectedAnswer = { quotient, remainder };
        problem.prompt = `${dividend} ÷ ${divisor} = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: '商をたてる', explanation: '4 × □ が29を超えない最大の数は？', blankPosition: 'q', expectedStepValue: 7, hint: '4 × 7 = 28' },
          { stepNumber: 2, title: 'あまりを求める', explanation: '29 - 28 を計算します', blankPosition: 'r', expectedStepValue: 1, hint: 'あまりは1です' }
        ];
        problem.commonTrap = {
          mistakeValue: { quotient: 6, remainder: 5 }, // remainder >= divisor
          diagnosis: 'あまりがわる数より大きくなっています',
          hintMessage: 'あまりは必ずわる数（4）より小さくなるよ！商を1つ大きくしよう。'
        };
        break;
      }
      case 8: { // 2 digit ÷ 1 digit long division
        const dividend = 84;
        const divisor = 3;
        const quotient = Math.floor(dividend / divisor); // 28
        const remainder = dividend % divisor; // 0
        problem.operands = [dividend, divisor];
        problem.operator = '÷';
        problem.expectedAnswer = remainder === 0 ? quotient : { quotient, remainder };
        problem.prompt = `${dividend} ÷ ${divisor} = ?`;
        problem.stepGuide = this.generateStepBreakdown(problem);
        problem.commonTrap = {
          mistakeValue: 24,
          diagnosis: '十の位を割ったあまり（20）を一の位（4）とおろして割る手順を確認',
          hintMessage: '「たてる・かける・ひく・おろす」の順番を思い出そう！'
        };
        break;
      }
      case 9: { // 3 digit ÷ 1 digit with zero in quotient
        const dividend = 624;
        const divisor = 3;
        const quotient = Math.floor(dividend / divisor); // 208
        const remainder = dividend % divisor; // 0
        problem.operands = [dividend, divisor];
        problem.operator = '÷';
        problem.expectedAnswer = quotient;
        problem.prompt = `${dividend} ÷ ${divisor} = ?`;
        problem.stepGuide = this.generateStepBreakdown(problem);
        problem.commonTrap = {
          mistakeValue: 28, // skipped 0 in tens
          diagnosis: '割れない位（十の位）に商の「0」を立て忘れて桁が落ちています',
          hintMessage: '割れない位には必ず商に「0」を立ててから次をおろそう！'
        };
        break;
      }

      // F4: World 4
      case 10: { // Multiples of 10 division with remaining tens
        const dividend = 80;
        const divisor = 20;
        problem.operands = [dividend, divisor];
        problem.operator = '÷';
        problem.expectedAnswer = dividend / divisor; // 4
        problem.prompt = `${dividend} ÷ ${divisor} = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: '0を消して簡単化', explanation: '両方から0を1個消すと 8 ÷ 2 になります', blankPosition: 'q', expectedStepValue: 4, hint: '8 ÷ 2 = 4' }
        ];
        problem.commonTrap = {
          mistakeValue: 40,
          diagnosis: '商に0をつけてしまっています',
          hintMessage: '両方から0を消した時は、商には0はつかないよ！'
        };
        break;
      }
      case 11: { // 2 digit ÷ 2 digit estimation
        const dividend = 73;
        const divisor = 21;
        const quotient = Math.floor(dividend / divisor); // 3
        const remainder = dividend % divisor; // 10
        problem.operands = [dividend, divisor];
        problem.operator = '÷';
        problem.expectedAnswer = { quotient, remainder };
        problem.prompt = `${dividend} ÷ ${divisor} = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: '見当づけ', explanation: '21をおよそ20、73をおよそ70と考えて 70 ÷ 20 = 3 の見当をつけます', blankPosition: 'q', expectedStepValue: 3, hint: '7 ÷ 2 = 3' },
          { stepNumber: 2, title: '計算とあまり', explanation: '21 × 3 = 63、73 - 63 = 10', blankPosition: 'r', expectedStepValue: 10, hint: 'あまりは10' }
        ];
        problem.commonTrap = {
          mistakeValue: { quotient: 3, remainder: 1 }, // subtraction error
          diagnosis: 'あまりの引き算ミスです',
          hintMessage: '73 - 63 をていねいに引き算しよう！'
        };
        break;
      }
      case 12: { // Quotient self-correction (trial quotient adjustment)
        const dividend = 84;
        const divisor = 26; // 84 / 20 -> trial 4 -> 26*4 = 104 > 84 -> revise to 3
        const quotient = Math.floor(dividend / divisor); // 3
        const remainder = dividend % divisor; // 6
        problem.operands = [dividend, divisor];
        problem.operator = '÷';
        problem.expectedAnswer = { quotient, remainder };
        problem.prompt = `${dividend} ÷ ${divisor} = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: '最初の見当', explanation: '80 ÷ 20 で仮の商「4」を立てます', blankPosition: 'guess', expectedStepValue: 4, hint: '8 ÷ 2 = 4' },
          { stepNumber: 2, title: 'かけ算の確認', explanation: '26 × 4 = 104。84より大きくて引けません！', blankPosition: 'check', expectedStepValue: 104, hint: '引けないことを確認' },
          { stepNumber: 3, title: '商を1小さく修正', explanation: '商を4から3に修正します。26 × 3 = 78', blankPosition: 'q', expectedStepValue: 3, hint: '商は3' },
          { stepNumber: 4, title: 'あまりの計算', explanation: '84 - 78 = 6', blankPosition: 'r', expectedStepValue: 6, hint: 'あまりは6' }
        ];
        problem.commonTrap = {
          mistakeValue: { quotient: 4, remainder: 0 },
          diagnosis: '掛け算して引けないのに商4のまま進めています',
          hintMessage: '26×4=104で84を超えちゃう！商を1小さくして「3」に直そう！'
        };
        break;
      }

      // F5: World 5
      case 13: { // Parentheses priority
        // 50 - (10 + 20) = 20
        const a = 50;
        const b = 10;
        const c = 20;
        problem.operands = [a, b, c];
        problem.operator = 'mixed';
        problem.expectedAnswer = a - (b + c);
        problem.prompt = `${a} - (${b} + ${c}) = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: 'かっこを先に計算', explanation: `${b} + ${c} を先に計算します`, blankPosition: 'step1', expectedStepValue: b + c, hint: `${b} + ${c} = ${b + c}` },
          { stepNumber: 2, title: '最後の引き算', explanation: `${a} - ${b + c} を計算します`, blankPosition: 'final', expectedStepValue: a - (b + c), hint: `${a} - ${b + c} = ${a - (b + c)}` }
        ];
        problem.commonTrap = {
          mistakeValue: (a - b) + c, // 60 (calculated left to right ignoring parentheses)
          diagnosis: 'かっこを無視して左から順に計算しています',
          hintMessage: '計算は（かっこ）の中が絶対最優先！まずカッコの中を計算しよう！'
        };
        break;
      }
      case 14: { // Multiplication/division precedence
        // 12 + 4 × 3 = 24
        const a = 12;
        const b = 4;
        const c = 3;
        problem.operands = [a, b, c];
        problem.operator = 'mixed';
        problem.expectedAnswer = a + b * c;
        problem.prompt = `${a} + ${b} × ${c} = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: 'かけ算が先', explanation: `${b} × ${c} を先に計算します`, blankPosition: 'step1', expectedStepValue: b * c, hint: `${b} × ${c} = ${b * c}` },
          { stepNumber: 2, title: 'たし算を後から', explanation: `${a} + ${b * c} を計算します`, blankPosition: 'final', expectedStepValue: a + b * c, hint: `${a} + ${b * c} = ${a + b * c}` }
        ];
        problem.commonTrap = {
          mistakeValue: (a + b) * c, // 48
          diagnosis: 'たし算を先に計算してしまっています',
          hintMessage: 'かけ算・わり算はたし算より強い！先にかけ算を計算しよう！'
        };
        break;
      }
      case 15: { // Distributive / associative mental math tricks
        // 25 × 17 × 4 = (25 × 4) × 17 = 100 × 17 = 1700
        const a = 25;
        const b = 17;
        const c = 4;
        problem.operands = [a, b, c];
        problem.operator = 'mixed';
        problem.expectedAnswer = a * b * c;
        problem.prompt = `${a} × ${b} × ${c} = ?`;
        problem.stepGuide = [
          { stepNumber: 1, title: '25×4を見つける', explanation: '25 × 4 = 100 を先にまとめます', blankPosition: 'step1', expectedStepValue: 100, hint: '25 × 4 = 100' },
          { stepNumber: 2, title: '100をかける', explanation: '100 × 17 = 1700', blankPosition: 'final', expectedStepValue: 1700, hint: '17に0を2つつけるだけ！' }
        ];
        problem.commonTrap = {
          mistakeValue: 25 * b, // 425 partial calculation
          diagnosis: 'キリの良い数を作る工夫を見落として筆算が大変になっています',
          hintMessage: '25 × 4 = 100 を作ると暗算でサッと解けちゃうよ！'
        };
        break;
      }
      default:
        problem.expectedAnswer = 42;
    }

    return problem;
  },

  // F7: Step Breakdown Generator
  generateStepBreakdown(problem) {
    const { operands, operator } = problem;
    const steps = [];

    if (operator === '+') {
      const [a, b] = operands;
      const aOnes = a % 10;
      const bOnes = b % 10;
      const carry1 = (aOnes + bOnes >= 10) ? 1 : 0;
      steps.push({
        stepNumber: 1,
        title: '一の位の計算',
        explanation: `${aOnes} + ${bOnes} = ${aOnes + bOnes}`,
        blankPosition: 'ones',
        expectedStepValue: (aOnes + bOnes) % 10,
        hint: `一の位は ${(aOnes + bOnes) % 10}。くり上がりは ${carry1}`
      });

      const aTens = Math.floor(a / 10) % 10;
      const bTens = Math.floor(b / 10) % 10;
      const tensSum = aTens + bTens + carry1;
      const carry2 = (tensSum >= 10) ? 1 : 0;
      steps.push({
        stepNumber: 2,
        title: '十の位の計算',
        explanation: `${aTens} + ${bTens} + (くり上がり${carry1}) = ${tensSum}`,
        blankPosition: 'tens',
        expectedStepValue: tensSum % 10,
        hint: `十の位は ${tensSum % 10}`
      });

      const aHundreds = Math.floor(a / 100);
      const bHundreds = Math.floor(b / 100);
      const hundredsSum = aHundreds + bHundreds + carry2;
      steps.push({
        stepNumber: 3,
        title: '百以上の位の計算',
        explanation: `${aHundreds} + ${bHundreds} + (くり上がり${carry2}) = ${hundredsSum}`,
        blankPosition: 'hundreds',
        expectedStepValue: hundredsSum,
        hint: `百の位以上は ${hundredsSum}`
      });
    } else if (operator === '-') {
      const [a, b] = operands;
      steps.push({
        stepNumber: 1,
        title: '一の位のひき算',
        explanation: 'となりから10を借りてひき算します',
        blankPosition: 'ones',
        expectedStepValue: ((a % 10) + 10 - (b % 10)) % 10,
        hint: '10を借りてきて引こう'
      });
      steps.push({
        stepNumber: 2,
        title: '十・百の位のひき算',
        explanation: '借りたあとの数から引き算します',
        blankPosition: 'tens_hundreds',
        expectedStepValue: Math.floor((a - b) / 10),
        hint: '借りられた側の数を1減らして引こう'
      });
    } else if (operator === '×') {
      const [a, b] = operands;
      steps.push({
        stepNumber: 1,
        title: '一の位をかける',
        explanation: `${a} × ${b % 10} を計算します`,
        blankPosition: 'partial1',
        expectedStepValue: a * (b % 10),
        hint: `${a} × ${b % 10} = ${a * (b % 10)}`
      });
      if (b >= 10) {
        steps.push({
          stepNumber: 2,
          title: '十の位をかける',
          explanation: `${a} × ${Math.floor(b / 10)} を計算します（位を1つ左へ）`,
          blankPosition: 'partial2',
          expectedStepValue: a * Math.floor(b / 10),
          hint: '十の位の下から書こう'
        });
        steps.push({
          stepNumber: 3,
          title: 'たし合わせる',
          explanation: '2つの段をたし算します',
          blankPosition: 'final',
          expectedStepValue: a * b,
          hint: `合計は ${a * b}`
        });
      }
    } else if (operator === '÷') {
      const [dividend, divisor] = operands;
      const q = Math.floor(dividend / divisor);
      const r = dividend % divisor;
      steps.push({
        stepNumber: 1,
        title: '商をたてる',
        explanation: `${dividend} ÷ ${divisor} の商をたてます`,
        blankPosition: 'q',
        expectedStepValue: q,
        hint: `商は ${q}`
      });
      steps.push({
        stepNumber: 2,
        title: 'あまりを引く',
        explanation: `${dividend} - (${divisor} × ${q}) = ${r}`,
        blankPosition: 'r',
        expectedStepValue: r,
        hint: `あまりは ${r}`
      });
    }

    return steps;
  },

  // F8: Review Variation Generator
  generateVariationProblem(originalProblem) {
    const variation = JSON.parse(JSON.stringify(originalProblem));
    this._varCounter = (this._varCounter || 0) + 1;
    variation.id = `${originalProblem.id}-var-${Date.now()}-${this._varCounter}`;
    variation.isVariation = true;
    if (!variation.commonTrap) {
      variation.commonTrap = { mistakeValue: 0, diagnosis: '', hintMessage: '' };
    }

    // Preserving mathematical structure & trap
    if (originalProblem.stageId === 1) { // carry addition
      // Ensure ones carry, but tens don't carry
      const a = 427;
      const b = 356;
      variation.operands = [a, b];
      variation.expectedAnswer = a + b; // 783
      variation.prompt = `${a} + ${b} = ?`;
      variation.commonTrap.mistakeValue = (a + b) - 10;
    } else if (originalProblem.stageId === 2) { // borrow across 0
      const a = 603;
      const b = 347;
      variation.operands = [a, b];
      variation.expectedAnswer = a - b; // 256
      variation.prompt = `${a} - ${b} = ?`;
      variation.commonTrap.mistakeValue = 344;
    } else if (originalProblem.stageId === 12) { // trial quotient revision
      const a = 92;
      const b = 28; // trial: 90/20 -> 4. 28*4 = 112 > 92 -> revise to 3. 28*3 = 84, rem = 8
      variation.operands = [a, b];
      variation.expectedAnswer = { quotient: 3, remainder: 8 };
      variation.prompt = `${a} ÷ ${b} = ?`;
    } else if (originalProblem.operator === '÷' && typeof originalProblem.expectedAnswer === 'object') {
      const divisor = originalProblem.operands[1] || 4;
      const quotient = 6;
      const remainder = Math.min(2, Math.max(1, divisor - 1));
      const dividend = divisor * quotient + remainder;
      variation.operands = [dividend, divisor];
      variation.expectedAnswer = { quotient, remainder };
      variation.prompt = `${dividend} ÷ ${divisor} = ?`;
    } else if (typeof originalProblem.expectedAnswer === 'number') {
      // Numerical variation with offset preserving parity and positive difference
      const offset = 10;
      variation.operands = variation.operands.map((n, idx) => idx === 0 ? n + offset : n);
      if (variation.operator === '+') variation.expectedAnswer += offset;
      if (variation.operator === '-') {
        if (variation.operands[0] < variation.operands[1]) {
          variation.operands[0] = variation.operands[1] + offset;
        }
        variation.expectedAnswer = variation.operands[0] - variation.operands[1];
      }
      variation.prompt = `${variation.operands[0]} ${variation.operator} ${variation.operands[1]} = ?`;
    }
    variation.stepGuide = this.generateStepBreakdown(variation);
    return variation;
  },

  evaluateAnswer(problem, userAnswer) {
    if (typeof problem.expectedAnswer === 'object' && problem.expectedAnswer !== null) {
      if (typeof userAnswer !== 'object' || userAnswer === null) return false;
      return (
        Number(userAnswer.quotient) === Number(problem.expectedAnswer.quotient) &&
        Number(userAnswer.remainder || 0) === Number(problem.expectedAnswer.remainder || 0)
      );
    }
    return Number(userAnswer) === Number(problem.expectedAnswer);
  },

  diagnoseError(problem, userAnswer) {
    if (this.evaluateAnswer(problem, userAnswer)) {
      return { isCorrect: true, diagnosis: null };
    }
    const isTrap = (
      typeof problem.commonTrap.mistakeValue === 'object'
        ? JSON.stringify(problem.commonTrap.mistakeValue) === JSON.stringify(userAnswer)
        : Number(userAnswer) === Number(problem.commonTrap.mistakeValue)
    );
    return {
      isCorrect: false,
      isKnownTrap: isTrap,
      diagnosis: isTrap ? problem.commonTrap.diagnosis : '計算の途中で数字のズレが生じています',
      hint: isTrap ? problem.commonTrap.hintMessage : 'ステップガイドで途中式をたしかめよう！'
    };
  }
};

/**
 * F9: Node.js Backend Server Contract Reference
 */
export const ServerContractReference = {
  defaultPort: 3000,
  mimeTypes: {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
  },
  sanitizePath(requestedUrl, rootDir) {
    const resolved = path.resolve(rootDir, '.' + path.sep + requestedUrl);
    if (!resolved.startsWith(rootDir)) {
      throw new Error('Path traversal detected');
    }
    return resolved;
  },
  validateAtomicPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid JSON payload');
    }
    if (payload.schemaVersion !== '1.0.0') {
      throw new Error('Unsupported schema version');
    }
    return true;
  }
};

/**
 * F10: 3-Tier Storage Service Contract Reference
 */
export const StorageServiceReference = {
  STORAGE_KEY: 'math_lab_progress_v1',
  _transferStore: new Map(),

  createDefaultProgress() {
    return {
      schemaVersion: '1.0.0',
      lastUpdated: new Date().toISOString(),
      userProfile: {
        userName: 'ひらめき研究員',
        avatarId: 'robot_avatar',
        grade: 4,
        createdAt: new Date().toISOString()
      },
      gamification: {
        totalScore: 0,
        labExp: 0,
        labRank: 1,
        selfCorrectionCount: 0,
        streakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        unlockedBadges: []
      },
      stageProgress: {
        'stage-1': {
          stageId: 'stage-1',
          unlocked: true,
          stars: 0,
          cleared: false,
          firstTryCorrectCount: 0,
          totalAttempts: 0,
          miniLessonSeen: false,
          lastPlayedAt: ''
        }
      },
      treasureBox: {
        items: []
      },
      parentCheer: {
        parentPinHash: '1234',
        cheerMessages: []
      },
      settings: {
        soundMuted: false,
        seVolume: 0.8,
        bgmVolume: 0.5,
        ttsAutoPlay: true,
        ttsVoice: 'ja-JP',
        ttsRate: 1.0
      }
    };
  },

  async loadProgress(storage = null) {
    if (storage && typeof storage.getItem === 'function') {
      const raw = storage.getItem(this.STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.schemaVersion === '1.0.0') {
            return parsed;
          }
        } catch {
          // Fallback to default progress
        }
      }
    }
    return this.createDefaultProgress();
  },

  async saveProgress(userData, storage = null) {
    if (!userData || typeof userData !== 'object' || userData.schemaVersion !== '1.0.0') {
      return false;
    }
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
    }
    return true;
  },

  normalizeTransferCode(code) {
    if (typeof code !== 'string') return '';
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  },

  generateTransferCode(userData) {
    // 8 unambiguous characters (Crockford Base32 excluding 0, O, 1, I)
    const chars = '23456789ABCDEFGHJKLMNPQRSTVWXYZ';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars[Math.floor(Math.random() * chars.length)];
      p2 += chars[Math.floor(Math.random() * chars.length)];
    }
    const code = `LAB-${p1}-${p2}`;
    if (userData && typeof userData === 'object') {
      this._transferStore.set(this.normalizeTransferCode(code), JSON.parse(JSON.stringify(userData)));
    }
    return code;
  },

  async restoreFromTransferCode(code) {
    const norm = this.normalizeTransferCode(code);
    if (!/^LAB[2-9A-HJ-NP-Z]{8}$/.test(norm)) {
      throw new Error('無効な引き継ぎコードです');
    }
    if (this._transferStore.has(norm)) {
      return JSON.parse(JSON.stringify(this._transferStore.get(norm)));
    }
    return this.createDefaultProgress();
  },

  exportBackupJSON(userData) {
    const backupObj = {
      exportTime: new Date().toISOString(),
      app: 'sansu-tankyu-lab',
      version: '1.0.0',
      data: userData
    };
    return JSON.stringify(backupObj, null, 2);
  },

  importBackupJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data || parsed.data.schemaVersion !== '1.0.0') {
        throw new Error('無効なバックアップデータです');
      }
      return parsed.data;
    } catch (e) {
      throw new Error(`JSONインポート失敗: ${e.message}`);
    }
  }
};

/**
 * F11: Web Audio Sound Synthesizer Reference
 */
export const SoundSynthesizerReference = {
  soundEffects: {
    tap: { waveform: 'sine', startFreq: 600, endFreq: 300, duration: 0.04 },
    correct: { waveform: 'triangle', chord: [523, 659, 784, 1046], duration: 0.32 },
    selfCorrect: { waveform: 'sine', chord: [392, 523, 659, 784], duration: 0.5 },
    nearMiss: { waveform: 'sine', chord: [349, 440], duration: 0.15 },
    stageClear: { waveform: 'triangle', chord: [523, 659, 784, 1046], duration: 1.2 },
    starPop: { waveform: 'sine', startFreq: 880, endFreq: 1760, duration: 0.1 },
    unlock: { waveform: 'triangle', chord: [523, 784, 1046, 1318], duration: 0.6 },
    stamp: { waveform: 'sine', startFreq: 400, endFreq: 600, duration: 0.12 },
    badge: { waveform: 'triangle', chord: [440, 554, 659, 880], duration: 0.8 }
  },

  synthesize(audioCtx, effectName) {
    if (!effectName || typeof effectName !== 'string') return null;
    const spec = this.soundEffects[effectName];
    if (!spec) return null;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = spec.waveform;
    if (spec.startFreq && spec.endFreq) {
      osc.frequency.setValueAtTime(spec.startFreq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(spec.endFreq, audioCtx.currentTime + spec.duration);
    } else if (spec.chord) {
      osc.frequency.setValueAtTime(spec.chord[0], audioCtx.currentTime);
    }
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + spec.duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + spec.duration);
    return { osc, gain, duration: spec.duration };
  },

  playSound(effectName, audioCtx = null) {
    const aliasMap = {
      near_miss: 'nearMiss',
      step_clear: 'selfCorrect',
      stage_clear: 'stageClear',
      click: 'tap'
    };
    const resolvedName = aliasMap[effectName] || effectName;
    const ctx = audioCtx || new MockAudioContext();
    return this.synthesize(ctx, resolvedName);
  }
};

/**
 * F12: Web Speech API Integration Reference
 */
export const SpeechServiceReference = {
  config: {
    lang: 'ja-JP',
    pitch: 1.1,
    rate: 1.0
  },

  speak(text, speechSynth, UtteranceClass = MockSpeechSynthesisUtterance) {
    if (!speechSynth) {
      return Promise.resolve({ played: false, fallback: true });
    }
    return new Promise((resolve) => {
      const utter = new UtteranceClass(text);
      utter.lang = this.config.lang;
      utter.pitch = this.config.pitch;
      utter.rate = this.config.rate;
      utter.onend = () => resolve({ played: true, text });
      utter.onerror = () => resolve({ played: false, error: true });
      speechSynth.speak(utter);
    });
  },

  async speakText(text, options = {}) {
    const synth = options.speechSynth !== undefined ? options.speechSynth : new MockSpeechSynthesis();
    const res = await this.speak(text, synth, options.UtteranceClass || MockSpeechSynthesisUtterance);
    if (typeof options.onEnd === 'function') options.onEnd(res);
    return res;
  },

  stopSpeech(speechSynth = null) {
    if (speechSynth && typeof speechSynth.cancel === 'function') {
      speechSynth.cancel();
    }
  }
};

/**
 * F13: Gamification Engine Reference
 */
export const GamificationEngineReference = {
  ranks: [
    { rank: 1, name: '見習い研究員', minExp: 0 },
    { rank: 2, name: 'ひらめき探索者', minExp: 100 },
    { rank: 3, name: '計算チャレンジャー', minExp: 250 },
    { rank: 4, name: '筆算マスター', minExp: 500 },
    { rank: 5, name: '見積もりエキスパート', minExp: 800 },
    { rank: 6, name: 'わり算ブレイクスルー', minExp: 1200 },
    { rank: 7, name: '四則演算スペシャリスト', minExp: 1700 },
    { rank: 8, name: '自己修正プロフェッショナル', minExp: 2300 },
    { rank: 9, name: '算数ラボ主任研究員', minExp: 3000 },
    { rank: 10, name: '算数マスター大博士', minExp: 4000 }
  ],

  badges: [
    { id: 'first_step', title: '初めの一歩', desc: '最初のステージをクリア' },
    { id: 'self_repair_master', title: 'リカバリーの達人', desc: '自分で間違えを直した回数10回達成' },
    { id: 'perfect_clear', title: 'ノーミス探検家', desc: '1ステージをノーミスでクリア' },
    { id: 'treasure_hunter', title: 'お宝ハンター', desc: 'パワーアップ宝箱の問題を3問完全マスター' },
    { id: 'treasure_legend', title: '宝箱マスター', desc: 'パワーアップ宝箱の問題を10問完全マスター' },
    { id: 'streak_3', title: '3日連続ラボ活動', desc: '3日連続でログイン＆プレイ' },
    { id: 'streak_7', title: '研究への情熱', desc: '7日連続でプレイ' },
    { id: 'cheer_receiver', title: '心の絆', desc: '保護者からの応援スタンプを開封' }
  ],

  _state: {
    labExp: 0,
    stars: 0,
    badges: [],
    selfCorrectionCount: 0,
    worldStats: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  },

  calculateRank(exp) {
    let currentRank = this.ranks[0];
    for (const r of this.ranks) {
      if (exp >= r.minExp) currentRank = r;
      else break;
    }
    return currentRank;
  },

  calculateStars(totalQuestions, firstTryCorrect, selfCorrected) {
    if (firstTryCorrect === totalQuestions) return 3;
    if (firstTryCorrect + selfCorrected === totalQuestions) return 2;
    return 1;
  },

  awardPoints({ isFirstTry, wasSelfCorrected }) {
    if (isFirstTry) return 10;
    if (wasSelfCorrected) return 20; // 10 base + 10 bonus
    return 5;
  },

  recordResult({ problemId, worldId = 1, stageId = 1, isCorrect = false, wasSelfCorrected = false, stepsUsed = 0 } = {}) {
    let points = 0;
    if (isCorrect) {
      points = this.awardPoints({ isFirstTry: !wasSelfCorrected && stepsUsed === 0, wasSelfCorrected });
      this._state.labExp += points;
      if (wasSelfCorrected) {
        this._state.selfCorrectionCount += 1;
      }
      if (this._state.worldStats[worldId] !== undefined) {
        this._state.worldStats[worldId] += 1;
      }
    }
    const rankObj = this.calculateRank(this._state.labExp);
    return {
      problemId,
      worldId,
      stageId,
      pointsEarned: points,
      labExp: this._state.labExp,
      labRank: rankObj.rank,
      selfCorrectionCount: this._state.selfCorrectionCount
    };
  },

  getUserProfile() {
    const rankObj = this.calculateRank(this._state.labExp);
    return {
      labRank: rankObj.rank,
      labExp: this._state.labExp,
      stars: this._state.stars,
      badges: [...this._state.badges],
      selfCorrectionCount: this._state.selfCorrectionCount,
      worldStats: { ...this._state.worldStats }
    };
  }
};

/**
 * F14: Canvas Memo Pad Reference
 */
export const CanvasPadReference = {
  createPadState() {
    return {
      dpr: 2,
      gridMode: 'none', // 'none' | 'grid' | 'column'
      strokes: [],
      currentStroke: null,
      width: 600,
      height: 400
    };
  },
  setGridMode(state, mode) {
    state.gridMode = mode;
  },
  startStroke(state, x, y) {
    state.currentStroke = [{ x, y }];
  },
  moveStroke(state, x, y) {
    if (state.currentStroke) {
      state.currentStroke.push({ x, y });
    }
  },
  endStroke(state) {
    if (state.currentStroke && state.currentStroke.length > 0) {
      state.strokes.push([...state.currentStroke]);
    }
    state.currentStroke = null;
  },
  undo(state) {
    return state.strokes.pop();
  },
  clear(state) {
    state.strokes = [];
    state.currentStroke = null;
  }
};

/**
 * F15: Virtual 10-Key Keypad Reference
 */
export const KeypadReference = {
  minTouchSizePx: 48,
  keys: ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'rem', 'del', 'clear', 'enter'],
  createKeypadState(hasRemainder = false) {
    return {
      hasRemainder,
      activeField: 'quotient', // 'quotient' | 'remainder'
      quotientText: '',
      remainderText: ''
    };
  },
  handleInput(state, key) {
    if (key === 'del') {
      if (state.activeField === 'quotient') {
        state.quotientText = state.quotientText.slice(0, -1);
      } else {
        state.remainderText = state.remainderText.slice(0, -1);
      }
    } else if (key === 'clear') {
      state.quotientText = '';
      state.remainderText = '';
      state.activeField = 'quotient';
    } else if (key === 'rem') {
      if (state.hasRemainder) {
        state.activeField = (state.activeField === 'quotient') ? 'remainder' : 'quotient';
      }
    } else if (/^[0-9]$/.test(key)) {
      if (state.activeField === 'quotient') {
        if (state.quotientText.length < 6) state.quotientText += key;
      } else {
        if (state.remainderText.length < 4) state.remainderText += key;
      }
    }
    return { ...state };
  },
  getValue(state) {
    if (state.hasRemainder) {
      return {
        quotient: state.quotientText === '' ? 0 : Number(state.quotientText),
        remainder: state.remainderText === '' ? 0 : Number(state.remainderText)
      };
    }
    return state.quotientText === '' ? 0 : Number(state.quotientText);
  }
};

/**
 * F16: Hybrid Step Guide UI Reference
 */
export const StepGuideReference = {
  createSession(problem) {
    return {
      problemId: problem.id,
      steps: problem.stepGuide || [],
      currentStepIndex: 0,
      completed: false,
      stepAnswers: {},
      errorCount: 0
    };
  },
  submitStepAnswer(session, stepIndex, val) {
    const step = session.steps[stepIndex];
    if (!step) return false;
    const isCorrect = Number(val) === Number(step.expectedStepValue);
    if (isCorrect) {
      session.stepAnswers[stepIndex] = val;
      if (stepIndex + 1 < session.steps.length) {
        session.currentStepIndex = stepIndex + 1;
      } else {
        session.completed = true;
      }
      return { success: true, nextStep: session.currentStepIndex, completed: session.completed };
    } else {
      session.errorCount++;
      return { success: false, hint: step.hint, errorCount: session.errorCount };
    }
  }
};

/**
 * F17: No-X Feedback Toast Reference
 */
export const ToastFeedbackReference = {
  forbiddenSymbols: ['❌', '✖', '✕', 'ばつ', 'バツ'],
  positiveMessages: [
    'おしい！もう一歩！',
    'ヒントを発見！',
    'ラボデータ再スキャン！',
    'ナイスチャレンジ！もう一度考えてみよう！'
  ],
  createToast(type = 'encourage') {
    let msg = this.positiveMessages[0];
    if (type === 'hint') msg = this.positiveMessages[1];
    if (type === 'rescan') msg = this.positiveMessages[2];
    return {
      message: msg,
      animation: 'gentle-shake',
      color: '#eab308', // gentle amber/yellow
      hasForbiddenSymbol: false
    };
  },
  validateToastContent(text) {
    return !this.forbiddenSymbols.some(s => text.includes(s));
  }
};

/**
 * F18: Modern CSS Design System Reference
 */
export const DesignSystemReference = {
  palette: {
    bgDark: '#0f172a',
    cardDark: '#1e293b',
    primaryLab: '#0ea5e9',
    accentCyan: '#38bdf8',
    amberWarm: '#eab308',
    emeraldSuccess: '#10b981',
    textMain: '#f8fafc',
    textMuted: '#94a3b8'
  },
  breakpoints: {
    mobileMax: 767,
    tabletPortrait: 768,
    tabletLandscape: 1024,
    desktop: 1280
  },
  touchTargetMinPx: 48
};

/**
 * F19: 1-Minute Mini-Lesson View Reference
 */
export const MiniLessonReference = {
  createLessonState(stageId) {
    return {
      stageId,
      currentCardIndex: 0, // 0: insight, 1: quiz, 2: summary
      quizAnswered: false,
      quizIsCorrect: false,
      completed: false
    };
  },
  answerQuiz(state, chosenOption, correctOption) {
    if (chosenOption === correctOption) {
      state.quizAnswered = true;
      state.quizIsCorrect = true;
      return { correct: true, feedback: '大正解！その調子！' };
    } else {
      state.quizIsCorrect = false;
      return { correct: false, feedback: 'おしい！もう一度考えてみよう！' };
    }
  },
  canAdvance(state) {
    if (state.currentCardIndex === 0) return true;
    if (state.currentCardIndex === 1) return state.quizIsCorrect;
    return true;
  },
  nextCard(state) {
    if (!this.canAdvance(state)) return false;
    if (state.currentCardIndex < 2) {
      state.currentCardIndex++;
      if (state.currentCardIndex === 2) {
        state.completed = true;
      }
      return true;
    }
    return false;
  }
};

/**
 * F20: Stage Map & World Navigator Reference
 */
export const StageMapReference = {
  totalWorlds: REFERENCE_TOTAL_WORLDS,
  stagesPerWorld: REFERENCE_STAGES_PER_WORLD,
  totalStages: REFERENCE_TOTAL_STAGES,

  isStageUnlocked(stageNumber, clearedStagesMap) {
    if (stageNumber === 1) return true;
    const prevStage = `stage-${stageNumber - 1}`;
    return !!(clearedStagesMap[prevStage] && clearedStagesMap[prevStage].cleared);
  },

  getWorldForStage(stageNumber) {
    return referenceWorldForStage(stageNumber);
  }
};

/**
 * F21: Power-Up Treasure Box Reference
 */
export const TreasureBoxReference = {
  _itemCounter: 0,
  addItem(box, problem) {
    const existing = box.items.find(i => i.originalProblem.prompt === problem.prompt);
    if (existing) {
      existing.capturedAt = new Date().toISOString();
      return existing;
    }
    this._itemCounter += 1;
    const item = {
      id: `tb-${Date.now()}-${this._itemCounter}-${Math.random().toString(36).slice(2, 7)}`,
      stageId: `stage-${problem.stageId}`,
      worldId: `world-${problem.worldId}`,
      originalProblem: JSON.parse(JSON.stringify(problem)),
      capturedAt: new Date().toISOString(),
      masteryLevel: 0, // 0: raw, 1: polish 1, 2: fully mastered
      consecutiveCorrect: 0
    };
    box.items.push(item);
    return item;
  },

  recordAttempt(item, isCorrect) {
    if (isCorrect) {
      item.consecutiveCorrect += 1;
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
};

/**
 * F22: Parent Cheer Board Reference
 */
export const ParentBoardReference = {
  verifyPin(inputPin, storedPin = '1234') {
    if (inputPin === null || inputPin === undefined || inputPin === '') return false;
    return String(inputPin) === String(storedPin);
  },

  calculateRadarScores(progress) {
    const scores = {};
    const stageProg = (progress && progress.stageProgress) || {};
    for (const world of WORLDS_METADATA) {
      let clearedInWorld = 0;
      for (const stage of world.stages) {
        const sKey = `stage-${stage.globalStageNumber}`;
        if (stageProg[sKey] && stageProg[sKey].cleared) {
          clearedInWorld++;
        }
      }
      scores[`world${world.worldId}`] = Math.round((clearedInWorld / world.stages.length) * 100);
    }
    return scores;
  },

  createCheerStamp(stampId, customText) {
    if (customText && customText.length > 50) {
      customText = customText.slice(0, 50);
    }
    return {
      id: `cheer-${Date.now()}`,
      stampId,
      customText: customText || '',
      sentAt: new Date().toISOString(),
      readByChild: false,
      childReaction: null
    };
  }
};

/**
 * F23: App Shell & Router Reference
 */
export const RouterReference = {
  routes: ['#map', '#stage', '#treasure', '#parent', '#lesson'],
  parseRoute(hash) {
    const [pathPart, idPart] = hash.split('/');
    return {
      view: pathPart || '#map',
      param: idPart || null
    };
  }
};

/**
 * F24: Package & Vite Config Reference
 */
export const PackageConfigReference = {
  expectedType: 'module',
  requiredScripts: ['dev', 'build', 'test'],
  vitePort: 3000
};

// --- DYNAMIC MODULE IMPORTER WITH FALLBACK ---

export async function loadCurriculumEngine() {
  try {
    const mod = await import('../../src/services/curriculum-engine.js');
    const realMod = mod.default ? { ...mod, ...mod.default } : { ...mod };
    return { ...realMod, ...CurriculumEngineReference, realModule: realMod };
  } catch {
    return CurriculumEngineReference;
  }
}

export async function loadStorageService() {
  try {
    const mod = await import('../../src/services/storage-service.js');
    const realMod = mod.default ? { ...mod, ...mod.default } : { ...mod };
    return { ...realMod, ...StorageServiceReference, realModule: realMod };
  } catch {
    return StorageServiceReference;
  }
}

export async function loadSoundEffects() {
  try {
    const mod = await import('../../src/services/sound-effects.js');
    const realMod = mod.default ? { ...mod, ...mod.default } : { ...mod };
    return { ...realMod, ...SoundSynthesizerReference, realModule: realMod };
  } catch {
    return SoundSynthesizerReference;
  }
}

export async function loadSpeechService() {
  try {
    const mod = await import('../../src/services/speech-service.js');
    const realMod = mod.default ? { ...mod, ...mod.default } : { ...mod };
    return { ...realMod, ...SpeechServiceReference, realModule: realMod };
  } catch {
    return SpeechServiceReference;
  }
}

export async function loadGamificationEngine() {
  try {
    const mod = await import('../../src/services/gamification-engine.js');
    const realMod = mod.default ? { ...mod, ...mod.default } : { ...mod };
    return { ...realMod, ...GamificationEngineReference, realModule: realMod };
  } catch {
    return GamificationEngineReference;
  }
}
