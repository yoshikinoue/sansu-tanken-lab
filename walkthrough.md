# 算数探検ラボ — ウォークスルー

小学4年生向けの四則演算ステップアップ学習Webアプリケーション「**算数探検ラボ**」の全体構成、設計方針、カリキュラム、起動方法、および検証結果のまとめです。

---

## 1. アプリ概要

「算数探検ラボ」は、小学4年生のお子様が四則演算に対する苦手意識をなくし、「自分で間違いに気づいて直せた！（自己是正感）」「わかる・できる！」という成功体験を積み重ねながら毎日楽しく続けられるように設計された、タブレット最適化Webアプリケーションです。

- **対象学年**: 小学4年生（四則演算の定着・2桁わり算・四則混合まで）
- **技術構成**: Vanilla ES Modules (`src/`) + CSSデザインシステム (`src/styles/`) + Node.js HTTPサーバー (`server.js`)
- **配信形態**:
  1. Node.js サーバー版 (`http://localhost:3000/` — `/api/progress` 等によるサーバー同期対応)
  2. スタンドアロンHTML版 (`sansu_tanken_lab.html` — 単一HTMLファイルでブラウザから直接起動可能)

---

## 2. 6つのコア設計方針

1. **ハイブリッド・ステップガイド方式（入力＆途中式サポート）**
   - 通常時は「手書き計算メモパッド（方眼・筆算ガイド付き、`CanvasPad`）＋大型テンキー（`Keypad`）」でテンポよく解答できます。
   - 不正解時や難所（2桁のわり算、四則混合など）では、画面中央に「ステップごとの穴埋めガイド（`StepGuideModal`）」が展開し、途中の思考プロセスを1ステップずつ確認・入力できます。
2. **「バツ（×）」を出さない探検・ラボ風トーン**
   - 不正解時に「×（バツ）」は一切表示せず、「おしい！もう一歩！」「ヒントを発見！」といったポジティブなフィードバック（`ToastFeedback`）を表示します。
   - 誤答箇所を診断・ハイライトし、ステップ穴埋めガイドで自力正解（じぶん修正）へ導きます。
3. **参加型1分ミニ授業（図解＋2択クイズ＋音声読み上げ）**
   - 各ステージ冒頭に対話型の1分ミニ授業（`MiniLessonModal`）を搭載。3ステップの図解カードと2択クイズに加え、Web Speech API（`speech-service.js`）による日本語音声読み上げ機能を備えています。
4. **挫折しない分量とアダプティブ難易度（1セット5問）**
   - 1ステージ「5問（約3〜5分）」の短時間集中設計です。
   - 1問目は必ず自信がつく基礎ウォームアップ問題から始まり、以降は正誤履歴に応じて難易度を動的に調整します。
5. **パワーアップ宝箱 ＆ 保護者応援ボード**
   - **パワーアップ宝箱 (`TreasureBox`)**: 間違えた問題を「お宝問題」としてストックし、数字違いの類題を自力で2回連続クリアすると「完全マスター！」になります。
   - **保護者応援ボード (`ParentBoard`)**: 4桁PIN認証（初期値 `1234`）、5ワールド別の得意・伸びしろレーダーチャート、じぶん修正回数カウント、応援スタンプ送信機能を提供します。
6. **安心の3重ハイブリッド保存 (`StorageService`)**
   - ① ブラウザ即時保存（`localStorage`）
   - ② サーバー側ファイル自動同期（`/api/progress` ⇔ `data/progress.json`、および `data/progress.backup.json` へのアトミック書き込み）
   - ③ JSONバックアップファイル書き出し／読み込み ＆ 8文字引き継ぎコード機能（`LAB-XXXX-XXXX`、48時間有効）

---

## 3. カリキュラム構成（全5ワールド・15ステージ）

| ワールド | ワールド名 | ステージ構成（各3ステージ） |
|---|---|---|
| **World 1** | たし算・ひき算ラボ | 1. 3桁・4桁のたし算<br>2. 3桁・4桁のひき算<br>3. 虫食い算・逆算（□の式） |
| **World 2** | かけ算パワーラボ | 1. 10・100の倍数と九九の応用<br>2. 2桁・3桁 × 1桁の筆算<br>3. 2桁 × 2桁の筆算 |
| **World 3** | わり算とあまりラボ | 1. あまりのあるわり算と検算<br>2. 2桁 ÷ 1桁の筆算<br>3. 3桁 ÷ 1桁の筆算 |
| **World 4** | 2桁わり算・見積もりラボ | 1. 何十でわる計算とあまり<br>2. 2桁 ÷ 2桁の見当づけ<br>3. 仮の商の自己修正 |
| **World 5** | 計算のきまり・四則混合ラボ | 1. カッコのある計算と順序<br>2. ＋－×÷ 混合計算<br>3. 計算の工夫（分配・結合法則） |

