/**
 * Web Audio API Procedural Sound Synthesizer
 * 算数探検ラボ (Smart Math Discovery Lab) - Zero external MP3 dependencies
 */

export const SOUND_PRESETS = {
  correct: {
    effect: 'correct',
    aliases: ['playCorrect'],
    waveform: 'triangle',
    harmonicWaveform: 'sine',
    notes: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6
    noteDuration: 0.08,
    duration: 0.36,
    gain: 0.25,
    description: '明るく爽快な正解チャイム (C5-E5-G5-C6 アルペジオ)'
  },
  near_miss: {
    effect: 'near_miss',
    aliases: ['try_again', 'hint', 'playTryAgain'],
    waveform: 'sine',
    notes: [349.23, 440.00], // F4 -> A4 gentle ascending interval
    noteDuration: 0.08,
    duration: 0.16,
    gain: 0.20,
    description: 'バツを出さない優しい「おしい！もう一歩！」上昇トーン (F4->A4)'
  },
  step_clear: {
    effect: 'step_clear',
    aliases: ['self_correct', 'playSelfCorrect'],
    waveform: 'sine',
    harmonicWaveform: 'triangle',
    notes: [392.00, 523.25, 659.25, 783.99], // G4 -> C5 -> E5 -> G5
    noteDuration: 0.09,
    duration: 0.42,
    gain: 0.26,
    description: '「ナイス・リカバリー！自分で直せた！」自己修正ファンファーレ'
  },
  stage_clear: {
    effect: 'stage_clear',
    aliases: ['stageClear', 'playStageClear'],
    waveform: 'triangle',
    harmonicWaveform: 'sine',
    notes: [523.25, 698.46, 783.99, 1046.50], // C5 -> F5 -> G5 -> C6
    chords: [
      [523.25, 659.25, 783.99],         // C5 major
      [698.46, 880.00, 1046.50],        // F5 major
      [783.99, 987.77, 1174.66],        // G5 major
      [523.25, 659.25, 783.99, 1046.50] // C6 full tonic chord
    ],
    chordTimings: [
      { start: 0.0, duration: 0.22 },
      { start: 0.24, duration: 0.22 },
      { start: 0.48, duration: 0.24 },
      { start: 0.74, duration: 0.46 }
    ],
    duration: 1.20,
    gain: 0.24,
    description: 'ステージクリア祝賀ファンファーレ (C5->F5->G5->C6, 1.2秒)'
  },
  stamp: {
    effect: 'stamp',
    aliases: ['star_pop', 'playStarPop'],
    waveform: 'sine',
    notes: [880.00, 1760.00], // A5 -> A6 pitch sweep
    sweep: { startFreq: 880.00, endFreq: 1760.00 },
    duration: 0.10,
    gain: 0.22,
    description: '星獲得・応援スタンプのポコン音 (880Hz->1760Hz スイープ)'
  },
  badge: {
    effect: 'badge',
    aliases: ['unlock', 'playUnlock'],
    waveform: 'triangle',
    harmonicWaveform: 'sine',
    notes: [523.25, 783.99, 1046.50, 1318.51], // C5, G5, C6, E6
    noteDuration: 0.12,
    duration: 0.60,
    gain: 0.25,
    description: 'バッジ獲得・お宝解放のキラキラ分散和音 (C5-G5-C6-E6)'
  },
  click: {
    effect: 'click',
    aliases: ['tap', 'playTap'],
    waveform: 'sine',
    notes: [600.00, 300.00], // 600Hz -> 300Hz rapid decay
    sweep: { startFreq: 600.00, endFreq: 300.00 },
    duration: 0.04,
    gain: 0.18,
    description: '軽快なテンキータップ音 (600Hz->300Hz 0.04秒)'
  }
};

const ALIAS_TO_CANONICAL = new Map();
for (const [canonical, preset] of Object.entries(SOUND_PRESETS)) {
  ALIAS_TO_CANONICAL.set(canonical, canonical);
  ALIAS_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
  if (Array.isArray(preset.aliases)) {
    for (const alias of preset.aliases) {
      ALIAS_TO_CANONICAL.set(alias, canonical);
      ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
    }
  }
}

let mutedState = false;
let masterVolume = 0.8;
let sharedAudioContext = null;
let customAudioContextFactory = null;

/**
 * Resolve any sound effect name or alias to its canonical preset key.
 * @param {string} effectName
 * @returns {string|null}
 */
export function resolveEffectName(effectName) {
  if (!effectName || typeof effectName !== 'string') return null;
  const trimmed = effectName.trim();
  return ALIAS_TO_CANONICAL.get(trimmed) || ALIAS_TO_CANONICAL.get(trimmed.toLowerCase()) || null;
}

/**
 * Set mute state for sound synthesizer.
 * @param {boolean} muted
 * @returns {boolean}
 */
export function setMuted(muted) {
  mutedState = Boolean(muted);
  return mutedState;
}

