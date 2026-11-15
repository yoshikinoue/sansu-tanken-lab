/**
 * src/components/cute-characters.js
 * 算数探検ラボ - ちいかわ風かわいいキャラクター＆おともだち図鑑 (CuteCharacters)
 *
 * Dual capability:
 * 1. Pure character definitions, quotes, and self-contained SVG renderers (headless compatible)
 * 2. Interactive MascotCompanionWidget (Problem Arena) & CharacterBookModal (おともだち図鑑)
 */

import * as SoundEffects from '../services/sound-effects.js';

export const DEFAULT_CHARACTER_ID = 'momonga';
export const INITIAL_UNLOCKED_CHARACTERS = ['momonga', 'marupi', 'hachiwaren'];

export const CUTE_CHARACTERS = [
  {
    id: 'momonga',
    name: 'ももんちゃん',
    role: 'ふわふわしっぽの推し相棒',
    personality: '「ほめろ〜っ！」が口ぐせの、かわいさ全開なモモンガ風キャラクター！',
    bodyColor: '#f8fafc',
    accentColor: '#a5b4fc',
    earColor: '#818cf8',
    cheekColor: '#f472b6',
    penColor: '#f472b6',
    initialUnlocked: true,
    unlockHint: '最初からいっしょにいる推しの相棒！',
    quotes: {
      normal: [
        'みろみろ〜！かわいさ全開だぞ！',
        'ほめろ〜っ！いっしょに計算してやるぞ！',
        '計算できたらウマいものよこせ〜！'
      ],
      focus: [
        'フンフン…メモに書いてるな！いいぞ〜！',
        'カキカキ…そのまま突き進めーッ！',
        'おっ！いい筆算じゃないか〜！'
      ],
      cheer: [
        'わァ…！？おしいぞ！なんとかなれーッ！！',
        'まだいけるぞ！もう一回やってみろ〜っ！',
        'あきらめるな〜！ほらヒントを見るぞ！'
      ],
      happy: [
        'ほめろ〜っ！！大正解じゃないかーッ！✨',
        'やったぞー！！すごすぎるじゃないか〜！🎉',
        'フフーン！おいらの応援のおかげだな！'
      ],
      selfCorrect: [
        'なっ…自分で直しただと！？えらすぎるぞーッ！💪',
        'ナイス・リカバリー！たっぷりほめてやるぞ〜！✨'
      ],
      tap: [
        'なんだなんだ〜？もっとほめてもいいぞ！',
        'ほめろ〜っ！計算がんばってるだろ〜？',
        'バックルームにおやつ探しに行こうぜ〜！'
      ]
    }
  },
  {
    id: 'marupi',
    name: 'まるぴ',
    role: '白くて丸い頑張り屋さん',
    personality: 'ちょっと泣き虫だけど、ここぞという時に強い「なんとかなれーッ！」の相棒。',
    bodyColor: '#ffffff',
    accentColor: '#fbcfe8',
    earColor: '#fce7f3',
    cheekColor: '#fb7185',
    penColor: '#f472b6',
    initialUnlocked: true,
    unlockHint: '最初からいっしょにいるおともだち！',
    quotes: {
      normal: [
        'わァ…！きょうもいっしょにがんばろうね！',
        'メモに書くとわかりやすいよ…！',
        'えへへ…計算だいすき！'
      ],
      focus: [
        'カキカキ…じょうずに書けてるね！',
        'うーん…この調子、この調子！'
      ],
      cheer: [
        'わァ…！おしいよ！なんとかなれーッ！！',
        'ふぇっ…でももう一歩だよ！いっしょに見直そう！'
      ],
      happy: [
        'やったァー！！大正解だねっ！✨',
        'わーい！すごーい！！🎉'
      ],
      selfCorrect: [
        'すごい！！自分で気づいて直せたねっ！💪',
        'やったー！完璧なリカバリーだよ〜！✨'
      ],
      tap: [
        'ふにふに…くすぐったいよ〜！',
        'なんとかなれーッ！！えいえいおー！'
      ]
    }
  },
  {
    id: 'hachiwaren',
    name: 'はちわれん',
    role: '青耳のしっかり者ヒント係',
    personality: '優しくてポジティブ！「なんとかなるよ！」と支えてくれる頼れる友だち。',
    bodyColor: '#ffffff',
    accentColor: '#38bdf8',
    earColor: '#0ea5e9',
    cheekColor: '#fda4af',
    penColor: '#38bdf8',
    initialUnlocked: true,
    unlockHint: '最初からいっしょにいるおともだち！',
    quotes: {
      normal: [
        '筆算を書けば…なんとかなるよ！',
        'いっしょに1問ずつ解いてみよう！',
        'チャリメラ食べたいなぁ…あ、計算しよう！'
      ],
      focus: [
        '位をそろえて書いてるね、すごい！',
        'そのまま落ち着いて計算しよう！'
      ],
      cheer: [
        'だいじょうぶ！ヒントを見ればなんとかなるよ！',
        'おしいところまで来てるよ！もう一回！'
      ],
      happy: [
        'やったね！！バッチリ大正解！✨',
        'すごいすごい！カメラで記念撮影だ〜！📸'
      ],
      selfCorrect: [
        '自分で直せたね！それが一番すごいんだよ！💪',
        'ナイス修正！さすが探検員だね！✨'
      ],
      tap: [
        'ぼくもいっしょに計算メモ見るよ！',
        'なんとかなるなる〜！応援してるよ！'
      ]
    }
  },
  {
    id: 'usapyon',
    name: 'うさぴょん',
    role: '黄色い元気っ子探検隊長',
    personality: '「ヤハ！」「プルャ！」と元気いっぱい！実はすごく計算が速い天才肌。',
    bodyColor: '#fef08a',
    accentColor: '#facc15',
    earColor: '#eab308',
    cheekColor: '#fb923c',
    penColor: '#facc15',
    initialUnlocked: false,
    unlockHint: 'バックルーム探検で迷子の仲間を助けよう！',
    quotes: {
      normal: ['ヤハ！！計算タイムだーッ！', 'プルャ！ウラララァ！'],
      focus: ['フゥン…！カキカキ！', 'ハァ！？いい感じだぞ！'],
      cheer: ['プルャ！？もう一回！なんとかなれーッ！', 'ヤハ！ここからだぞ！'],
      happy: ['ヤハーーッ！！大正解！！✨', 'ウラララァ！！パーフェクト！🎉'],
      selfCorrect: ['フゥン！！見事な修正だ！💪', 'ヤハ！自分で直せて最高だぞ！✨'],
      tap: ['プルャ！', 'ヤハ！！バックルーム行くぞーッ！']
    }
  },
  {
    id: 'kuriman',
    name: 'くりまん',
    role: '落ち着いたグルメな先輩',
    personality: 'いつもおいしそうなおやつを持っていて、良い計算を見ると「ッハー！」と褒めてくれる。',
    bodyColor: '#fed7aa',
    accentColor: '#9a3412',
    earColor: '#7c2d12',
    cheekColor: '#fb7185',
    penColor: '#34d399',
    initialUnlocked: false,
    unlockHint: 'バックルーム探検で迷子の仲間を助けよう！',
    quotes: {
      normal: ['ッハー…今日もいい計算日和だな。', '焦らずじっくり解いていこう。'],
      focus: ['ほう…いい手書きメモだな。', '落ち着いて、ひとつずつだ。'],
      cheer: ['おしいな…もうひと踏ん張りだ！', 'ヒントを見れば道が開けるぞ。'],
      happy: ['ッハー！！見事な大正解だ！✨', 'うまい！最高の一手だな！🎉'],
      selfCorrect: ['自分で誤りに気づくとは…達人だな！💪', 'ッハー！素晴らしい修正だ！✨'],
      tap: ['ほら、おやつでも食べながら休めよ。', 'ッハー…おまえはよく頑張ってるな。']
    }
  },
  {
    id: 'shisa',
    name: 'シーサーちゃん',
    role: '勉強熱心な頑張り屋さん',
    personality: 'いつも礼儀正しくて一生懸命！「お師匠〜！」とあなたを慕ってくれるよ。',
    bodyColor: '#fef3c7',
    accentColor: '#f59e0b',
    earColor: '#d97706',
    cheekColor: '#f87171',
    penColor: '#facc15',
    initialUnlocked: false,
    unlockHint: 'バックルーム探検で迷子の仲間を助けよう！',
    quotes: {
      normal: ['お師匠〜！今日も勉強バッチリです！', 'がんばるお姿、素敵です！'],
      focus: ['メモ書き、とっても綺麗です〜！', '集中モードですね！応援してます！'],
      cheer: ['おしいです〜！なんとかなれーッ！', 'お師匠なら絶対解けます！もう一回！'],
      happy: ['やりました〜！！お師匠、大正解です！✨', 'スーパー正解ですっ！🎉'],
      selfCorrect: ['自分で直せましたね！さすがですお師匠！💪', '感動しました〜！大成功です！✨'],
      tap: ['はいっ！いつでもお手伝いします！', 'お師匠といっしょだと楽しいです〜！']
    }
  },
  {
    id: 'rakko',
    name: 'ラッコせんぱい',
    role: '算数ランキング1位の剣士',
    personality: '強くて優しいみんなの憧れ！甘いパフェが大好きで、自己修正を全力で称えてくれる。',
    bodyColor: '#ffedd5',
    accentColor: '#b45309',
    earColor: '#92400e',
    cheekColor: '#fda4af',
    penColor: '#38bdf8',
    initialUnlocked: false,
    unlockHint: 'バックルーム探検で迷子の仲間を助けよう！',
    quotes: {
      normal: ['さあ、今日も計算の鍛錬だ！', '強くなる秘訣は毎日の積み重ねだぞ。'],
      focus: ['いい集中力だ！手元の計算が冴えているな。', 'よし、その調子で突き進め！'],
      cheer: ['惜しい！だが何度でも立ち上がればいい！', '弱点に気づくことが強さへの第一歩だ！'],
      happy: ['見事な一撃！大正解だ！！✨', '素晴らしい！1位にふさわしい腕前だぞ！🎉'],
      selfCorrect: ['自分で気づいて直したか…本当に強くなったな！💪', 'お見事！最高の自己修正だ！✨'],
      tap: ['鍛錬のあとには甘いパフェを食べよう！', 'お前ならもっともっと強くなれるぞ！']
    }
  },
  {
    id: 'kanichan',
    name: 'カニちゃん',
    role: '古本と算数が大好きな優しい子',
    personality: 'カチューシャがチャームポイントの優しいおともだち。いつもそばでニコニコ応援！',
    bodyColor: '#ffe4e6',
    accentColor: '#fb7185',
    earColor: '#f43f5e',
    cheekColor: '#fb7185',
    penColor: '#f472b6',
    initialUnlocked: false,
    unlockHint: 'バックルーム探検で迷子の仲間を助けよう！',
    quotes: {
      normal: ['いっしょに楽しく計算しようね！', 'カキカキするの、とっても上手だね！'],
      focus: ['わあ、丁寧に書けててえらいね！', 'じっくり考えるの、だいじだよね！'],
      cheer: ['あとちょっとだよ〜！なんとかなれーッ！', 'だいじょうぶ、いっしょに確認しようね！'],
      happy: ['やったぁ！大正解おめでとう〜！✨', 'すごーい！ぴょんぴょん嬉しいな！🎉'],
      selfCorrect: ['自分で直せてほんとにえらいね！💪', 'ナイス・リカバリー！とっても素敵だよ！✨'],
      tap: ['えへへ、なでてくれてありがとう！', 'おそろいのペンで書くと楽しいね！']
    }
  }
];