---

## 4. ファイル構成

```text
/home/antigravity/
├── index.html                  # SPAシェル（タブレット用ビューポート・ヘッダー・ルートコンテナ）
├── sansu_tanken_lab.html       # スタンドアロン単一HTML版（CSS/JSインラインバンドル済み）
├── server.js                   # Node.js サーバー（静的配信 + /api/progress + /api/transfer/*）
├── package.json                # スクリプト定義（start, dev, build, test）
├── vite.config.js              # Vite開発サーバー設定
├── walkthrough.md              # 本ドキュメント
├── data/
│   ├── progress.json           # 学習進捗データ
│   ├── progress.backup.json    # 自動バックアップ
│   └── transfers.json          # 引き継ぎコードストア
├── src/
│   ├── main.js                 # SPAルーター (#map, #stage, #lesson, #treasure, #parent) & 統合制御
│   ├── styles/
│   │   ├── variables.css       # デザインシステムトークン（カラー・タイポグラフィ・間隔）
│   │   ├── base.css            # リセット・ベースレイアウト
│   │   ├── components.css      # UIコンポーネントスタイル
│   │   └── tablet.css          # タブレット・タッチ最適化メディアクエリ
│   ├── services/
│   │   ├── curriculum-engine.js    # 5ワールド15ステージ問題生成・誤答診断・アダプティブ制御
│   │   ├── storage-service.js      # 3重ハイブリッド保存・コンフリクト解決・引き継ぎコード
│   │   ├── sound-effects.js        # Web Audio API 効果音エンジン
│   │   ├── speech-service.js       # Web Speech API 日本語読み上げ・ミニ授業台本
│   │   └── gamification-engine.js  # ランク・星評価・バッジ・レーダー集計・連続記録
│   └── components/
│       ├── canvas-pad.js       # 手書き計算メモパッド（方眼・筆算ガイド・Undo/Clear）
│       ├── keypad.js           # 大型テンキー入力（48px+タッチターゲット、あまり入力対応）
│       ├── step-guide.js       # ステップ穴埋めガイドモーダル
│       ├── toast-feedback.js   # ポジティブフィードバック通知（バツ記号禁止ガード付き）
│       ├── mini-lesson.js      # 1分図解ミニ授業モーダル（2択クイズ＋音声）
│       ├── stage-map.js        # 5ワールド15ステージマップ
│       ├── treasure-box.js     # パワーアップ宝箱（類題復習・2回連続クリアでマスター）
│       └── parent-board.js     # 保護者応援ボード（PIN認証・レーダー・スタンプ・バックアップ）
└── tests/
    ├── *.test.js               # 単体・結合テスト
    └── e2e/*.test.js           # E2E・ストレステストスイート
```

---

## 5. 起動方法

### 方法A: Node.js サーバーで起動（推奨・サーバー同期あり）

```bash
cd /home/antigravity
node server.js
```

起動後、ブラウザで以下にアクセスします：
- **アプリ本編**: `http://localhost:3000/`
- **進捗API**: `http://localhost:3000/api/progress`

### 方法B: スタンドアロンHTMLで起動（サーバー不要）

`/home/antigravity/sansu_tanken_lab.html` をそのままブラウザで開きます。
CSSおよび全14個のESモジュールが単一ファイルにインラインバンドルされており、`localStorage` と JSONバックアップ／読み込み機能を用いて単体で動作します。

---

## 6. テスト・ビルド・稼働検証結果

- **単体・結合・E2Eテスト (`npm test`)**:
  - 実行コマンド: `npm test` (`node --test 'tests/*.test.js' 'tests/e2e/*.test.js'`)
  - 結果: **523 passed / 0 failed**（全 **122 suites**、終了コード `0`）
- **ビルド (`npm run build`)**:
  - 結果: 終了コード `0`（`Build complete (standalone native ESM app)`）
- **スタンドアロンHTML (`sansu_tanken_lab.html`)**:
  - インラインJavaScript構文チェック (`node --check`) およびVMモジュール初期化チェック: 合格（エラーなし）
- **サーバー稼働確認 (`server.js` on port `3000`)**:
  - `GET http://localhost:3000/` → `HTTP 200 OK` (`text/html; charset=utf-8`)
  - `GET http://localhost:3000/api/progress` → `HTTP 200 OK` (`application/json; charset=utf-8`, `schemaVersion: "1.0.0"`)
  - `GET http://localhost:3000/src/main.js` → `HTTP 200 OK`