/**
 * Check whether sound synthesizer is currently muted.
 * @returns {boolean}
 */
export function isMuted() {
  return mutedState;
}

/**
 * Toggle mute state and return the new state.
 * @returns {boolean}
 */
export function toggleMute() {
  mutedState = !mutedState;
  return mutedState;
}

/**
 * Set master volume (clamped between 0.0 and 1.0).
 * @param {number} vol
 * @returns {number}
 */
export function setVolume(vol) {
  const num = Number(vol);
  if (Number.isNaN(num)) return masterVolume;
  masterVolume = Math.max(0.0, Math.min(1.0, num));
  return masterVolume;
}

/**
 * Get current master volume (0.0 to 1.0).
 * @returns {number}
 */
export function getVolume() {
  return masterVolume;
}

/**
 * Inject a custom AudioContext factory (for deterministic testing or custom audio routing).
 * @param {Function|null} fn
 */
export function setAudioContextFactory(fn) {
  customAudioContextFactory = typeof fn === 'function' ? fn : null;
  sharedAudioContext = null;
}

/**
 * Reset audio engine state to defaults.
 */
export function resetAudioEngine() {
  mutedState = false;
  masterVolume = 0.8;
  sharedAudioContext = null;
  customAudioContextFactory = null;
}

/**
 * Obtain or lazily initialize the Web Audio API AudioContext.
 * Returns null if running in a headless/Node environment without AudioContext.
 * @returns {AudioContext|null}
 */
function getOrCreateAudioContext() {
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    return sharedAudioContext;
  }

  if (customAudioContextFactory) {
    try {
      sharedAudioContext = customAudioContextFactory();
      return sharedAudioContext || null;
    } catch {
      return null;
    }
  }

  const g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  const AudioCtx = g.AudioContext || g.webkitAudioContext;
  if (typeof AudioCtx !== 'function') {
    return null;
  }

  try {
    sharedAudioContext = new AudioCtx();
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Schedule an oscillator with a soft attack and exponential/linear release envelope.
 */
function scheduleTone(ctx, {
  freq,
  endFreq = null,
  waveform = 'sine',
  startTime,
  duration,
  peakGain
}) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = waveform;
  if (osc.frequency && typeof osc.frequency.setValueAtTime === 'function') {
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== null && endFreq !== freq) {
      if (typeof osc.frequency.exponentialRampToValueAtTime === 'function' && endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
      } else if (typeof osc.frequency.linearRampToValueAtTime === 'function') {
        osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
      }
    }
  } else {
    osc.frequency = freq;
  }

  const attackTime = Math.min(0.012, duration * 0.25);
  const safePeak = Math.max(0.0001, peakGain);
  if (gainNode.gain && typeof gainNode.gain.setValueAtTime === 'function') {
    gainNode.gain.setValueAtTime(0.0001, startTime);
    if (typeof gainNode.gain.linearRampToValueAtTime === 'function') {
      gainNode.gain.linearRampToValueAtTime(safePeak, startTime + attackTime);
    }
    if (typeof gainNode.gain.exponentialRampToValueAtTime === 'function') {
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    } else if (typeof gainNode.gain.linearRampToValueAtTime === 'function') {
      gainNode.gain.linearRampToValueAtTime(0.0001, startTime + duration);
    }
  }

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);

  return { osc, gainNode };
}

/**
 * Synthesize and play a procedural sound effect via Web Audio API.
 * Safe in headless/Node environments without AudioContext.
 *
 * @param {string} effectName - 'correct' | 'near_miss' | 'step_clear' | 'stage_clear' | 'stamp' | 'badge' | 'click' (or alias)
 * @param {object} [options={}] - Optional overrides ({ volume })
 * @returns {{ played: boolean, effect: string, reason?: string, notes: number[], waveform: string, duration: number, scheduledCount?: number }}
 */