/**
 * Look up a character definition by ID (defaults to Momonga).
 * @param {string} charId
 * @returns {object}
 */
export function getCharacterById(charId) {
  return CUTE_CHARACTERS.find((c) => c.id === charId) || CUTE_CHARACTERS[0];
}

/**
 * Get an encouragement/reaction quote for a character and mood.
 * @param {string} charId
 * @param {'normal'|'focus'|'cheer'|'happy'|'selfCorrect'|'tap'|'surprised'} mood
 * @param {number|null} [fixedIndex=null]
 * @returns {string}
 */
export function getCharacterQuote(charId, mood = 'normal', fixedIndex = null) {
  const char = getCharacterById(charId);
  const key = mood === 'surprised' ? 'cheer' : mood;
  const list = char.quotes[key] || char.quotes.normal;
  if (!list || list.length === 0) return 'いっしょにがんばろう！';
  const idx = typeof fixedIndex === 'number'
    ? Math.abs(fixedIndex) % list.length
    : Math.floor(Math.random() * list.length);
  return list[idx];
}

/**
 * Render an adorable Chiikawa-inspired two-head-tall inline SVG for any character and mood.
 * All empty SVG elements use explicit self-closing tags for safe DOM & mock parsing.
 *
 * @param {string} [charId='momonga']
 * @param {'normal'|'focus'|'cheer'|'happy'|'surprised'|'tap'|'selfCorrect'} [mood='normal']
 * @param {number} [size=68]
 * @returns {string}
 */