export function playSound(effectName, options = {}) {
  const canonical = resolveEffectName(effectName);
  if (!canonical) {
    return {
      played: false,
      effect: String(effectName || 'unknown'),
      reason: 'unknown_effect',
      notes: [],
      waveform: 'none',
      duration: 0
    };
  }

  const preset = SOUND_PRESETS[canonical];
  const effectiveVolume = options.volume !== undefined
    ? Math.max(0.0, Math.min(1.0, Number(options.volume)))
    : masterVolume;

  if (mutedState || effectiveVolume <= 0) {
    return {
      played: false,
      effect: canonical,
      reason: mutedState ? 'muted' : 'zero_volume',
      notes: [...preset.notes],
      waveform: preset.waveform,
      duration: preset.duration
    };
  }

  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    return {
      played: false,
      effect: canonical,
      reason: 'no_audio_context',
      notes: [...preset.notes],
      waveform: preset.waveform,
      duration: preset.duration
    };
  }

  try {
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      const resumeResult = ctx.resume();
      if (resumeResult && typeof resumeResult.catch === 'function') {
        resumeResult.catch(() => {});
      }
    }

    const now = typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
    const baseGain = preset.gain * effectiveVolume;
    let scheduledCount = 0;

    if (preset.sweep) {
      // Frequency sweep effect ('stamp' or 'click')
      scheduleTone(ctx, {
        freq: preset.sweep.startFreq,
        endFreq: preset.sweep.endFreq,
        waveform: preset.waveform,
        startTime: now,
        duration: preset.duration,
        peakGain: baseGain
      });
      scheduledCount += 1;
    } else if (preset.chords && preset.chordTimings) {
      // Multi-chord fanfare ('stage_clear')
      for (let i = 0; i < preset.chords.length; i++) {
        const chord = preset.chords[i];
        const timing = preset.chordTimings[i];
        const chordGain = baseGain / Math.sqrt(chord.length);
        for (const freq of chord) {
          scheduleTone(ctx, {
            freq,
            waveform: preset.waveform,
            startTime: now + timing.start,
            duration: timing.duration,
            peakGain: chordGain
          });
          scheduledCount += 1;
        }
      }
    } else {
      // Melodic arpeggio / interval ('correct', 'near_miss', 'step_clear', 'badge')
      const stepTime = preset.noteDuration || (preset.duration / preset.notes.length);
      for (let i = 0; i < preset.notes.length; i++) {
        const freq = preset.notes[i];
        const noteStart = now + i * stepTime;
        const isLast = i === preset.notes.length - 1;
        const noteDur = isLast ? Math.max(stepTime * 1.5, preset.duration - i * stepTime) : stepTime * 1.1;

        scheduleTone(ctx, {
          freq,
          waveform: preset.waveform,
          startTime: noteStart,
          duration: noteDur,
          peakGain: baseGain
        });
        scheduledCount += 1;

        if (preset.harmonicWaveform) {
          scheduleTone(ctx, {
            freq: freq * 2, // Octave shimmer harmonic
            waveform: preset.harmonicWaveform,
            startTime: noteStart,
            duration: noteDur * 0.85,
            peakGain: baseGain * 0.35
          });
          scheduledCount += 1;
        }
      }
    }

    return {
      played: true,
      effect: canonical,
      notes: [...preset.notes],
      waveform: preset.waveform,
      duration: preset.duration,
      scheduledCount
    };
  } catch {
    return {
      played: false,
      effect: canonical,
      reason: 'synthesis_error',
      notes: [...preset.notes],
      waveform: preset.waveform,
      duration: preset.duration
    };
  }
}

// Convenience helper functions matching survey_miner_2/analysis.md §3.3
export function playTap(options) {
  return playSound('click', options);
}

export function playCorrect(options) {
  return playSound('correct', options);
}

export function playSelfCorrect(options) {
  return playSound('step_clear', options);
}

export function playTryAgain(options) {
  return playSound('near_miss', options);
}

export function playStageClear(options) {
  return playSound('stage_clear', options);
}

export function playStarPop(options) {
  return playSound('stamp', options);
}

export function playUnlock(options) {
  return playSound('badge', options);
}

/**
 * Play a cute character chirp/voice effect using Web Audio API (safe in headless Node.js).
 * @param {string} [characterId='momonga']
 * @param {object} [options={}]
 */
export function playCuteVoice(characterId = 'momonga', options = {}) {
  if (mutedState) {
    return playSound('stamp', options);
  }
  const ctx = getOrCreateAudioContext();
  if (!ctx) {
    return playSound('stamp', options);
  }
  const effectiveVolume = options.volume !== undefined
    ? Math.max(0.0, Math.min(1.0, Number(options.volume)))
    : masterVolume;
  if (effectiveVolume <= 0) {
    return playSound('stamp', options);
  }

  // Distinct cute squeak/chirp pitch pairs per character
  const pitchMap = {
    momonga: [783.99, 1046.50, 1318.51],
    marupi: [659.25, 880.00, 1046.50],
    hachiwaren: [587.33, 783.99, 987.77],
    usapyon: [880.00, 1174.66, 1567.98],
    kuriman: [440.00, 523.25, 659.25],
    shisa: [698.46, 880.00, 1174.66],
    rakko: [523.25, 659.25, 783.99],
    kanichan: [739.99, 987.77, 1174.66]
  };
  const notes = pitchMap[characterId] || pitchMap.momonga;

  try {
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume()?.catch?.(() => {});
    }
    const now = typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
    const peakGain = 0.18 * effectiveVolume;
    notes.forEach((freq, idx) => {
      scheduleTone(ctx, {
        freq,
        endFreq: freq * 1.12,
        waveform: 'sine',
        startTime: now + idx * 0.065,
        duration: 0.08,
        peakGain
      });
    });
    return { played: true, effect: 'cute_voice', characterId, notes, waveform: 'sine', duration: 0.24 };
  } catch {
    return playSound('stamp', options);
  }
}