export function renderCharacterSvg(charId = DEFAULT_CHARACTER_ID, mood = 'normal', size = 68) {
  const char = getCharacterById(charId);
  const s = Math.max(24, Number(size) || 68);
  const effectiveMood = mood === 'selfCorrect' ? 'happy' : mood;

  // Tail / back accessory (Momonga gets a signature big fluffy tail puff!)
  let backLayer = '';
  if (char.id === 'momonga') {
    backLayer = `
      <ellipse cx="78" cy="64" rx="18" ry="22" transform="rotate(-18 78 64)" fill="${char.accentColor}" stroke="#334155" stroke-width="2.5" />
      <ellipse cx="80" cy="60" rx="11" ry="14" transform="rotate(-18 80 60)" fill="#e0e7ff" />
    `;
  } else if (char.id === 'kanichan') {
    backLayer = `
      <circle cx="28" cy="24" r="6" fill="${char.earColor}" stroke="#334155" stroke-width="2" />
      <circle cx="72" cy="24" r="6" fill="${char.earColor}" stroke="#334155" stroke-width="2" />
    `;
  }

  // Ears per character silhouette
  let earsLayer = '';
  if (char.id === 'usapyon') {
    earsLayer = `
      <ellipse cx="36" cy="20" rx="8" ry="18" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.5" />
      <ellipse cx="36" cy="22" rx="4" ry="11" fill="${char.earColor}" />
      <ellipse cx="64" cy="20" rx="8" ry="18" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.5" />
      <ellipse cx="64" cy="22" rx="4" ry="11" fill="${char.earColor}" />
    `;
  } else if (char.id === 'hachiwaren') {
    earsLayer = `
      <polygon points="22,38 24,14 42,26" fill="${char.earColor}" stroke="#334155" stroke-width="2.5" stroke-linejoin="round" />
      <polygon points="78,38 76,14 58,26" fill="${char.earColor}" stroke="#334155" stroke-width="2.5" stroke-linejoin="round" />
    `;
  } else if (char.id === 'momonga') {
    earsLayer = `
      <ellipse cx="26" cy="27" rx="11" ry="12" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.5" />
      <ellipse cx="26" cy="28" rx="6" ry="7" fill="${char.earColor}" />
      <ellipse cx="74" cy="27" rx="11" ry="12" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.5" />
      <ellipse cx="74" cy="28" rx="6" ry="7" fill="${char.earColor}" />
    `;
  } else {
    earsLayer = `
      <circle cx="28" cy="27" r="10" fill="${char.earColor}" stroke="#334155" stroke-width="2.5" />
      <circle cx="72" cy="27" r="10" fill="${char.earColor}" stroke="#334155" stroke-width="2.5" />
    `;
  }

  // Head markings (Hachiwaren parted hair, Momonga fluffy cheeks, Kuriman chestnut cap, Rakko scar)
  let markingsLayer = '';
  if (char.id === 'hachiwaren') {
    markingsLayer = `
      <path d="M22,42 Q38,24 50,36 Q62,24 78,42 L74,29 Q50,18 26,29 Z" fill="${char.earColor}" />
    `;
  } else if (char.id === 'momonga') {
    markingsLayer = `
      <path d="M18,52 Q12,56 19,60 Q14,65 22,67" fill="${char.bodyColor}" stroke="#334155" stroke-width="2" stroke-linecap="round" />
      <path d="M82,52 Q88,56 81,60 Q86,65 78,67" fill="${char.bodyColor}" stroke="#334155" stroke-width="2" stroke-linecap="round" />
      <path d="M36,28 Q50,24 64,28" fill="none" stroke="${char.accentColor}" stroke-width="3" stroke-linecap="round" />
    `;
  } else if (char.id === 'kuriman') {
    markingsLayer = `
      <path d="M22,38 Q50,20 78,38 Q74,23 50,22 Q26,23 22,38 Z" fill="${char.earColor}" />
    `;
  } else if (char.id === 'rakko') {
    markingsLayer = `
      <line x1="60" y1="36" x2="68" y2="41" stroke="#b45309" stroke-width="2.2" stroke-linecap="round" />
    `;
  }

  // Facial expressions by mood
  let faceLayer = '';
  if (effectiveMood === 'happy') {
    faceLayer = `
      <path d="M34,49 Q39,43 44,49" fill="none" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" />
      <path d="M56,49 Q61,43 66,49" fill="none" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" />
      <path d="M44,57 Q50,65 56,57 Z" fill="#fb7185" stroke="#1e293b" stroke-width="2" />
      <text x="14" y="22" font-size="12">✨</text>
      <text x="76" y="20" font-size="12">✨</text>
    `;
  } else if (effectiveMood === 'cheer' || effectiveMood === 'surprised') {
    // Teary-eyed "なんとかなれーッ！" pleading/cheering look
    faceLayer = `
      <circle cx="39" cy="48" r="4.5" fill="#1e293b" />
      <circle cx="37.5" cy="46.5" r="1.7" fill="#ffffff" />
      <ellipse cx="36" cy="53" rx="2.5" ry="1.8" fill="#7dd3fc" />
      <circle cx="61" cy="48" r="4.5" fill="#1e293b" />
      <circle cx="59.5" cy="46.5" r="1.7" fill="#ffffff" />
      <ellipse cx="64" cy="53" rx="2.5" ry="1.8" fill="#7dd3fc" />
      <path d="M46,57 Q50,53 54,57 Q50,62 46,57 Z" fill="#fb7185" stroke="#1e293b" stroke-width="1.8" />
    `;
  } else if (effectiveMood === 'focus') {
    faceLayer = `
      <line x1="34" y1="43" x2="43" y2="45" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
      <line x1="66" y1="43" x2="57" y2="45" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="39" cy="49" r="3.6" fill="#1e293b" />
      <circle cx="38" cy="47.8" r="1.3" fill="#ffffff" />
      <circle cx="61" cy="49" r="3.6" fill="#1e293b" />
      <circle cx="60" cy="47.8" r="1.3" fill="#ffffff" />
      <path d="M46,57 Q50,59 54,57" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
    `;
  } else {
    // Normal / tap cute expressive eyes
    faceLayer = `
      <circle cx="39" cy="48" r="4.2" fill="#1e293b" />
      <circle cx="37.6" cy="46.5" r="1.6" fill="#ffffff" />
      <circle cx="40.5" cy="49.5" r="0.8" fill="#ffffff" />
      <circle cx="61" cy="48" r="4.2" fill="#1e293b" />
      <circle cx="59.6" cy="46.5" r="1.6" fill="#ffffff" />
      <circle cx="62.5" cy="49.5" r="0.8" fill="#ffffff" />
      <path d="M44,56 Q47,59 50,56 Q53,59 56,56" fill="none" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${s}" height="${s}" class="cute-char-svg" data-char-id="${char.id}" data-mood="${effectiveMood}" aria-hidden="true">
    ${backLayer}
    ${earsLayer}
    <ellipse cx="50" cy="77" rx="22" ry="16" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.5" />
    <ellipse cx="50" cy="50" rx="31" ry="27" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.5" />
    ${markingsLayer}
    <ellipse cx="29" cy="55" rx="6" ry="3.5" fill="${char.cheekColor}" opacity="0.6" />
    <ellipse cx="71" cy="55" rx="6" ry="3.5" fill="${char.cheekColor}" opacity="0.6" />
    ${faceLayer}
    <ellipse cx="32" cy="75" rx="6" ry="4.5" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.2" />
    <ellipse cx="68" cy="75" rx="6" ry="4.5" fill="${char.bodyColor}" stroke="#334155" stroke-width="2.2" />
  </svg>`;
}

/**
 * Problem Arena Companion Widget:
 * Shows the active cheering character (Momonga by default) near the memo pad,
 * reacts to calculations, speaks when tapped, and lets the user switch characters anytime.
 */
export class MascotCompanionWidget {
  constructor(options = {}) {
    this.container = options.container || null;
    this.characterId = options.selectedCharacterId || DEFAULT_CHARACTER_ID;
    this.unlockedCharacters = Array.isArray(options.unlockedCharacters) && options.unlockedCharacters.length > 0
      ? [...options.unlockedCharacters]
      : [...INITIAL_UNLOCKED_CHARACTERS];
    this.mood = 'normal';
    this.quote = getCharacterQuote(this.characterId, 'normal', 0);
    this.pickerOpen = false;
    this.onSelectCharacter = options.onSelectCharacter || null;
    this.onOpenBook = options.onOpenBook || null;
    this.rootEl = null;
    this._boundClick = null;
  }

  mount(container) {
    if (typeof document === 'undefined') return this;
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) return this;
    this.render();
    return this;
  }

  setCharacter(charId) {
    this.characterId = getCharacterById(charId).id;
    this.mood = 'happy';
    this.quote = getCharacterQuote(this.characterId, 'normal', 0);
    this.pickerOpen = false;
    this.render();
  }

  setUnlockedCharacters(unlockedList) {
    if (Array.isArray(unlockedList) && unlockedList.length > 0) {
      this.unlockedCharacters = [...unlockedList];
      this.render();
    }
  }

  setMood(mood = 'normal', customText = null) {
    this.mood = mood;
    this.quote = customText || getCharacterQuote(this.characterId, mood);
    this.render();
  }

  toggleQuickPicker() {
    this.pickerOpen = !this.pickerOpen;
    this.render();
  }

  render() {
    if (!this.container || typeof document === 'undefined') return null;
    const char = getCharacterById(this.characterId);

    if (this._boundClick && this.rootEl) {
      this.rootEl.removeEventListener('click', this._boundClick);
    }

    const wrapper = document.createElement('div');
    wrapper.className = `mascot-companion-widget mood-${this.mood}`;
    wrapper.dataset.characterId = char.id;

    const unlockedDefs = CUTE_CHARACTERS.filter((c) => this.unlockedCharacters.includes(c.id));
    const pickerHtml = this.pickerOpen
      ? `
        <div class="mascot-quick-picker">
          <div class="mascot-quick-picker-label">応援してくれるキャラを選ぼう！</div>
          <div class="mascot-quick-picker-list">
            ${unlockedDefs.map((c) => `
              <button type="button" class="btn btn-sm mascot-pick-btn ${c.id === char.id ? 'active' : ''}" data-pick-char="${c.id}">
                <span class="mascot-pick-mini">${renderCharacterSvg(c.id, 'normal', 28)}</span>
                <span>${c.name}</span>
              </button>
            `).join('')}
            <button type="button" class="btn btn-sm btn-outline btn-open-full-book">🐾 図鑑 (${unlockedDefs.length}/${CUTE_CHARACTERS.length})</button>
          </div>
        </div>
      `
      : '';

    wrapper.innerHTML = `
      <div class="mascot-main-row">
        <button type="button" class="mascot-avatar-btn" title="タップするとおしゃべりするよ！" aria-label="${char.name}をなでる">
          ${renderCharacterSvg(char.id, this.mood, 62)}
        </button>
        <div class="mascot-bubble-area">
          <div class="mascot-name-tag">💖 ${char.name}</div>
          <div class="mascot-speech-bubble">${this.quote}</div>
        </div>
        <div class="mascot-widget-actions">
          <button type="button" class="btn btn-sm btn-outline btn-switch-mascot" title="応援キャラを変更">🔄 キャラ変更</button>
        </div>
      </div>
      ${pickerHtml}
    `;

    this._boundClick = (e) => {
      const pickBtn = e.target.closest?.('.mascot-pick-btn');
      if (pickBtn) {
        const nextId = pickBtn.dataset.pickChar;
        if (nextId) {
          SoundEffects.playCuteVoice(nextId);
          this.setCharacter(nextId);
          if (typeof this.onSelectCharacter === 'function') {
            this.onSelectCharacter(nextId);
          }
        }
        return;
      }

      if (e.target.closest?.('.btn-open-full-book')) {
        SoundEffects.playSound('tap');
        this.pickerOpen = false;
        this.render();
        if (typeof this.onOpenBook === 'function') {
          this.onOpenBook();
        }
        return;
      }

      if (e.target.closest?.('.btn-switch-mascot')) {
        SoundEffects.playSound('tap');
        this.toggleQuickPicker();
        return;
      }

      if (e.target.closest?.('.mascot-avatar-btn') || e.target.closest?.('.mascot-speech-bubble')) {
        SoundEffects.playCuteVoice(this.characterId);
        this.setMood('tap');
      }
    };

    wrapper.addEventListener('click', this._boundClick);
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    this.rootEl = wrapper;
    return wrapper;
  }

  destroy() {
    if (this.rootEl && this._boundClick) {
      this.rootEl.removeEventListener('click', this._boundClick);
    }
    this._boundClick = null;
    if (this.rootEl && this.rootEl.parentNode) {
      this.rootEl.parentNode.removeChild(this.rootEl);
    }
    this.rootEl = null;
  }
}

/**
 * Character Book Modal (おともだち図鑑):
 * Displays all 8 cute characters, allows listening to their voices,
 * and switching the active cheering partner character.
 */
export class CharacterBookModal {
  constructor(options = {}) {
    this.selectedCharacterId = options.selectedCharacterId || DEFAULT_CHARACTER_ID;
    this.unlockedCharacters = Array.isArray(options.unlockedCharacters) && options.unlockedCharacters.length > 0
      ? [...options.unlockedCharacters]
      : [...INITIAL_UNLOCKED_CHARACTERS];
    this.onSelectCharacter = options.onSelectCharacter || null;
    this.onOpenBonusGame = options.onOpenBonusGame || null;
    this.onClose = options.onClose || null;
    this.overlay = null;
    this._boundClick = null;
  }

  open(target = null) {
    if (typeof document === 'undefined') return this;
    const mountParent = target || document.getElementById('modal-root') || document.body;
    if (!mountParent) return this;

    this.close(false);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open char-book-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card char-book-modal-card';

    const unlockedSet = new Set(this.unlockedCharacters);
    const unlockedCount = CUTE_CHARACTERS.filter((c) => unlockedSet.has(c.id)).length;

    const gridHtml = CUTE_CHARACTERS.map((c) => {
      const isUnlocked = unlockedSet.has(c.id);
      const isSelected = c.id === this.selectedCharacterId;

      if (isUnlocked) {
        return `
          <div class="char-book-card unlocked ${isSelected ? 'selected' : ''}" data-char-id="${c.id}">
            <div class="char-book-svg">${renderCharacterSvg(c.id, isSelected ? 'happy' : 'normal', 72)}</div>
            <div class="char-book-name">${c.name}</div>
            <div class="char-book-role">${c.role}</div>
            <p class="char-book-desc">${c.personality}</p>
            <div class="char-book-actions">
              <button type="button" class="btn btn-sm btn-outline btn-char-voice" data-char-id="${c.id}">🔊 こえ</button>
              ${isSelected
                ? '<span class="char-selected-badge">✨ いまの相棒</span>'
                : `<button type="button" class="btn btn-sm btn-primary btn-char-select" data-char-id="${c.id}">💖 相棒にする</button>`}
            </div>
          </div>
        `;
      }

      return `
        <div class="char-book-card locked" data-char-id="${c.id}">
          <div class="char-book-svg locked-silhouette">${renderCharacterSvg(c.id, 'cheer', 72)}</div>
          <div class="char-book-name">？？？ (${c.name})</div>
          <div class="char-book-role">迷子のおともだち</div>
          <p class="char-book-desc">${c.unlockHint}</p>
          <div class="char-book-actions">
            <button type="button" class="btn btn-sm btn-accent btn-go-rescue">🎮 助けにいく！</button>
          </div>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">🐾 おともだち図鑑 (${unlockedCount} / ${CUTE_CHARACTERS.length})</h2>
        <button type="button" class="icon-btn btn-close-charbook" aria-label="閉じる">✕</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--color-text-muted); margin-bottom:14px;">
          いっしょに算数を応援してくれる相棒を選んだり、バックルームで助けたおともだちを見られるよ！
        </p>
        <div class="char-book-grid">
          ${gridHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary btn-close-charbook">とじる</button>
      </div>
    `;

    this._boundClick = (e) => {
      if (e.target === overlay || e.target.closest?.('.btn-close-charbook')) {
        SoundEffects.playSound('tap');
        this.close(true);
        return;
      }

      const voiceBtn = e.target.closest?.('.btn-char-voice');
      if (voiceBtn) {
        const cId = voiceBtn.dataset.charId;
        SoundEffects.playCuteVoice(cId);
        return;
      }

      const selectBtn = e.target.closest?.('.btn-char-select');
      if (selectBtn) {
        const cId = selectBtn.dataset.charId;
        if (cId) {
          this.selectedCharacterId = cId;
          SoundEffects.playSound('badge');
          SoundEffects.playCuteVoice(cId);
          if (typeof this.onSelectCharacter === 'function') {
            this.onSelectCharacter(cId);
          }
          this.open(mountParent);
        }
        return;
      }

      if (e.target.closest?.('.btn-go-rescue')) {
        SoundEffects.playSound('tap');
        this.close(false);
        if (typeof this.onOpenBonusGame === 'function') {
          this.onOpenBonusGame();
        }
      }
    };

    overlay.addEventListener('click', this._boundClick);
    overlay.appendChild(card);
    mountParent.appendChild(overlay);
    this.overlay = overlay;
    return this;
  }

  close(triggerCallback = true) {
    if (this.overlay) {
      if (this._boundClick) {
        this.overlay.removeEventListener('click', this._boundClick);
      }
      if (this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }
    this.overlay = null;
    this._boundClick = null;
    if (triggerCallback && typeof this.onClose === 'function') {
      this.onClose();
    }
  }

  destroy() {
    this.close(false);
  }
}

export default {
  DEFAULT_CHARACTER_ID,
  INITIAL_UNLOCKED_CHARACTERS,
  CUTE_CHARACTERS,
  getCharacterById,
  getCharacterQuote,
  renderCharacterSvg,
  MascotCompanionWidget,
  CharacterBookModal
};
