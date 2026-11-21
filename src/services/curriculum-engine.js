/**
 * @file curriculum-engine.js
 * @description 小学4年生向け 四則演算ステップアップ学習Webアプリ (算数探検ラボ)
 * 全9ワールド・27ステージ カリキュラム問題生成・アダプティブ出題・ステップガイド・誤答診断・類題生成エンジン
 */

let problemSequenceCounter = 1;

/**
 * 乱数ヘルパー: [min, max] の整数を返す
 * @param {number} min
 * @param {number} max
 * @param {() => number} [rng=Math.random]
 * @returns {number}
 */
function randInt(min, max, rng = Math.random) {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

/**
 * 配列からランダムに1要素を選択
 * @template T
 * @param {T[]} arr
 * @param {() => number} [rng=Math.random]
 * @returns {T}
 */
function pickRandom(arr, rng = Math.random) {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * 全ワールド・全ステージのメタデータ（ミニ授業3ステップ＋2択クイズ定義含む）
 */
export const WORLDS_METADATA = [
  {
    worldId: 1,
    id: 'world-1',
    title: 'たし算・ひき算ラボ',
    subtitle: 'くり上がり・くり下がり・虫食い算',
    themeColor: '#00bcd4',
    icon: '🧪',
    description: '3桁・4桁の大きな数の筆算と、□を使った逆算をマスターしよう！',
    stages: [
      {
        stageId: 1,
        worldId: 1,
        globalStageNumber: 1,
        globalId: 'stage-1',
        title: '3桁・4桁のたし算',
        subtitle: 'くり上がりのある筆算',
        description: '一の位・十の位・百の位のくり上がりメモを正確に追跡しよう。',
        operator: '+',
        displayFormat: 'column',
        miniLesson: {
          title: 'くり上がりのある3桁・4桁の筆算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】10を超えたら次の位へお引っ越し！',
              body: '一の位や十の位の計算が10以上になったら、すぐ左の位の上に小さく「1」をメモしよう。位をたてにピシッとそろえて書くのが研究員のコツだよ！',
              ttsText: '一の位が十を超えたら、次の位へ小さく一をメモしよう！位をそろえて書くのがコツだよ。',
              visualType: 'column_carry'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】くり上がりメモの確認',
              question: '一の位の計算が 7 + 8 = 15 になったよ。十の位にメモするくり上がりの数はどっち？',
              choices: [
                { id: 'A', label: '1', isCorrect: true, feedback: 'ピンポン！大正解！十の位には10のまとまりの「1」をメモするね！' },
                { id: 'B', label: '5', isCorrect: false, feedback: 'おしい！5は一の位の答えの欄に書く数だよ。十の位に送る数を考えてみよう！' }
              ],
              hint: '15は「10が1こ」と「1が5こ」だね！',
              ttsText: '一の位の計算が7足す8で15になったよ。十の位にメモする数はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【次の位へ小さく「1」を書く！】くり上がりメモを忘れなければ百発百中！',
              ttsText: '今日の必殺技！次の位へ小さく一を書く！くり上がりメモを忘れなければ百発百中だよ。ミッションスタート！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 1,
        globalStageNumber: 2,
        globalId: 'stage-2',
        title: '3桁・4桁のひき算',
        subtitle: '0をまたぐ連続くり下がり',
        description: '引けない時はとなりの位から10を借りる！0がある時の2段階くり下がりを攻略しよう。',
        operator: '-',
        displayFormat: 'column',
        miniLesson: {
          title: 'くり下がりのある3桁・4桁の筆算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】引けない時はとなりから「10」を借りる！',
              body: '一の位で引けない時は、十の位から10を借りてこよう。もし十の位が「0」の時は、百の位から十の位へ10を借りて、そこから1つ貸すから十の位は「9」になるよ！',
              ttsText: '引けない時はとなりの位から十をもらおう。十の位がゼロの時は、百の位からリレーして借りてくるよ。',
              visualType: 'column_borrow_zero'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】くり下がりの数',
              question: '一の位で引けない時、となりの十の位からいくつ借りてくる？',
              choices: [
                { id: 'A', label: '1', isCorrect: false, feedback: 'おしい！十の位は「1」減るけれど、一の位へ持っていくと10のかたまりになるよ！' },
                { id: 'B', label: '10', isCorrect: true, feedback: 'ピンポン！大正解！十の位の1は、一の位では「10」になるね！' }
              ],
              hint: '十の位の「1」は、一の位にとっていくつ分かな？',
              ttsText: '一の位で引けない時、十の位からいくつ借りてくるかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【となりから「10」を借りる！】0をまたぐ時は真ん中の0が「9」に変身！',
              ttsText: '今日の必殺技！となりから十を借りる！ゼロをまたぐ時は真ん中のゼロが九に変身するよ！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 1,
        globalStageNumber: 3,
        globalId: 'stage-3',
        title: '虫食い算・逆算（□の式）',
        subtitle: 'たし算とひき算の逆算',
        description: '□に入る数を探すには「逆の計算」を使おう！和から引く・差に足す関係をマスター。',
        operator: '+',
        displayFormat: 'horizontal',
        miniLesson: {
          title: 'たし算・ひき算の虫食い算（□の式）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】□を求めるカギは「逆の計算」！',
              body: '「248 + □ = 615」のように足し算の片方がわからない時は、全体の和からひき算（615 - 248）しよう！「□ - 184 = 356」のように元の数がわからない時は、たし算（356 + 184）で元に戻せるよ！',
              ttsText: 'わからない四角がある時は、逆の計算をすると正解が見えてくるよ！',
              visualType: 'inverse_box'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】逆算の式を選ぼう',
              question: '「□ + 35 = 80」のとき、□を求める式はどっち？',
              choices: [
                { id: 'A', label: '80 - 35', isCorrect: true, feedback: 'ピンポン！大正解！合計の80から35を引けば□がわかるね！' },
                { id: 'B', label: '80 + 35', isCorrect: false, feedback: 'おしい！80は足した後の合計だから、そこから35を取り除いてみよう！' }
              ],
              hint: '□に35を足して80になったから、元に戻すには…？',
              ttsText: '四角足す35は80のとき、四角を求める式はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【□の計算は逆算を使う！】合計から引くか、残りに足すか見極めよう！',
              ttsText: '今日の必殺技！四角の計算は逆算を使う！合計から引くか、残りに足すか見極めよう！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 2,
    id: 'world-2',
    title: 'かけ算パワーラボ',
    subtitle: '九九の応用・2〜3桁×1桁・2桁×2桁筆算',
    themeColor: '#ff9800',
    icon: '⚡',
    description: '0の計算ルールと、2桁×2桁の部分積を足し合わせる筆算パワーを身につけよう！',
    stages: [
      {
        stageId: 1,
        worldId: 2,
        globalStageNumber: 4,
        globalId: 'stage-4',
        title: '10・100の倍数と九九の応用',
        subtitle: '末尾の0の個数ルール',
        description: '何十・何百をかける計算。0を隠して九九を計算し、最後に0を合わせてつけよう！',
        operator: '×',
        displayFormat: 'horizontal',
        miniLesson: {
          title: '九九の発展と0のかけ算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】0はいったん隠して、最後に合体！',
              body: '60 × 40 を計算するときは、まず0を隠して「6 × 4 = 24」を計算しよう。そのあと、隠した0の個数（2こ）を右につけて「2400」にするよ！',
              ttsText: 'ゼロはいったん隠して九九を計算。最後にゼロをつければ簡単だよ！',
              visualType: 'trailing_zeros'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】0のかけ算ルール',
              question: '40 × 6 の答えはどうやって考える？',
              choices: [
                { id: 'A', label: '4×6の答えの右に0を1個つける', isCorrect: true, feedback: 'ピンポン！大正解！4×6=24に0を1個つけて240だね！' },
                { id: 'B', label: '4×6の答えに0をたす', isCorrect: false, feedback: 'おしい！40は「10が4こ」だから、答えも10倍（右に0を1個つける）になるよ！' }
              ],
              hint: '10倍すると、数字の右側に何がつくかな？',
              ttsText: '40かける6の答えはどうやって考えるかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【0を隠して計算、最後に0を全部つける！】九九の末尾の0と混同しないよう注意！',
              ttsText: '今日の必殺技！ゼロを隠して計算、最後にゼロを全部つける！これで暗算マスターだ！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 2,
        globalStageNumber: 5,
        globalId: 'stage-5',
        title: '2桁・3桁 × 1桁の筆算',
        subtitle: 'くり上がりと空位0の処理',
        description: '一の位から順にかけてくり上がりを足そう。真ん中に0がある筆算（408×6など）も攻略！',
        operator: '×',
        displayFormat: 'column',
        miniLesson: {
          title: '2〜3桁×1桁の筆算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】かける → くり上がりをたす！',
              body: '一の位から順番にかけていこう。真ん中に「0」がある数（例: 408 × 6）では、0に何をかけても0だから、一の位からくり上がった数をそのまま十の位に書くよ！',
              ttsText: 'かける、くり上がる、足す！この順番を守ればどんな大きな数も大丈夫だよ。',
              visualType: 'mult_1digit'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】くり上がりメモ',
              question: '38 × 4 で、一の位は 8 × 4 = 32。十の位にメモするくり上がりは？',
              choices: [
                { id: 'A', label: '3', isCorrect: true, feedback: 'ピンポン！大正解！32の十の位の「3」をくり上がりとしてメモするね！' },
                { id: 'B', label: '2', isCorrect: false, feedback: 'おしい！2は一の位の答えに書く数字だよ。十の位に送る数を考えよう！' }
              ],
              hint: '32のうち、一の位に書くのは2、十の位に送るのは…？',
              ttsText: '38かける4で、一の位は8かける4で32。十の位にメモするくり上がりはどっち？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【九九を計算したあとに、くり上がりを足す！】0の位でもくり上がりを忘れずに！',
              ttsText: '今日の必殺技！九九を計算したあとに、くり上がりを足す！ゼロの位でもくり上がりを忘れないでね！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 2,
        globalStageNumber: 6,
        globalId: 'stage-6',
        title: '2桁 × 2桁の筆算',
        subtitle: '2段の部分積と位のシフト',
        description: '一の位をかけた1段目と、十の位をかけた2段目（左に1桁ずらす）を足し合わせよう！',
        operator: '×',
        displayFormat: 'column',
        miniLesson: {
          title: '2桁×2桁の筆算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】2段目は十の位の下から書き始める！',
              body: 'かける数の「一の位」をかけた1段目と、「十の位」をかけた2段目を書いて足し算するよ。2段目は「何十」をかけているから、左に1マスずらして十の位の下から書こう！',
              ttsText: '十の位をかけた答えは、十の位の下から書くんだ。位のズレに注目しよう！',
              visualType: 'mult_2digit_shift'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】2段目の書く位置',
              question: '23 × 14 の筆算で、十の位の「1」をかけた2段目の答えはどこから書き始める？',
              choices: [
                { id: 'A', label: '一の位の下', isCorrect: false, feedback: 'おしい！十の位の1は本当は「10」だから、一の位をあけて書き始めるよ！' },
                { id: 'B', label: '十の位の下', isCorrect: true, feedback: 'ピンポン！大正解！十の位の下から書き始めるのが最大のポイントだね！' }
              ],
              hint: '23 × 10 = 230 だから、3は十の位に来るね！',
              ttsText: '23かける14の筆算で、十の位の1をかけた答えはどこから書き始めるかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【十の位をかけたら十の位の下から書く！】段のズレが筆算成功の最大のカギ！',
              ttsText: '今日の必殺技！十の位をかけたら十の位の下から書く！段のズレが成功のカギだよ！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 3,
    id: 'world-3',
    title: 'わり算とあまりラボ',
    subtitle: 'あまりのあるわり算・2桁÷1桁・3桁÷1桁筆算',
    themeColor: '#4caf50',
    icon: '🧭',
    description: '「たてる・かける・ひく・おろす」の4ステップと、あまりのルール・検算を極めよう！',
    stages: [
      {
        stageId: 1,
        worldId: 3,
        globalStageNumber: 7,
        globalId: 'stage-7',
        title: 'あまりのあるわり算と検算',
        subtitle: 'あまり < わる数 の絶対ルール',
        description: '九九の逆算から商とあまりを求めよう。「わる数×商＋あまり＝わられる数」で検算！',
        operator: '÷',
        displayFormat: 'horizontal',
        miniLesson: {
          title: 'あまりのあるわり算の基本',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】あまりは絶対に「わる数」より小さい！',
              body: '53 ÷ 7 なら、7の段で53を超えない一番近い「7 × 7 = 49」を見つけよう。53 - 49 = 4 で、あまり4はわる数の7より小さいからバッチリ！',
              ttsText: 'あまりは割る数より必ず小さくなるよ。検算の式で確かめよう！',
              visualType: 'div_remainder_rule'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】あまりの大きさチェック',
              question: '「7」でわった計算のとき、あまりとして正しいのはどっち？',
              choices: [
                { id: 'A', label: 'あまり 5', isCorrect: true, feedback: 'ピンポン！大正解！5はわる数の7より小さいから正しいあまりだね！' },
                { id: 'B', label: 'あまり 8', isCorrect: false, feedback: 'おしい！8の中にはまだ7が1こ入るね。あまりは7より小さくしよう！' }
              ],
              hint: 'あまりが7以上だったら、もう1回7で割れるよ！',
              ttsText: '7でわった計算。あまりとして正しいのはどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【あまり ＜ わる数！】検算「わる数×商＋あまり＝わられる数」で100%確認！',
              ttsText: '今日の必殺技！あまりは割る数より小さい！検算の式で確かめれば完璧だよ！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 3,
        globalStageNumber: 8,
        globalId: 'stage-8',
        title: '2桁 ÷ 1桁の筆算',
        subtitle: 'たてる・かける・ひく・おろす',
        description: '十の位から順番に「①たてる→②かける→③ひく→④おろす」の4拍子で解き進めよう！',
        operator: '÷',
        displayFormat: 'column',
        miniLesson: {
          title: '2桁÷1桁の筆算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】わり算筆算の4ステップ呪文！',
              body: 'わり算の筆算は上の位（十の位）から順番に計算するよ。「①商をたてる → ②かける → ③ひく → ④次の位をおろす」の4拍子をくり返そう！',
              ttsText: 'たてる、かける、ひく、おろす！この四拍子のリズムを唱えながら解こう！',
              visualType: 'div_4steps'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】4ステップの順番',
              question: '筆算で商を「たてた」あと、すぐ次にするステップはどっち？',
              choices: [
                { id: 'A', label: 'ひく', isCorrect: false, feedback: 'おしい！引く前に、わる数とたてた商をかけ算して下に書くよ！' },
                { id: 'B', label: 'かける', isCorrect: true, feedback: 'ピンポン！大正解！「たてる → かける → ひく → おろす」の順番だね！' }
              ],
              hint: '「たてる・○○○・ひく・おろす」の2番目は？',
              ttsText: '商をたてたあと、次にするステップはどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【たてる・かける・ひく・おろす！】4拍子のリズムで十の位から一の位へ！',
              ttsText: '今日の必殺技！たてる、かける、ひく、おろす！このリズムで解き進めよう！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 3,
        globalStageNumber: 9,
        globalId: 'stage-9',
        title: '3桁 ÷ 1桁の筆算',
        subtitle: '商に0がたつ筆算と2桁商',
        description: '百の位に商がたたない時や、途中の十の位に「0」がたつパターン（624÷3=208など）を完全攻略！',
        operator: '÷',
        displayFormat: 'column',
        miniLesson: {
          title: '3桁÷1桁の筆算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】割れない位にはガードマン「0」をたてる！',
              body: '624 ÷ 3 のように、百の位（6÷3=2）のあと、おろした十の位「2」が3で割れない時は、商の十の位に必ず「0」をたてよう！0を抜かすと28になって桁がズレちゃうぞ！',
              ttsText: '割れない位にはゼロを立てる！ゼロは位を守る大切なガードマンだよ。',
              visualType: 'div_zero_in_quotient'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】割れない位が出たとき',
              question: '百の位を計算したあと、十の位をおろしたらわる数より小さくて割れない！どうする？',
              choices: [
                { id: 'A', label: '商の十の位に「0」をたてる', isCorrect: true, feedback: 'ピンポン！大正解！商に0をたててから、次の一の位をおろすね！' },
                { id: 'B', label: '何も書かずに次の位へ行く', isCorrect: false, feedback: 'おしい！何も書かないと商の桁が1つ減ってズレてしまうよ！' }
              ],
              hint: '位を守るガードマンの数字はなにかな？',
              ttsText: '百の位から順に計算して、割れない位があったらどうするかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【割れない時は商に0をたてて次をおろす！】位のガードマン「0」を忘れずに！',
              ttsText: '今日の必殺技！割れない時は商にゼロを立てて次をおろす！位のガードマンを忘れずにね！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 4,
    id: 'world-4',
    title: '2桁わり算・見積もりラボ',
    subtitle: '何十でわる計算・商の見当づけ・仮商の自己修正',
    themeColor: '#9c27b0',
    icon: '🔭',
    description: '小学4年生最大の難関！わる数を見積もって仮の商をたて、自分で修正するプロ技を習得しよう！',
    stages: [
      {
        stageId: 1,
        worldId: 4,
        globalStageNumber: 10,
        globalId: 'stage-10',
        title: '何十でわる計算とあまり',
        subtitle: '0を消す工夫とあまりの位',
        description: '両方から0を1個ずつ隠して商を見つけよう。あまりには隠した0を戻すのを忘れずに！',
        operator: '÷',
        displayFormat: 'horizontal',
        miniLesson: {
          title: '何十でわる計算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】商は0を隠して計算、あまりには0を戻す！',
              body: '170 ÷ 30 なら、両方の0を隠して「17 ÷ 3 = 5 あまり 2」と考えよう。ただし、10のまとまりが2こ余っているから、本当のあまりは0を戻して「20」になるよ！',
              ttsText: '両方の数からゼロを一個ずつ取ると、いつもの九九で商が見つかるよ！あまりにはゼロを戻してね。',
              visualType: 'div_by_tens_remainder'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】何十でわる計算',
              question: '80 ÷ 20 の商（答え）は、どっちの計算と同じになる？',
              choices: [
                { id: 'A', label: '8 ÷ 2', isCorrect: true, feedback: 'ピンポン！大正解！両方から0を1個ずつ消した 8 ÷ 2 = 4 と同じだね！' },
                { id: 'B', label: '80 ÷ 2', isCorrect: false, feedback: 'おしい！片方だけ0を消すと10倍違ってしまうよ。両方から同じ数だけ0を消そう！' }
              ],
              hint: '10のまとまりで考えると、80は10が8こ、20は10が2こだね！',
              ttsText: '80わる20の答えは、どっちの計算と同じかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【0を隠して商を出し、あまりには0を戻す！】170÷30＝5 あまり 20！',
              ttsText: '今日の必殺技！ゼロを隠して商を出し、あまりにはゼロを戻す！これでミスゼロだ！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 4,
        globalStageNumber: 11,
        globalId: 'stage-11',
        title: '2桁 ÷ 2桁の見当づけ',
        subtitle: 'およその何十で商を予測',
        description: 'わる数を四捨五入して「およそ何十」とみて、商をピタッと見当づけしよう！',
        operator: '÷',
        displayFormat: 'column',
        miniLesson: {
          title: '2桁÷2桁の筆算（商の見当）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】わる数を「およそ何十」に丸めて見当づけ！',
              body: '84 ÷ 21 なら、わる数の21を「およそ20」とみて、「80 ÷ 20 = 4」から商は「4」と見当をつけよう！18や19なら「およそ20」に切り上げて考えると一発で決まるよ！',
              ttsText: '割る数を約何十と考えて、商の見当をつけよう。八十割る二十なら約四だね！',
              visualType: 'div_estimate_round'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】わる数の見積もり',
              question: '73 ÷ 21 の商の見当をつける時、わる数の「21」をおよそいくつと考える？',
              choices: [
                { id: 'A', label: 'およそ 20', isCorrect: true, feedback: 'ピンポン！大正解！21は20に近いから、70 ÷ 20 で商は3と見当がつくね！' },
                { id: 'B', label: 'およそ 30', isCorrect: false, feedback: 'おしい！21の一の位は1だから、切り捨てて20にするほうがずっと近いよ！' }
              ],
              hint: '21は20と30のどっちに近いかな？',
              ttsText: '73わる21の商の見当をつける時、21をおよそいくつと考えるかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【四捨五入でおよその何十にして見当づけ！】見当がついたら実際に掛けて確かめよう！',
              ttsText: '今日の必殺技！四捨五入でおよその何十にして見当づけ！見当がついたら掛けて確かめよう！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 4,
        globalStageNumber: 12,
        globalId: 'stage-12',
        title: '仮の商の自己修正',
        subtitle: '大きすぎ・小さすぎを＋1／－1修正',
        description: '仮の商をかけて引けない時は商を1減らし、あまりが大きすぎる時は商を1増やして自己修正！',
        operator: '÷',
        displayFormat: 'column',
        miniLesson: {
          title: '仮の商の修正',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】仮の商がズレても大丈夫！＋1・－1で直せる！',
              body: '87 ÷ 29 で商を「4」とたてると、29 × 4 = 116 で87から引けないね！「引けない＝商が大きすぎた」から、商を1減らして「3」に直そう。逆にあまりがわる数以上になったら商を1増やそう！',
              ttsText: '掛け算して引けなかったら商が大きすぎた証拠。一小さくしてリトライしよう！',
              visualType: 'div_self_adjust'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】仮の商の修正方法',
              question: 'たてた商をわる数にかけたら、わられる数より大きくなって引き算できない！どうする？',
              choices: [
                { id: 'A', label: '商を 1 小さくする', isCorrect: true, feedback: 'ピンポン！大正解！商が大きすぎたから、1減らせば引けるようになるよ！' },
                { id: 'B', label: '商を 1 大きくする', isCorrect: false, feedback: 'おしい！もっと大きくすると積がさらに増えてしまうよ。1減らしてみよう！' }
              ],
              hint: '引けないということは、商を取りすぎたということだね！',
              ttsText: 'たてた商をかけたら、わられる数より大きくなっちゃった！どうするかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【引けなければ商を-1、あまりが大きければ商を+1！】自分で気づいて直せたら天才研究員！',
              ttsText: '今日の必殺技！引き算できなかったら商を一小さく修正！自分で気づいて直せたら天才研究員だよ！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 5,
    id: 'world-5',
    title: '計算のきまり・四則混合ラボ',
    subtitle: 'カッコ・＋－×÷混合・計算の工夫',
    themeColor: '#e91e63',
    icon: '👑',
    description: 'カッコやかけ算・わり算の優先ルールと、100をつくるスマートな計算の工夫をマスターしよう！',
    stages: [
      {
        stageId: 1,
        worldId: 5,
        globalStageNumber: 13,
        globalId: 'stage-13',
        title: 'カッコのある計算と順序',
        subtitle: '( ) の中を最優先で計算',
        description: '式の中に ( ) があったら最優先！カッコの中を先に計算して式をシンプルにしよう。',
        operator: 'mixed',
        displayFormat: 'tree',
        miniLesson: {
          title: '（かっこ）のある計算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】計算の順番ナンバーワンは（かっこ）の中！',
              body: '100 - (35 + 28) のような式では、左から計算するのではなく、（かっこ）の中の「35 + 28 = 63」を1番最初に計算するよ！そのあと「100 - 63 = 37」を解こう。',
              ttsText: 'カッコがある計算は、カッコの中が絶対最優先！真っ先に計算しよう。',
              visualType: 'order_parens'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】どこから先に計算する？',
              question: '50 - (10 + 20) は、どこから先に計算する？',
              choices: [
                { id: 'A', label: '50 - 10', isCorrect: false, feedback: 'おしい！カッコがある時は、左からではなくカッコの中を先に計算するよ！' },
                { id: 'B', label: '10 + 20', isCorrect: true, feedback: 'ピンポン！大正解！カッコの中の 10 + 20 = 30 を先に計算して、50 - 30 = 20 だね！' }
              ],
              hint: '（かっこ）は「ここを一番先に計算して！」のサインだよ！',
              ttsText: '50ひくカッコ10足す20は、どこから先に計算するかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【かっこは最優先ガード！】どんな計算でも（かっこ）の中が1番最初！',
              ttsText: '今日の必殺技！かっこは最優先ガード！どんな計算があってもカッコの中が1番最初だよ！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 5,
        globalStageNumber: 14,
        globalId: 'stage-14',
        title: '＋－×÷ 混合計算',
        subtitle: 'かけ算・わり算は＋－より先！',
        description: 'カッコがない式では「かけ算・わり算」を「たし算・ひき算」より先に計算しよう！',
        operator: 'mixed',
        displayFormat: 'tree',
        miniLesson: {
          title: '＋－×÷のまざった計算',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】かけ算・わり算は、たし算・ひき算より強い！',
              body: '20 + 15 × 3 の計算で、左から 20 + 15 を計算しちゃうのは罠！かけ算・わり算が優先だから、先に「15 × 3 = 45」を計算して、「20 + 45 = 65」にするよ！',
              ttsText: '掛け算と割り算は、足し算や引き算より強い！先に計算してしまおう。',
              visualType: 'order_mixed'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】優先順位チェック',
              question: '12 + 4 × 3 の計算、先に計算するのはどっち？',
              choices: [
                { id: 'A', label: '12 + 4', isCorrect: false, feedback: 'おしい！たし算よりかけ算のほうが優先順位が高いよ！' },
                { id: 'B', label: '4 × 3', isCorrect: true, feedback: 'ピンポン！大正解！4 × 3 = 12 を先に計算して、12 + 12 = 24 になるね！' }
              ],
              hint: 'たし算とかけ算、強いのはどっちだったかな？',
              ttsText: '12足す4かける3の計算、先に計算するのはどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【かけ算・わり算が優先、たし算・ひき算はあと！】先に計算する場所に線を引こう！',
              ttsText: '今日の必殺技！かけ算・わり算が優先、たし算・ひき算はあと！左から順番とは限らないぞ！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 5,
        globalStageNumber: 15,
        globalId: 'stage-15',
        title: '計算の工夫（分配・結合法則）',
        subtitle: '25×4＝100・キリのいい数づくり',
        description: '25×4=100 や分配法則を使って、100のまとまりをつくってスマートに暗算しよう！',
        operator: 'mixed',
        displayFormat: 'tree',
        miniLesson: {
          title: '計算の工夫（まとめ）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】「100」のまとまりを作ると暗算に変身！',
              body: '「25 × 4 = 100」は大発明！25 × 36 なら「25 × 4 × 9 = 100 × 9 = 900」にできるよ。また「37 × 4 + 63 × 4」も「(37 + 63) × 4 = 100 × 4 = 400」にまとめられるね！',
              ttsText: '二十五掛ける四は百！キリのいい数を作ると、暗算で解けちゃうよ！',
              visualType: 'smart_calc_100'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】スマート計算の工夫',
              question: '25 × 17 × 4 をカンタンに暗算する工夫はどっち？',
              choices: [
                { id: 'A', label: '25 × 4 = 100 を先に計算する', isCorrect: true, feedback: 'ピンポン！大正解！100 × 17 = 1700 になって一瞬で答えが出るね！' },
                { id: 'B', label: '17 × 4 を筆算する', isCorrect: false, feedback: 'おしい！それでも解けるけれど、25と4を先にペアにすると100ができて超カンタンになるよ！' }
              ],
              hint: '25とペアにすると100になる魔法の数字は？',
              ttsText: '25かける17かける4をカンタンに計算する工夫はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【25×4＝100 や (a+b)×c で100をつくる！】工夫して計算博士になろう！',
              ttsText: '今日の必殺技！25かける4は100や、かっこのまとめ技で100をつくろう！これで君も計算博士だ！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 6,
    id: 'world-6',
    title: '小数ラボ',
    subtitle: '小数の仕組み・たし算・ひき算',
    themeColor: '#009688',
    icon: '💧',
    description: '0.1や0.01の世界を探検！小数点の位置をそろえて計算する力を身につけよう！',
    stages: [
      {
        stageId: 1,
        worldId: 6,
        globalStageNumber: 16,
        globalId: 'stage-16',
        title: '小数の仕組み',
        subtitle: '0.1が何こ分？ 位の数字を読もう',
        description: '0.1が10こ集まると1になるよ。数を位に分けて、小数の正体をつかもう！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        usesDecimal: true,
        answerLabel: 'こたえ',
        miniLesson: {
          title: '小数の仕組み（0.1と0.01）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】0.1が10こ集まると「1」！',
              body: '1を10等分した1つ分が「0.1」。0.1が10こ集まると1になるよ。さらに0.1を10等分すると「0.01」。3.47は「0.1が34こ」と「0.01が7こ」に分けて考えられるね！',
              ttsText: '0.1が10こ集まると1になるよ。0.1を10等分すると0.01。小数は位に分けると正体がわかるよ！',
              visualType: 'decimal_structure'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】0.1が何こ分？',
              question: '0.1 が 23 こ集まった数はいくつ？',
              choices: [
                { id: 'A', label: '23', isCorrect: false, feedback: 'おしい！0.1は「1を10等分した1つ分」だよ。23こ集まると1をこえるかな？' },
                { id: 'B', label: '2.3', isCorrect: true, feedback: 'ピンポン！大正解！0.1が20こで2、0.1が3こで0.3。合わせて2.3だね！' }
              ],
              hint: '0.1が10こで1。20こなら2になるね！',
              ttsText: '0.1が23こ集まった数はいくつかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【0.1が10こで1、0.01が10こで0.1！】位に分けると小数の大きさが見えてくる！',
              ttsText: '今日の必殺技！0.1が10こで1！位に分けて考えると小数はこわくないよ！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 6,
        globalStageNumber: 17,
        globalId: 'stage-17',
        title: '小数のたし算',
        subtitle: '小数点をそろえて位ごとに計算',
        description: '小数点をたてにそろえるのが鉄則！0.01の位から順に計算して、くり上がりをメモしよう。',
        operator: '+',
        displayFormat: 'column',
        usesDecimal: true,
        miniLesson: {
          title: '小数のたし算（小数点をそろえる）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】小数点はたてにピシッとそろえる！',
              body: '小数のたし算は、小数点の位置をそろえて位ごとに計算するよ。3.25 + 1.48 なら、0.01の位は 5 + 8 = 13 で「3を書いて1くり上がり」。整数の筆算と同じだけど、小数点を落とさないのが一番のコツ！',
              ttsText: '小数のたし算は小数点をそろえるのが鉄則！位ごとに計算して、答えにも小数点を書こう！',
              visualType: 'decimal_add'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】くり上がりの確認',
              question: '0.7 + 0.5 の 0.1の位は 7 + 5 = 12。答えの 0.1の位に書く数字はどっち？',
              choices: [
                { id: 'A', label: '2', isCorrect: true, feedback: 'ピンポン！大正解！12の「2」を書いて、1は一の位へくり上がり。答えは1.2だね！' },
                { id: 'B', label: '12', isCorrect: false, feedback: 'おしい！1つの位に書ける数字は1つだけ。10のまとまりは左の位へお引っ越しだよ！' }
              ],
              hint: '12は「0.1が12こ」=「1と0.2」。一の位に送るのはいくつかな？',
              ttsText: '0.7たす0.5の計算、0.1の位に書く数字はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【小数点をそろえて位ごとに計算、答えにも小数点！】小数点を無視して整数みたいにしない！',
              ttsText: '今日の必殺技！小数点をそろえて計算、答えにも小数点を忘れずに！ミッションスタート！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 6,
        globalStageNumber: 18,
        globalId: 'stage-18',
        title: '小数のひき算',
        subtitle: 'くり下がりと0からのひき算',
        description: '引けない時は上の位から借りてくる！1 - 0.37 のような、整数から小数を引く計算も攻略しよう。',
        operator: '-',
        displayFormat: 'column',
        usesDecimal: true,
        miniLesson: {
          title: '小数のひき算（くり下がり）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】引けない時は「10」を借りる（小数でも同じ）！',
              body: '0.52 - 0.27 の 0.01の位は 2 - 7 で引けない。そんな時は0.1の位から「10」を借りて 12 - 7 = 5。借りた0.1の位は1減るよ。1 - 0.37 のような計算は、1を「0.1が10こ、0.01が100こ」と見ると考えやすいね！',
              ttsText: '小数のひき算も、引けない時は上の位から十を借りてくるよ。整数から引く時は位に分けて考えよう！',
              visualType: 'decimal_sub'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】借りたあとの位',
              question: '0.5 - 0.27 で 0.01の位が引けないので、0.1の位の5から10を借りたよ。0.1の位の計算はどっち？',
              choices: [
                { id: 'A', label: '5 - 2', isCorrect: false, feedback: 'おしい！10を貸したから、0.1の位は5ではなく4になっているよ！' },
                { id: 'B', label: '4 - 2', isCorrect: true, feedback: 'ピンポン！大正解！貸した分を引いて4 - 2 = 2。答えは0.23だね！' }
              ],
              hint: 'となりに貸したら、自分の位は1減るんだったね！',
              ttsText: '0.5ひく0.27の計算、借りたあとの0.1の位はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【引けない時は10を借りる、貸した位は1減らす！】小数点をそろえるのも忘れずに！',
              ttsText: '今日の必殺技！引けない時は十を借りる！貸した位が1減るのを忘れないでね！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 7,
    id: 'world-7',
    title: '分数パーク',
    subtitle: '分数の仕組み・同分母のたし算・ひき算',
    themeColor: '#ff5722',
    icon: '🍕',
    description: 'ピザを等分すると分数の世界！分母と分子の意味をつかんで、同分母のたし算・ひき算を攻略しよう！',
    stages: [
      {
        stageId: 1,
        worldId: 7,
        globalStageNumber: 19,
        globalId: 'stage-19',
        title: '分数の仕組み',
        subtitle: '分母と分子・単位分数',
        description: '1を等分したうちの何こ分か。分母は等分した数、分子は何こ分かを読み取ろう！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        usesFraction: true,
        miniLesson: {
          title: '分数の仕組み（分母と分子）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】分母は「等分した数」、分子は「何こ分」！',
              body: '1を7等分した1つ分が「1/7」。分数の下の数（分母）は1を何等分したか、上の数（分子）はその何こ分か表すよ。3/7 は 1/7 が3こ分という意味だね！',
              ttsText: '分母は1を何等分したか、分子はその何こ分か表すよ。3/7は1/7が3こ分だね！',
              visualType: 'fraction_structure'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】単位分数の数',
              question: '5/9 は 1/9 が何こ分？',
              choices: [
                { id: 'A', label: '9', isCorrect: false, feedback: 'おしい！9は分母で「9等分した」という意味だよ。何こ分かは上の数を見てみよう！' },
                { id: 'B', label: '5', isCorrect: true, feedback: 'ピンポン！大正解！分子の5が、1/9 が5こ分という意味だね！' }
              ],
              hint: '分子は「何こ分」、分母は「何等分したか」だね！',
              ttsText: '5/9は1/9が何こ分かな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【分母＝等分した数、分子＝何こ分！】単位分数が何こ分かで分数を読む！',
              ttsText: '今日の必殺技！分母は等分した数、分子は何こ分！単位分数で分数を読もう！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 7,
        globalStageNumber: 20,
        globalId: 'stage-20',
        title: '同分母のたし算',
        subtitle: '分母はそのまま・分子だけ足す',
        description: '分母が同じ分数のたし算は、単位分数の数を合わせるだけ。分母同士を足さないのが最大のコツ！',
        operator: '+',
        displayFormat: 'horizontal',
        usesFraction: true,
        miniLesson: {
          title: '同分母のたし算（分母はそのまま）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】分母はそのまま、分子だけを足す！',
              body: '2/7 + 3/7 は、1/7 が「2こ」と「3こ」で合わせて5こ分。だから答えは 5/7 だよ。分母の7は「7等分した」という意味だから変わらない。分母同士を足して14にしないのが一番のコツ！',
              ttsText: '同分母のたし算は、分母はそのままで分子だけを足すよ。分母同士は足さないでね！',
              visualType: 'fraction_add'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】答えの分母',
              question: '3/8 + 2/8 の答えの分母はどっち？',
              choices: [
                { id: 'A', label: '16', isCorrect: false, feedback: 'おしい！分母同士を足してしまったね。分母は「8等分した」のままで変わらないよ！' },
                { id: 'B', label: '8', isCorrect: true, feedback: 'ピンポン！大正解！分母は8のまま、分子は 3 + 2 = 5。答えは5/8だね！' }
              ],
              hint: '分母は「何等分したか」。たし算でも等分の数は変わらないね！',
              ttsText: '3/8たす2/8の答えの分母はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【分母はそのまま、分子だけ足す！】分母同士は絶対に足さない！',
              ttsText: '今日の必殺技！分母はそのまま、分子だけ足す！ミッションスタート！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 7,
        globalStageNumber: 21,
        globalId: 'stage-21',
        title: '同分母のひき算',
        subtitle: '帯分数と借りる計算',
        description: '分母が同じ分数のひき算も分子だけを引くよ。引けない時は帯分数を仮分数に直してから計算しよう！',
        operator: '-',
        displayFormat: 'horizontal',
        usesFraction: true,
        miniLesson: {
          title: '同分母のひき算（仮分数に直す）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】引けない時は帯分数を仮分数に直す！',
              body: '1と2/7 - 4/7 は、分子の 2 - 4 が引けないね。そんな時は 1と2/7 を仮分数の 9/7 に直してから引くと 5/7 になるよ。整数の1は「1/7 が7こ分」に変身できるのがポイント！',
              ttsText: '引けない時は帯分数を仮分数に直してから引くよ。整数の1は分母の数こ分に変身できるよ！',
              visualType: 'fraction_sub'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】仮分数の分子',
              question: '1と1/5 を仮分数に直すと、分子はどっち？',
              choices: [
                { id: 'A', label: '5', isCorrect: false, feedback: 'おしい！5は「1を1/5が5こ分に変身させた数」。もとの分子の1を足すのを忘れていないかな？' },
                { id: 'B', label: '6', isCorrect: true, feedback: 'ピンポン！大正解！1は1/5が5こ分、それに1こ分を足して6。答えは6/5だね！' }
              ],
              hint: '1 = 5/5 だから、1/5 が「5 + 1」こ分だね！',
              ttsText: '1と1/5を仮分数に直すと、分子はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【引けない時は仮分数に直して、分子だけ引く！】分母はひき算でもそのまま！',
              ttsText: '今日の必殺技！引けない時は仮分数に直す！分母はそのままで分子だけ引こう！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 8,
    id: 'world-8',
    title: '大きな数とがい数ラボ',
    subtitle: '大きな数の位取り・四捨五入・概算',
    themeColor: '#5e35b1',
    icon: '🚀',
    description: '億や兆の大きな数と、がい数・概算をマスター！数の大きさを見抜く力を身につけよう！',
    stages: [
      {
        stageId: 1,
        worldId: 8,
        globalStageNumber: 22,
        globalId: 'stage-22',
        title: '大きな数の仕組み',
        subtitle: '万・億・兆の位取りと10倍の関係',
        description: '位取り表で大きな数を読もう。10倍・100倍・1/10で0がどう変わるかも攻略！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        miniLesson: {
          title: '大きな数の仕組み（万・億・兆）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】数は「万・億・兆」のまとまりで読む！',
              body: '大きな数は、右から4桁ずつ区切ると読みやすいよ。一万、十万、百万、千万の次が一億。一億は一万が10000こ分！位の名前は「一、十、百、千」が万・億・兆のまとまりごとに繰り返されるよ。',
              ttsText: '大きな数は右から4桁ずつ区切って、万・億・兆のまとまりで読もう。一億は一万が10000こ分だよ！',
              visualType: 'large_place_value'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】一億は何こ分？',
              question: '1億は、1万が何こ分？',
              choices: [
                { id: 'A', label: '1000', isCorrect: false, feedback: 'おしい！1万→10万→100万→1000万→1億と、10倍が4回分だよ。0の数を数えてみよう！' },
                { id: 'B', label: '10000', isCorrect: true, feedback: 'ピンポン！大正解！1億は1万の10000倍。0が4こ分ちがうね！' }
              ],
              hint: '1万に0を4こつけると1億になるね！',
              ttsText: '1億は、1万が何こ分かな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【位は右から数える！】4桁ずつのまとまりで万・億・兆をつかむ！',
              ttsText: '今日の必殺技！位は右から数える！4桁ずつのまとまりで大きな数を読もう！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 8,
        globalStageNumber: 23,
        globalId: 'stage-23',
        title: 'がい数と四捨五入',
        subtitle: '〜の位までのがい数・上から○桁のがい数',
        description: '四捨五入は「1つ下の位」を見るのが鉄則。がい数になる数の範囲も考えよう！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        miniLesson: {
          title: 'がい数と四捨五入（見る位がカギ）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】四捨五入は「1つ下の位」を見る！',
              body: '百の位までのがい数にする時は、十の位の数字を見よう。4以下なら切り捨て、5以上なら切り上げ。どの位までのがい数にするかと、見る位をまちがえないのが一番のコツだよ！',
              ttsText: '四捨五入は、残したい位の1つ下の数字を見るよ。4以下は切り捨て、5以上は切り上げだね！',
              visualType: 'rounding_place'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】がい数に直そう',
              question: '3,567 を百の位までのがい数にすると？',
              choices: [
                { id: 'A', label: '3,500', isCorrect: false, feedback: 'おしい！十の位は6で、5以上だから切り上げるよ。百の位の5が6になるね！' },
                { id: 'B', label: '3,600', isCorrect: true, feedback: 'ピンポン！大正解！十の位の6を見て切り上げて3,600だね！' }
              ],
              hint: '百の位まで残すから、見るのは十の位の「6」だね！',
              ttsText: '3,567を百の位までのがい数にするとどうなるかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【見るのは1つ下の位、5以上で切り上げ！】どの位までのがい数か先に確認！',
              ttsText: '今日の必殺技！四捨五入は1つ下の位を見る！5以上で切り上げだよ！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 8,
        globalStageNumber: 24,
        globalId: 'stage-24',
        title: '概算（見積もり）',
        subtitle: 'がい数を使った買い物の見積もり',
        description: '値段をがい数に直してから計算すると、合計の見当がすぐにつくよ！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        miniLesson: {
          title: '概算（がい数で見積もる）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】見積もりは「がい数にしてから計算」！',
              body: '298円は約300円、512円は約500円。値段をがい数に直してから足すと、暗算で合計の見当がつくよ。正確な計算の前に見積もると、大きな計算まちがいに気づけるのが研究員の技！',
              ttsText: '買い物の見積もりは、値段をがい数に直してから計算するよ。見当をつけてから正確に計算しよう！',
              visualType: 'estimation_shopping'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】りんごの見積もり',
              question: '198円のりんごを4こ買います。百の位までのがい数にして見積もると、約何円？',
              choices: [
                { id: 'A', label: '約800円', isCorrect: true, feedback: 'ピンポン！大正解！198円は約200円。200 × 4 = 800円だね！' },
                { id: 'B', label: '792円', isCorrect: false, feedback: 'おしい！それは正確な計算の答えだね。見積もりでは、まず198円を約200円に直してからかけ算しよう！' }
              ],
              hint: '198円を百の位までのがい数にすると約200円だね！',
              ttsText: '198円のりんごを4こ買う見積もりは、約何円かな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【がい数に直してから計算！】見積もってから正確に計算するとまちがいに気づける！',
              ttsText: '今日の必殺技！がい数に直してから計算！見積もり上手になろう！'
            }
          ]
        }
      }
    ]
  },
  {
    worldId: 9,
    id: 'world-9',
    title: '文章題ラボ',
    subtitle: '読んで、式を立てて、答える',
    themeColor: '#00796b',
    icon: '📖',
    description: '文章を読んで数量の関係をつかみ、式を立てて解く力を身につけよう！あまりの判断と単位換算も攻略！',
    stages: [
      {
        stageId: 1,
        worldId: 9,
        globalStageNumber: 25,
        globalId: 'stage-25',
        title: '立式マスター',
        subtitle: '文章を読んで式を立てる',
        description: '「ぜんぶで」「残り」「○ずつ△つ分」「同じ数ずつ分ける」。言葉から計算を見つけよう！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        miniLesson: {
          title: '立式マスター（言葉が計算のヒント）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】言葉が計算のヒント！',
              body: '「ぜんぶで・合わせて」はたし算、「残り・ちがいは」はひき算、「○こずつ△つ分」はかけ算、「同じ数ずつ分ける」はわり算だよ。もんだいの言葉に注目するのが立式のコツ！',
              ttsText: '言葉が計算のヒントだよ。ぜんぶではたし算、残りはひき算、ずつはかけ算、分けるはわり算だね！',
              visualType: 'word_problem_ops'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】式を選ぼう',
              question: '「シールが24まいあります。6人で同じ数ずつ分けます。1人は何まい？」の式はどっち？',
              choices: [
                { id: 'A', label: '24 ÷ 6', isCorrect: true, feedback: 'ピンポン！大正解！「同じ数ずつ分ける」からわり算だね！' },
                { id: 'B', label: '24 × 6', isCorrect: false, feedback: 'おしい！24まいを分けるのに、答えが24より大きくなるのはおかしいね。「分ける」はわり算だよ！' }
              ],
              hint: '「同じ数ずつ分ける」は何算だったかな？',
              ttsText: 'シール24まいを6人で同じ数ずつ分ける式はどっちかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【言葉を見て計算を決める！】ぜんぶで→たし算、残り→ひき算、ずつ→かけ算、分ける→わり算！',
              ttsText: '今日の必殺技！言葉を見て計算を決める！式を立ててから計算しよう！'
            }
          ]
        }
      },
      {
        stageId: 2,
        worldId: 9,
        globalStageNumber: 26,
        globalId: 'stage-26',
        title: 'あまりの判断マスター',
        subtitle: '切り上げ・切り捨て・あまりそのもの',
        description: 'わり算のあまりをどうするかは場面で決まるよ。全員が乗れるか、お金が足りるかを考えよう！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        miniLesson: {
          title: 'あまりの判断（場面で決める）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】あまりの扱いは場面で決まる！',
              body: '全員が乗らなければならない時は、あまりの分でもう1台必要だから切り上げ。買える数や取れる数を聞かれたら、足りない分は切り捨て。「あまりは？」と聞かれたら、あまりそのものが答えだよ！',
              ttsText: 'あまりの扱いは場面で決まるよ。全員分なら切り上げ、買える数なら切り捨て、あまりを聞かれたらそのまま答えよう！',
              visualType: 'word_remainder_judge'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】タクシーは何台？',
              question: '23人でタクシーに乗ります。1台に5人まで乗れます。タクシーは何台必要？（23 ÷ 5 = 4 あまり 3）',
              choices: [
                { id: 'A', label: '4台', isCorrect: false, feedback: 'おしい！4台だと3人が乗れなくなってしまうよ。あまりの3人の分も考えよう！' },
                { id: 'B', label: '5台', isCorrect: true, feedback: 'ピンポン！大正解！あまりの3人も乗れるように、もう1台必要だね！' }
              ],
              hint: 'あまりの3人は、どうやって乗るのかな？',
              ttsText: '23人を5人ずつ乗せると何台必要かな？あまりの3人のことも考えよう！'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【あまりは場面で判断！】全員分なら切り上げ、買える数なら切り捨て、あまりを聞かれたらそのまま！',
              ttsText: '今日の必殺技！あまりは場面で判断する！商とあまりを出してから、場面に合わせて決めよう！'
            }
          ]
        }
      },
      {
        stageId: 3,
        worldId: 9,
        globalStageNumber: 27,
        globalId: 'stage-27',
        title: '単位換算の文章題',
        subtitle: 'mとcm・LとmL・kgとg',
        description: '単位がちがう時は、まず小さい単位にそろえてから計算しよう。1m=100cm、1L=1000mL、1kg=1000g！',
        operator: 'mixed',
        displayFormat: 'horizontal',
        miniLesson: {
          title: '単位換算の文章題（そろえてから計算）',
          cards: [
            {
              step: 1,
              type: 'concept',
              title: '【着眼点】単位をそろえてから計算！',
              body: 'mとcmがまざった問題は、全部cmに直してから計算しよう。1mは100cm、1Lは1000mL、1kgは1000g。単位をそろえるのが先で、計算はその後だよ！',
              ttsText: '単位がちがう時は、まず小さい単位にそろえてから計算しよう。1メートルは100センチメートルだよ！',
              visualType: 'word_unit_convert'
            },
            {
              step: 2,
              type: 'quiz',
              title: '【ラボ2択クイズ】2mは何cm？',
              question: '2m は 何cm？',
              choices: [
                { id: 'A', label: '20cm', isCorrect: false, feedback: 'おしい！1mは10cmではなく100cmだよ。0の数に注目しよう！' },
                { id: 'B', label: '200cm', isCorrect: true, feedback: 'ピンポン！大正解！1m = 100cm だから、2m = 200cm だね！' }
              ],
              hint: '1mは何cmだったかな？',
              ttsText: '2メートルは何センチメートルかな？'
            },
            {
              step: 3,
              type: 'summary',
              title: '【攻略まとめ】今日のラボ必殺技！',
              ruleSummary: '【まず単位をそろえる！】m→cmは×100、L→mLとkg→gは×1000！',
              ttsText: '今日の必殺技！まず単位をそろえる！換算してから計算しよう！'
            }
          ]
        }
      }
    ]
  }
];

/**
 * ワールド・ステージIDを正規化する（範囲外は World 1, Stage 1 にフォールバック）
 * @param {number|string} worldIdInput
 * @param {number|string} [stageIdInput]
 * @returns {{ worldId: number, stageId: number, globalStageNumber: number }}
 */
export function normalizeWorldAndStage(worldIdInput, stageIdInput) {
  // ワールド数・総ステージ数はメタデータから導出する（ワールド追加に追随）
  const totalWorlds = WORLDS_METADATA.length;
  const stagesPerWorld = WORLDS_METADATA[0]?.stages.length || 3;
  const totalStages = WORLDS_METADATA.reduce((n, world) => n + world.stages.length, 0);
  let w = Number(worldIdInput);
  let s = Number(stageIdInput);

  if (typeof worldIdInput === 'string') {
    const stageMatch = worldIdInput.match(/^stage-(\d+)$/i);
    const wsMatch = worldIdInput.match(/^w(\d+)[_-]s(\d+)$/i);
    if (stageMatch) {
      const globalNum = parseInt(stageMatch[1], 10);
      if (globalNum >= 1 && globalNum <= totalStages) {
        w = Math.ceil(globalNum / stagesPerWorld);
        s = ((globalNum - 1) % stagesPerWorld) + 1;
      }
    } else if (wsMatch) {
      w = parseInt(wsMatch[1], 10);
      s = parseInt(wsMatch[2], 10);
    }
  }

  if (typeof stageIdInput === 'string') {
    const stageMatch = stageIdInput.match(/^stage-(\d+)$/i);
    if (stageMatch) {
      const globalNum = parseInt(stageMatch[1], 10);
      if (globalNum >= 1 && globalNum <= totalStages) {
        w = Math.ceil(globalNum / stagesPerWorld);
        s = ((globalNum - 1) % stagesPerWorld) + 1;
      }
    }
  }

  // If worldId was valid and stageId was given as a global stage number (e.g., (2, 5))
  if (Number.isInteger(w) && w >= 1 && w <= totalWorlds && Number.isInteger(s) && s >= 4 && s <= totalStages) {
    const expectedWorld = Math.ceil(s / stagesPerWorld);
    if (expectedWorld === w) {
      s = ((s - 1) % stagesPerWorld) + 1;
    }
  }

  if (!Number.isInteger(w) || w < 1 || w > totalWorlds || !Number.isInteger(s) || s < 1 || s > stagesPerWorld) {
    w = 1;
    s = 1;
  }

  return {
    worldId: w,
    stageId: s,
    globalStageNumber: (w - 1) * stagesPerWorld + s
  };
}

/**
 * 全ワールド・ステージのメタデータを取得
 * @returns {typeof WORLDS_METADATA}
 */
export function getWorldsMetadata() {
  return WORLDS_METADATA;
}

/**
 * グローバルステージ番号 (1..総ステージ数) から所属ワールドIDを引く
 * ワールドごとのステージ数は WORLDS_METADATA から導出する (ワールド追加に追随)
 * @param {number} globalStageNumber
 * @returns {number} ワールドID (1未満は先頭ワールド、超過分は最終ワールド)
 */
export function getWorldIdByGlobalStage(globalStageNumber) {
  const n = Number(globalStageNumber);
  if (!Number.isInteger(n) || n < 1) return WORLDS_METADATA[0]?.worldId ?? 1;
  let acc = 0;
  for (const world of WORLDS_METADATA) {
    acc += world.stages.length;
    if (n <= acc) return world.worldId;
  }
  return WORLDS_METADATA[WORLDS_METADATA.length - 1]?.worldId ?? 1;
}

/**
 * 指定されたワールド・ステージのメタデータを取得
 * @param {number|string} worldId
 * @param {number|string} [stageId]
 */
export function getStageMetadata(worldId, stageId) {
  const norm = normalizeWorldAndStage(worldId, stageId);
  const world = WORLDS_METADATA[norm.worldId - 1];
  return world.stages[norm.stageId - 1];
}

/**
 * PROJECT.md の Array 形式と analysis.md の { mode, steps } 形式の両方でアクセス可能な
 * ハイブリッド stepGuide オブジェクトを生成する
 * @param {"column_add_sub" | "column_mult" | "column_div_2digit" | "order_of_ops"} mode
 * @param {Array<object>} rawSteps
 */
function createHybridStepGuide(mode, rawSteps) {
  const stepsArray = rawSteps.map((step, idx) => {
    const stepNumber = step.stepNumber ?? idx + 1;
    const expectedVal = Number(step.expectedStepValue ?? step.expectedValue ?? step.answer ?? 0);
    const title = step.title || step.label || `ステップ ${stepNumber}`;
    const explanation = step.explanation || step.instructionText || step.prompt || '';
    const actionName = step.actionName || 'さきに計算';
    const blankPosition = step.blankPosition || step.id || `step_${stepNumber}`;
    const targetInputId = step.targetInputId || `step_input_${stepNumber}`;
    const hint = step.hint || 'ゆっくり計算して確かめてみよう！';

    const normalizedStep = {
      stepNumber,
      id: step.id || blankPosition,
      title,
      label: title,
      actionName,
      explanation,
      instructionText: explanation,
      prompt: explanation,
      blankPosition,
      targetInputId,
      expectedStepValue: expectedVal,
      expectedValue: expectedVal,
      answer: expectedVal,
      hint
    };

    if (step.carry !== undefined) normalizedStep.carry = step.carry;
    if (step.digit !== undefined) normalizedStep.digit = step.digit;
    if (step.estimatedReference !== undefined) {
      normalizedStep.estimatedReference = step.estimatedReference;
    }
    if (step.correctionTrigger) {
      normalizedStep.correctionTrigger = step.correctionTrigger;
    }
    return normalizedStep;
  });

  Object.defineProperties(stepsArray, {
    mode: { value: mode, enumerable: false, writable: true, configurable: true },
    type: { value: mode, enumerable: false, writable: true, configurable: true },
    steps: { value: stepsArray, enumerable: false, writable: true, configurable: true }
  });

  return stepsArray;
}

/**
 * difficultyLevel と level (1..3) の相互変換
 * @param {object} options
 * @returns {{ level: number, difficultyLevel: "warmup" | "standard" | "hurdle" | "challenge" | "remedial" }}
 */
function resolveDifficulty(options = {}) {
  const validLevels = ['warmup', 'standard', 'hurdle', 'challenge', 'remedial'];
  let difficultyLevel = options.difficultyLevel;
  let level = Number(options.level);

  if (difficultyLevel && validLevels.includes(difficultyLevel)) {
    if (!Number.isInteger(level) || level < 1 || level > 3) {
      if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') level = 1;
      else if (difficultyLevel === 'standard' || difficultyLevel === 'hurdle') level = 2;
      else level = 3;
    }
    return { level, difficultyLevel };
  }

  if (Number.isInteger(level) && level >= 1 && level <= 3) {
    if (level === 1) difficultyLevel = 'warmup';
    else if (level === 2) difficultyLevel = 'standard';
    else difficultyLevel = 'challenge';
    return { level, difficultyLevel };
  }

  const qIdx = Number(options.questionIndex) || 1;
  if (qIdx === 1) return { level: 1, difficultyLevel: 'warmup' };
  if (qIdx === 2) return { level: 2, difficultyLevel: 'standard' };
  if (qIdx === 3) return { level: 2, difficultyLevel: 'hurdle' };
  if (qIdx === 4) return { level: 3, difficultyLevel: 'challenge' };
  return { level: 3, difficultyLevel: 'challenge' };
}

/**
 * 共通の問題オブジェクトビルダー
 */
function buildMathProblem({
  worldId,
  stageId,
  questionIndex = 1,
  level,
  difficultyLevel,
  prompt,
  expression,
  displayFormat,
  operands,
  operator,
  hasRemainder = false,
  hasFraction = false,
  quotient,
  remainder = 0,
  stepMode,
  steps,
  commonTrap,
  errorDiagnostics,
  patternType,
  trapMetadata = {}
}) {
  const uid = `${Date.now().toString(36)}_${problemSequenceCounter++}`;
  const id = `w${worldId}_s${stageId}_q${questionIndex}_${uid}`;
  const isDivision = operator === '÷';
  const expectedAnswer = isDivision
    ? { quotient, remainder, value: quotient }
    : quotient;

  const correctAnswer = {
    value: quotient,
    quotient,
    remainder: isDivision ? remainder : 0
  };

  const stepGuide = createHybridStepGuide(stepMode, steps);

  const normalizedDiagnostics = (errorDiagnostics || []).map((d) => ({
    predictedErrorValue: Number(d.predictedErrorValue),
    ...(d.predictedRemainder !== undefined ? { predictedRemainder: Number(d.predictedRemainder) } : {}),
    reasonCategory: d.reasonCategory || 'calculation_slip',
    adviceMessage: d.adviceMessage || d.hintMessage || 'もう一度ステップを確認してみよう！',
    diagnosis: d.diagnosis || d.adviceMessage || '計算の途中を確かめてみよう',
    hintMessage: d.hintMessage || d.adviceMessage || 'ヒントを使って1ステップずつ解いてみよう！'
  }));

  const normalizedTrap = {
    mistakeValue: Number(commonTrap?.mistakeValue ?? (quotient + 1)),
    ...(commonTrap?.mistakeRemainder !== undefined
      ? { mistakeRemainder: Number(commonTrap.mistakeRemainder) }
      : {}),
    reasonCategory: commonTrap?.reasonCategory || normalizedDiagnostics[0]?.reasonCategory || 'calculation_slip',
    diagnosis: commonTrap?.diagnosis || 'おしい！計算の途中をチェックしてみよう！',
    hintMessage: commonTrap?.hintMessage || 'ステップガイドで順番に確かめてみよう！'
  };

  return {
    id,
    worldId,
    stageId,
    globalStageId: `stage-${(worldId - 1) * 3 + stageId}`,
    questionIndex,
    level,
    difficultyLevel,
    prompt,
    expression,
    displayFormat,
    operands,
    num1: operands[0],
    num2: operands[1],
    operator,
    hasRemainder,
    hasFraction: Boolean(hasFraction),
    expectedAnswer,
    correctAnswer,
    answer: quotient,
    remainder: isDivision ? remainder : 0,
    stepGuide,
    stepGuideMode: stepMode,
    commonTrap: normalizedTrap,
    errorDiagnostics: normalizedDiagnostics,
    patternType,
    trapMetadata
  };
}

// ============================================================================
// Stage Generators (27 Stages)
// ============================================================================

/**
 * Stage 1-1: 3桁・4桁のたし算 (くり上がり1〜3回)
 */
function generateStage1_1({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const is4Digit =
    variationTarget?.trapMetadata?.is4Digit ??
    (difficultyLevel === 'challenge' || level === 3);
  const targetCarries =
    variationTarget?.trapMetadata?.targetCarries ??
    (difficultyLevel === 'warmup' || difficultyLevel === 'remedial'
      ? 1
      : is4Digit
        ? 3
        : 2);

  let A = 458;
  let B = 276;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (!is4Digit) {
      if (targetCarries === 1) {
        // Carry only in ones place
        const a0 = randInt(4, 9, rng);
        const b0 = randInt(10 - a0, 9, rng);
        const a1 = randInt(1, 6, rng);
        const b1 = randInt(1, 8 - a1, rng); // a1 + b1 + 1 <= 9
        const a2 = randInt(1, 5, rng);
        const b2 = randInt(1, 8 - a2, rng);
        A = a2 * 100 + a1 * 10 + a0;
        B = b2 * 100 + b1 * 10 + b0;
      } else {
        // Carry in ones and tens
        const a0 = randInt(4, 9, rng);
        const b0 = randInt(10 - a0, 9, rng);
        const a1 = randInt(4, 9, rng);
        const b1 = randInt(Math.max(1, 9 - a1), 9, rng); // a1 + b1 + 1 >= 10
        const a2 = randInt(1, 5, rng);
        const b2 = randInt(1, 8 - a2, rng);
        A = a2 * 100 + a1 * 10 + a0;
        B = b2 * 100 + b1 * 10 + b0;
      }
    } else {
      // 4-digit with 3 carries (ones, tens, hundreds)
      const a0 = randInt(5, 9, rng);
      const b0 = randInt(10 - a0, 9, rng);
      const a1 = randInt(5, 9, rng);
      const b1 = randInt(9 - a1, 9, rng);
      const a2 = randInt(5, 9, rng);
      const b2 = randInt(9 - a2, 9, rng);
      const a3 = randInt(1, 4, rng);
      const b3 = randInt(1, 3, rng);
      A = a3 * 1000 + a2 * 100 + a1 * 10 + a0;
      B = b3 * 1000 + b2 * 100 + b1 * 10 + b0;
    }

    if (!variationTarget || (A !== variationTarget.operands[0] && B !== variationTarget.operands[1])) {
      break;
    }
  }

  const sum = A + B;
  const a0 = A % 10;
  const b0 = B % 10;
  const s0 = a0 + b0;
  const c1 = Math.floor(s0 / 10);

  const a1 = Math.floor(A / 10) % 10;
  const b1 = Math.floor(B / 10) % 10;
  const s1 = a1 + b1 + c1;
  const c2 = Math.floor(s1 / 10);

  const a2 = Math.floor(A / 100) % 10;
  const b2 = Math.floor(B / 100) % 10;
  const s2 = a2 + b2 + c2;
  const c3 = Math.floor(s2 / 10);

  const steps = [
    {
      stepNumber: 1,
      id: 'ones',
      title: '一の位の計算',
      actionName: 'くりあがり',
      explanation: `一の位を計算しよう: ${a0} + ${b0} はいくつ？`,
      blankPosition: 'ones',
      expectedStepValue: s0,
      carry: c1,
      digit: s0 % 10,
      hint: `${a0} に ${b0} を足すと ${s0} になるよ。十の位に ${c1} くり上がるね！`
    },
    {
      stepNumber: 2,
      id: 'tens',
      title: '十の位の計算',
      actionName: 'くりあがり',
      explanation: c1 > 0
        ? `十の位を計算しよう: くり上がりの ${c1} + ${a1} + ${b1} はいくつ？`
        : `十の位を計算しよう: ${a1} + ${b1} はいくつ？`,
      blankPosition: 'tens',
      expectedStepValue: s1,
      carry: c2,
      digit: s1 % 10,
      hint: c1 > 0
        ? `くり上がった ${c1} を忘れずに ${a1} + ${b1} に足そう！`
        : `${a1} + ${b1} を計算しよう！`
    },
    {
      stepNumber: 3,
      id: 'hundreds',
      title: '百の位の計算',
      actionName: 'くりあがり',
      explanation: c2 > 0
        ? `百の位を計算しよう: くり上がりの ${c2} + ${a2} + ${b2} はいくつ？`
        : `百の位を計算しよう: ${a2} + ${b2} はいくつ？`,
      blankPosition: 'hundreds',
      expectedStepValue: s2,
      carry: c3,
      digit: s2 % 10,
      hint: c2 > 0
        ? `十の位からくり上がった ${c2} を足すのを忘れないでね！`
        : `${a2} + ${b2} を計算しよう！`
    }
  ];

  if (is4Digit) {
    const a3 = Math.floor(A / 1000);
    const b3 = Math.floor(B / 1000);
    const s3 = a3 + b3 + c3;
    steps.push({
      stepNumber: 4,
      id: 'thousands',
      title: '千の位の計算',
      actionName: 'くりあがり',
      explanation: `千の位を計算しよう: くり上がりの ${c3} + ${a3} + ${b3} はいくつ？`,
      blankPosition: 'thousands',
      expectedStepValue: s3,
      carry: 0,
      digit: s3,
      hint: `百の位からのくり上がり ${c3} と ${a3} + ${b3} を合わせよう！`
    });
  }

  steps.push({
    stepNumber: steps.length + 1,
    id: 'final',
    title: '筆算の答え',
    actionName: 'くりあがり',
    explanation: `すべての位を合わせた ${A} + ${B} の答えは？`,
    blankPosition: 'final',
    expectedStepValue: sum,
    hint: '上から順番に数字を並べて答えを完成させよう！'
  });

  const mistakeTensCarry = sum - 10;
  const mistakeHundredsCarry = c2 > 0 ? sum - 100 : sum - 10;

  return buildMathProblem({
    worldId: 1,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} + ${B} = ?`,
    expression: `${A} + ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '+',
    hasRemainder: false,
    quotient: sum,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: mistakeTensCarry,
      reasonCategory: 'carry_forgotten',
      diagnosis: '十の位へのくり上がり「1」を足し忘れているかも！',
      hintMessage: '一の位でくり上がった小さな「1」を十の位に足してみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: mistakeTensCarry,
        reasonCategory: 'carry_forgotten',
        adviceMessage: '一の位から十の位へくり上がった「1」を足し忘れていないかな？十の位をチェック！'
      },
      {
        predictedErrorValue: mistakeHundredsCarry,
        reasonCategory: 'carry_forgotten',
        adviceMessage: '百の位へくり上がった「1」を足し忘れていないかな？百の位をチェック！'
      },
      ...(is4Digit
        ? [
            {
              predictedErrorValue: sum - 1000,
              reasonCategory: 'carry_forgotten',
              adviceMessage: '千の位へくり上がった「1」を足し忘れていないかな？'
            }
          ]
        : [])
    ],
    patternType: is4Digit ? 'add_4digit_carry' : `add_3digit_carry_${targetCarries}`,
    trapMetadata: { is4Digit, targetCarries }
  });
}

/**
 * Stage 1-2: 3桁・4桁のひき算 (0をまたぐ連続くり下がり含む)
 */
function generateStage1_2({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const is4Digit =
    variationTarget?.trapMetadata?.is4Digit ??
    (difficultyLevel === 'challenge' || level === 3);
  const acrossZero =
    variationTarget?.trapMetadata?.acrossZero ??
    (difficultyLevel !== 'warmup');

  let A = 504;
  let B = 238;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (!is4Digit) {
      if (!acrossZero) {
        // Warmup: 3-digit, 1 borrow in ones, tens digit > 0 and no borrow in tens
        const a0 = randInt(1, 5, rng);
        const b0 = randInt(a0 + 2, 9, rng);
        const a1 = randInt(5, 9, rng);
        const b1 = randInt(1, a1 - 2, rng);
        const a2 = randInt(4, 9, rng);
        const b2 = randInt(1, a2 - 1, rng);
        A = a2 * 100 + a1 * 10 + a0;
        B = b2 * 100 + b1 * 10 + b0;
      } else {
        // Borrow across zero in tens place: A = a2_0_a0 where a0 < b0
        const a0 = randInt(1, 6, rng);
        const b0 = randInt(a0 + 2, 9, rng);
        const a1 = 0;
        const b1 = randInt(2, 8, rng);
        const a2 = randInt(4, 9, rng);
        const b2 = randInt(1, a2 - 2, rng);
        A = a2 * 100 + a1 * 10 + a0;
        B = b2 * 100 + b1 * 10 + b0;
      }
    } else {
      // 4-digit borrow across zero (e.g., X00Y - B or X20Y - B)
      const doubleZero = rng() < 0.5;
      const a0 = randInt(1, 5, rng);
      const b0 = randInt(a0 + 2, 9, rng);
      const a1 = 0;
      const b1 = randInt(3, 8, rng);
      const a2 = doubleZero ? 0 : randInt(1, 4, rng);
      const b2 = doubleZero ? randInt(2, 7, rng) : randInt(a2 + 2, 8, rng);
      const a3 = randInt(3, 8, rng);
      const b3 = randInt(1, a3 - 2, rng);
      A = a3 * 1000 + a2 * 100 + a1 * 10 + a0;
      B = b3 * 1000 + b2 * 100 + b1 * 10 + b0;
    }

    if (!variationTarget || (A !== variationTarget.operands[0] && B !== variationTarget.operands[1])) {
      break;
    }
  }

  const diff = A - B;
  const a0 = A % 10;
  const b0 = B % 10;
  const onesVal = a0 + 10 - b0;

  const a1 = Math.floor(A / 10) % 10;
  const b1 = Math.floor(B / 10) % 10;
  const effectiveA1 = a1 === 0 ? 9 : a1 - 1;
  const needHundredsBorrow = a1 === 0 || effectiveA1 < b1;
  const tensVal = (effectiveA1 < b1 ? effectiveA1 + 10 : effectiveA1) - b1;

  const a2 = Math.floor(A / 100) % 10;
  const b2 = Math.floor(B / 100) % 10;

  const steps = [
    {
      stepNumber: 1,
      id: 'ones',
      title: '一の位のくり下がり計算',
      actionName: 'ひく',
      explanation: `${a0} から ${b0} は引けないので、10を借りて ${a0 + 10} - ${b0} を計算しよう！`,
      blankPosition: 'ones',
      expectedStepValue: onesVal,
      digit: onesVal,
      hint: `10を借りてくると ${a0 + 10} になるよ。${a0 + 10} - ${b0} はいくつかな？`
    },
    {
      stepNumber: 2,
      id: 'tens',
      title: '十の位の計算',
      actionName: 'ひく',
      explanation:
        a1 === 0
          ? `十の位は0だったから、百の位から10を借りて一の位に1貸した残りの「9」から ${b1} を引こう（9 - ${b1}）！`
          : `1を貸して ${a1 - 1} になった十の位の計算をしよう！`,
      blankPosition: 'tens',
      expectedStepValue: tensVal,
      digit: tensVal,
      hint:
        a1 === 0
          ? `0をまたいでくり下げたから、十の位は 10 ではなく 9 になっているよ！ 9 - ${b1} を計算しよう。`
          : `一の位に1貸した分を引くのを忘れないでね！`
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '全体の答え',
      actionName: 'ひく',
      explanation: needHundredsBorrow
        ? `上の位もくり下がりに気をつけて、${A} - ${B} の答えを完成させよう！`
        : `百の位（${a2} - ${b2}）も合わせて、${A} - ${B} の答えは？`,
      blankPosition: 'final',
      expectedStepValue: diff,
      hint: 'くり下がりで減った上の位の数字をもう一度チェックしよう！'
    }
  ];

  // Predicted mistakes:
  // 1. Forgetting borrow in tens (+10) or hundreds (+100)
  // 2. Subtracting a0 from b0 (reverse subtraction in ones place)
  const mistakeForgotBorrowTens = diff + 10;
  const mistakeForgotBorrowHundreds = diff + 100;
  const reverseOnesDiff = diff - onesVal + Math.abs(b0 - a0);

  return buildMathProblem({
    worldId: 1,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} - ${B} = ?`,
    expression: `${A} - ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '-',
    hasRemainder: false,
    quotient: diff,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: acrossZero ? mistakeForgotBorrowHundreds : mistakeForgotBorrowTens,
      reasonCategory: 'borrow_forgotten',
      diagnosis: acrossZero
        ? '0をまたいで借りた百の位や十の位のくり下がりメモをチェックしよう！'
        : 'となりの位に「1」貸したあとのくり下がりを忘れているかも！',
      hintMessage: acrossZero
        ? '十の位が0のときは、百の位が1減って、十の位は「9」になるよ！'
        : '10を借りたとなりの位は1小さくなっているよ。もう一度確かめてみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: mistakeForgotBorrowTens,
        reasonCategory: 'borrow_forgotten',
        adviceMessage: '十の位から一の位に10を貸したあと、十の位を1減らすのを忘れていないかな？'
      },
      {
        predictedErrorValue: mistakeForgotBorrowHundreds,
        reasonCategory: 'borrow_forgotten',
        adviceMessage: '百の位からくり下げた「1」を引くのを忘れていないかな？百の位をチェック！'
      },
      {
        predictedErrorValue: reverseOnesDiff,
        reasonCategory: 'borrow_forgotten',
        adviceMessage: `一の位を ${b0} - ${a0} と下から引いてしまっていないかな？引けないときは上から10を借りてこよう！`
      }
    ],
    patternType: acrossZero
      ? is4Digit
        ? 'sub_4digit_across_zero'
        : 'sub_3digit_across_zero'
      : 'sub_3digit_single_borrow',
    trapMetadata: { is4Digit, acrossZero }
  });
}

/**
 * Stage 1-3: 虫食い算・逆算（□の式）
 */
function generateStage1_3({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const patterns = ['add_missing_right', 'add_missing_left', 'sub_missing_left', 'sub_missing_right'];
  let patternType = variationTarget?.patternType;
  if (!patternType) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      patternType = pickRandom(['add_missing_right', 'add_missing_left'], rng);
    } else if (difficultyLevel === 'standard') {
      patternType = pickRandom(['add_missing_right', 'sub_missing_left'], rng);
    } else {
      patternType = pickRandom(['sub_missing_left', 'sub_missing_right'], rng);
    }
  }

  let known1 = 248;
  let known2 = 615;
  let answer = 367;
  let expression = '';
  let prompt = '';
  let operator = '+';
  let inverseOpDesc = '';
  let trapVal = 0;

  for (let attempt = 0; attempt < 200; attempt++) {
    const isSmall = difficultyLevel === 'warmup' || level === 1;
    const partA = isSmall ? randInt(25, 85, rng) : randInt(120, 480, rng);
    const partB = isSmall ? randInt(25, 85, rng) : randInt(130, 460, rng);
    const total = partA + partB;

    if (patternType === 'add_missing_right') {
      // A + □ = C -> □ = C - A
      known1 = partA;
      known2 = total;
      answer = partB;
      operator = '+';
      expression = `${known1} + □ = ${known2}`;
      prompt = `${known1} + □ = ${known2} （□にあてはまる数は？）`;
      inverseOpDesc = `全体の和 ${known2} から ${known1} を引こう（${known2} - ${known1}）`;
      trapVal = known1 + known2;
    } else if (patternType === 'add_missing_left') {
      // □ + B = C -> □ = C - B
      known1 = partB;
      known2 = total;
      answer = partA;
      operator = '+';
      expression = `□ + ${known1} = ${known2}`;
      prompt = `□ + ${known1} = ${known2} （□にあてはまる数は？）`;
      inverseOpDesc = `全体の和 ${known2} から ${known1} を引こう（${known2} - ${known1}）`;
      trapVal = known1 + known2;
    } else if (patternType === 'sub_missing_left') {
      // □ - B = C -> □ = C + B
      known1 = partB;
      known2 = partA;
      answer = total;
      operator = '-';
      expression = `□ - ${known1} = ${known2}`;
      prompt = `□ - ${known1} = ${known2} （□にあてはまる数は？）`;
      inverseOpDesc = `残りの ${known2} に引いた ${known1} を足して元の数を求めよう（${known2} + ${known1}）`;
      trapVal = Math.abs(known2 - known1);
    } else {
      // A - □ = C -> □ = A - C
      known1 = total;
      known2 = partA;
      answer = partB;
      operator = '-';
      expression = `${known1} - □ = ${known2}`;
      prompt = `${known1} - □ = ${known2} （□にあてはまる数は？）`;
      inverseOpDesc = `はじめの ${known1} から残りの ${known2} を引こう（${known1} - ${known2}）`;
      trapVal = known1 + known2;
    }

    if (!variationTarget || answer !== variationTarget.correctAnswer.value) {
      break;
    }
  }

  const onesAns = answer % 10;
  const steps = [
    {
      stepNumber: 1,
      id: 'ones_digit',
      title: '逆算の一の位',
      actionName: '逆算',
      explanation: `${inverseOpDesc}。まず一の位の数字はいくつになるかな？`,
      blankPosition: 'ones',
      expectedStepValue: onesAns,
      hint: `${inverseOpDesc} の一の位を計算してみよう！`
    },
    {
      stepNumber: 2,
      id: 'inverse_result',
      title: '□にあてはまる数',
      actionName: '逆算',
      explanation: `${inverseOpDesc} を最後まで計算して、□に入る数を求めよう！`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: `求めた数を元の式の□に入れて、式が成り立つか確かめてみよう！`
    }
  ];

  return buildMathProblem({
    worldId: 1,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt,
    expression,
    displayFormat: 'horizontal',
    operands: [known1, known2],
    operator,
    hasRemainder: false,
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: trapVal,
      reasonCategory: 'order_mistake',
      diagnosis: 'たし算とひき算の逆算が反対になっているかも！',
      hintMessage: `${inverseOpDesc} で計算してみよう！`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: trapVal,
        reasonCategory: 'order_mistake',
        adviceMessage: `逆算の向きに注意！${inverseOpDesc} で□が求められるよ！`
      },
      {
        predictedErrorValue: answer + 10,
        reasonCategory: 'borrow_forgotten',
        adviceMessage: '逆算の方法はバッチリ！十の位のくり上がり・くり下がりをもう一度確認しよう！'
      },
      {
        predictedErrorValue: Math.max(1, answer - 10),
        reasonCategory: 'carry_forgotten',
        adviceMessage: '逆算の方法はバッチリ！十の位のくり上がり・くり下がりをもう一度確認しよう！'
      }
    ],
    patternType,
    trapMetadata: { patternType }
  });
}

/**
 * Stage 2-1: 10・100の倍数と九九の応用
 */
function generateStage2_1({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let patternType = variationTarget?.patternType;
  if (!patternType) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      patternType = pickRandom(['tens_times_one', 'hundreds_times_one'], rng);
    } else if (difficultyLevel === 'standard') {
      patternType = 'tens_times_tens';
    } else {
      patternType = 'tens_times_tens_extra_zero';
    }
  }

  let A = 60;
  let B = 40;
  let baseA = 6;
  let baseB = 4;
  let zeroCount = 2;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (patternType === 'tens_times_one') {
      baseA = randInt(2, 9, rng);
      baseB = randInt(2, 9, rng);
      A = baseA * 10;
      B = baseB;
      zeroCount = 1;
    } else if (patternType === 'hundreds_times_one') {
      baseA = randInt(2, 9, rng);
      baseB = randInt(2, 9, rng);
      A = baseA * 100;
      B = baseB;
      zeroCount = 2;
    } else if (patternType === 'tens_times_tens_extra_zero') {
      // Pairs where baseA * baseB ends in 0 (e.g., 5*4=20, 5*6=30, 5*8=40, 2*5=10, 4*5=20, 6*5=30, 8*5=40)
      const pairs = [
        [5, 4],
        [5, 6],
        [5, 8],
        [4, 5],
        [6, 5],
        [8, 5],
        [5, 2],
        [2, 5]
      ];
      const pair = pickRandom(pairs, rng);
      baseA = pair[0];
      baseB = pair[1];
      const scaleA = rng() < 0.3 ? 100 : 10;
      A = baseA * scaleA;
      B = baseB * 10;
      zeroCount = scaleA === 100 ? 3 : 2;
    } else {
      baseA = randInt(2, 9, rng);
      baseB = randInt(2, 9, rng);
      if ((baseA * baseB) % 10 === 0) baseB = baseB === 5 ? 6 : 3;
      A = baseA * 10;
      B = baseB * 10;
      zeroCount = 2;
    }

    if (!variationTarget || (A !== variationTarget.operands[0] || B !== variationTarget.operands[1])) {
      break;
    }
  }

  const baseProd = baseA * baseB;
  const prod = A * B;
  const zerosStr = '0'.repeat(zeroCount);

  const steps = [
    {
      stepNumber: 1,
      id: 'base_mult',
      title: '0をかくして九九を計算',
      actionName: 'かける',
      explanation: `まず0をかくして ${baseA} と ${baseB} をかけ算しよう！`,
      blankPosition: 'step1',
      expectedStepValue: baseProd,
      hint: `九九の ${baseA} の段で ${baseA} と ${baseB} の積は ${baseProd} だね！`
    },
    {
      stepNumber: 2,
      id: 'attach_zeros',
      title: 'かくした0を合わせる',
      actionName: 'かける',
      explanation: `${baseProd} の右に、かくした0を ${zeroCount} こ（${zerosStr}）つけた数はいくつ？`,
      blankPosition: 'final',
      expectedStepValue: prod,
      hint: `${baseProd} のうしろに 0 を ${zeroCount} こ並べて書こう！`
    }
  ];

  const mistakeOneLessZero = Math.floor(prod / 10);
  const mistakeOneMoreZero = prod * 10;

  return buildMathProblem({
    worldId: 2,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} × ${B} = ?`,
    expression: `${A} × ${B}`,
    displayFormat: 'horizontal',
    operands: [A, B],
    operator: '×',
    hasRemainder: false,
    quotient: prod,
    stepMode: 'column_mult',
    steps,
    commonTrap: {
      mistakeValue: mistakeOneLessZero,
      reasonCategory: 'shift_forgotten',
      diagnosis: '右につける「0」の数が1つ足りないかも！',
      hintMessage: `2つの数の末尾にある0の合計（${zeroCount}こ）を、${baseProd} の右につけよう！`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: mistakeOneLessZero,
        reasonCategory: 'shift_forgotten',
        adviceMessage: `おしい！0が1つ足りないよ。かくした0は全部で ${zeroCount} こあるから、${baseProd} の右に0を ${zeroCount} こつけよう！`
      },
      {
        predictedErrorValue: mistakeOneMoreZero,
        reasonCategory: 'shift_forgotten',
        adviceMessage: `おしい！0が1つ多いみたい。かくした0の個数（${zeroCount}こ）をもう一度数えてみよう！`
      }
    ],
    patternType,
    trapMetadata: { patternType, zeroCount }
  });
}

/**
 * Stage 2-2: 2桁・3桁 × 1桁の筆算 (真ん中0の3桁×1桁含む)
 */
function generateStage2_2({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const hasMiddleZero =
    variationTarget?.trapMetadata?.hasMiddleZero ??
    (difficultyLevel === 'hurdle' || difficultyLevel === 'challenge');
  const is3Digit =
    variationTarget?.trapMetadata?.is3Digit ??
    (hasMiddleZero || difficultyLevel === 'standard' || difficultyLevel === 'challenge' || level >= 2);

  let A = 408;
  let B = 6;

  for (let attempt = 0; attempt < 200; attempt++) {
    B = randInt(3, 9, rng);
    if (!is3Digit) {
      // 2-digit x 1-digit with carry
      const a0 = randInt(Math.ceil(10 / B), 9, rng);
      const a1 = randInt(2, 8, rng);
      A = a1 * 10 + a0;
    } else if (hasMiddleZero) {
      // X0Y x B where Y * B >= 10 (middle zero trap!)
      const a2 = randInt(1, 4, rng);
      const a1 = 0;
      const a0 = randInt(Math.max(2, Math.ceil(10 / B)), 9, rng);
      A = a2 * 100 + a1 * 10 + a0;
    } else {
      // 3-digit x 1-digit with carries
      const a2 = randInt(1, 4, rng);
      const a1 = randInt(3, 8, rng);
      const a0 = randInt(Math.max(2, Math.ceil(10 / B)), 9, rng);
      A = a2 * 100 + a1 * 10 + a0;
    }

    if (!variationTarget || (A !== variationTarget.operands[0] || B !== variationTarget.operands[1])) {
      break;
    }
  }

  const prod = A * B;
  const a0 = A % 10;
  const a1 = Math.floor(A / 10) % 10;
  const a2 = Math.floor(A / 100);

  const p0 = a0 * B;
  const c1 = Math.floor(p0 / 10);
  const p1 = a1 * B + c1;
  const c2 = Math.floor(p1 / 10);

  const steps = [
    {
      stepNumber: 1,
      id: 'ones',
      title: '一の位のかけ算',
      actionName: 'かける',
      explanation: `一の位を計算しよう: ${a0} と ${B} をかけるといくつ？`,
      blankPosition: 'ones',
      expectedStepValue: p0,
      carry: c1,
      digit: p0 % 10,
      hint: `九九で ${a0} と ${B} の積は ${p0}。十の位へ ${c1} くり上がるよ！`
    },
    {
      stepNumber: 2,
      id: 'tens',
      title: '十の位のかけ算とくり上がり',
      actionName: 'くりあがり',
      explanation:
        a1 === 0
          ? `十の位は 0 と ${B} をかけて 0。そこにくり上がりの ${c1} を足すといくつ？`
          : `十の位の ${a1} と ${B} をかけた数に、くり上がりの ${c1} を足すといくつ？`,
      blankPosition: 'tens',
      expectedStepValue: p1,
      carry: c2,
      digit: p1 % 10,
      hint:
        a1 === 0
          ? `0に何をかけても0だから、くり上がった ${c1} がそのまま十の位の数字になるよ！`
          : `${a1 * B} にくり上がりの ${c1} を足して ${p1} だね！`
    }
  ];

  if (is3Digit) {
    const p2 = a2 * B + c2;
    steps.push({
      stepNumber: 3,
      id: 'hundreds',
      title: '百の位の計算と全体の答え',
      actionName: 'かける',
      explanation: `百の位の計算（くり上がり ${c2} を含む）も合わせて、全体の答えはいくつ？`,
      blankPosition: 'final',
      expectedStepValue: prod,
      digit: p2,
      hint: `百の位は ${a2 * B + c2} になるから、全部合わせて ${prod} だね！`
    });
  } else {
    steps.push({
      stepNumber: 3,
      id: 'final',
      title: '全体の答え',
      actionName: 'かける',
      explanation: `十の位と一の位を合わせた答えはいくつ？`,
      blankPosition: 'final',
      expectedStepValue: prod,
      hint: `十の位が ${p1}、一の位が ${p0 % 10} だから ${prod} になるね！`
    });
  }

  // Common trap: forgetting carry into tens (especially when tens is 0, e.g. 408*6 -> 2408 instead of 2448)
  const mistakeForgotCarry1 = prod - c1 * 10;
  const mistakeMultipliedCarry = hasMiddleZero ? a2 * B * 100 + c1 * B * 10 + (p0 % 10) : prod - c2 * 100;

  return buildMathProblem({
    worldId: 2,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} × ${B} = ?`,
    expression: `${A} × ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '×',
    hasRemainder: false,
    quotient: prod,
    stepMode: 'column_mult',
    steps,
    commonTrap: {
      mistakeValue: mistakeForgotCarry1,
      reasonCategory: 'carry_forgotten',
      diagnosis: hasMiddleZero
        ? '真ん中の0の位に、一の位からくり上がった数を足し忘れているかも！'
        : '一の位からくり上がった数を十の位に足し忘れているかも！',
      hintMessage: hasMiddleZero
        ? `0に何をかけても0だけど、くり上がった ${c1} を十の位に足すのを忘れないでね！`
        : `九九を計算したあとに、くり上がった ${c1} を足してみよう！`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: mistakeForgotCarry1,
        reasonCategory: 'carry_forgotten',
        adviceMessage: `一の位からくり上がった「${c1}」を十の位に足すのを忘れていないかな？`
      },
      {
        predictedErrorValue: mistakeMultipliedCarry,
        reasonCategory: 'carry_forgotten',
        adviceMessage: hasMiddleZero
          ? `十の位の0には、くり上がった「${c1}」をかけるのではなく、足し算しよう！`
          : '百の位へのくり上がりを足し忘れていないかチェックしてみよう！'
      }
    ],
    patternType: hasMiddleZero ? 'mult_3digit_middle_zero' : is3Digit ? 'mult_3digit_1digit' : 'mult_2digit_1digit',
    trapMetadata: { is3Digit, hasMiddleZero }
  });
}

/**
 * Stage 2-3: 2桁 × 2桁の筆算
 */
function generateStage2_3({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let A = 34;
  let B = 26;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (difficultyLevel === 'warmup' || level === 1) {
      A = randInt(12, 34, rng);
      B = randInt(12, 24, rng);
      if (B % 10 === 0) B += 2;
    } else if (difficultyLevel === 'standard' || difficultyLevel === 'remedial') {
      A = randInt(23, 64, rng);
      B = randInt(22, 48, rng);
      if (B % 10 < 2) B += 3;
    } else {
      A = randInt(34, 89, rng);
      B = randInt(26, 78, rng);
      if (B % 10 < 3) B += 4;
    }

    if (!variationTarget || (A !== variationTarget.operands[0] || B !== variationTarget.operands[1])) {
      break;
    }
  }

  const b0 = B % 10;
  const b1 = Math.floor(B / 10);
  const part1 = A * b0;
  const part2Unshifted = A * b1;
  const part2Shifted = part2Unshifted * 10;
  const prod = A * B;
  const shiftTrapValue = part1 + part2Unshifted; // Classic 2-digit mult trap: forgetting to shift 2nd row left!

  const steps = [
    {
      stepNumber: 1,
      id: 'partial_1',
      title: '1段目の計算（一の位をかける）',
      actionName: 'かける',
      explanation: `まず ${A} に一の位の ${b0} をかけよう（${A} かける ${b0}）！`,
      blankPosition: 'row1',
      expectedStepValue: part1,
      hint: `${A} と ${b0} のかけ算を計算して1段目に書こう！`
    },
    {
      stepNumber: 2,
      id: 'partial_2',
      title: '2段目の計算（十の位をかける）',
      actionName: 'かける',
      explanation: `次に ${A} に十の位の ${b1 * 10} をかけよう（十の位の下から ${part2Unshifted} と書いて ${part2Shifted} にする）！`,
      blankPosition: 'row2',
      expectedStepValue: part2Shifted,
      hint: `十の位の ${b1} は本当は ${b1 * 10} だから、1桁左にずらして ${part2Shifted} になるよ！`
    },
    {
      stepNumber: 3,
      id: 'sum_partials',
      title: '2つの段をたし算する',
      actionName: 'くりあがり',
      explanation: `1段目の ${part1} と 2段目の ${part2Shifted} を足し合わせよう！`,
      blankPosition: 'final',
      expectedStepValue: prod,
      hint: `${part1} + ${part2Shifted} を位をそろえて足し算しよう！`
    }
  ];

  return buildMathProblem({
    worldId: 2,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} × ${B} = ?`,
    expression: `${A} × ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '×',
    hasRemainder: false,
    quotient: prod,
    stepMode: 'column_mult',
    steps,
    commonTrap: {
      mistakeValue: shiftTrapValue,
      reasonCategory: 'shift_forgotten',
      diagnosis: '2段目（十の位をかけた数）を左に1桁ずらすのを忘れているかも！',
      hintMessage: '十の位をかけた答えは、一の位をあけて「十の位の下」から書き始めよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: shiftTrapValue,
        reasonCategory: 'shift_forgotten',
        adviceMessage: `2段目の「${part2Unshifted}」は十の位の計算だから、左に1桁ずらして「${part2Shifted}」として足そう！`
      },
      {
        predictedErrorValue: prod - 100,
        reasonCategory: 'carry_forgotten',
        adviceMessage: '1段目と2段目を足すときのくり上がりを忘れないようにチェックしよう！'
      },
      {
        predictedErrorValue: prod - 10,
        reasonCategory: 'carry_forgotten',
        adviceMessage: '十の位のくり上がりをもう一度確認してみよう！'
      }
    ],
    patternType: 'mult_2digit_2digit',
    trapMetadata: { b1 }
  });
}

/**
 * Stage 3-1: あまりのあるわり算と検算
 */
function generateStage3_1({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let A = 53;
  let B = 7;
  let q = 7;
  let r = 4;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (difficultyLevel === 'warmup' || level === 1) {
      B = randInt(3, 6, rng);
      q = randInt(2, 6, rng);
      r = randInt(1, B - 1, rng);
    } else if (difficultyLevel === 'standard' || difficultyLevel === 'remedial') {
      B = randInt(4, 8, rng);
      q = randInt(4, 8, rng);
      r = randInt(1, B - 1, rng);
    } else {
      B = randInt(6, 9, rng);
      q = randInt(6, 9, rng);
      r = randInt(Math.max(1, B - 3), B - 1, rng);
    }
    A = B * q + r;

    if (!variationTarget || (A !== variationTarget.operands[0] || B !== variationTarget.operands[1])) {
      break;
    }
  }

  const prod = B * q;
  const steps = [
    {
      stepNumber: 1,
      id: 'quotient',
      title: '商をたてる',
      actionName: 'たてる',
      explanation: `${B} の段の九九で、${A} をこえない一番近い商（答え）はいくつ？`,
      blankPosition: 'quotient',
      expectedStepValue: q,
      hint: `${B} に何をかけると ${A} に一番近くなるかな？`
    },
    {
      stepNumber: 2,
      id: 'multiply',
      title: 'わる数と商をかける',
      actionName: 'かける',
      explanation: `わる数 ${B} と たてた商 ${q} をかけ算しよう！`,
      blankPosition: 'product',
      expectedStepValue: prod,
      hint: `九九で ${B} と ${q} の積は ${prod} だね！`
    },
    {
      stepNumber: 3,
      id: 'subtract_remainder',
      title: 'ひいてあまりを出す',
      actionName: 'ひく',
      explanation: `${A} - ${prod} を計算して「あまり」を出そう（わる数 ${B} より小さいかチェック）！`,
      blankPosition: 'remainder',
      expectedStepValue: r,
      hint: `${A} から ${prod} を引くと ${r}。わる数 ${B} より小さいからバッチリ！`
    },
    {
      stepNumber: 4,
      id: 'verify',
      title: '検算（たしかめ算）',
      actionName: 'かける',
      explanation: `たしかめ算！「わる数 ${B} と 商 ${q} の積 (${prod}) ＋ あまり ${r}」はいくつになる？`,
      blankPosition: 'verify',
      expectedStepValue: A,
      hint: `${prod} + ${r} = ${A} で、わられる数とぴったり同じになるね！`
    }
  ];

  return buildMathProblem({
    worldId: 3,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} ÷ ${B} = ?`,
    expression: `${A} ÷ ${B}`,
    displayFormat: 'horizontal',
    operands: [A, B],
    operator: '÷',
    hasRemainder: true,
    quotient: q,
    remainder: r,
    stepMode: 'column_div_2digit',
    steps,
    commonTrap: {
      mistakeValue: q - 1,
      mistakeRemainder: r + B,
      reasonCategory: 'quotient_too_small',
      diagnosis: `あまりがわる数（${B}）以上になっているかも！商をもう1つ増やせるよ！`,
      hintMessage: `あまりは必ずわる数（${B}）より小さくしよう！商を ${q} にしてみよう。`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: q - 1,
        predictedRemainder: r + B,
        reasonCategory: 'quotient_too_small',
        adviceMessage: `あまりが ${r + B} になったね。わる数の ${B} がまだ1回入るから、商を1増やして ${q} にしよう！`
      },
      {
        predictedErrorValue: q + 1,
        predictedRemainder: B * (q + 1) - A,
        reasonCategory: 'quotient_too_big',
        adviceMessage: `商が ${q + 1} だと積が ${B * (q + 1)} になって ${A} をこえてしまうよ。商を1減らして ${q} にしよう！`
      }
    ],
    patternType: 'div_1digit_with_remainder',
    trapMetadata: { divisor: B }
  });
}

/**
 * Stage 3-2: 2桁 ÷ 1桁の筆算
 */
function generateStage3_2({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const expectRemainder =
    variationTarget?.trapMetadata?.expectRemainder ??
    (difficultyLevel === 'hurdle' || difficultyLevel === 'challenge');
  const expectTensRemainder =
    variationTarget?.trapMetadata?.expectTensRemainder ??
    (difficultyLevel !== 'warmup');

  let A = 74;
  let B = 3;
  let q = 24;
  let r = 2;

  for (let attempt = 0; attempt < 200; attempt++) {
    B = randInt(2, 7, rng);
    const q1 = randInt(1, Math.floor(8 / B), rng);
    const tensRem = expectTensRemainder ? randInt(1, B - 1, rng) : 0;
    const a1 = q1 * B + tensRem;
    if (a1 > 9) continue;

    const q0 = randInt(1, 9, rng);
    r = expectRemainder ? randInt(1, B - 1, rng) : 0;
    const remWithOnes = q0 * B + r;
    const a0 = remWithOnes - tensRem * 10;
    if (a0 < 0 || a0 > 9) continue;

    A = a1 * 10 + a0;
    q = Math.floor(A / B);
    r = A % B;

    if (!variationTarget || (A !== variationTarget.operands[0] || B !== variationTarget.operands[1])) {
      break;
    }
  }

  const a1 = Math.floor(A / 10);
  const a0 = A % 10;
  const q1 = Math.floor(a1 / B);
  const tensRem = a1 - B * q1;
  const broughtDown = tensRem * 10 + a0;
  const q0 = Math.floor(broughtDown / B);

  const steps = [
    {
      stepNumber: 1,
      id: 'tens_quotient',
      title: '十の位に商をたてる',
      actionName: 'たてる',
      explanation: `十の位の ${a1} の中に ${B} はいくつ入るかな（${a1} ÷ ${B}）？`,
      blankPosition: 'tens_quotient',
      expectedStepValue: q1,
      hint: `${B} に ${q1} をかけると ${B * q1} だね！十の位の商は ${q1}！`
    },
    {
      stepNumber: 2,
      id: 'bring_down',
      title: 'ひいて一の位をおろす',
      actionName: 'おろす',
      explanation: `${a1} - ${B * q1} = ${tensRem} の横に、一の位の ${a0} をおろすといくつになる？`,
      blankPosition: 'bring_down',
      expectedStepValue: broughtDown,
      hint: `十の位のあまり ${tensRem} とおろした ${a0} で ${broughtDown} になるよ！`
    },
    {
      stepNumber: 3,
      id: 'ones_quotient',
      title: '一の位に商をたてる',
      actionName: 'たてる',
      explanation: `${broughtDown} ÷ ${B} の商を一の位にたてると、全体の商はいくつになる？`,
      blankPosition: 'quotient',
      expectedStepValue: q,
      hint: `十の位が ${q1}、一の位が ${q0} だから、商は ${q} だね！`
    },
    {
      stepNumber: 4,
      id: 'remainder',
      title: 'あまりを求める',
      actionName: 'ひく',
      explanation: `${broughtDown} - ${B * q0} を計算して、最後のあまりはいくつ？`,
      blankPosition: 'remainder',
      expectedStepValue: r,
      hint: r === 0 ? 'ぴったり割り切れてあまりは 0 だね！' : `${broughtDown} から ${B * q0} を引いてあまりは ${r}！`
    }
  ];

  const mistakeForgotTensRem = q1 * 10 + Math.floor(a0 / B);

  return buildMathProblem({
    worldId: 3,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} ÷ ${B} = ?`,
    expression: `${A} ÷ ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '÷',
    hasRemainder: true,
    quotient: q,
    remainder: r,
    stepMode: 'column_div_2digit',
    steps,
    commonTrap: {
      mistakeValue: mistakeForgotTensRem === q ? q - 1 : mistakeForgotTensRem,
      mistakeRemainder: r,
      reasonCategory: 'borrow_forgotten',
      diagnosis: '十の位の引き算で残った数と、おろした一の位を合わせるのを忘れているかも！',
      hintMessage: `十の位のあまり ${tensRem} の横に ${a0} をおろして「${broughtDown} ÷ ${B}」を計算しよう！`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: mistakeForgotTensRem,
        predictedRemainder: a0 % B,
        reasonCategory: 'borrow_forgotten',
        adviceMessage: `十の位の引き算のあまり（${tensRem}）を忘れずに！${a0} をおろして ${broughtDown} ÷ ${B} を計算しよう！`
      }
    ],
    patternType: expectRemainder ? 'div_2digit_with_rem' : 'div_2digit_exact',
    trapMetadata: { expectRemainder, expectTensRemainder }
  });
}

/**
 * Stage 3-3: 3桁 ÷ 1桁の筆算 (商の十の位に0がたつパターン & 百の位に商がたたない2桁商パターン)
 */
function generateStage3_3({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const zeroInTens =
    variationTarget?.trapMetadata?.zeroInTens ??
    (difficultyLevel === 'hurdle' || difficultyLevel === 'challenge');

  let A = 624;
  let B = 3;
  let q = 208;
  let r = 0;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (zeroInTens) {
      // Quotient is X0Y (e.g. 624 / 3 = 208, 816 / 4 = 204, 614 / 3 = 204 r 2)
      B = randInt(3, 8, rng);
      const q2 = randInt(1, Math.floor(9 / B), rng);
      const q1 = 0;
      const q0 = randInt(3, 9, rng);
      q = q2 * 100 + q1 * 10 + q0;
      r = difficultyLevel === 'challenge' ? randInt(1, B - 1, rng) : 0;
      A = B * q + r;
      // Ensure hundreds digit is cleanly divisible by B so tens digit brought down is < B
      if (Math.floor(A / 100) !== B * q2) continue;
    } else {
      // Hundreds digit < B so quotient is 2 digits (e.g. 148 / 4 = 37)
      B = randInt(3, 8, rng);
      const q1 = randInt(2, 9, rng);
      if (Math.floor((q1 * B) / 10) === 0 || Math.floor((q1 * B) / 10) >= B) continue;
      const q0 = randInt(2, 9, rng);
      q = q1 * 10 + q0;
      r = difficultyLevel === 'standard' ? 0 : randInt(0, B - 1, rng);
      A = B * q + r;
      if (A < 100 || Math.floor(A / 100) >= B) continue;
    }

    if (!variationTarget || (A !== variationTarget.operands[0])) {
      break;
    }
  }

  const a2 = Math.floor(A / 100);
  const a1 = Math.floor(A / 10) % 10;
  const a0 = A % 10;

  let steps;
  let mistakeVal;
  let trapDiagnosis;
  let trapHint;

  if (zeroInTens) {
    const q2 = Math.floor(q / 100);
    const q0 = q % 10;
    const lastTwo = a1 * 10 + a0;
    mistakeVal = q2 * 10 + q0; // e.g., 28 instead of 208!
    trapDiagnosis = '商の十の位に「0」をたてるのを忘れて、桁がズレてしまっているかも！';
    trapHint = `十の位の ${a1} は ${B} で割れないから、商の十の位にガードマン「0」をたてよう！`;

    steps = [
      {
        stepNumber: 1,
        id: 'hundreds_quotient',
        title: '百の位に商をたてる',
        actionName: 'たてる',
        explanation: `百の位の ${a2} ÷ ${B} の商はいくつ？`,
        blankPosition: 'hundreds_quotient',
        expectedStepValue: q2,
        hint: `${a2} ÷ ${B} = ${q2} だね！`
      },
      {
        stepNumber: 2,
        id: 'tens_zero_guard',
        title: '十の位にガードマン「0」をたてる',
        actionName: 'たてる',
        explanation: `おろした十の位の ${a1} は ${B} より小さくて割れないね！商の十の位にたてる数字は？`,
        blankPosition: 'tens_quotient',
        expectedStepValue: 0,
        hint: '割れない位には位を守るガードマン「0」をたてよう！'
      },
      {
        stepNumber: 3,
        id: 'ones_quotient',
        title: '一の位をおろして全体の商を完成',
        actionName: 'おろす',
        explanation: `一の位の ${a0} もおろして ${lastTwo} ÷ ${B} を計算しよう。全体の3桁の商はいくつ？`,
        blankPosition: 'quotient',
        expectedStepValue: q,
        hint: `百の位が ${q2}、十の位が 0、一の位が ${q0} だから ${q} になるね！`
      }
    ];
  } else {
    const firstTwo = a2 * 10 + a1;
    const q1 = Math.floor(q / 10);
    const rem1 = firstTwo - B * q1;
    const broughtDown = rem1 * 10 + a0;
    mistakeVal = q * 10;
    trapDiagnosis = `百の位の ${a2} は ${B} で割れないので、十の位から商をたてよう！`;
    trapHint = `最初の2桁「${firstTwo} ÷ ${B}」から計算を始めると商は2桁になるよ！`;

    steps = [
      {
        stepNumber: 1,
        id: 'first_two_digits',
        title: '百の位と十の位を合わせて商をたてる',
        actionName: 'たてる',
        explanation: `百の位の ${a2} は ${B} で割れないので、${firstTwo} ÷ ${B} の商を十の位にたてよう！`,
        blankPosition: 'tens_quotient',
        expectedStepValue: q1,
        hint: `${B} に ${q1} をかけると ${B * q1} だね！`
      },
      {
        stepNumber: 2,
        id: 'bring_down_ones',
        title: 'ひいて一の位をおろす',
        actionName: 'おろす',
        explanation: `${firstTwo} - ${B * q1} = ${rem1} の横に一の位の ${a0} をおろすといくつ？`,
        blankPosition: 'bring_down',
        expectedStepValue: broughtDown,
        hint: `${rem1} と ${a0} で ${broughtDown} になるね！`
      },
      {
        stepNumber: 3,
        id: 'final_quotient',
        title: '一の位の商をたてて完成',
        actionName: 'たてる',
        explanation: `${broughtDown} ÷ ${B} を計算して、全体の商はいくつ？`,
        blankPosition: 'quotient',
        expectedStepValue: q,
        hint: `十の位が ${q1}、一の位が ${q % 10} で商は ${q} だね！`
      }
    ];
  }

  return buildMathProblem({
    worldId: 3,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} ÷ ${B} = ?`,
    expression: `${A} ÷ ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '÷',
    hasRemainder: true,
    quotient: q,
    remainder: r,
    stepMode: 'column_div_2digit',
    steps,
    commonTrap: {
      mistakeValue: mistakeVal,
      mistakeRemainder: r,
      reasonCategory: 'shift_forgotten',
      diagnosis: trapDiagnosis,
      hintMessage: trapHint
    },
    errorDiagnostics: [
      {
        predictedErrorValue: mistakeVal,
        predictedRemainder: r,
        reasonCategory: 'shift_forgotten',
        adviceMessage: trapHint
      }
    ],
    patternType: zeroInTens ? 'zero_in_tens_quotient' : 'hundreds_not_divisible',
    trapMetadata: { zeroInTens }
  });
}

/**
 * Stage 4-1: 何十でわる計算とあまり (あまりの10倍復元トラップ含む)
 */
function generateStage4_1({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const withRemainder =
    variationTarget?.trapMetadata?.withRemainder ??
    (difficultyLevel !== 'warmup');

  let A = 170;
  let B = 30;
  let q = 5;
  let r = 20;

  for (let attempt = 0; attempt < 200; attempt++) {
    const bTen = randInt(2, 8, rng);
    B = bTen * 10;
    q = randInt(2, Math.min(9, Math.floor(48 / bTen)), rng);
    const rTen = withRemainder ? randInt(1, bTen - 1, rng) : 0;
    r = rTen * 10;
    A = B * q + r;

    if (A >= 30 && A <= 490) {
      if (!variationTarget || (A !== variationTarget.operands[0] || B !== variationTarget.operands[1])) {
        break;
      }
    }
  }

  const aTen = A / 10;
  const bTen = B / 10;
  const smallRem = r / 10; // The classic trap: e.g. 2 instead of 20!

  const steps = [
    {
      stepNumber: 1,
      id: 'estimate_quotient',
      title: '0を1つずつ隠して商をたてる',
      actionName: 'たてる',
      explanation: `${A} と ${B} の両方の0を隠して、「${aTen} ÷ ${bTen}」の商を求めよう！`,
      blankPosition: 'quotient',
      expectedStepValue: q,
      estimatedReference: B,
      hint: `${bTen} の段で ${aTen} をこえない一番近い商は ${q} だね！`
    },
    {
      stepNumber: 2,
      id: 'multiply_divisor',
      title: 'わる数と商をかける',
      actionName: 'かける',
      explanation: `本当のわる数 ${B} に 商 ${q} をかけるといくつになる？`,
      blankPosition: 'product',
      expectedStepValue: B * q,
      hint: `${B} に ${q} をかけると ${B * q} になるよ！`
    },
    {
      stepNumber: 3,
      id: 'true_remainder',
      title: '本当のあまりを求める（0を戻す）',
      actionName: 'ひく',
      explanation: withRemainder
        ? `${A} - ${B * q} を計算しよう！隠した0を戻すと本当のあまりはいくつ？（${smallRem} ではなく10の倍数！）`
        : `${A} - ${B * q} を計算してあまりはいくつ？`,
      blankPosition: 'remainder',
      expectedStepValue: r,
      hint: withRemainder
        ? `0をかくして計算したあとは、あまりにも0を戻して「${r}」にしよう！`
        : 'ぴったり割り切れてあまりは0だね！'
    }
  ];

  return buildMathProblem({
    worldId: 4,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} ÷ ${B} = ?`,
    expression: `${A} ÷ ${B}`,
    displayFormat: 'horizontal',
    operands: [A, B],
    operator: '÷',
    hasRemainder: true,
    quotient: q,
    remainder: r,
    stepMode: 'column_div_2digit',
    steps,
    commonTrap: {
      mistakeValue: q,
      mistakeRemainder: withRemainder ? smallRem : 1,
      reasonCategory: 'remainder_scale',
      // BUG-008: when the division is exact (r === 0) the remainder-scale
      // wording is self-contradictory ("あまりは 0 ではなく…「0」になる"),
      // so the trap texts must be built for the exact case instead.
      diagnosis: withRemainder
        ? '0をかくして計算したあと、あまりの位（0）を戻すのを忘れているよ！'
        : 'ぴったり割り切れる計算だよ！あまりはないはずだよ！',
      hintMessage: withRemainder
        ? `商の ${q} は大正解！あまりは ${smallRem} ではなく、隠した0を戻して「${r}」になるよ！`
        : `商の ${q} は大正解！この計算はぴったり割り切れて、あまりは「0」だよ！`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: q,
        predictedRemainder: smallRem,
        reasonCategory: 'remainder_scale',
        adviceMessage: withRemainder
          ? `0をかくして計算したあとは、あまりに0を戻してあげよう！本当のあまりは ${smallRem} ではなく「${r}」だね！`
          : `商の ${q} は大正解！この計算はぴったり割り切れて、あまりは「0」だよ！`
      },
      {
        predictedErrorValue: q * 10,
        predictedRemainder: r,
        reasonCategory: 'shift_forgotten',
        adviceMessage: `両方から0を消したとき、商には0をつけないよ！商は「${q}」だね。`
      }
    ],
    patternType: withRemainder ? 'div_tens_with_remainder' : 'div_tens_exact',
    trapMetadata: { withRemainder }
  });
}

/**
 * Stage 4-2: 2桁 ÷ 2桁の見当づけ (四捨五入した何十で仮商が一発成立)
 */
function generateStage4_2({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const roundUp =
    variationTarget?.trapMetadata?.roundUp ??
    (difficultyLevel === 'hurdle' || difficultyLevel === 'challenge');
  const withRemainder =
    variationTarget?.trapMetadata?.withRemainder ??
    (difficultyLevel !== 'warmup');

  let A = 84;
  let B = 21;
  let q = 4;
  let r = 0;
  let roundedB = 20;

  for (let attempt = 0; attempt < 300; attempt++) {
    const tensDigit = randInt(1, 3, rng);
    const onesDigit = roundUp ? pickRandom([8, 9], rng) : pickRandom([1, 2], rng);
    B = tensDigit * 10 + onesDigit;
    roundedB = Math.round(B / 10) * 10;

    q = randInt(2, Math.floor(95 / B), rng);
    if (q < 2 || q > 9) continue;

    r = withRemainder ? randInt(1, Math.min(9, B - 1), rng) : 0;
    A = B * q + r;
    if (A < 21 || A > 99) continue;

    // Verify 1-shot estimation works: floor(A / roundedB) === q
    const estQ = Math.floor(A / roundedB);
    if (estQ !== q) continue;

    if (!variationTarget || (A !== variationTarget.operands[0] || B !== variationTarget.operands[1])) {
      break;
    }
  }

  const prod = B * q;
  const steps = [
    {
      stepNumber: 1,
      id: 'estimate_quotient',
      title: 'わる数を見積もって商をたてる',
      actionName: 'たてる',
      explanation: `わる数 ${B} を「およそ ${roundedB}」とみよう。${A} の中に ${roundedB} はいくつあると見当がつくかな？`,
      blankPosition: 'quotient',
      expectedStepValue: q,
      estimatedReference: roundedB,
      hint: `${B} をおよそ ${roundedB} とみると、商は ${q} と見当がつくね！`
    },
    {
      stepNumber: 2,
      id: 'multiply_check',
      title: 'わる数と商をかける',
      actionName: 'かける',
      explanation: `たてた商 ${q} と わる数 ${B} をかけ算しよう（${B} かける ${q}）！`,
      blankPosition: 'product',
      expectedStepValue: prod,
      hint: `${B} に ${q} をかけると ${prod} になるよ！`
    },
    {
      stepNumber: 3,
      id: 'subtract_remainder',
      title: 'わられる数からひく',
      actionName: 'ひく',
      explanation: `${A} - ${prod} を計算してあまりを出そう！`,
      blankPosition: 'remainder',
      expectedStepValue: r,
      hint: r === 0 ? `${A} - ${prod} = 0 でぴったり割り切れたね！` : `${A} - ${prod} = ${r} で、あまりは ${r} だね！`
    }
  ];

  return buildMathProblem({
    worldId: 4,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} ÷ ${B} = ?`,
    expression: `${A} ÷ ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '÷',
    hasRemainder: true,
    quotient: q,
    remainder: r,
    stepMode: 'column_div_2digit',
    steps,
    commonTrap: {
      mistakeValue: q - 1,
      mistakeRemainder: r + B,
      reasonCategory: 'quotient_too_small',
      diagnosis: `わる数 ${B} をおよそ ${roundedB} とみて、もう一度商の見当をつけてみよう！`,
      hintMessage: `${B} をおよそ ${roundedB} とみると、商は ${q} でぴったり計算できるよ！`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: q - 1,
        predictedRemainder: r + B,
        reasonCategory: 'quotient_too_small',
        adviceMessage: `あまりが ${B} 以上になっているよ。商を1増やして ${q} にしてみよう！`
      },
      {
        predictedErrorValue: q + 1,
        predictedRemainder: 0,
        reasonCategory: 'quotient_too_big',
        adviceMessage: `商が ${q + 1} だと ${A} から引けなくなっちゃうよ。商を1減らして ${q} にしよう！`
      }
    ],
    patternType: roundUp ? 'div_estimate_round_up' : 'div_estimate_round_down',
    trapMetadata: { roundUp, withRemainder, roundedB }
  });
}

/**
 * Stage 4-3: 仮の商の自己修正 (大きすぎて引けない -1修正 / 小さすぎてあまり過大 +1修正)
 */
function generateStage4_3({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  // Determine whether this problem tests "product_greater_than_dividend" (too_big -> -1)
  // or "difference_gte_divisor" (too_small -> +1)
  let correctionCondition = variationTarget?.trapMetadata?.correctionCondition;
  if (!correctionCondition) {
    if (difficultyLevel === 'challenge' && questionIndex === 5) {
      correctionCondition = 'difference_gte_divisor';
    } else {
      correctionCondition = 'product_greater_than_dividend';
    }
  }

  // Verified pool of Grade 4 textbook problems requiring trial quotient revision
  const tooBigCandidates = [
    { A: 87, B: 29, trialQ: 4, refB: 20 }, // 80/20=4 -> 29*4=116 > 87 -> q=3, r=0
    { A: 84, B: 26, trialQ: 4, refB: 20 }, // 80/20=4 -> 26*4=104 > 84 -> q=3, r=6
    { A: 92, B: 28, trialQ: 4, refB: 20 }, // 90/20=4 -> 28*4=112 > 92 -> q=3, r=8
    { A: 76, B: 24, trialQ: 4, refB: 20 }, // 70/20 -> 4*24=96 > 76 -> q=3, r=4
    { A: 81, B: 27, trialQ: 4, refB: 20 }, // 80/20=4 -> 27*4=108 > 81 -> q=3, r=0
    { A: 68, B: 17, trialQ: 5, refB: 10 }, // 17*5=85 > 68 -> q=4, r=0
    { A: 72, B: 18, trialQ: 5, refB: 10 }, // 18*5=90 > 72 -> q=4, r=0
    { A: 85, B: 16, trialQ: 6, refB: 10 }, // 16*6=96 > 85 -> q=5, r=5
    { A: 91, B: 14, trialQ: 7, refB: 10 }, // 14*7=98 > 91 -> q=6, r=7
    { A: 78, B: 25, trialQ: 4, refB: 20 }, // 25*4=100 > 78 -> q=3, r=3
    { A: 95, B: 34, trialQ: 3, refB: 30 }, // 34*3=102 > 95 -> q=2, r=27
    { A: 64, B: 15, trialQ: 5, refB: 10 }  // 15*5=75 > 64 -> q=4, r=4
  ];

  const tooSmallCandidates = [
    { A: 142, B: 28, trialQ: 4, refB: 30 }, // 140/30=4 -> 142-112=30 >= 28 -> q=5, r=2
    { A: 115, B: 28, trialQ: 3, refB: 30 }, // 110/30=3 -> 115-84=31 >= 28 -> q=4, r=3
    { A: 96, B: 18, trialQ: 4, refB: 20 },  // 90/20=4 -> 96-72=24 >= 18 -> q=5, r=6
    { A: 78, B: 19, trialQ: 3, refB: 20 },  // 70/20=3 -> 78-57=21 >= 19 -> q=4, r=2
    { A: 138, B: 27, trialQ: 4, refB: 30 }, // 130/30=4 -> 138-108=30 >= 27 -> q=5, r=3
    { A: 118, B: 29, trialQ: 3, refB: 30 }, // 110/30=3 -> 118-87=31 >= 29 -> q=4, r=2
    { A: 156, B: 38, trialQ: 3, refB: 40 }, // 150/40=3 -> 156-114=42 >= 38 -> q=4, r=4
    { A: 92, B: 18, trialQ: 4, refB: 20 }   // 90/20=4 -> 92-72=20 >= 18 -> q=5, r=2
  ];

  const pool =
    correctionCondition === 'difference_gte_divisor' ? tooSmallCandidates : tooBigCandidates;

  let chosen = pickRandom(pool, rng);
  if (variationTarget) {
    const filtered = pool.filter(
      (c) => c.A !== variationTarget.operands[0] || c.B !== variationTarget.operands[1]
    );
    if (filtered.length > 0) {
      chosen = pickRandom(filtered, rng);
    }
  }

  const { A, B, trialQ, refB } = chosen;
  const q = Math.floor(A / B);
  const r = A % B;
  const trialProd = B * trialQ;
  const trueProd = B * q;

  const isTooBig = correctionCondition === 'product_greater_than_dividend';
  const correctionTrigger = isTooBig
    ? {
        condition: 'product_greater_than_dividend',
        hintMessage: `仮の商「${trialQ}」だと ${B} と ${trialQ} の積が ${trialProd} になり、${A} から引けないね！商が大きすぎたから 1 減らして「${q}」に修正しよう！`,
        adjustedValue: q
      }
    : {
        condition: 'difference_gte_divisor',
        hintMessage: `仮の商「${trialQ}」だと あまりが ${A - trialProd} になり、わる数 ${B} より大きいね！商が小さすぎたから 1 増やして「${q}」に修正しよう！`,
        adjustedValue: q
      };

  const steps = [
    {
      stepNumber: 1,
      id: 'adjust_quotient',
      title: '仮の商をたてて自己修正しよう',
      actionName: 'たてる',
      explanation: isTooBig
        ? `${B} をおよそ ${refB} とみて仮の商「${trialQ}」をたてると、積が ${trialProd} で ${A} から引けないね！商を1小さく修正するといくつ？`
        : `${B} をおよそ ${refB} とみて仮の商「${trialQ}」をたてると、あまりが ${A - trialProd} で ${B} より大きいね！商を1大きく修正するといくつ？`,
      blankPosition: 'quotient',
      expectedStepValue: q,
      estimatedReference: refB,
      correctionTrigger,
      hint: correctionTrigger.hintMessage
    },
    {
      stepNumber: 2,
      id: 'multiply_adjusted',
      title: '修正した商とわる数をかける',
      actionName: 'かける',
      explanation: `修正した商「${q}」とわる数 ${B} をかけ算しよう！`,
      blankPosition: 'product',
      expectedStepValue: trueProd,
      hint: `${B} に ${q} をかけると ${trueProd} になるよ！`
    },
    {
      stepNumber: 3,
      id: 'subtract_remainder',
      title: 'ひいてあまりを確認',
      actionName: 'ひく',
      explanation: `${A} - ${trueProd} を計算して、あまりを出そう！`,
      blankPosition: 'remainder',
      expectedStepValue: r,
      hint: `${A} - ${trueProd} = ${r} で、わる数 ${B} より小さいから大成功！`
    }
  ];

  return buildMathProblem({
    worldId: 4,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${A} ÷ ${B} = ?`,
    expression: `${A} ÷ ${B}`,
    displayFormat: 'column',
    operands: [A, B],
    operator: '÷',
    hasRemainder: true,
    quotient: q,
    remainder: r,
    stepMode: 'column_div_2digit',
    steps,
    commonTrap: {
      mistakeValue: trialQ,
      mistakeRemainder: isTooBig ? trialProd - A : A - trialProd,
      reasonCategory: isTooBig ? 'quotient_too_big' : 'quotient_too_small',
      diagnosis: isTooBig
        ? `仮の商「${trialQ}」だと積が ${trialProd} になって引けないよ！商を1減らそう！`
        : `仮の商「${trialQ}」だとあまりが ${A - trialProd} でわる数 ${B} 以上になるよ！商を1増やそう！`,
      hintMessage: correctionTrigger.hintMessage
    },
    errorDiagnostics: [
      {
        predictedErrorValue: trialQ,
        predictedRemainder: isTooBig ? 0 : A - trialProd,
        reasonCategory: isTooBig ? 'quotient_too_big' : 'quotient_too_small',
        adviceMessage: correctionTrigger.hintMessage
      },
      {
        predictedErrorValue: q - 1,
        predictedRemainder: r + B,
        reasonCategory: 'quotient_too_small',
        adviceMessage: `あまりが ${r + B} でわる数 ${B} より大きいから、商を1つ増やして「${q}」にしよう！`
      },
      {
        predictedErrorValue: q + 1,
        predictedRemainder: 0,
        reasonCategory: 'quotient_too_big',
        adviceMessage: `商が ${q + 1} だとわられる数 ${A} をこえて引けないよ。商を1つ減らして「${q}」にしよう！`
      }
    ],
    patternType: isTooBig ? 'trial_quotient_too_big' : 'trial_quotient_too_small',
    trapMetadata: { correctionCondition, refB, trialQ }
  });
}

/**
 * Stage 5-1: カッコのある計算と順序
 */
function generateStage5_1({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let patternType = variationTarget?.patternType;
  if (!patternType) {
    if (difficultyLevel === 'warmup' || level === 1) {
      patternType = 'sub_parens_add';
    } else if (difficultyLevel === 'standard' || difficultyLevel === 'remedial') {
      patternType = pickRandom(['sub_parens_add', 'mult_parens_add'], rng);
    } else {
      patternType = pickRandom(['sub_parens_add', 'parens_sub_div', 'mult_parens_add'], rng);
    }
  }

  let A = 100;
  let B = 35;
  let C = 28;
  let innerVal = 63;
  let finalVal = 37;
  let expression = '';
  let innerExpr = '';
  let rewriteExpr = '';
  let trapVal = 93;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (patternType === 'sub_parens_add') {
      // A - (B + C)
      B = randInt(12, 45, rng);
      C = randInt(12, 38, rng);
      innerVal = B + C;
      finalVal = randInt(15, 60, rng);
      A = innerVal + finalVal;
      expression = `${A} - (${B} + ${C})`;
      innerExpr = `${B} + ${C}`;
      rewriteExpr = `${A} - ${innerVal}`;
      trapVal = A - B + C; // Left-to-right mistake: (A - B) + C
    } else if (patternType === 'mult_parens_add') {
      // A × (B + C)
      A = randInt(3, 9, rng);
      B = randInt(6, 18, rng);
      C = randInt(4, 15, rng);
      innerVal = B + C;
      finalVal = A * innerVal;
      expression = `${A} × (${B} + ${C})`;
      innerExpr = `${B} + ${C}`;
      rewriteExpr = `${A} × ${innerVal}`;
      trapVal = A * B + C; // Ignoring parens: A * B + C
    } else {
      // (A - B) ÷ C
      C = randInt(3, 9, rng);
      finalVal = randInt(4, 12, rng);
      innerVal = C * finalVal;
      B = C * randInt(2, 5, rng);
      A = innerVal + B;
      expression = `(${A} - ${B}) ÷ ${C}`;
      innerExpr = `${A} - ${B}`;
      rewriteExpr = `${innerVal} ÷ ${C}`;
      trapVal = A - Math.floor(B / C); // Ignoring parens: A - (B / C)
    }

    if (!variationTarget || expression !== variationTarget.expression) {
      break;
    }
  }

  const steps = [
    {
      stepNumber: 1,
      id: 'parens_inner',
      title: 'カッコの中を先に計算',
      actionName: 'カッコ内',
      explanation: `一番優先される（かっこ）の中の「${innerExpr}」を計算しよう！`,
      blankPosition: 'step1',
      expectedStepValue: innerVal,
      hint: `カッコの中の ${innerExpr} は ${innerVal} になるね！`
    },
    {
      stepNumber: 2,
      id: 'final_calc',
      title: '式を書き換えて答えを出す',
      actionName: 'さきに計算',
      explanation: `カッコの部分を ${innerVal} に置き換えた「${rewriteExpr}」を計算しよう！`,
      blankPosition: 'final',
      expectedStepValue: finalVal,
      hint: `${rewriteExpr} を計算すると ${finalVal} になるよ！`
    }
  ];

  return buildMathProblem({
    worldId: 5,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${expression} = ?`,
    expression,
    displayFormat: 'tree',
    operands: [A, B, C],
    operator: 'mixed',
    hasRemainder: false,
    quotient: finalVal,
    stepMode: 'order_of_ops',
    steps,
    commonTrap: {
      mistakeValue: trapVal,
      reasonCategory: 'order_mistake',
      diagnosis: '（かっこ）の中を先に計算するルールを忘れているかも！',
      hintMessage: `左から順番ではなく、まずカッコの中の「${innerExpr}」を一番先に計算しよう！`
    },
    errorDiagnostics: [
      {
        predictedErrorValue: trapVal,
        reasonCategory: 'order_mistake',
        adviceMessage: `カッコがある式では、カッコの中の「${innerExpr} = ${innerVal}」を真っ先に計算しよう！`
      }
    ],
    patternType,
    trapMetadata: { patternType }
  });
}

/**
 * Stage 5-2: ＋－×÷ 混合計算 (左が＋－で右が×÷の順序トラップ含む)
 */
function generateStage5_2({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let patternType = variationTarget?.patternType;
  if (!patternType) {
    if (difficultyLevel === 'warmup' || level === 1) {
      patternType = 'add_then_mult';
    } else if (difficultyLevel === 'standard' || difficultyLevel === 'remedial') {
      patternType = pickRandom(['add_then_mult', 'sub_then_div'], rng);
    } else if (difficultyLevel === 'hurdle') {
      patternType = 'sub_then_mult';
    } else {
      patternType = 'four_term_mult_div';
    }
  }

  let operands = [20, 15, 3];
  let expression = '20 + 15 × 3';
  let firstCalcDesc = '15 × 3';
  let firstVal = 45;
  let rewriteDesc = '20 + 45';
  let finalVal = 65;
  let trapVal = 105;
  let steps = [];

  for (let attempt = 0; attempt < 200; attempt++) {
    if (patternType === 'add_then_mult') {
      // A + B × C
      const A = randInt(12, 45, rng);
      const B = randInt(6, 18, rng);
      const C = randInt(3, 7, rng);
      firstVal = B * C;
      finalVal = A + firstVal;
      trapVal = (A + B) * C;
      operands = [A, B, C];
      expression = `${A} + ${B} × ${C}`;
      firstCalcDesc = `${B} × ${C}`;
      rewriteDesc = `${A} + ${firstVal}`;
    } else if (patternType === 'sub_then_div') {
      // A - B ÷ C
      const C = randInt(3, 8, rng);
      firstVal = randInt(4, 12, rng);
      const B = C * firstVal;
      const A = B + C * randInt(2, 8, rng);
      finalVal = A - firstVal;
      trapVal = Math.floor((A - B) / C);
      operands = [A, B, C];
      expression = `${A} - ${B} ÷ ${C}`;
      firstCalcDesc = `${B} ÷ ${C}`;
      rewriteDesc = `${A} - ${firstVal}`;
    } else if (patternType === 'sub_then_mult') {
      // A - B × C
      const B = randInt(6, 15, rng);
      const C = randInt(3, 7, rng);
      firstVal = B * C;
      const A = firstVal + randInt(12, 45, rng);
      finalVal = A - firstVal;
      trapVal = (A - B) * C;
      operands = [A, B, C];
      expression = `${A} - ${B} × ${C}`;
      firstCalcDesc = `${B} × ${C}`;
      rewriteDesc = `${A} - ${firstVal}`;
    } else {
      // 4-term: A × B - C ÷ D
      const A = randInt(8, 16, rng);
      const B = randInt(3, 6, rng);
      const D = randInt(3, 7, rng);
      const rightVal = randInt(3, 9, rng);
      const C = D * rightVal;
      const leftVal = A * B;
      if (leftVal <= rightVal + 5) continue;
      firstVal = leftVal;
      finalVal = leftVal - rightVal;
      trapVal = Math.floor((leftVal - C) / D);
      operands = [A, B, C, D];
      expression = `${A} × ${B} - ${C} ÷ ${D}`;
      steps = [
        {
          stepNumber: 1,
          id: 'left_mult',
          title: '左側のかけ算を先に計算',
          actionName: 'さきに計算',
          explanation: `かけ算とわり算を先に計算しよう！まず左の「${A} × ${B}」はいくつ？`,
          blankPosition: 'step1',
          expectedStepValue: leftVal,
          hint: `${A} と ${B} のかけ算は ${leftVal} だね！`
        },
        {
          stepNumber: 2,
          id: 'right_div',
          title: '右側のわり算を計算',
          actionName: 'さきに計算',
          explanation: `次に右のわり算「${C} ÷ ${D}」はいくつ？`,
          blankPosition: 'step2',
          expectedStepValue: rightVal,
          hint: `${C} を ${D} で割ると ${rightVal} だね！`
        },
        {
          stepNumber: 3,
          id: 'final_sub',
          title: '最後にひき算をする',
          actionName: 'ひく',
          explanation: `最後に「${leftVal} - ${rightVal}」を計算しよう！`,
          blankPosition: 'final',
          expectedStepValue: finalVal,
          hint: `${leftVal} から ${rightVal} を引くと ${finalVal} になるね！`
        }
      ];
    }

    if (!variationTarget || expression !== variationTarget.expression) {
      break;
    }
  }

  if (patternType !== 'four_term_mult_div') {
    steps = [
      {
        stepNumber: 1,
        id: 'priority_op',
        title: 'かけ算・わり算を先に計算',
        actionName: 'さきに計算',
        explanation: `たし算・ひき算より強い「${firstCalcDesc}」を一番先に計算しよう！`,
        blankPosition: 'step1',
        expectedStepValue: firstVal,
        hint: `先に ${firstCalcDesc} を計算すると ${firstVal} になるよ！`
      },
      {
        stepNumber: 2,
        id: 'final_op',
        title: '残りの計算をする',
        actionName: 'さきに計算',
        explanation: `式を書き換えた「${rewriteDesc}」を計算しよう！`,
        blankPosition: 'final',
        expectedStepValue: finalVal,
        hint: `${rewriteDesc} = ${finalVal} だね！`
      }
    ];
  }

  return buildMathProblem({
    worldId: 5,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${expression} = ?`,
    expression,
    displayFormat: 'tree',
    operands,
    operator: 'mixed',
    hasRemainder: false,
    quotient: finalVal,
    stepMode: 'order_of_ops',
    steps,
    commonTrap: {
      mistakeValue: trapVal,
      reasonCategory: 'order_mistake',
      diagnosis: '左のたし算・ひき算から先に計算してしまっているかも！',
      hintMessage: '計算の合言葉！「かけ算・わり算は、たし算・ひき算より強い！」先に計算しよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: trapVal,
        reasonCategory: 'order_mistake',
        adviceMessage: '足し算や引き算から先に計算しちゃったかな？かけ算・わり算のほうが強いから先に計算しよう！'
      }
    ],
    patternType,
    trapMetadata: { patternType }
  });
}

/**
 * Stage 5-3: 計算の工夫（分配・結合法則）
 */
function generateStage5_3({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let patternType = variationTarget?.patternType;
  if (!patternType) {
    if (difficultyLevel === 'warmup' || level === 1) {
      patternType = 'associative_25_4';
    } else if (difficultyLevel === 'standard' || difficultyLevel === 'remedial') {
      patternType = 'distributive_factor_100';
    } else if (difficultyLevel === 'hurdle') {
      patternType = 'distributive_over_100';
    } else {
      patternType = 'distributive_under_100';
    }
  }

  let operands = [25, 36];
  let expression = '25 × 36';
  let finalVal = 900;
  let trapVal = 800;
  let steps = [];

  for (let attempt = 0; attempt < 200; attempt++) {
    if (patternType === 'associative_25_4') {
      // 25 × (4 × k) e.g. 25 × 36 = (25 × 4) × 9 = 900
      const k = randInt(3, 9, rng);
      const secondNum = 4 * k;
      finalVal = 100 * k;
      trapVal = 10 * k;
      operands = [25, secondNum];
      expression = `25 × ${secondNum}`;
      steps = [
        {
          stepNumber: 1,
          id: 'make_100',
          title: '25と4で100をつくる',
          actionName: 'さきに計算',
          explanation: `${secondNum} を「4 と ${k} の積」に分けて、先に 25 と 4 をかけるといくつになる？`,
          blankPosition: 'step1',
          expectedStepValue: 100,
          hint: '25 と 4 をかけるとキリのいい「100」になるね！'
        },
        {
          stepNumber: 2,
          id: 'mult_by_100',
          title: '100に残りの数をかける',
          actionName: 'かける',
          explanation: `できた 100 に残りの ${k} をかけるといくつ？`,
          blankPosition: 'final',
          expectedStepValue: finalVal,
          hint: `100 と ${k} の積は ${finalVal} だね！`
        }
      ];
    } else if (patternType === 'distributive_factor_100') {
      // a × c + b × c = (a + b) × c where a + b = 100
      const a = randInt(21, 79, rng);
      const b = 100 - a;
      const c = randInt(3, 9, rng);
      finalVal = 100 * c;
      trapVal = a * c + b;
      operands = [a, c, b, c];
      expression = `${a} × ${c} + ${b} × ${c}`;
      steps = [
        {
          stepNumber: 1,
          id: 'sum_to_100',
          title: '共通のかけ算をまとめてカッコにする',
          actionName: 'カッコ内',
          explanation: `両方にある「${c}」でまとめて、(${a} + ${b}) を先に計算するといくつ？`,
          blankPosition: 'step1',
          expectedStepValue: 100,
          hint: `${a} + ${b} はキリのいい「100」になるよ！`
        },
        {
          stepNumber: 2,
          id: 'mult_100',
          title: '100とかけ算する',
          actionName: 'かける',
          explanation: `100 と ${c} をかけ算して答えを出そう！`,
          blankPosition: 'final',
          expectedStepValue: finalVal,
          hint: `100 に ${c} をかけると ${finalVal} だね！`
        }
      ];
    } else if (patternType === 'distributive_over_100') {
      // (100 + d) × k e.g. 102 × 7 = 700 + 14 = 714
      const d = randInt(1, 4, rng);
      const A = 100 + d;
      const k = randInt(3, 9, rng);
      finalVal = A * k;
      trapVal = 100 * k + d; // Forgetting to multiply d by k!
      operands = [A, k];
      expression = `${A} × ${k}`;
      steps = [
        {
          stepNumber: 1,
          id: 'hundreds_part',
          title: '100と端数に分けて計算（100のパート）',
          actionName: 'かける',
          explanation: `${A} を「100 + ${d}」に分けよう。まず 100 と ${k} の積はいくつ？`,
          blankPosition: 'step1',
          expectedStepValue: 100 * k,
          hint: `100 に ${k} をかけると ${100 * k} だね！`
        },
        {
          stepNumber: 2,
          id: 'ones_part_and_sum',
          title: '端数の積を足して完成',
          actionName: 'くりあがり',
          explanation: `${100 * k} に、端数の積（${d} と ${k} の積 = ${d * k}）を足すといくつ？`,
          blankPosition: 'final',
          expectedStepValue: finalVal,
          hint: `${100 * k} + ${d * k} = ${finalVal} になるね！`
        }
      ];
    } else {
      // (100 - d) × k e.g. 98 × 6 = 600 - 12 = 588
      const d = randInt(1, 3, rng);
      const A = 100 - d;
      const k = randInt(3, 9, rng);
      finalVal = A * k;
      trapVal = 100 * k + d * k; // Adding instead of subtracting d * k!
      operands = [A, k];
      expression = `${A} × ${k}`;
      steps = [
        {
          stepNumber: 1,
          id: 'hundreds_part',
          title: '100との差を使って計算（100のパート）',
          actionName: 'かける',
          explanation: `${A} を「100 - ${d}」と考えよう。まず 100 と ${k} の積はいくつ？`,
          blankPosition: 'step1',
          expectedStepValue: 100 * k,
          hint: `100 に ${k} をかけると ${100 * k} だね！`
        },
        {
          stepNumber: 2,
          id: 'subtract_diff',
          title: '多すぎた分をひいて完成',
          actionName: 'ひく',
          explanation: `${100 * k} から、多すぎた分（${d} と ${k} の積 = ${d * k}）を引くといくつ？`,
          blankPosition: 'final',
          expectedStepValue: finalVal,
          hint: `${100 * k} - ${d * k} = ${finalVal} になるね！`
        }
      ];
    }

    if (!variationTarget || expression !== variationTarget.expression) {
      break;
    }
  }

  return buildMathProblem({
    worldId: 5,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${expression} = ?`,
    expression,
    displayFormat: 'tree',
    operands,
    operator: 'mixed',
    hasRemainder: false,
    quotient: finalVal,
    stepMode: 'order_of_ops',
    steps,
    commonTrap: {
      mistakeValue: trapVal,
      reasonCategory: 'order_mistake',
      diagnosis: '計算の工夫で分けた片方の数にも、かけ算するのを忘れないようにしよう！',
      hintMessage: 'キリのいい「100」をつくってから、端数の計算も丁寧に合わせてみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: trapVal,
        reasonCategory: 'order_mistake',
        adviceMessage: '100に分けたあとの端数の部分も忘れずに計算して合わせよう！'
      }
    ],
    patternType,
    trapMetadata: { patternType }
  });
}

// ============================================================================
// World 6: 小数 (Decimal) Helpers & Stage Generators
// 小数は浮動小数点誤差を避けるため、内部では整数にスケーリングして生成する
// (例: scale=100 のとき 325 が 3.25 を表す)
// ============================================================================

/**
 * スケーリング済み整数を表示用文字列にする (例: (325, 100) -> "3.25", (70, 100) -> "0.7")
 * 浮動小数点の文字列表現に頼らず、整数演算だけで組み立てる
 */
function formatDecimal(scaledInt, scale) {
  const sign = scaledInt < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(scaledInt));
  const intPart = Math.floor(abs / scale);
  const fracDigits = String(scale).length - 1; // 10 -> 1桁, 100 -> 2桁
  const frac = String(abs % scale).padStart(fracDigits, '0').replace(/0+$/, '');
  return frac ? `${sign}${intPart}.${frac}` : `${sign}${intPart}`;
}

/**
 * スケーリング済み整数を位ごとの数字配列にする (下の位から)
 * 例: (325, 100) -> [5, 2, 3] (0.01の位, 0.1の位, 一の位)
 */
function splitPlaces(scaledInt, scale) {
  const placeCount = String(scale).length; // scale=10 -> 2位, scale=100 -> 3位
  const digits = [];
  let rest = Math.trunc(scaledInt);
  for (let i = 0; i < placeCount; i++) {
    digits.push(rest % 10);
    rest = Math.floor(rest / 10);
  }
  if (rest > 0) digits.push(rest);
  return digits;
}

/**
 * 問題が小数問題なら、そのスケール (10 | 100) を返す。整数問題は 0
 */
function getDecimalScale(problem) {
  const scale = Number(problem?.trapMetadata?.decimalScale);
  return scale === 10 || scale === 100 ? scale : 0;
}

/**
 * 小数の等値判定 (浮動小数点誤差の影響を受けない厳密比較)
 * 両値をスケールした結果が「整数 (誤差の範囲内)」であり、かつ一致する場合のみ true。
 * Math.round 同士の比較だけだと、スケールより細かい入力 (例: 答え 7.3 への 7.301) が
 * 丸めで一致して正解扱いになってしまうため、整数性もあわせて要求する。
 */
function scaledValueEquals(a, b, scale) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (!scale) return a === b;
  const scaledA = a * scale;
  const scaledB = b * scale;
  const roundedA = Math.round(scaledA);
  const roundedB = Math.round(scaledB);
  const tolerance = 1e-6;
  if (Math.abs(scaledA - roundedA) > tolerance) return false;
  if (Math.abs(scaledB - roundedB) > tolerance) return false;
  return roundedA === roundedB;
}

/**
 * Stage 6-1 (pattern A): 0.1 が n こ集まると いくつ？
 */
function buildDecimalTenthsCount({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const ranges = {
    warmup: [3, 15],
    remedial: [3, 15],
    standard: [11, 39],
    hurdle: [21, 59],
    challenge: [41, 99]
  };
  const [lo, hi] = ranges[difficultyLevel] || ranges.standard;
  let n = 14;
  for (let attempt = 0; attempt < 50; attempt++) {
    n = randInt(lo, hi, rng);
    if (n % 10 === 0) continue; // ちょうど整数になるケースは位の練習にならない
    if (!variationTarget || variationTarget.operands?.[1] !== n) break;
  }

  const ones = Math.floor(n / 10);
  const tenths = n % 10;
  const answer = n / 10;

  const steps = [
    {
      stepNumber: 1,
      id: 'ones',
      title: '一の位の数字',
      actionName: 'かぞえる',
      explanation: `0.1 が 10 こで 1 だよ。0.1 が ${n} こあるとき、1 のまとまりは何こできる？`,
      blankPosition: 'ones',
      expectedStepValue: ones,
      digit: ones,
      hint: `10 こずつまとめていくと、1 のまとまりが ${ones} こできるよ！`
    },
    {
      stepNumber: 2,
      id: 'tenths',
      title: '0.1の位の数字',
      actionName: 'かぞえる',
      explanation: '1 のまとまりに入りきらなかった 0.1 は何こ残る？',
      blankPosition: 'tenths',
      expectedStepValue: tenths,
      digit: tenths,
      hint: `${n} こから 10 こずつ取りのぞくと、${tenths} こ残るよ！`
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '小数の答え',
      actionName: 'かぞえる',
      explanation: `一の位が ${ones}、0.1の位が ${tenths}。0.1 が ${n} こ集まった数はいくつ？`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: '一の位と 0.1の位の間に小数点を書いてみよう！'
    }
  ];

  return buildMathProblem({
    worldId: 6,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `0.1 が ${n} こ集まると いくつ？`,
    expression: `0.1 × ${n}`,
    displayFormat: 'horizontal',
    operands: [0.1, n],
    operator: '×',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: n,
      reasonCategory: 'decimal_point_position',
      diagnosis: '0.1 が 10 こ集まると 1 だよ！そのまま整数で答えていないかな？',
      hintMessage: '0.1 を 10 こずつまとめて、一の位と 0.1の位に分けてみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: n,
        reasonCategory: 'decimal_point_position',
        adviceMessage: `0.1 が ${n} こは、1 のまとまり ${ones} こと 0.1 が ${tenths} こ分だよ！`
      },
      {
        predictedErrorValue: n / 100,
        reasonCategory: 'decimal_point_position',
        adviceMessage: '小数点の位置が1つずれているかも！0.1 が 10 こで 1 になるよ！'
      }
    ],
    patternType: 'decimal_tenths_count',
    trapMetadata: { decimalScale: 10, count: n }
  });
}

/**
 * Stage 6-1 (pattern B): 「x は 0.1 (0.01) が何こ分？」
 */
function buildDecimalCountOf(patternType, { questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const isHundredths = patternType === 'decimal_count_of_hundredths';
  const unit = isHundredths ? 100 : 10;
  const unitText = isHundredths ? '0.01' : '0.1';

  let count = isHundredths ? 347 : 34;
  for (let attempt = 0; attempt < 50; attempt++) {
    count = isHundredths ? randInt(120, 989, rng) : randInt(13, 59, rng);
    if (count % 10 === 0) continue;
    if (!variationTarget || Math.round((variationTarget.operands?.[0] ?? -1) * unit) !== count) break;
  }

  const valueText = formatDecimal(count, unit);
  // splitPlaces は下の位から返す (例: 347, scale=100 -> [7, 4, 3])
  const digitsAsc = splitPlaces(count, unit);
  const placeNameFor = (i) => {
    if (i === digitsAsc.length - 1) return '一の位';
    return unit === 100 && i === 0 ? '0.01の位' : '0.1の位';
  };
  const placeIdFor = (i) => {
    if (i === digitsAsc.length - 1) return 'ones';
    return unit === 100 && i === 0 ? 'hundredths' : 'tenths';
  };
  // 大きい位から順にステップ化する (例: 347 なら 一の位=300こ, 0.1の位=40こ, 0.01の位=7こ)
  const placeIndexes = digitsAsc.map((_, i) => i).reverse();
  const onesContribution = digitsAsc[digitsAsc.length - 1] * Math.pow(10, digitsAsc.length - 1);

  const steps = placeIndexes.map((i, order) => ({
    stepNumber: order + 1,
    id: placeIdFor(i),
    title: `${placeNameFor(i)}の分`,
    actionName: 'かぞえる',
    explanation: `${valueText} の ${placeNameFor(i)}の数字は ${digitsAsc[i]}。${unitText} が何こ分？`,
    blankPosition: placeIdFor(i),
    expectedStepValue: digitsAsc[i] * Math.pow(10, i),
    hint: `${placeNameFor(i)}の 1 は ${unitText} が ${Math.pow(10, i)} こ分だよ！`
  }));
  steps.push({
    stepNumber: steps.length + 1,
    id: 'final',
    title: 'ぜんぶの数',
    actionName: 'かぞえる',
    explanation: `位ごとの分をぜんぶ合わせると、${valueText} は ${unitText} が何こ分？`,
    blankPosition: 'final',
    expectedStepValue: count,
    hint: '位ごとの数を大きい位から順に足し合わせよう！'
  });

  return buildMathProblem({
    worldId: 6,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${valueText} は ${unitText} が何こ分？`,
    expression: `${valueText} ÷ ${unitText}`,
    displayFormat: 'horizontal',
    operands: [count / unit, 1 / unit],
    operator: '÷',
    quotient: count,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: count / unit,
      reasonCategory: 'decimal_structure',
      diagnosis: '位に分けて考えよう！一の位の数字は 0.1 が 10 こ分 (0.01 なら 100 こ分) だよ！',
      hintMessage: '一の位・0.1の位・0.01の位に分けて、それぞれ何こ分か数えてみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: onesContribution,
        reasonCategory: 'decimal_structure',
        adviceMessage: '一の位の分だけを数えていないかな？小さい位の分も合わせよう！'
      },
      {
        predictedErrorValue: count / unit,
        reasonCategory: 'decimal_structure',
        adviceMessage: `${valueText} そのままの数ではなく、${unitText} が何こ分か数える問題だよ！`
      }
    ],
    patternType,
    trapMetadata: { decimalScale: unit, count }
  });
}

/**
 * Stage 6-1 (pattern C): 小数の位の数字を読む
 */
function buildDecimalPlaceDigit({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const targetPlace =
    variationTarget?.trapMetadata?.targetPlace ??
    (difficultyLevel === 'challenge' ? 'hundredths' : pickRandom(['tenths', 'hundredths'], rng));

  let m = 528;
  for (let attempt = 0; attempt < 50; attempt++) {
    const cand = randInt(123, 987, rng);
    const co = Math.floor(cand / 100);
    const ct = Math.floor(cand / 10) % 10;
    const ch = cand % 10;
    // 位の混同トラップが成立するよう、3つの位の数字はすべて異なる正の数にする
    if (co === 0 || ct === 0 || ch === 0 || co === ct || ct === ch || co === ch) continue;
    m = cand;
    if (!variationTarget || Math.round((variationTarget.operands?.[0] ?? -1) * 100) !== m) break;
  }
  const digits = [m % 10, Math.floor(m / 10) % 10, Math.floor(m / 100)];

  const [h, t, o] = digits;
  const valueText = formatDecimal(m, 100);
  const isTenths = targetPlace === 'tenths';
  const targetDigit = isTenths ? t : h;
  const trapDigit = isTenths ? o : t;

  const steps = [
    {
      stepNumber: 1,
      id: 'ones',
      title: '一の位の数字',
      actionName: 'よむ',
      explanation: `${valueText} の小数点の左側、一の位の数字は？`,
      blankPosition: 'ones',
      expectedStepValue: o,
      digit: o,
      hint: '小数点のすぐ左が一の位だよ！'
    },
    {
      stepNumber: 2,
      id: 'tenths',
      title: '0.1の位の数字',
      actionName: 'よむ',
      explanation: `${valueText} の小数点のすぐ右、0.1の位の数字は？`,
      blankPosition: 'tenths',
      expectedStepValue: t,
      digit: t,
      hint: '小数点のすぐ右が 0.1の位だよ！'
    }
  ];
  if (!isTenths) {
    steps.push({
      stepNumber: 3,
      id: 'hundredths',
      title: '0.01の位の数字',
      actionName: 'よむ',
      explanation: `${valueText} の 0.1の位の次、0.01の位の数字は？`,
      blankPosition: 'hundredths',
      expectedStepValue: h,
      digit: h,
      hint: '0.1の位の右どなりが 0.01の位だよ！'
    });
  }
  steps.push({
    stepNumber: steps.length + 1,
    id: 'final',
    title: '小数を組み立てる',
    actionName: 'よむ',
    explanation: `一の位が ${o}、0.1の位が ${t}、0.01の位が ${h}。位を組み立てた小数はいくつ？`,
    blankPosition: 'final',
    expectedStepValue: m / 100,
    hint: '一の位と 0.1の位の間に小数点を書いて、位の順に数字を並べよう！'
  });

  return buildMathProblem({
    worldId: 6,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${valueText} の ${isTenths ? '0.1' : '0.01'} の位の数字は？`,
    expression: `${valueText} の ${isTenths ? '0.1' : '0.01'}の位`,
    displayFormat: 'horizontal',
    operands: [m / 100, isTenths ? 0.1 : 0.01],
    operator: 'mixed',
    quotient: targetDigit,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: trapDigit,
      reasonCategory: 'decimal_place_read',
      diagnosis: '小数点のすぐ右が 0.1の位、その次が 0.01の位だよ！位の順番を確かめよう！',
      hintMessage: '一の位 → 0.1の位 → 0.01の位の順に、指でたどってみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: trapDigit,
        reasonCategory: 'decimal_place_read',
        adviceMessage: `それは ${isTenths ? '一の位' : '0.1の位'} の数字だよ。${isTenths ? '0.1' : '0.01'} の位は小数点から数えてみよう！`
      }
    ],
    patternType: 'decimal_place_digit',
    trapMetadata: { decimalScale: 100, targetPlace }
  });
}

/**
 * Stage 6-1: 小数の仕組み (0.1・0.01 の位の理解)
 */
function generateStage6_1(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = 'decimal_tenths_count';
    } else if (args.difficultyLevel === 'standard') {
      patternType = pickRandom(['decimal_tenths_count', 'decimal_count_of_tenths'], args.rng);
    } else if (args.difficultyLevel === 'hurdle') {
      patternType = pickRandom(['decimal_count_of_tenths', 'decimal_place_digit'], args.rng);
    } else {
      patternType = pickRandom(['decimal_count_of_hundredths', 'decimal_place_digit'], args.rng);
    }
  }

  if (patternType === 'decimal_count_of_tenths' || patternType === 'decimal_count_of_hundredths') {
    return buildDecimalCountOf(patternType, args);
  }
  if (patternType === 'decimal_place_digit') {
    return buildDecimalPlaceDigit(args);
  }
  return buildDecimalTenthsCount(args);
}

/**
 * Stage 6-2: 小数のたし算 (小数第1位・第2位、くり上がり含む)
 */
function generateStage6_2({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let scale = variationTarget?.trapMetadata?.decimalScale;
  if (!scale) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') scale = 10;
    else if (difficultyLevel === 'standard') scale = rng() < 0.5 ? 10 : 100;
    else scale = 100;
  }
  const needDoubleCarry = difficultyLevel === 'challenge' && scale === 100;

  let aInt = 325;
  let bInt = 148;
  let da = splitPlaces(aInt, scale);
  let db = splitPlaces(bInt, scale);
  let carries = [];

  for (let attempt = 0; attempt < 200; attempt++) {
    if (scale === 10) {
      aInt = randInt(12, 89, rng);
      bInt = randInt(12, 89, rng);
    } else {
      aInt = randInt(112, 989, rng);
      bInt = randInt(112, 989, rng);
    }
    da = splitPlaces(aInt, scale);
    db = splitPlaces(bInt, scale);
    carries = [];
    let carryIn = 0;
    for (let i = 0; i < da.length; i++) {
      const s = da[i] + db[i] + carryIn;
      carries.push(s >= 10);
      carryIn = Math.floor(s / 10);
    }
    // 主題は最下位のくり上がり。challenge では 2 位連続のくり上がりを要求する
    if (!carries[0]) continue;
    if (needDoubleCarry && !carries[1]) continue;
    if (!variationTarget) break;
    const tScale = variationTarget.trapMetadata?.decimalScale || scale;
    if (
      Math.round((variationTarget.operands?.[0] ?? -1) * tScale) !== aInt &&
      Math.round((variationTarget.operands?.[1] ?? -1) * tScale) !== bInt
    ) {
      break;
    }
  }

  const sumInt = aInt + bInt;
  const aText = formatDecimal(aInt, scale);
  const bText = formatDecimal(bInt, scale);
  const placeNames = scale === 100 ? ['0.01の位', '0.1の位', '一の位'] : ['0.1の位', '一の位'];
  const placeIds = scale === 100 ? ['hundredths', 'tenths', 'ones'] : ['tenths', 'ones'];

  const steps = [];
  let carryIn = 0;
  for (let i = 0; i < da.length; i++) {
    const s = da[i] + db[i] + carryIn;
    const carryOut = Math.floor(s / 10);
    steps.push({
      stepNumber: i + 1,
      id: placeIds[i],
      title: `${placeNames[i]}の計算`,
      actionName: 'くりあがり',
      explanation: carryIn > 0
        ? `${placeNames[i]}を計算しよう: くり上がりの ${carryIn} + ${da[i]} + ${db[i]} はいくつ？`
        : `${placeNames[i]}を計算しよう: ${da[i]} + ${db[i]} はいくつ？`,
      blankPosition: placeIds[i],
      expectedStepValue: s,
      carry: carryOut,
      digit: s % 10,
      hint: carryIn > 0
        ? `下の位からくり上がった ${carryIn} を忘れずに足そう！`
        : `${da[i]} + ${db[i]} を計算しよう！10 をこえたら左の位へ 1 くり上がるよ。`
    });
    carryIn = carryOut;
  }
  if (carryIn > 0) {
    const topName = '十の位';
    steps.push({
      stepNumber: steps.length + 1,
      id: 'tens',
      title: `${topName}の計算`,
      actionName: 'くりあがり',
      explanation: `一番上の位へくり上がった ${carryIn} がそのまま ${topName}の数字になるよ。${topName}の数字は？`,
      blankPosition: 'tens',
      expectedStepValue: carryIn,
      carry: 0,
      digit: carryIn,
      hint: 'くり上がった 1 を新しい位に書こう！'
    });
  }
  steps.push({
    stepNumber: steps.length + 1,
    id: 'final',
    title: '筆算の答え',
    actionName: 'くりあがり',
    explanation: `小数点をそろえて、${aText} + ${bText} の答えは？`,
    blankPosition: 'final',
    expectedStepValue: sumInt / scale,
    hint: '答えにも小数点を書くのを忘れないでね！位をそろえて数字を並べよう。'
  });

  const errorDiagnostics = [
    {
      predictedErrorValue: sumInt,
      reasonCategory: 'decimal_point_ignored',
      adviceMessage: '小数点を無視して整数のように計算していないかな？答えにも小数点を書こう！'
    },
    {
      predictedErrorValue: (sumInt * 10) / scale,
      reasonCategory: 'decimal_point_position',
      adviceMessage: '小数点の位置が1つずれているかも！位をそろえて確認しよう！'
    }
  ];
  if (carries[0]) {
    errorDiagnostics.push({
      predictedErrorValue: (sumInt - 10) / scale,
      reasonCategory: 'carry_forgotten',
      adviceMessage: `${placeNames[1]}へのくり上がりの「1」を足し忘れていないかな？`
    });
  }
  if (scale === 100 && carries[1]) {
    errorDiagnostics.push({
      predictedErrorValue: (sumInt - 100) / scale,
      reasonCategory: 'carry_forgotten',
      adviceMessage: '一の位へのくり上がりの「1」を足し忘れていないかな？'
    });
  }

  return buildMathProblem({
    worldId: 6,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${aText} + ${bText} = ?`,
    expression: `${aText} + ${bText}`,
    displayFormat: 'column',
    operands: [aInt / scale, bInt / scale],
    operator: '+',
    quotient: sumInt / scale,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: sumInt,
      reasonCategory: 'decimal_point_ignored',
      diagnosis: '小数点を無視して整数のように計算していないかな？小数点の位置をチェック！',
      hintMessage: '小数点をたてにそろえて、位ごとに計算してみよう！'
    },
    errorDiagnostics,
    patternType: `dec_add_${scale === 10 ? 'tenths' : 'hundredths'}`,
    trapMetadata: { decimalScale: scale }
  });
}

/**
 * Stage 6-3: 小数のひき算 (くり下がり・整数からのひき算含む)
 */
function generateStage6_3({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let scale = variationTarget?.trapMetadata?.decimalScale;
  if (!scale) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') scale = 10;
    else if (difficultyLevel === 'standard') scale = rng() < 0.5 ? 10 : 100;
    else scale = 100;
  }
  const fromRound =
    variationTarget?.trapMetadata?.fromRound ??
    (difficultyLevel !== 'warmup' && difficultyLevel !== 'remedial' && rng() < 0.4);
  const needDoubleBorrow = difficultyLevel === 'challenge' && scale === 100;

  let aInt = scale === 10 ? 52 : 502;
  let bInt = scale === 10 ? 28 : 268;
  let da = splitPlaces(aInt, scale);
  let db = splitPlaces(bInt, scale);

  for (let attempt = 0; attempt < 200; attempt++) {
    if (fromRound) {
      aInt = randInt(1, 4, rng) * scale;
      bInt = scale === 10 ? randInt(12, 89, rng) : randInt(112, 989, rng);
    } else if (scale === 10) {
      aInt = randInt(23, 95, rng);
      bInt = randInt(12, 89, rng);
    } else {
      aInt = randInt(213, 995, rng);
      bInt = randInt(112, 989, rng);
    }
    da = splitPlaces(aInt, scale);
    db = splitPlaces(bInt, scale);
    if (aInt <= bInt) continue;
    // 主題は最下位のくり下がり
    if (!(da[0] < db[0])) continue;
    if (needDoubleBorrow) {
      const effTens = da[1] - 1;
      if (!(effTens < db[1])) continue;
    }
    if (!variationTarget) break;
    const tScale = variationTarget.trapMetadata?.decimalScale || scale;
    if (
      Math.round((variationTarget.operands?.[0] ?? -1) * tScale) !== aInt &&
      Math.round((variationTarget.operands?.[1] ?? -1) * tScale) !== bInt
    ) {
      break;
    }
  }

  // 位ごとのくり下がりをシミュレーション
  const resDigits = [];
  const borrowIns = [];
  let borrow = 0;
  for (let i = 0; i < da.length; i++) {
    borrowIns.push(borrow);
    let d = da[i] - borrow - db[i];
    if (d < 0) {
      d += 10;
      borrow = 1;
    } else {
      borrow = 0;
    }
    resDigits.push(d);
  }
  let diffInt = 0;
  for (let i = resDigits.length - 1; i >= 0; i--) {
    diffInt = diffInt * 10 + resDigits[i];
  }

  const aText = formatDecimal(aInt, scale);
  const bText = formatDecimal(bInt, scale);
  const placeNames = scale === 100 ? ['0.01の位', '0.1の位', '一の位'] : ['0.1の位', '一の位'];
  const placeIds = scale === 100 ? ['hundredths', 'tenths', 'ones'] : ['tenths', 'ones'];

  const steps = da.map((aDigit, i) => {
    const borrowIn = borrowIns[i];
    const effA = aDigit - borrowIn;
    const bDigit = db[i];
    let explanation;
    if (effA < 0) {
      // この位が 0 で下の位に 1 貸したケース: 負の数を出さず、借りてきた 10 から
      // 貸した 1 を引いた数 (effA + 10) で計算する形で説明する (期待値は変えない)
      explanation = `${placeNames[i]}を計算しよう: 0 しかないので、上の位から 10 を借りてこよう。下の位に貸した 1 を引くと ${effA + 10} になるよ。${effA + 10} - ${bDigit} はいくつ？`;
    } else if (effA < bDigit) {
      explanation = borrowIn > 0
        ? `${placeNames[i]}を計算しよう: 貸した分を引くと ${effA}。${bDigit} は引けないので、上の位から 10 を借りて ${effA + 10} - ${bDigit} はいくつ？`
        : `${placeNames[i]}を計算しよう: ${effA} から ${bDigit} は引けないので、上の位から 10 を借りて ${effA + 10} - ${bDigit} はいくつ？`;
    } else if (borrowIn > 0) {
      explanation = `${placeNames[i]}を計算しよう: 下の位に貸した分を引いて ${effA} - ${bDigit} はいくつ？`;
    } else {
      explanation = `${placeNames[i]}を計算しよう: ${effA} - ${bDigit} はいくつ？`;
    }
    return {
      stepNumber: i + 1,
      id: placeIds[i],
      title: `${placeNames[i]}の計算`,
      actionName: 'ひく',
      explanation,
      blankPosition: placeIds[i],
      expectedStepValue: resDigits[i],
      digit: resDigits[i],
      hint: effA < bDigit
        ? '引けない時は、上の位から 10 を借りてこよう！'
        : '貸した分を引いた数字で計算するのがコツだよ！'
    };
  });
  steps.push({
    stepNumber: steps.length + 1,
    id: 'final',
    title: '筆算の答え',
    actionName: 'ひく',
    explanation: `小数点をそろえて、${aText} - ${bText} の答えは？`,
    blankPosition: 'final',
    expectedStepValue: diffInt / scale,
    hint: '答えにも小数点を書くのを忘れないでね！くり下がりのメモを確かめよう。'
  });

  const errorDiagnostics = [
    {
      predictedErrorValue: diffInt,
      reasonCategory: 'decimal_point_ignored',
      adviceMessage: '小数点を無視して整数のように計算していないかな？答えにも小数点を書こう！'
    }
  ];
  if (borrowIns[1] === 1) {
    errorDiagnostics.push({
      predictedErrorValue: (diffInt + 10) / scale,
      reasonCategory: 'borrow_forgotten',
      adviceMessage: `${placeNames[1]}に「1」貸した分を引くのを忘れていないかな？`
    });
  }
  if (da[0] < db[0]) {
    errorDiagnostics.push({
      predictedErrorValue: (diffInt - resDigits[0] + Math.abs(da[0] - db[0])) / scale,
      reasonCategory: 'borrow_forgotten',
      adviceMessage: `${placeNames[0]}は引けない時は下の数字から引かずに、上の位から 10 を借りてこよう！`
    });
  }

  return buildMathProblem({
    worldId: 6,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${aText} - ${bText} = ?`,
    expression: `${aText} - ${bText}`,
    displayFormat: 'column',
    operands: [aInt / scale, bInt / scale],
    operator: '-',
    quotient: diffInt / scale,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: diffInt,
      reasonCategory: 'decimal_point_ignored',
      diagnosis: '小数点を無視して整数のように計算していないかな？小数点の位置をチェック！',
      hintMessage: '小数点をたてにそろえて、引けない時は上の位から 10 を借りてみよう！'
    },
    errorDiagnostics,
    patternType: `dec_sub_${scale === 10 ? 'tenths' : 'hundredths'}${fromRound ? '_from_round' : ''}`,
    trapMetadata: { decimalScale: scale, fromRound }
  });
}

// ============================================================================
// World 7: 分数 (Fraction) Helpers & Stage Generators
// 分数の答えは { numerator, denominator } の整数ペアで厳密に扱う。
// correctAnswer.value には表示・照合用の数値 (numerator / denominator) を入れるが、
// 正解判定は evaluateAnswer が整数ペアの完全一致で行う (浮動小数点誤差の影響なし)
// ============================================================================

/**
 * 問題が分数解答なら、その正解 { numerator, denominator } を返す。それ以外は null
 */
function getFractionAnswer(problem) {
  const fa = problem?.trapMetadata?.fractionAnswer;
  if (
    fa &&
    Number.isInteger(fa.numerator) &&
    Number.isInteger(fa.denominator) &&
    fa.denominator > 0
  ) {
    return { numerator: fa.numerator, denominator: fa.denominator };
  }
  return null;
}

/**
 * 分数の誤答診断の予測値が、正解や他の予測値と重ならないかを整数の
 * クロス乗算で判定する。予測値どうしが重なる組では、先に一致した診断が
 * 常に選ばれて片方に到達できなくなり、誤答の原因を誤って説明してしまう
 * ため、生成側では重なる被演算子の組を再抽選する。
 * @param {[number, number]} answerPair 正解の [分子, 分母]
 * @param {Array<[number, number]>} predictedPairs 予測値の [分子, 分母] 一覧
 * @returns {boolean} 重なりがあれば true
 */
function fractionDiagnosticsCollide(answerPair, predictedPairs) {
  const pairs = [answerPair, ...predictedPairs];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      if (pairs[i][0] * pairs[j][1] === pairs[j][0] * pairs[i][1]) return true;
    }
  }
  return false;
}

/**
 * Stage 7-1 (pattern A): 「n/d は 1/d が何こ分？」(答えは整数)
 */
function buildFractionUnitCount({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let den = 7;
  let num = 3;
  for (let attempt = 0; attempt < 50; attempt++) {
    den = difficultyLevel === 'challenge' ? randInt(6, 12, rng) : randInt(3, 9, rng);
    num = randInt(2, den - 1, rng);
    // 診断の予測値 (分母 den / 1こ分) が正解 (分子 num) と重なる組は避ける
    if (fractionDiagnosticsCollide([num, 1], [[den, 1], [1, 1]])) continue;
    if (!variationTarget) break;
    const t = variationTarget.trapMetadata || {};
    if (!(t.fracDen === den && t.fracNum === num)) break;
  }

  const steps = [
    {
      stepNumber: 1,
      id: 'denominator',
      title: '分母の意味',
      actionName: 'よむ',
      explanation: `分数の下の数（分母）は、1を何等分したかを表すよ。${num}/${den} では、1を何等分している？`,
      blankPosition: 'denominator',
      expectedStepValue: den,
      hint: '分母は線の下の数だよ！'
    },
    {
      stepNumber: 2,
      id: 'numerator',
      title: '分子の意味',
      actionName: 'よむ',
      explanation: `分数の上の数（分子）は、1/${den} が何こ分か表すよ。${num}/${den} の分子はいくつ？`,
      blankPosition: 'numerator',
      expectedStepValue: num,
      hint: '分子は線の上の数だよ！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '単位分数の数',
      actionName: 'かぞえる',
      explanation: `${num}/${den} は 1/${den} が何こ分？`,
      blankPosition: 'final',
      expectedStepValue: num,
      hint: '分子の数が、そのまま「何こ分」になるよ！'
    }
  ];

  return buildMathProblem({
    worldId: 7,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${num}/${den} は 1/${den} が何こ分？`,
    expression: `${num}/${den} は 1/${den} が何こ分`,
    displayFormat: 'horizontal',
    operands: [num, den],
    operator: 'mixed',
    quotient: num,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: den,
      reasonCategory: 'fraction_part_mixup',
      diagnosis: '分母の数を答えてしまったかも！聞かれているのは「1つ分が何こ分か」だよ！',
      hintMessage: '分子が「何こ分」、分母が「何等分したか」だよ。分子を見てみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: den,
        reasonCategory: 'fraction_part_mixup',
        adviceMessage: `それは分母の数だね。${num}/${den} は 1/${den} が「分子の数」こ分だよ！`
      },
      {
        predictedErrorValue: 1,
        reasonCategory: 'fraction_unit_miss',
        adviceMessage: `${num}/${den} は 1/${den} が ${num} こ分だよ。1つ分だけではないよ！`
      }
    ],
    patternType: 'frac_unit_count',
    trapMetadata: { fracDen: den, fracNum: num }
  });
}

/**
 * Stage 7-1 (pattern B): 「1を d 等分したうちの n こ分」を分数で表す (答えは分数)
 */
function buildFractionPartsToFraction({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let den = 7;
  let num = 3;
  for (let attempt = 0; attempt < 50; attempt++) {
    den = difficultyLevel === 'challenge' ? randInt(4, 12, rng) : randInt(3, 9, rng);
    num = randInt(1, den - 1, rng);
    // 診断の予測値 (上下反転 den/num / 同じ数 1) が正解 num/den と重なる組は避ける
    if (fractionDiagnosticsCollide([num, den], [[den, num], [1, 1]])) continue;
    if (!variationTarget) break;
    const t = variationTarget.trapMetadata || {};
    if (!(t.fracDen === den && t.fracNum === num)) break;
  }

  const steps = [
    {
      stepNumber: 1,
      id: 'denominator',
      title: '分母を決める',
      actionName: 'かぞえる',
      explanation: `1を ${den} 等分したよ。答えの分母（何等分したか）はいくつ？`,
      blankPosition: 'denominator',
      expectedStepValue: den,
      hint: '等分した数が分母になるよ！'
    },
    {
      stepNumber: 2,
      id: 'numerator',
      title: '分子を決める',
      actionName: 'かぞえる',
      explanation: `そのうちの ${num} こ分だよ。答えの分子（何こ分か）はいくつ？`,
      blankPosition: 'numerator',
      expectedStepValue: num,
      hint: '何こ分か、が分子になるよ！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '分数の完成',
      actionName: 'かぞえる',
      explanation: `答えは ${num}/${den} だよ。もう一度、分子はいくつ？`,
      blankPosition: 'final',
      expectedStepValue: num,
      hint: '上が分子、下が分母だよ！'
    }
  ];

  return buildMathProblem({
    worldId: 7,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `1を ${den} 等分したうちの ${num} こ分は、分数で表すといくつ？`,
    expression: `1を${den}等分したうちの${num}こ分`,
    displayFormat: 'horizontal',
    operands: [num, den],
    operator: 'mixed',
    hasFraction: true,
    quotient: num / den,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: den / num,
      reasonCategory: 'fraction_inverted',
      diagnosis: '分子と分母が反対になっているかも！分母は「何等分したか」だよ！',
      hintMessage: '下が分母（等分した数）、上が分子（何こ分）だよ！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: den / num,
        reasonCategory: 'fraction_inverted',
        adviceMessage: `上下が反対かも！${den} 等分した数が分母で下、${num} こ分が分子で上だよ！`
      },
      {
        predictedErrorValue: 1,
        reasonCategory: 'fraction_same_numbers',
        adviceMessage: `分母と分子を同じ数にしていないかな？分母は ${den}、分子は ${num} だよ！`
      }
    ],
    patternType: 'frac_parts_to_fraction',
    trapMetadata: {
      fractionAnswer: { numerator: num, denominator: den },
      fracDen: den,
      fracNum: num
    }
  });
}

/**
 * Stage 7-1 (pattern C): 帯分数を仮分数に直す (答えは分数)
 */
function buildFractionMixedToImproper({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let whole = 1;
  let den = 5;
  let num = 2;
  for (let attempt = 0; attempt < 50; attempt++) {
    whole = difficultyLevel === 'challenge' ? randInt(2, 3, rng) : randInt(1, 2, rng);
    den = randInt(3, 9, rng);
    num = randInt(1, den - 1, rng);
    // 診断の予測値 (整数部分 whole / 上下反転) が正解の仮分数と重なる組は避ける
    if (
      fractionDiagnosticsCollide(
        [whole * den + num, den],
        [[whole, 1], [den, whole * den + num]]
      )
    ) {
      continue;
    }
    if (!variationTarget) break;
    const t = variationTarget.trapMetadata || {};
    if (!(t.fracWhole === whole && t.fracDen === den && t.fracNum === num)) break;
  }
  const improperNum = whole * den + num;

  const steps = [
    {
      stepNumber: 1,
      id: 'unit',
      title: '1の変身',
      actionName: 'かぞえる',
      explanation: `1 は 1/${den} が何こ分？`,
      blankPosition: 'unit',
      expectedStepValue: den,
      hint: `1を ${den} 等分すると、1つ分は 1/${den} だね！`
    },
    {
      stepNumber: 2,
      id: 'whole',
      title: '整数部分の変身',
      actionName: 'かぞえる',
      explanation: `${whole} は 1/${den} が何こ分？（${den} × ${whole}）`,
      blankPosition: 'whole',
      expectedStepValue: whole * den,
      hint: '1が「分母の数」こ分だから、整数の分だけかけ算しよう！'
    },
    {
      stepNumber: 3,
      id: 'numerator',
      title: '分子を合わせる',
      actionName: 'たす',
      explanation: `もとの ${num}/${den} と合わせると、分子は ${whole * den} + ${num} でいくつ？`,
      blankPosition: 'numerator',
      expectedStepValue: improperNum,
      hint: '変身させた数に、もとの分子を足そう！'
    },
    {
      stepNumber: 4,
      id: 'final',
      title: '分母の確認',
      actionName: 'かぞえる',
      explanation: `答えは ${improperNum}/${den} だよ。答えの分母はいくつ？`,
      blankPosition: 'final',
      expectedStepValue: den,
      hint: '仮分数に直しても、分母は変わらないよ！'
    }
  ];

  return buildMathProblem({
    worldId: 7,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${whole}と${num}/${den} を仮分数で表すといくつ？`,
    expression: `${whole}と${num}/${den} を仮分数に`,
    displayFormat: 'horizontal',
    operands: [whole, num, den],
    operator: 'mixed',
    hasFraction: true,
    quotient: improperNum / den,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: whole,
      reasonCategory: 'fraction_mixed_convert',
      diagnosis: `整数の部分だけを直して、もとの分子 ${num} を足し忘れているかも！`,
      hintMessage: '整数を変身させた数に、もとの分子を足すのを忘れずに！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: whole,
        reasonCategory: 'fraction_mixed_convert',
        adviceMessage: `${whole} は 1/${den} が ${whole * den} こ分。もとの分子 ${num} を足して ${improperNum} が答えの分子だよ！`
      },
      {
        predictedErrorValue: den / improperNum,
        reasonCategory: 'fraction_inverted',
        adviceMessage: '分子と分母が反対になっているかも！仮分数の分子は分母より大きくなるよ！'
      }
    ],
    patternType: 'frac_mixed_to_improper',
    trapMetadata: {
      fractionAnswer: { numerator: improperNum, denominator: den },
      fracDen: den,
      fracNum: num,
      fracWhole: whole
    }
  });
}

/**
 * Stage 7-1: 分数の仕組み (分母・分子と単位分数)
 */
function generateStage7_1(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = 'frac_unit_count';
    } else if (args.difficultyLevel === 'standard') {
      patternType = pickRandom(['frac_unit_count', 'frac_parts_to_fraction'], args.rng);
    } else if (args.difficultyLevel === 'hurdle') {
      patternType = pickRandom(['frac_parts_to_fraction', 'frac_mixed_to_improper'], args.rng);
    } else {
      patternType = pickRandom(['frac_mixed_to_improper', 'frac_parts_to_fraction'], args.rng);
    }
  }

  if (patternType === 'frac_parts_to_fraction') {
    return buildFractionPartsToFraction(args);
  }
  if (patternType === 'frac_mixed_to_improper') {
    return buildFractionMixedToImproper(args);
  }
  return buildFractionUnitCount(args);
}

/**
 * Stage 7-2: 同分母のたし算 (分母はそのまま、分子だけ足す)
 * challenge では和が1を超える仮分数の答えまで扱う
 */
function generateStage7_2({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const isChallenge = difficultyLevel === 'challenge';
  let den = variationTarget?.trapMetadata?.fracDen;
  if (!den) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') den = randInt(4, 7, rng);
    else if (difficultyLevel === 'standard') den = randInt(4, 9, rng);
    else if (difficultyLevel === 'hurdle') den = randInt(5, 10, rng);
    else den = randInt(6, 12, rng);
  }

  let a = 2;
  let b = 3;
  for (let attempt = 0; attempt < 200; attempt++) {
    a = randInt(1, den - 1, rng);
    b = randInt(1, den - 1, rng);
    if (isChallenge ? a + b <= den : a + b >= den) continue;
    // 診断の予測値どうしが重なる組は再抽選する。重なると先に一致した診断が
    // 常に選ばれ、もう一方の原因を説明できなくなる
    // (例: 1/6+3/6 では「分母も足した」4/12 と「引いてしまった」2/6 が同じ 1/3)
    const predictedPairs = [[a + b, 2 * den], [den, a + b]];
    if (a !== b) predictedPairs.push([Math.abs(a - b), den]);
    if (fractionDiagnosticsCollide([a + b, den], predictedPairs)) continue;
    if (!variationTarget) break;
    const t = variationTarget.operands || [];
    if (!(t[0] === a && t[2] === b)) break;
  }
  const sum = a + b;

  const steps = [
    {
      stepNumber: 1,
      id: 'unit_a',
      title: '1つ目の分数',
      actionName: 'かぞえる',
      explanation: `${a}/${den} は 1/${den} が何こ分？`,
      blankPosition: 'unit_a',
      expectedStepValue: a,
      hint: '分子の数が「何こ分」だよ！'
    },
    {
      stepNumber: 2,
      id: 'unit_b',
      title: '2つ目の分数',
      actionName: 'かぞえる',
      explanation: `${b}/${den} は 1/${den} が何こ分？`,
      blankPosition: 'unit_b',
      expectedStepValue: b,
      hint: '分子の数が「何こ分」だよ！'
    },
    {
      stepNumber: 3,
      id: 'numerator',
      title: '分子同士を足す',
      actionName: 'たす',
      explanation: sum > den
        ? `分子同士を足すと何こ分？ ${a} + ${b} = ?（分母より大きくなったら仮分数だね！）`
        : `分子同士を足すと何こ分？ ${a} + ${b} = ?`,
      blankPosition: 'numerator',
      expectedStepValue: sum,
      hint: '単位分数の数を合わせるだけだよ！'
    },
    {
      stepNumber: 4,
      id: 'final',
      title: '分母の確認',
      actionName: 'かぞえる',
      explanation: `答えは ${sum}/${den} だよ。答えの分母はいくつ？（分母は変わらないよ）`,
      blankPosition: 'final',
      expectedStepValue: den,
      hint: '分母は「何等分したか」。たし算でも変わらないよ！'
    }
  ];

  const errorDiagnostics = [
    {
      predictedErrorValue: sum / (2 * den),
      reasonCategory: 'fraction_denominator_added',
      adviceMessage: `分母同士を足していないかな？分母は ${den} のままだよ！`
    },
    {
      predictedErrorValue: den / sum,
      reasonCategory: 'fraction_inverted',
      adviceMessage: '分子と分母が反対になっているかも！上が分子、下が分母だよ！'
    }
  ];
  if (a !== b) {
    errorDiagnostics.push({
      predictedErrorValue: Math.abs(a - b) / den,
      reasonCategory: 'fraction_subtracted_instead',
      adviceMessage: 'たし算なのに、分子を引いてしまっていないかな？'
    });
  }

  return buildMathProblem({
    worldId: 7,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${a}/${den} + ${b}/${den} = ?`,
    expression: `${a}/${den} + ${b}/${den}`,
    displayFormat: 'horizontal',
    operands: [a, den, b, den],
    operator: '+',
    hasFraction: true,
    quotient: sum / den,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: sum / (2 * den),
      reasonCategory: 'fraction_denominator_added',
      diagnosis: '分母同士も足してしまったかも！分母は「何等分したか」だから変わらないよ！',
      hintMessage: '分母はそのまま。分子だけを足してみよう！'
    },
    errorDiagnostics,
    patternType: 'frac_add_same_den',
    trapMetadata: {
      fractionAnswer: { numerator: sum, denominator: den },
      fracDen: den,
      fracA: a,
      fracB: b
    }
  });
}

/**
 * Stage 7-3 (pattern A): 同分母のひき算 (真分数 − 真分数)
 */
function buildFractionSubSameDen({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let den = variationTarget?.trapMetadata?.fracDen;
  if (!den) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') den = randInt(4, 7, rng);
    else if (difficultyLevel === 'standard') den = randInt(4, 9, rng);
    else if (difficultyLevel === 'hurdle') den = randInt(5, 10, rng);
    else den = randInt(6, 12, rng);
  }

  let a = 5;
  let b = 2;
  for (let attempt = 0; attempt < 200; attempt++) {
    a = randInt(2, den - 1, rng);
    b = randInt(1, a - 1, rng);
    // 診断の予測値どうし (足してしまう / 上下反転 / 分母も計算) が重なる組は避ける
    if (
      fractionDiagnosticsCollide(
        [a - b, den],
        [[a + b, den], [den, a - b], [a - b, 2 * den]]
      )
    ) {
      continue;
    }
    if (!variationTarget) break;
    const t = variationTarget.operands || [];
    if (!(t[0] === a && t[2] === b)) break;
  }
  const diff = a - b;

  const steps = [
    {
      stepNumber: 1,
      id: 'unit_a',
      title: 'はじめの分数',
      actionName: 'かぞえる',
      explanation: `${a}/${den} は 1/${den} が何こ分？`,
      blankPosition: 'unit_a',
      expectedStepValue: a,
      hint: '分子の数が「何こ分」だよ！'
    },
    {
      stepNumber: 2,
      id: 'unit_b',
      title: '引く分数',
      actionName: 'かぞえる',
      explanation: `${b}/${den} は 1/${den} が何こ分？`,
      blankPosition: 'unit_b',
      expectedStepValue: b,
      hint: '分子の数が「何こ分」だよ！'
    },
    {
      stepNumber: 3,
      id: 'numerator',
      title: '分子同士を引く',
      actionName: 'ひく',
      explanation: `分子同士を引くと何こ分？ ${a} - ${b} = ?`,
      blankPosition: 'numerator',
      expectedStepValue: diff,
      hint: '単位分数の数だけを引くよ！'
    },
    {
      stepNumber: 4,
      id: 'final',
      title: '分母の確認',
      actionName: 'かぞえる',
      explanation: `答えは ${diff}/${den} だよ。答えの分母はいくつ？（分母は変わらないよ）`,
      blankPosition: 'final',
      expectedStepValue: den,
      hint: '分母は「何等分したか」。ひき算でも変わらないよ！'
    }
  ];

  return buildMathProblem({
    worldId: 7,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${a}/${den} - ${b}/${den} = ?`,
    expression: `${a}/${den} - ${b}/${den}`,
    displayFormat: 'horizontal',
    operands: [a, den, b, den],
    operator: '-',
    hasFraction: true,
    quotient: diff / den,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: (a + b) / den,
      reasonCategory: 'fraction_added_instead',
      diagnosis: 'ひき算なのに、分子を足してしまったかも！',
      hintMessage: '分子同士を引いてみよう。分母はそのままだよ！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: (a + b) / den,
        reasonCategory: 'fraction_added_instead',
        adviceMessage: 'ひき算なのに分子を足していないかな？分子同士を引いてみよう！'
      },
      {
        predictedErrorValue: den / diff,
        reasonCategory: 'fraction_inverted',
        adviceMessage: '分子と分母が反対になっているかも！上が分子、下が分母だよ！'
      },
      {
        predictedErrorValue: diff / (2 * den),
        reasonCategory: 'fraction_denominator_added',
        adviceMessage: `分母まで計算してしまったかも！分母は ${den} のままだよ！`
      }
    ],
    patternType: 'frac_sub_same_den',
    trapMetadata: {
      fractionAnswer: { numerator: diff, denominator: den },
      fracDen: den,
      fracA: a,
      fracB: b
    }
  });
}

/**
 * Stage 7-3 (pattern B): 帯分数 (1とn/d) − 真分数 (m/d)、分子が引けないので借りる
 */
function buildFractionSubMixedBorrow({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let den = variationTarget?.trapMetadata?.fracDen;
  if (!den) {
    if (difficultyLevel === 'standard') den = randInt(4, 9, rng);
    else if (difficultyLevel === 'hurdle') den = randInt(5, 10, rng);
    else den = randInt(6, 12, rng);
  }

  let n = 1;
  let m = den - 1;
  for (let attempt = 0; attempt < 200; attempt++) {
    n = randInt(1, den - 2, rng);
    m = randInt(n + 1, den - 1, rng);
    // 借り忘れトラップ (m - n) が正解 (den + n - m) と一致する組は避ける
    if (den === 2 * (m - n)) continue;
    // 診断の予測値どうしが重なる組も避ける (例: 1と2/4-3/4 では「借り忘れ」
    // 1/4 と「整数部分の足し忘れ」1/4 が一致し、後者に到達できなくなる)
    const borrowPredicted = [[m - n, den], [den, den + n - m]];
    if (den - m > 0 && den - m !== den + n - m) borrowPredicted.push([den - m, den]);
    if (fractionDiagnosticsCollide([den + n - m, den], borrowPredicted)) continue;
    if (!variationTarget) break;
    const t = variationTarget.trapMetadata || {};
    if (!(t.fracNum === n && t.fracSub === m)) break;
  }
  const improperNum = den + n;
  const resultNum = improperNum - m;

  const steps = [
    {
      stepNumber: 1,
      id: 'convert',
      title: '仮分数に直す',
      actionName: 'かぞえる',
      explanation: `1と${n}/${den} を仮分数に直そう。1 は 1/${den} が ${den} こ分だから、分子は ${den} + ${n} でいくつ？`,
      blankPosition: 'convert',
      expectedStepValue: improperNum,
      hint: '整数の1を「分母の数こ分」に変身させて、もとの分子と合わせよう！'
    },
    {
      stepNumber: 2,
      id: 'unit_b',
      title: '引く分数',
      actionName: 'かぞえる',
      explanation: `${m}/${den} は 1/${den} が何こ分？`,
      blankPosition: 'unit_b',
      expectedStepValue: m,
      hint: '分子の数が「何こ分」だよ！'
    },
    {
      stepNumber: 3,
      id: 'numerator',
      title: '分子同士を引く',
      actionName: 'ひく',
      explanation: `分子同士を引くと何こ分？ ${improperNum} - ${m} = ?`,
      blankPosition: 'numerator',
      expectedStepValue: resultNum,
      hint: '仮分数に直したから、そのまま引けるよ！'
    },
    {
      stepNumber: 4,
      id: 'final',
      title: '分母の確認',
      actionName: 'かぞえる',
      explanation: `答えは ${resultNum}/${den} だよ。答えの分母はいくつ？（分母は変わらないよ）`,
      blankPosition: 'final',
      expectedStepValue: den,
      hint: '分母は「何等分したか」。ひき算でも変わらないよ！'
    }
  ];

  const errorDiagnostics = [
    {
      predictedErrorValue: (m - n) / den,
      reasonCategory: 'fraction_borrow_forgotten',
      adviceMessage: '分子が引けない時は、帯分数を仮分数に直してから引くんだったね！小さい方から引いてしまっているかも！'
    },
    {
      predictedErrorValue: den / resultNum,
      reasonCategory: 'fraction_inverted',
      adviceMessage: '分子と分母が反対になっているかも！上が分子、下が分母だよ！'
    }
  ];
  if (den - m > 0 && den - m !== resultNum) {
    errorDiagnostics.push({
      predictedErrorValue: (den - m) / den,
      reasonCategory: 'fraction_mixed_convert',
      adviceMessage: `1を ${den} こ分に直したあと、もとの分子 ${n} を足し忘れているかも！`
    });
  }

  return buildMathProblem({
    worldId: 7,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `1と${n}/${den} - ${m}/${den} = ?`,
    expression: `1と${n}/${den} - ${m}/${den}`,
    displayFormat: 'horizontal',
    operands: [improperNum, den, m, den],
    operator: '-',
    hasFraction: true,
    quotient: resultNum / den,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: (m - n) / den,
      reasonCategory: 'fraction_borrow_forgotten',
      diagnosis: '分子が引けない時は、帯分数を仮分数に直してから引くんだったね！小さい方から引いてしまっているかも！',
      hintMessage: '1と書かれた数を仮分数に直してから、分子同士を引いてみよう！'
    },
    errorDiagnostics,
    patternType: 'frac_sub_mixed_borrow',
    trapMetadata: {
      fractionAnswer: { numerator: resultNum, denominator: den },
      fracDen: den,
      fracNum: n,
      fracSub: m
    }
  });
}

/**
 * Stage 7-3 (pattern C): 帯分数 − 帯分数 (借りが必要、答えは真分数)
 */
function buildFractionSubMixedMixed({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let den = variationTarget?.trapMetadata?.fracDen;
  if (!den) den = randInt(6, 12, rng);

  let wholeA = 2;
  let n = 1;
  let m = den - 1;
  for (let attempt = 0; attempt < 200; attempt++) {
    wholeA = randInt(2, 3, rng);
    n = randInt(1, den - 2, rng);
    m = randInt(n + 1, den - 1, rng);
    // 診断の予測値どうし (別々に引く den+m-n / 上下反転) が正解 (分子 den+n-m)
    // や相互に重なる組は避ける
    if (
      fractionDiagnosticsCollide(
        [den + n - m, den],
        [[den + m - n, den], [den, den + n - m]]
      )
    ) {
      continue;
    }
    if (!variationTarget) break;
    const t = variationTarget.trapMetadata || {};
    if (!(t.fracWhole === wholeA && t.fracNum === n && t.fracSub === m)) break;
  }
  const wholeB = wholeA - 1;
  const improperA = wholeA * den + n;
  const improperB = wholeB * den + m;
  const resultNum = improperA - improperB;

  const steps = [
    {
      stepNumber: 1,
      id: 'convert_a',
      title: 'はじめの帯分数を直す',
      actionName: 'かぞえる',
      explanation: `${wholeA}と${n}/${den} を仮分数に直そう。分子は ${wholeA} × ${den} + ${n} でいくつ？`,
      blankPosition: 'convert_a',
      expectedStepValue: improperA,
      hint: '整数の分は「分母の数こ分」に変身させるよ！'
    },
    {
      stepNumber: 2,
      id: 'convert_b',
      title: '引く帯分数を直す',
      actionName: 'かぞえる',
      explanation: `${wholeB}と${m}/${den} を仮分数に直そう。分子は ${wholeB} × ${den} + ${m} でいくつ？`,
      blankPosition: 'convert_b',
      expectedStepValue: improperB,
      hint: 'こちらも同じように変身させよう！'
    },
    {
      stepNumber: 3,
      id: 'numerator',
      title: '分子同士を引く',
      actionName: 'ひく',
      explanation: `分子同士を引くと何こ分？ ${improperA} - ${improperB} = ?`,
      blankPosition: 'numerator',
      expectedStepValue: resultNum,
      hint: '両方とも仮分数に直したから、そのまま引けるよ！'
    },
    {
      stepNumber: 4,
      id: 'final',
      title: '分母の確認',
      actionName: 'かぞえる',
      explanation: `答えは ${resultNum}/${den} だよ。答えの分母はいくつ？（分母は変わらないよ）`,
      blankPosition: 'final',
      expectedStepValue: den,
      hint: '分母は「何等分したか」。ひき算でも変わらないよ！'
    }
  ];

  return buildMathProblem({
    worldId: 7,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${wholeA}と${n}/${den} - ${wholeB}と${m}/${den} = ?`,
    expression: `${wholeA}と${n}/${den} - ${wholeB}と${m}/${den}`,
    displayFormat: 'horizontal',
    operands: [improperA, den, improperB, den],
    operator: '-',
    hasFraction: true,
    quotient: resultNum / den,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: ((wholeA - wholeB) * den + (m - n)) / den,
      reasonCategory: 'fraction_borrow_forgotten',
      diagnosis: '分子が引けない時は、帯分数を仮分数に直してから引くんだったね！整数部分と分子を別々に引いてしまっているかも！',
      hintMessage: '両方とも仮分数に直してから、分子同士を引いてみよう！'
    },
    errorDiagnostics: [
      {
        predictedErrorValue: ((wholeA - wholeB) * den + (m - n)) / den,
        reasonCategory: 'fraction_borrow_forgotten',
        adviceMessage: '整数部分と分子を別々に計算して、分子を小さい方から引いてしまっているかも！仮分数に直してから引こう！'
      },
      {
        predictedErrorValue: den / resultNum,
        reasonCategory: 'fraction_inverted',
        adviceMessage: '分子と分母が反対になっているかも！上が分子、下が分母だよ！'
      }
    ],
    patternType: 'frac_sub_mixed_mixed',
    trapMetadata: {
      fractionAnswer: { numerator: resultNum, denominator: den },
      fracDen: den,
      fracNum: n,
      fracSub: m,
      fracWhole: wholeA
    }
  });
}

/**
 * Stage 7-3: 同分母のひき算 (帯分数からの借りを含む)
 */
function generateStage7_3(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = 'frac_sub_same_den';
    } else if (args.difficultyLevel === 'standard' || args.difficultyLevel === 'hurdle') {
      patternType = pickRandom(['frac_sub_same_den', 'frac_sub_mixed_borrow'], args.rng);
    } else {
      patternType = pickRandom(['frac_sub_mixed_borrow', 'frac_sub_mixed_mixed'], args.rng);
    }
  }

  if (patternType === 'frac_sub_mixed_borrow') {
    return buildFractionSubMixedBorrow(args);
  }
  if (patternType === 'frac_sub_mixed_mixed') {
    return buildFractionSubMixedMixed(args);
  }
  return buildFractionSubSameDen(args);
}

// ============================================================================
// Stage 8-x Helpers: 大きな数とがい数 (位取り・四捨五入・概算)
// ============================================================================

const LARGE_PLACES = [
  { value: 1, name: '一の位' },
  { value: 10, name: '十の位' },
  { value: 100, name: '百の位' },
  { value: 1000, name: '千の位' },
  { value: 10000, name: '万の位' },
  { value: 100000, name: '十万の位' },
  { value: 1000000, name: '百万の位' },
  { value: 10000000, name: '千万の位' },
  { value: 100000000, name: '億の位' },
  { value: 1000000000, name: '十億の位' },
  { value: 10000000000, name: '百億の位' },
  { value: 100000000000, name: '千億の位' },
  { value: 1000000000000, name: '兆の位' }
];

function largePlaceName(placeValue) {
  const found = LARGE_PLACES.find((p) => p.value === placeValue);
  return found ? found.name : '一の位';
}

/** 一の位から数えた位の順番 (一の位=1, 十の位=2, ..., 兆の位=13) */
function largePlacePosition(placeValue) {
  return LARGE_PLACES.findIndex((p) => p.value === placeValue) + 1;
}

function digitAtPlace(n, placeValue) {
  return Math.floor(n / placeValue) % 10;
}

/** 3桁区切り表記 (例: 1234567 → '1,234,567')。桁を数えやすくするための表示用 */
function formatComma(n) {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 万・億・兆のまとまりで読む表記 (例: 456000000 → '4億5600万', 30000000 → '3000万') */
function formatUnitReading(n) {
  if (n === 0) return '0';
  const groups = [
    { unit: '兆', size: 1000000000000 },
    { unit: '億', size: 100000000 },
    { unit: '万', size: 10000 },
    { unit: '', size: 1 }
  ];
  let rest = n;
  let out = '';
  for (const g of groups) {
    const v = Math.floor(rest / g.size);
    if (v > 0) {
      out += `${v}${g.unit}`;
      rest -= v * g.size;
    }
  }
  return out;
}

/** place の位までのがい数にする (四捨五入。0.5 は切り上げ) */
function roundToPlace(n, place) {
  return Math.round(n / place) * place;
}

/**
 * 切り上げで「残す位」の 9 が 0 に繰り上がってしまう組み合わせか
 * (例: 19,643 を千の位まで → 20,000、9,668 を上から1桁 → 10,000)。
 * この場合ステップ「残す位の数字」の期待値が 0 になり、答えと食い違う
 */
function roundingCarriesPastKeptDigit(n, place) {
  return digitAtPlace(n, place) === 9 && digitAtPlace(n, place / 10) >= 5;
}

function countTrailingZeros(n) {
  let count = 0;
  let rest = Math.abs(Math.trunc(n));
  while (rest > 0 && rest % 10 === 0) {
    count++;
    rest = Math.floor(rest / 10);
  }
  return count;
}

/**
 * Stage 8-1 (pattern A): 大きな数の位の数字を読む
 */
function buildLargePlaceDigit({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let placePool;
  if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
    placePool = [10000, 100000, 1000000, 10000000, 100000000];
  } else if (difficultyLevel === 'standard') {
    placePool = [100000, 1000000, 10000000, 100000000, 1000000000, 10000000000];
  } else if (difficultyLevel === 'hurdle') {
    placePool = [1000000, 10000000, 100000000, 1000000000, 10000000000, 100000000000];
  } else {
    placePool = [10000000, 100000000, 1000000000, 10000000000, 100000000000, 1000000000000];
  }
  let place = variationTarget?.trapMetadata?.placeValue;
  if (!placePool.includes(place) && !LARGE_PLACES.some((p) => p.value === place && place >= 10000)) {
    place = pickRandom(placePool, rng);
  }

  let n = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    const topPlace = Math.min(place * Math.pow(10, randInt(0, 2, rng)), 1000000000000);
    n = 0;
    for (const p of LARGE_PLACES) {
      if (p.value > topPlace) break;
      const d = p.value === topPlace ? randInt(1, 9, rng) : randInt(0, 9, rng);
      n += d * p.value;
    }
    if (!variationTarget) break;
    if (variationTarget.operands?.[0] !== n) break;
  }

  const digit = digitAtPlace(n, place);
  const position = largePlacePosition(place);
  const placeName = largePlaceName(place);
  const nText = formatComma(n);

  const leftDigit = place < 1000000000000 ? digitAtPlace(n, place * 10) : null;
  const rightDigit = place > 1 ? digitAtPlace(n, place / 10) : null;

  const errorDiagnostics = [];
  if (leftDigit !== null && leftDigit !== digit) {
    errorDiagnostics.push({
      predictedErrorValue: leftDigit,
      reasonCategory: 'large_place_neighbor',
      adviceMessage: `それは1つ左の${largePlaceName(place * 10)}の数字だね。${placeName}は右から${position}番目だよ！`
    });
  }
  if (rightDigit !== null && rightDigit !== digit && rightDigit !== leftDigit) {
    errorDiagnostics.push({
      predictedErrorValue: rightDigit,
      reasonCategory: 'large_place_neighbor',
      adviceMessage: `それは1つ右の${largePlaceName(place / 10)}の数字だね。${placeName}は右から${position}番目だよ！`
    });
  }
  let mistakeValue;
  let trapPlaceName = '';
  if (leftDigit !== null && leftDigit !== digit) {
    mistakeValue = leftDigit;
    trapPlaceName = largePlaceName(place * 10);
  } else if (rightDigit !== null && rightDigit !== digit) {
    mistakeValue = rightDigit;
    trapPlaceName = largePlaceName(place / 10);
  } else {
    mistakeValue = (digit + 1) % 10;
  }
  if (errorDiagnostics.length === 0) {
    errorDiagnostics.push({
      predictedErrorValue: mistakeValue,
      reasonCategory: 'large_digit_slip',
      adviceMessage: '位取り表で、右から1つずつ数えて確かめてみよう！'
    });
  }

  const steps = [
    {
      stepNumber: 1,
      id: 'position',
      title: '位の場所',
      actionName: 'かぞえる',
      explanation: `位取り表で確かめよう。${placeName}は、一の位から数えて何番目の位？`,
      blankPosition: 'position',
      expectedStepValue: position,
      hint: '右から「一、十、百、千、万、十万…」と順に数えてみよう！'
    },
    {
      stepNumber: 2,
      id: 'digit',
      title: '位の数字',
      actionName: 'よむ',
      explanation: `${nText} を右から数えて、${position}番目（${placeName}）の数字は？`,
      blankPosition: 'digit',
      expectedStepValue: digit,
      hint: '右から4桁ずつ区切ると「万・億」のまとまりで読みやすいよ！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '位の数字の答え',
      actionName: 'よむ',
      explanation: `${nText} の ${placeName}の数字は？`,
      blankPosition: 'final',
      expectedStepValue: digit,
      hint: `${placeName}は右から${position}番目だよ！`
    }
  ];

  return buildMathProblem({
    worldId: 8,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${nText} の ${placeName}の数字は？`,
    expression: `${nText} の ${placeName}`,
    displayFormat: 'horizontal',
    operands: [n, place],
    operator: 'mixed',
    quotient: digit,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue,
      reasonCategory: 'large_place_neighbor',
      diagnosis: trapPlaceName
        ? `となりの${trapPlaceName}の数字とまちがえているかも！${placeName}は右から${position}番目だよ！`
        : '位取り表で、右から数えて確かめてみよう！',
      hintMessage: `右から「一、十、百、千、万…」と数えて、${position}番目の数字を見つけよう！`
    },
    errorDiagnostics,
    patternType: 'large_place_digit',
    trapMetadata: { placeValue: place }
  });
}

/**
 * Stage 8-1 (pattern B): 「○億は、1万が何こ分？」単位の換算
 */
function buildLargeUnitCount({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let unitBase = variationTarget?.trapMetadata?.unitBase || null;
  let lead = 3;
  let exp10 = 2;
  let count = 300;
  let target = 3000000;

  for (let attempt = 0; attempt < 200; attempt++) {
    if (!unitBase) {
      if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') unitBase = 10000;
      else if (difficultyLevel === 'standard') unitBase = pickRandom([10000, 100000000], rng);
      else unitBase = pickRandom([10000, 1000000, 100000000], rng);
    }
    lead = randInt(2, 9, rng);
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') exp10 = randInt(1, 2, rng);
    else if (difficultyLevel === 'challenge') exp10 = randInt(3, 4, rng);
    else exp10 = randInt(2, 3, rng);
    count = lead * Math.pow(10, exp10);
    target = unitBase * count;
    if (target >= 10000000000000) continue;
    if (!variationTarget) break;
    const t = variationTarget.operands || [];
    if (!(t[0] === target && t[1] === unitBase)) break;
  }

  const unitText = formatUnitReading(unitBase);
  const targetText = formatUnitReading(target);
  const groupValue = unitBase * lead;
  const groupText = formatUnitReading(groupValue);

  const steps = [
    {
      stepNumber: 1,
      id: 'group',
      title: 'まとまりの数',
      actionName: 'かぞえる',
      explanation: `${unitText} が ${lead} こ集まると ${groupText} だね。その数はいくつ？`,
      blankPosition: 'group',
      expectedStepValue: groupValue,
      hint: `${unitText} の ${lead} 倍だよ。0の数に注目しよう！`
    },
    {
      stepNumber: 2,
      id: 'ten_ladder',
      title: '10倍の階段',
      actionName: 'かぞえる',
      explanation: `${groupText} を10倍ずつ大きくしていくと ${targetText} になるよ。10倍は全部で何回分？`,
      blankPosition: 'ten_ladder',
      expectedStepValue: exp10,
      hint: '10倍するたびに、右に0が1こ増えるよ！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '何こ分の答え',
      actionName: 'かぞえる',
      explanation: `${targetText}（${formatComma(target)}）は、${unitText} が何こ分？`,
      blankPosition: 'final',
      expectedStepValue: count,
      hint: `${lead} こ分のまとまりが、さらに10を${exp10}回かけた分あるよ！`
    }
  ];

  // exp10 === 1 のとき count / 10 === lead となり、zero_count_slip と
  // large_count_partial の予測値が重複して後者が到達不能になるため、重複を除く
  const errorDiagnostics = [
    {
      predictedErrorValue: count / 10,
      reasonCategory: 'zero_count_slip',
      adviceMessage: '0の数が1つ足りないかも！10倍の階段をもう一度数えてみよう！'
    },
    {
      predictedErrorValue: count * 10,
      reasonCategory: 'zero_count_slip',
      adviceMessage: '0を1つ多く数えているかも！位の差を確かめよう！'
    },
    {
      predictedErrorValue: lead,
      reasonCategory: 'large_count_partial',
      adviceMessage: `それは最初のまとまり（${lead}こ分）だけの数だね。10倍の分も合わせよう！`
    }
  ].filter((d, i, arr) => arr.findIndex((o) => o.predictedErrorValue === d.predictedErrorValue) === i);

  return buildMathProblem({
    worldId: 8,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${targetText}（${formatComma(target)}）は、${unitText}が何こ分？`,
    expression: `${formatComma(target)} は ${unitText} が何こ分`,
    displayFormat: 'horizontal',
    operands: [target, unitBase],
    operator: 'mixed',
    quotient: count,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: count / 10,
      reasonCategory: 'zero_count_slip',
      diagnosis: '0の数が1つ足りないかも！10倍の回数を数え直してみよう！',
      hintMessage: `${unitText} から ${targetText} まで、10倍が何回分か指で数えてみよう！`
    },
    errorDiagnostics,
    patternType: 'large_unit_count',
    trapMetadata: { unitBase, unitCount: count }
  });
}

/**
 * Stage 8-1 (pattern C): 10倍・100倍・1/10で0がどう変わるか
 */
function buildLargeTimesTen({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let mode = variationTarget?.trapMetadata?.timesMode || null;
  let factor = variationTarget?.trapMetadata?.scaleFactor || null;
  if (mode !== 'times' && mode !== 'tenth') {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      mode = 'times';
      factor = 10;
    } else if (difficultyLevel === 'standard') {
      mode = 'times';
      factor = pickRandom([10, 100], rng);
    } else if (rng() < 0.5) {
      mode = 'times';
      factor = 100;
    } else {
      mode = 'tenth';
      factor = 10;
    }
  }
  if (mode === 'times' && factor !== 10 && factor !== 100) factor = 10;
  if (mode === 'tenth') factor = 10;

  let n = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    let zeros;
    if (mode === 'tenth') zeros = randInt(2, 5, rng);
    else if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') zeros = 3;
    else if (difficultyLevel === 'standard') zeros = randInt(3, 4, rng);
    else zeros = randInt(4, 5, rng);
    n = randInt(12, 9999, rng) * Math.pow(10, zeros);
    if (!variationTarget) break;
    if (variationTarget.operands?.[0] !== n) break;
  }

  const answer = mode === 'times' ? n * factor : n / 10;
  const zeroChange = mode === 'times' ? (factor === 10 ? 1 : 2) : 1;
  const answerZeros = countTrailingZeros(answer);
  const nText = formatComma(n);

  const steps = [
    {
      stepNumber: 1,
      id: 'zero_change',
      title: '0の変化',
      actionName: 'かぞえる',
      explanation: mode === 'times'
        ? `${factor}倍すると、数の右に0が何こ増える？`
        : '1/10にすると、数の右の0が何こ減る？',
      blankPosition: 'zero_change',
      expectedStepValue: zeroChange,
      hint: mode === 'times'
        ? '10倍で0が1こ、100倍で0が2こ増えるよ！'
        : '1/10にすると、右の0が1こ取れるよ！'
    },
    {
      stepNumber: 2,
      id: 'trailing',
      title: '答えの0の数',
      actionName: 'かぞえる',
      explanation: `答えの末尾の0は、全部で何こになる？`,
      blankPosition: 'trailing',
      expectedStepValue: answerZeros,
      hint: 'もとの数の0の数と、増える（減る）0の数を合わせよう！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '答え',
      actionName: 'かぞえる',
      explanation: mode === 'times' ? `${nText} の${factor}倍は？` : `${nText} を 1/10 にすると？`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: '数字の並びはそのままで、0の数だけが変わるよ！'
    }
  ];

  let mistakeValue;
  let trapDiagnosis;
  const errorDiagnostics = [];
  if (mode === 'times' && factor === 10) {
    mistakeValue = n * 100;
    trapDiagnosis = '0を1つ多くつけてしまったかも！10倍では0は1こだけ増えるよ！';
    errorDiagnostics.push(
      { predictedErrorValue: n * 100, reasonCategory: 'zero_count_slip', adviceMessage: '0を1つ多くつけているかも！10倍では0は1こ増えるだけだよ！' },
      { predictedErrorValue: n, reasonCategory: 'times_ten_unchanged', adviceMessage: 'そのままの数になっているよ。10倍すると0が1こ増えるよ！' }
    );
  } else if (mode === 'times') {
    mistakeValue = n * 10;
    trapDiagnosis = '0が1つ足りないかも！100倍では0が2こ増えるよ！';
    errorDiagnostics.push(
      { predictedErrorValue: n * 10, reasonCategory: 'zero_count_slip', adviceMessage: '0が1つ足りないかも！100倍では0が2こ増えるよ！' },
      { predictedErrorValue: n * 1000, reasonCategory: 'zero_count_slip', adviceMessage: '0を1つ多くつけているかも！100倍では0は2こ増えるよ！' }
    );
  } else {
    mistakeValue = n;
    trapDiagnosis = '0を取り忘れているかも！1/10にすると、右の0が1こ減るよ！';
    errorDiagnostics.push(
      { predictedErrorValue: n, reasonCategory: 'times_ten_unchanged', adviceMessage: 'そのままの数になっているよ。1/10にすると0が1こ減るよ！' },
      { predictedErrorValue: n / 100, reasonCategory: 'zero_count_slip', adviceMessage: '0を2こ取ってしまったかも！1/10では0は1こだけ減るよ！' }
    );
  }

  return buildMathProblem({
    worldId: 8,
    stageId: 1,
    questionIndex,
    level,
    difficultyLevel,
    prompt: mode === 'times' ? `${nText} の${factor}倍は？` : `${nText} を 1/10 にすると？`,
    expression: mode === 'times' ? `${nText} × ${factor}` : `${nText} ÷ 10`,
    displayFormat: 'horizontal',
    operands: [n, factor],
    operator: 'mixed',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue,
      reasonCategory: 'zero_count_slip',
      diagnosis: trapDiagnosis,
      hintMessage: '数字の並びはそのまま。0の数がどう変わるかだけに注目しよう！'
    },
    errorDiagnostics,
    patternType: 'large_times_ten',
    trapMetadata: { timesMode: mode, scaleFactor: factor }
  });
}

/**
 * Stage 8-1: 大きな数の仕組み (位取り・単位換算・10倍関係)
 */
function generateStage8_1(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = pickRandom(['large_place_digit', 'large_place_digit', 'large_unit_count'], args.rng);
    } else {
      patternType = pickRandom(['large_place_digit', 'large_unit_count', 'large_times_ten'], args.rng);
    }
  }
  if (patternType === 'large_unit_count') return buildLargeUnitCount(args);
  if (patternType === 'large_times_ten') return buildLargeTimesTen(args);
  return buildLargePlaceDigit(args);
}

/**
 * Stage 8-2 (pattern A): 〜の位までのがい数 (四捨五入)
 * place は「残す一番小さい位」= がい数の刻み (例: place=1000 → 千の位まで)
 */
function buildRoundToPlace({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let placePool;
  if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') placePool = [100, 1000];
  else if (difficultyLevel === 'standard') placePool = [1000, 10000];
  else if (difficultyLevel === 'hurdle') placePool = [10000, 100000];
  else placePool = [100000, 1000000];
  let place = variationTarget?.trapMetadata?.roundPlace;
  if (!place) place = pickRandom(placePool, rng);

  let n = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    n = randInt(11, 99, rng) * place + randInt(1, place - 1, rng);
    // 切り上げで残す位の 9 が繰り上がる組み合わせは生成から除外する
    if (roundingCarriesPastKeptDigit(n, place)) continue;
    if (!variationTarget) break;
    if (variationTarget.operands?.[0] !== n) break;
  }

  let answer = roundToPlace(n, place);
  // 乱数が偏って繰り上がりの候補しか引けなかった場合に備え、刻みを下げて確実に解消する
  while (roundingCarriesPastKeptDigit(n, place)) {
    n -= place;
    answer = roundToPlace(n, place);
  }
  const lookPlace = place / 10;
  const lookDigit = digitAtPlace(n, lookPlace);
  const roundsUp = lookDigit >= 5;
  const placeName = largePlaceName(place);
  const lookName = largePlaceName(lookPlace);
  const nText = formatComma(n);

  const wrongPlace = roundToPlace(n, place * 10);
  const directionValue = roundsUp ? Math.floor(n / place) * place : Math.ceil(n / place) * place;

  const errorDiagnostics = [];
  if (wrongPlace !== answer) {
    errorDiagnostics.push({
      predictedErrorValue: wrongPlace,
      reasonCategory: 'round_place_misread',
      adviceMessage: `四捨五入する位が1つずれているかも！「${placeName}まで」だから、見るのは${lookName}だよ！`
    });
  }
  errorDiagnostics.push({
    predictedErrorValue: directionValue,
    reasonCategory: 'round_direction_slip',
    adviceMessage: roundsUp
      ? `${lookName}は${lookDigit}で5以上だから、切り上げよう！`
      : `${lookName}は${lookDigit}で4以下だから、切り捨てよう！`
  });

  const usePlaceTrap = wrongPlace !== answer;
  const steps = [
    {
      stepNumber: 1,
      id: 'look',
      title: '見る位',
      actionName: 'よむ',
      explanation: `${placeName}までのがい数にするには、1つ下の${lookName}の数字を見るよ。${nText} の ${lookName}の数字は？`,
      blankPosition: 'look',
      expectedStepValue: lookDigit,
      hint: `見るのは${placeName}の右となりの位だよ！`
    },
    {
      stepNumber: 2,
      id: 'decide',
      title: '切り上げ・切り捨て',
      actionName: '四捨五入',
      explanation: roundsUp
        ? `${lookDigit} は5以上だから切り上げ！${placeName}の数字はいくつになる？`
        : `${lookDigit} は4以下だから切り捨て！${placeName}の数字はそのままだといくつ？`,
      blankPosition: 'decide',
      expectedStepValue: digitAtPlace(answer, place),
      hint: roundsUp ? '切り上げると、残す位の数字が1つ増えるよ！' : '切り捨てると、残す位の数字は変わらないよ！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: 'がい数の答え',
      actionName: '四捨五入',
      explanation: `${nText} を ${placeName}までのがい数にすると？`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: `${placeName}より下の位は全部0になるよ！`
    }
  ];

  return buildMathProblem({
    worldId: 8,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${nText} を、${placeName}までのがい数にすると？`,
    expression: `${nText} を ${placeName}までのがい数に`,
    displayFormat: 'horizontal',
    operands: [n, place],
    operator: 'mixed',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: usePlaceTrap ? wrongPlace : directionValue,
      reasonCategory: usePlaceTrap ? 'round_place_misread' : 'round_direction_slip',
      diagnosis: usePlaceTrap
        ? `四捨五入する位を取り違えているかも！「${placeName}まで」のがい数だよ！`
        : roundsUp
          ? '切り上げを忘れているかも！5以上は切り上げるよ！'
          : '切り捨てのはずが切り上げているかも！4以下は切り捨てるよ！',
      hintMessage: `まず${lookName}の数字を見て、4以下か5以上かで決めよう！`
    },
    errorDiagnostics,
    patternType: 'round_to_place',
    trapMetadata: { roundPlace: place }
  });
}

/**
 * Stage 8-2 (pattern B): 上から○桁のがい数
 */
function buildRoundSignificant({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let sig = variationTarget?.trapMetadata?.sigDigits;
  if (!sig) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') sig = 1;
    else if (difficultyLevel === 'standard') sig = pickRandom([1, 2], rng);
    else if (difficultyLevel === 'hurdle') sig = 2;
    else sig = pickRandom([2, 3], rng);
  }

  let n = 0;
  let unit = 100;
  for (let attempt = 0; attempt < 200; attempt++) {
    const digits = sig + randInt(2, 3, rng);
    unit = Math.pow(10, digits - sig);
    n = randInt(Math.pow(10, digits - 1), Math.pow(10, digits) - 1, rng);
    if (n % unit === 0) continue;
    // 切り上げで残す桁の 9 が繰り上がる組み合わせは生成から除外する
    if (roundingCarriesPastKeptDigit(n, unit)) continue;
    if (!variationTarget) break;
    if (variationTarget.operands?.[0] !== n) break;
  }

  let answer = roundToPlace(n, unit);
  // 乱数が偏って繰り上がりの候補しか引けなかった場合に備え、刻みを下げて確実に解消する
  while (roundingCarriesPastKeptDigit(n, unit)) {
    n -= unit;
    answer = roundToPlace(n, unit);
  }
  const lookDigit = digitAtPlace(n, unit / 10);
  const roundsUp = lookDigit >= 5;
  const nText = formatComma(n);

  const keptTooMany = roundToPlace(n, unit / 10);
  const keptTooFew = roundToPlace(n, unit * 10);
  const directionValue = roundsUp ? Math.floor(n / unit) * unit : Math.ceil(n / unit) * unit;

  const errorDiagnostics = [];
  if (keptTooMany !== answer) {
    errorDiagnostics.push({
      predictedErrorValue: keptTooMany,
      reasonCategory: 'round_place_misread',
      adviceMessage: `上から${sig}桁まで残すはずだよ。1桁多く残しているかも！`
    });
  }
  if (sig >= 2 && keptTooFew !== answer && keptTooFew !== keptTooMany) {
    errorDiagnostics.push({
      predictedErrorValue: keptTooFew,
      reasonCategory: 'round_place_misread',
      adviceMessage: `上から${sig}桁まで残すはずだよ。残す桁が少なすぎるかも！`
    });
  }
  errorDiagnostics.push({
    predictedErrorValue: directionValue,
    reasonCategory: 'round_direction_slip',
    adviceMessage: roundsUp
      ? `上から${sig + 1}桁目は${lookDigit}で5以上だから、切り上げよう！`
      : `上から${sig + 1}桁目は${lookDigit}で4以下だから、切り捨てよう！`
  });

  const useCountTrap = keptTooMany !== answer;
  const steps = [
    {
      stepNumber: 1,
      id: 'look',
      title: '見る桁',
      actionName: 'よむ',
      explanation: `上から${sig}桁のがい数にするには、上から${sig + 1}桁目の数字を見るよ。${nText} の上から${sig + 1}桁目は？`,
      blankPosition: 'look',
      expectedStepValue: lookDigit,
      hint: '左から1つずつ指で数えてみよう！'
    },
    {
      stepNumber: 2,
      id: 'decide',
      title: '切り上げ・切り捨て',
      actionName: '四捨五入',
      explanation: roundsUp
        ? `${lookDigit} は5以上だから切り上げ！上から${sig}桁目の数字はいくつになる？`
        : `${lookDigit} は4以下だから切り捨て！上から${sig}桁目の数字はそのままだといくつ？`,
      blankPosition: 'decide',
      expectedStepValue: digitAtPlace(answer, unit),
      hint: roundsUp ? '切り上げると、残す最後の桁が1つ増えるよ！' : '切り捨てると、残す桁は変わらないよ！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: 'がい数の答え',
      actionName: '四捨五入',
      explanation: `${nText} を、上から${sig}桁のがい数にすると？`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: `上から${sig}桁だけ残して、あとは全部0だよ！`
    }
  ];

  return buildMathProblem({
    worldId: 8,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${nText} を、上から${sig}桁のがい数にすると？`,
    expression: `${nText} を 上から${sig}桁のがい数に`,
    displayFormat: 'horizontal',
    operands: [n, sig],
    operator: 'mixed',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: useCountTrap ? keptTooMany : directionValue,
      reasonCategory: useCountTrap ? 'round_place_misread' : 'round_direction_slip',
      diagnosis: useCountTrap
        ? `残す桁の数がずれているかも！「上から${sig}桁」までだよ！`
        : roundsUp
          ? '切り上げを忘れているかも！5以上は切り上げるよ！'
          : '切り捨てのはずが切り上げているかも！4以下は切り捨てるよ！',
      hintMessage: `まず上から${sig + 1}桁目の数字を見てみよう！`
    },
    errorDiagnostics,
    patternType: 'round_significant',
    trapMetadata: { sigDigits: sig }
  });
}

/**
 * Stage 8-2 (pattern C): がい数になる数の範囲 (以上・未満の考え方)
 * place はがい数の刻み。四捨五入して place の位までのがい数で V になる範囲を問う
 */
function buildRoundRange({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let place = variationTarget?.trapMetadata?.roundPlace;
  if (!place) {
    place = difficultyLevel === 'challenge'
      ? pickRandom([1000, 10000], rng)
      : pickRandom([100, 1000], rng);
  }
  let which = variationTarget?.trapMetadata?.rangeWhich;
  if (which !== 'min' && which !== 'max') which = pickRandom(['min', 'max'], rng);

  let v = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    v = randInt(12, 98, rng) * place;
    if (!variationTarget) break;
    if (variationTarget.operands?.[0] !== v) break;
  }

  const half = place / 2;
  const answer = which === 'min' ? v - half : v + half - 1;
  const placeName = largePlaceName(place);
  const lookName = largePlaceName(place / 10);
  const vText = formatComma(v);

  const steps = which === 'min'
    ? [
        {
          stepNumber: 1,
          id: 'boundary',
          title: '切り上がる境界',
          actionName: '四捨五入',
          explanation: `${vText} になるのは、${lookName}が5以上で切り上がる数からだよ。${vText} よりいくつ小さい数までなら、四捨五入して ${vText} になる？`,
          blankPosition: 'boundary',
          expectedStepValue: half,
          hint: `刻みの半分（${formatComma(place)}の半分）までだよ！`
        },
        {
          stepNumber: 2,
          id: 'final',
          title: 'いちばん小さい数',
          actionName: '四捨五入',
          explanation: `四捨五入して ${placeName}までのがい数にすると ${vText} になる整数のうち、いちばん小さい数は？`,
          blankPosition: 'final',
          expectedStepValue: answer,
          hint: `${vText} から ${formatComma(half)} を引いてみよう！`
        }
      ]
    : [
        {
          stepNumber: 1,
          id: 'boundary',
          title: '切り捨ての境界',
          actionName: '四捨五入',
          explanation: `${vText} より大きい数でも、${lookName}が4以下なら切り捨てで ${vText} になるよ。${vText} よりいくつ大きい数までなら、四捨五入して ${vText} になる？`,
          blankPosition: 'boundary',
          expectedStepValue: half - 1,
          hint: `刻みの半分より1小さい数までだよ。${formatComma(half)} を足すと切り上がってしまうよ！`
        },
        {
          stepNumber: 2,
          id: 'final',
          title: 'いちばん大きい数',
          actionName: '四捨五入',
          explanation: `四捨五入して ${placeName}までのがい数にすると ${vText} になる整数のうち、いちばん大きい数は？`,
          blankPosition: 'final',
          expectedStepValue: answer,
          hint: `${vText} に ${formatComma(half - 1)} を足してみよう！`
        }
      ];

  const errorDiagnostics = which === 'min'
    ? [
        {
          predictedErrorValue: v - place,
          reasonCategory: 'round_range_boundary',
          adviceMessage: '下がりすぎかも！切り上がって同じがい数になるのは、刻みの半分までだよ！'
        },
        {
          predictedErrorValue: v - half - 1,
          reasonCategory: 'round_range_boundary',
          adviceMessage: `その数は${lookName}が4になって切り捨てられてしまうよ。境界は${formatComma(half)}引いた数までだよ！`
        }
      ]
    : [
        {
          predictedErrorValue: v + half,
          reasonCategory: 'round_range_boundary',
          adviceMessage: `その数は${lookName}が5になって切り上がってしまうよ！境界は1小さい数までだよ！`
        },
        {
          predictedErrorValue: v + place - 1,
          reasonCategory: 'round_range_boundary',
          adviceMessage: '行きすぎかも！切り捨てで同じがい数になるのは、刻みの半分より1小さい数までだよ！'
        }
      ];

  return buildMathProblem({
    worldId: 8,
    stageId: 2,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `四捨五入して ${placeName}までのがい数にすると ${vText} になる整数のうち、いちばん${which === 'min' ? '小さい' : '大きい'}数は？`,
    expression: `がい数が ${vText} になる${which === 'min' ? '最小' : '最大'}の整数`,
    displayFormat: 'horizontal',
    operands: [v, place],
    operator: 'mixed',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: which === 'min' ? v - place : v + half,
      reasonCategory: 'round_range_boundary',
      diagnosis: which === 'min'
        ? '範囲が広すぎるかも！切り上がるのは刻みの半分までだよ！'
        : `境界の${formatComma(half)}を足した数は、切り上がって次の数になってしまうよ！`,
      hintMessage: '刻み（がい数の1目もり）の半分が境界だよ！'
    },
    errorDiagnostics,
    patternType: 'round_range',
    trapMetadata: { roundPlace: place, rangeWhich: which }
  });
}

/**
 * Stage 8-2: がい数と四捨五入
 */
function generateStage8_2(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = 'round_to_place';
    } else if (args.difficultyLevel === 'standard') {
      patternType = pickRandom(['round_to_place', 'round_significant'], args.rng);
    } else {
      patternType = pickRandom(['round_to_place', 'round_significant', 'round_range'], args.rng);
    }
  }
  if (patternType === 'round_significant') return buildRoundSignificant(args);
  if (patternType === 'round_range') return buildRoundRange(args);
  return buildRoundToPlace(args);
}

const ESTIMATE_ITEMS = [
  'えんぴつ', 'ノート', 'りんご', 'みかん', 'ケーキ', 'ボールペン',
  'ジュース', 'パン', '牛乳', '本', 'クッキー', 'バナナ'
];

function pickTwoItems(rng) {
  const first = pickRandom(ESTIMATE_ITEMS, rng);
  let second = pickRandom(ESTIMATE_ITEMS, rng);
  for (let i = 0; i < 20 && second === first; i++) {
    second = pickRandom(ESTIMATE_ITEMS, rng);
  }
  return [first, second];
}

/**
 * Stage 8-3 (pattern A): がい数で見積もるたし算 (買い物)
 */
function buildEstimateAdd({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let place = variationTarget?.trapMetadata?.estimatePlace;
  if (!place) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') place = 100;
    else if (difficultyLevel === 'challenge') place = 1000;
    else place = pickRandom([100, 1000], rng);
  }

  let a = 298;
  let b = 512;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (place === 100) {
      a = randInt(108, 989, rng);
      b = randInt(108, 989, rng);
    } else {
      a = randInt(1108, 9899, rng);
      b = randInt(1108, 9899, rng);
    }
    if (a % place === 0 || b % place === 0) continue;
    // 正確な合計と概算が一致する組み合わせ (切り上げと切り捨てが相殺) は、
    // 「そのまま足した」誤答と区別できないため避ける
    if (a + b === roundToPlace(a, place) + roundToPlace(b, place)) continue;
    if (!variationTarget) break;
    const t = variationTarget.operands || [];
    if (!(t[0] === a && t[1] === b)) break;
  }

  const [itemA, itemB] = pickTwoItems(rng);
  const ra = roundToPlace(a, place);
  const rb = roundToPlace(b, place);
  const answer = ra + rb;
  const placeName = largePlaceName(place);

  const errorDiagnostics = [
    {
      predictedErrorValue: a + b,
      reasonCategory: 'estimate_exact_calc',
      adviceMessage: '値段をそのまま足してしまったかも！見積もりでは、まずがい数に直してから計算しよう！'
    },
    {
      predictedErrorValue: ra + b,
      reasonCategory: 'estimate_partial_round',
      adviceMessage: `片方だけがい数になっているよ。${itemB}の値段も${placeName}までのがい数に直そう！`
    }
  ];
  const wrongPlaceSum = roundToPlace(a, place * 10) + roundToPlace(b, place * 10);
  if (wrongPlaceSum !== answer && wrongPlaceSum !== a + b) {
    errorDiagnostics.push({
      predictedErrorValue: wrongPlaceSum,
      reasonCategory: 'round_place_misread',
      adviceMessage: `丸める位がずれているかも！「${placeName}まで」のがい数だよ！`
    });
  }

  const steps = [
    {
      stepNumber: 1,
      id: 'round_a',
      title: '1つ目のがい数',
      actionName: '四捨五入',
      explanation: `${itemA}の ${formatComma(a)} 円を、${placeName}までのがい数にすると？`,
      blankPosition: 'round_a',
      expectedStepValue: ra,
      hint: `見るのは${largePlaceName(place / 10)}の数字だよ！`
    },
    {
      stepNumber: 2,
      id: 'round_b',
      title: '2つ目のがい数',
      actionName: '四捨五入',
      explanation: `${itemB}の ${formatComma(b)} 円を、${placeName}までのがい数にすると？`,
      blankPosition: 'round_b',
      expectedStepValue: rb,
      hint: `見るのは${largePlaceName(place / 10)}の数字だよ！`
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '見積もりの合計',
      actionName: 'たす',
      explanation: `2つのがい数を合わせると、約何円？`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: 'がい数同士を足すだけだから、暗算でできるよ！'
    }
  ];

  return buildMathProblem({
    worldId: 8,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${itemA}は ${formatComma(a)} 円、${itemB}は ${formatComma(b)} 円です。${placeName}までのがい数にして見積もると、合わせて約何円？`,
    expression: `${a} + ${b} の概算`,
    displayFormat: 'horizontal',
    operands: [a, b],
    operator: '+',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: a + b,
      reasonCategory: 'estimate_exact_calc',
      diagnosis: '正確な計算をしてしまったかも！見積もりでは、まず値段をがい数に直そう！',
      hintMessage: '298円は約300円、というように、がい数に直してから足してみよう！'
    },
    errorDiagnostics,
    patternType: 'estimate_add',
    trapMetadata: { estimatePlace: place }
  });
}

/**
 * Stage 8-3 (pattern B): がい数で見積もるおつり (ひき算)
 */
function buildEstimateSub({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  let place = variationTarget?.trapMetadata?.estimatePlace;
  if (!place) {
    place = difficultyLevel === 'hurdle' || difficultyLevel === 'challenge' ? 1000 : 100;
  }

  let budget = place === 100 ? 1000 : 5000;
  let a = 298;
  for (let attempt = 0; attempt < 200; attempt++) {
    a = place === 100 ? randInt(108, 949, rng) : randInt(1108, 4499, rng);
    if (a % place === 0) continue;
    if (!variationTarget) break;
    if (variationTarget.operands?.[1] !== a) break;
  }

  const item = pickRandom(ESTIMATE_ITEMS, rng);
  const ra = roundToPlace(a, place);
  const answer = budget - ra;
  const placeName = largePlaceName(place);

  const errorDiagnostics = [
    {
      predictedErrorValue: budget - a,
      reasonCategory: 'estimate_exact_calc',
      adviceMessage: '値段をそのまま引いてしまったかも！見積もりでは、まずがい数に直してから計算しよう！'
    }
  ];
  const wrongPlaceChange = budget - roundToPlace(a, place * 10);
  if (wrongPlaceChange !== answer && wrongPlaceChange !== budget - a) {
    errorDiagnostics.push({
      predictedErrorValue: wrongPlaceChange,
      reasonCategory: 'round_place_misread',
      adviceMessage: `丸める位がずれているかも！「${placeName}まで」のがい数だよ！`
    });
  }

  const steps = [
    {
      stepNumber: 1,
      id: 'round_a',
      title: '値段のがい数',
      actionName: '四捨五入',
      explanation: `${item}の ${formatComma(a)} 円を、${placeName}までのがい数にすると？`,
      blankPosition: 'round_a',
      expectedStepValue: ra,
      hint: `見るのは${largePlaceName(place / 10)}の数字だよ！`
    },
    {
      stepNumber: 2,
      id: 'final',
      title: 'おつりの見積もり',
      actionName: 'ひく',
      explanation: `${formatComma(budget)} 円から ${formatComma(ra)} 円を引くと、おつりは約何円？`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: 'がい数で引くから、暗算で見当がつくよ！'
    }
  ];

  return buildMathProblem({
    worldId: 8,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `${formatComma(budget)} 円を持って買い物に行きました。${item}（${formatComma(a)} 円）を買います。${placeName}までのがい数にして見積もると、おつりは約何円？`,
    expression: `${budget} - ${a} の概算`,
    displayFormat: 'horizontal',
    operands: [budget, a],
    operator: '-',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: budget - a,
      reasonCategory: 'estimate_exact_calc',
      diagnosis: '正確な計算をしてしまったかも！見積もりでは、まず値段をがい数に直そう！',
      hintMessage: '値段をがい数に直してから、持っているお金と比べよう！'
    },
    errorDiagnostics,
    patternType: 'estimate_sub',
    trapMetadata: { estimatePlace: place }
  });
}

/**
 * Stage 8-3 (pattern C): がい数で見積もるかけ算 (単価 × 個数)
 */
function buildEstimateMult({ questionIndex, level, difficultyLevel, rng, variationTarget }) {
  const place = 100;
  let a = 198;
  let count = 4;
  for (let attempt = 0; attempt < 200; attempt++) {
    a = difficultyLevel === 'challenge' ? randInt(1008, 1989, rng) : randInt(108, 989, rng);
    count = randInt(3, 9, rng);
    if (a % place === 0) continue;
    if (!variationTarget) break;
    const t = variationTarget.operands || [];
    if (!(t[0] === a && t[1] === count)) break;
  }

  const item = pickRandom(ESTIMATE_ITEMS, rng);
  const ra = roundToPlace(a, place);
  const answer = ra * count;

  const errorDiagnostics = [
    {
      predictedErrorValue: a * count,
      reasonCategory: 'estimate_exact_calc',
      adviceMessage: '値段をそのままかけてしまったかも！見積もりでは、まずがい数に直してから計算しよう！'
    }
  ];
  const tensRoundedProduct = roundToPlace(a, 10) * count;
  if (tensRoundedProduct !== answer && tensRoundedProduct !== a * count) {
    errorDiagnostics.push({
      predictedErrorValue: tensRoundedProduct,
      reasonCategory: 'round_place_misread',
      adviceMessage: '丸める位がずれているかも！「百の位まで」のがい数だよ！'
    });
  }

  const steps = [
    {
      stepNumber: 1,
      id: 'round_a',
      title: '値段のがい数',
      actionName: '四捨五入',
      explanation: `${item}の ${formatComma(a)} 円を、百の位までのがい数にすると？`,
      blankPosition: 'round_a',
      expectedStepValue: ra,
      hint: '見るのは十の位の数字だよ！'
    },
    {
      stepNumber: 2,
      id: 'final',
      title: '見積もりの金額',
      actionName: 'かける',
      explanation: `${formatComma(ra)} 円 × ${count} こ で、約何円？`,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: 'がい数だから、かけ算も暗算でできるよ！'
    }
  ];

  return buildMathProblem({
    worldId: 8,
    stageId: 3,
    questionIndex,
    level,
    difficultyLevel,
    prompt: `1こ ${formatComma(a)} 円の${item}を ${count} こ買います。百の位までのがい数にして見積もると、約何円？`,
    expression: `${a} × ${count} の概算`,
    displayFormat: 'horizontal',
    operands: [a, count],
    operator: '×',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: {
      mistakeValue: a * count,
      reasonCategory: 'estimate_exact_calc',
      diagnosis: '正確な計算をしてしまったかも！見積もりでは、まず値段をがい数に直そう！',
      hintMessage: '198円は約200円、というように直してからかけ算しよう！'
    },
    errorDiagnostics,
    patternType: 'estimate_mult',
    trapMetadata: { estimatePlace: place }
  });
}

/**
 * Stage 8-3: 概算 (がい数を使った見積もり計算)
 */
function generateStage8_3(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = 'estimate_add';
    } else if (args.difficultyLevel === 'standard') {
      patternType = pickRandom(['estimate_add', 'estimate_sub'], args.rng);
    } else {
      patternType = pickRandom(['estimate_add', 'estimate_sub', 'estimate_mult'], args.rng);
    }
  }
  if (patternType === 'estimate_sub') return buildEstimateSub(args);
  if (patternType === 'estimate_mult') return buildEstimateMult(args);
  return buildEstimateAdd(args);
}

// ============================================================================
// World 9: 文章題ラボ (文章を読んで式を立てる・あまりの判断・単位換算)
// ============================================================================

/**
 * 文章題共通ビルダー: prompt に文章、expression に立てた式を持たせる。
 * 答えは常に数値1つで、通常のテンキー入力で回答できる形にする。
 */
function buildWordProblem({
  stageId,
  questionIndex,
  level,
  difficultyLevel,
  prompt,
  expression,
  operands,
  answer,
  steps,
  mistakeValue,
  reasonCategory,
  diagnosis,
  hintMessage,
  errorDiagnostics,
  patternType,
  trapMetadata = {}
}) {
  return buildMathProblem({
    worldId: 9,
    stageId,
    questionIndex,
    level,
    difficultyLevel,
    prompt,
    expression,
    displayFormat: 'horizontal',
    operands,
    operator: 'mixed',
    quotient: answer,
    stepMode: 'column_add_sub',
    steps,
    commonTrap: { mistakeValue, reasonCategory, diagnosis, hintMessage },
    errorDiagnostics,
    patternType,
    trapMetadata
  });
}

/**
 * 類題生成時に、元問題と異なる数値の組み合わせになったか
 */
function wordOperandsDiffer(variationTarget, a, b) {
  if (!variationTarget) return true;
  const t = variationTarget.operands || [];
  return !(t[0] === a && t[1] === b);
}

/**
 * 文章題 (9-1 / 9-2) 共通のステップ: 文中の2つの数を見つける → 式を立てて計算
 */
function wordNumberSteps({ a, b, finalExplanation, finalHint }) {
  return [
    {
      stepNumber: 1,
      id: 'first_number',
      title: '1つ目の数',
      actionName: 'さがす',
      explanation: 'もんだい文に出てくる数を見つけよう。1つ目の数は？',
      blankPosition: 'first_number',
      expectedStepValue: a,
      hint: '文を最初から読んで、数のところに注目してみよう！'
    },
    {
      stepNumber: 2,
      id: 'second_number',
      title: '2つ目の数',
      actionName: 'さがす',
      explanation: 'もう1つの数は？',
      blankPosition: 'second_number',
      expectedStepValue: b,
      hint: '単位（こ・人・円など）の前にある数がヒントだよ！'
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '式と答え',
      actionName: 'たてる',
      explanation: finalExplanation,
      blankPosition: 'final',
      expectedStepValue: null, // caller fills with the answer below
      hint: finalHint
    }
  ];
}

const WORD_NOUNS = [
  { noun: 'りんご', counter: 'こ', subVerb: '食べました' },
  { noun: 'みかん', counter: 'こ', subVerb: '食べました' },
  { noun: 'あめ', counter: 'こ', subVerb: '食べました' },
  { noun: 'シール', counter: 'まい', subVerb: 'あげました' },
  { noun: 'ビー玉', counter: 'こ', subVerb: 'なくしました' },
  { noun: '本', counter: 'さつ', subVerb: '貸しました' }
];

/**
 * Stage 9-1 (pattern: word_add): 「ぜんぶで」でたし算を選ぶ
 */
function buildWordAdd(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const templateIndex = variationTarget?.trapMetadata?.templateIndex ?? randInt(0, 2, rng);
  const nounIndex = variationTarget?.trapMetadata?.nounIndex ?? randInt(0, WORD_NOUNS.length - 1, rng);
  const item = WORD_NOUNS[nounIndex];

  let a = 0;
  let b = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      a = randInt(15, 60, rng); b = randInt(8, 40, rng);
    } else if (difficultyLevel === 'challenge') {
      a = randInt(150, 700, rng); b = randInt(120, 600, rng);
    } else if (difficultyLevel === 'hurdle') {
      a = randInt(80, 450, rng); b = randInt(60, 380, rng);
    } else {
      a = randInt(35, 240, rng); b = randInt(25, 200, rng);
    }
    if (b > a) [a, b] = [b, a];
    if (a === b) a += 7;
    if (wordOperandsDiffer(variationTarget, a, b)) break;
  }

  const answer = a + b;
  const prompts = [
    `${item.noun}が ${a}${item.counter} あります。${b}${item.counter} もらいました。ぜんぶで 何${item.counter}に なりますか？`,
    `男の子が ${a}人、女の子が ${b}人 います。ぜんぶで 何人ですか？`,
    `${a}円の ノートと、${b}円の えんぴつを 買います。ぜんぶで 何円ですか？`
  ];
  const steps = wordNumberSteps({
    a, b,
    finalExplanation: `「ぜんぶで」は合わせる計算だから、式は ${a} ＋ ${b} だね。答えは？`,
    finalHint: '「ぜんぶで・合わせて」と聞かれたら、たし算だよ！'
  });
  steps[2].expectedStepValue = answer;

  return buildWordProblem({
    stageId: 1, questionIndex, level, difficultyLevel,
    prompt: prompts[templateIndex],
    expression: `${a} + ${b}`,
    operands: [a, b],
    answer,
    steps,
    mistakeValue: a - b,
    reasonCategory: 'word_wrong_operation',
    diagnosis: '「ぜんぶで」は合わせる計算だから、たし算だよ！ひき算になっていないか確かめよう！',
    hintMessage: '文の中の「ぜんぶで」という言葉が、たし算の合図だよ！',
    errorDiagnostics: [
      {
        predictedErrorValue: a - b,
        reasonCategory: 'word_wrong_operation',
        adviceMessage: 'ひき算になっているよ。「ぜんぶで」は合わせるから、たし算で式を立てよう！'
      },
      {
        predictedErrorValue: answer + 10,
        reasonCategory: 'calculation_slip',
        adviceMessage: '式は合っているよ！たし算のくり上がりをもう一度ゆっくり確かめよう！'
      }
    ],
    patternType: 'word_add',
    trapMetadata: { templateIndex, nounIndex, wordOp: '+' }
  });
}

/**
 * Stage 9-1 (pattern: word_sub): 「残り・ちがい」でひき算を選ぶ
 */
function buildWordSub(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const templateIndex = variationTarget?.trapMetadata?.templateIndex ?? randInt(0, 2, rng);
  const nounIndex = variationTarget?.trapMetadata?.nounIndex ?? randInt(0, WORD_NOUNS.length - 1, rng);
  const item = WORD_NOUNS[nounIndex];

  let a = 0;
  let b = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      a = randInt(25, 80, rng); b = randInt(9, 50, rng);
    } else if (difficultyLevel === 'challenge') {
      a = randInt(300, 950, rng); b = randInt(140, 700, rng);
    } else if (difficultyLevel === 'hurdle') {
      a = randInt(150, 600, rng); b = randInt(80, 420, rng);
    } else {
      a = randInt(60, 320, rng); b = randInt(30, 210, rng);
    }
    if (a - b < 5) continue;
    if (wordOperandsDiffer(variationTarget, a, b)) break;
  }

  const answer = a - b;
  const prompts = [
    `${item.noun}が ${a}${item.counter} あります。${b}${item.counter} ${item.subVerb}。残りは 何${item.counter}ですか？`,
    `${a}円 持っています。${b}円の おかしを 買いました。残りは 何円ですか？`,
    `赤いリボンは ${a}cm、白いリボンは ${b}cmです。赤いリボンは 白いリボンより 何cm 長いですか？`
  ];
  const finalExplanation = templateIndex === 2
    ? `「ちがい」は大きい数から小さい数を引くよ。式は ${a} − ${b} だね。答えは？`
    : `「残り」は ひき算だね。式は ${a} − ${b}。答えは？`;
  const steps = wordNumberSteps({
    a, b,
    finalExplanation,
    finalHint: '「残り・ちがい」と聞かれたら、ひき算だよ！'
  });
  steps[2].expectedStepValue = answer;

  return buildWordProblem({
    stageId: 1, questionIndex, level, difficultyLevel,
    prompt: prompts[templateIndex],
    expression: `${a} - ${b}`,
    operands: [a, b],
    answer,
    steps,
    mistakeValue: a + b,
    reasonCategory: 'word_wrong_operation',
    diagnosis: '「残り（ちがい）」は ひき算だよ！たし算になっていないか確かめよう！',
    hintMessage: '文の中の「残り」という言葉が、ひき算の合図だよ！',
    errorDiagnostics: [
      {
        predictedErrorValue: a + b,
        reasonCategory: 'word_wrong_operation',
        adviceMessage: 'たし算になっているよ。「残り」は全体から一部を取り除くから、ひき算で式を立てよう！'
      },
      {
        predictedErrorValue: answer + 10,
        reasonCategory: 'calculation_slip',
        adviceMessage: '式は合っているよ！ひき算のくり下がりをもう一度ゆっくり確かめよう！'
      }
    ],
    patternType: 'word_sub',
    trapMetadata: { templateIndex, nounIndex, wordOp: '-' }
  });
}

/**
 * Stage 9-1 (pattern: word_mult): 「○ずつ △つ分」でかけ算を選ぶ
 */
function buildWordMult(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const templateIndex = variationTarget?.trapMetadata?.templateIndex ?? randInt(0, 2, rng);
  const nounIndex = variationTarget?.trapMetadata?.nounIndex ?? randInt(0, WORD_NOUNS.length - 1, rng);
  const item = WORD_NOUNS[nounIndex];

  let a = 0;
  let b = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (templateIndex === 2) {
      // 値段は10円単位にする (a は10円の個数ではなく値段そのもの)
      if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') a = randInt(2, 9, rng) * 10;
      else if (difficultyLevel === 'challenge') a = randInt(12, 30, rng) * 10;
      else a = randInt(3, 12, rng) * 10;
      b = randInt(2, 9, rng);
    } else if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      a = randInt(2, 9, rng); b = randInt(2, 5, rng);
    } else if (difficultyLevel === 'challenge') {
      a = randInt(12, 30, rng); b = randInt(3, 9, rng);
    } else {
      a = randInt(3, 9, rng); b = randInt(3, 9, rng);
    }
    // a = b = 2 のとき誤答トラップ (a + b) が正解と一致してしまうため除外
    if (a + b === a * b) continue;
    if (wordOperandsDiffer(variationTarget, a, b)) break;
  }

  const answer = a * b;
  const prompts = [
    `${item.noun}が ${a}${item.counter}ずつ 入った 箱が ${b}箱 あります。ぜんぶで 何${item.counter}ですか？`,
    `1れつに ${a}人ずつ ならんで、${b}れつ あります。ぜんぶで 何人ですか？`,
    `${a}円の ジュースを ${b}本 買います。ぜんぶで 何円ですか？`
  ];
  const steps = wordNumberSteps({
    a, b,
    finalExplanation: `「${a}ずつ ${b}つ分」は かけ算だね。式は ${a} × ${b}。答えは？`,
    finalHint: '「○ずつ △つ分」と聞かれたら、かけ算だよ！'
  });
  steps[2].expectedStepValue = answer;

  return buildWordProblem({
    stageId: 1, questionIndex, level, difficultyLevel,
    prompt: prompts[templateIndex],
    expression: `${a} × ${b}`,
    operands: [a, b],
    answer,
    steps,
    mistakeValue: a + b,
    reasonCategory: 'word_wrong_operation',
    diagnosis: '「○ずつ △つ分」は かけ算だよ！たし算になっていないか確かめよう！',
    hintMessage: '「ずつ」という言葉が、かけ算の合図だよ！',
    errorDiagnostics: [
      {
        predictedErrorValue: a + b,
        reasonCategory: 'word_wrong_operation',
        adviceMessage: 'たし算になっているよ。「1つ分 × いくつ分」がかけ算だね！'
      },
      {
        predictedErrorValue: a * (b + 1),
        reasonCategory: 'calculation_slip',
        adviceMessage: `式は合っているよ！${b}つ分なのに、1つ分多くかけていないか確かめよう！`
      }
    ],
    patternType: 'word_mult',
    trapMetadata: { templateIndex, nounIndex, wordOp: '×' }
  });
}

/**
 * Stage 9-1 (pattern: word_div): 「同じ数ずつ分ける」でわり算を選ぶ (割り切れる問題のみ)
 */
function buildWordDiv(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const templateIndex = variationTarget?.trapMetadata?.templateIndex ?? randInt(0, 2, rng);

  let d = 0;
  let q = 0;
  let total = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      d = randInt(2, 6, rng); q = randInt(3, 9, rng);
    } else if (difficultyLevel === 'challenge') {
      d = randInt(4, 9, rng); q = randInt(12, 25, rng);
    } else {
      d = randInt(3, 9, rng); q = randInt(6, 15, rng);
    }
    total = d * q;
    if (wordOperandsDiffer(variationTarget, total, d)) break;
  }

  const answer = q;
  const prompts = [
    `${total}この あめを ${d}人で 同じ数ずつ 分けます。1人は 何こ もらえますか？`,
    `${total}まいの 色紙を ${d}つの グループに 同じ数ずつ 配ります。1つのグループは 何まいですか？`,
    `${total}mの リボンを ${d}人で 同じ長さに 分けます。1人分は 何mですか？`
  ];
  const steps = wordNumberSteps({
    a: total, b: d,
    finalExplanation: `「同じ数ずつ分ける」は わり算だね。式は ${total} ÷ ${d}。答えは？`,
    finalHint: '「分ける・配る」と聞かれたら、わり算だよ！'
  });
  steps[2].expectedStepValue = answer;

  return buildWordProblem({
    stageId: 1, questionIndex, level, difficultyLevel,
    prompt: prompts[templateIndex],
    expression: `${total} ÷ ${d}`,
    operands: [total, d],
    answer,
    steps,
    mistakeValue: total - d,
    reasonCategory: 'word_wrong_operation',
    diagnosis: '「同じ数ずつ分ける」は わり算だよ！ひき算になっていないか確かめよう！',
    hintMessage: '「同じ数ずつ分ける」という言葉が、わり算の合図だよ！',
    errorDiagnostics: [
      {
        predictedErrorValue: total - d,
        reasonCategory: 'word_wrong_operation',
        adviceMessage: 'ひき算になっているよ。分け算は「全体 ÷ 分ける数」で式を立てよう！'
      },
      {
        predictedErrorValue: q + 1,
        reasonCategory: 'calculation_slip',
        adviceMessage: '式は合っているよ！九九のどの段で割り切れるか、もう一度確かめよう！'
      }
    ],
    patternType: 'word_div',
    trapMetadata: { templateIndex, wordOp: '÷' }
  });
}

/**
 * Stage 9-1: 立式マスター (文章を読んで四則の式を立てる)
 */
function generateStage9_1(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = pickRandom(['word_add', 'word_sub'], args.rng);
    } else if (args.difficultyLevel === 'standard') {
      patternType = pickRandom(['word_add', 'word_sub', 'word_mult'], args.rng);
    } else {
      patternType = pickRandom(['word_add', 'word_sub', 'word_mult', 'word_div'], args.rng);
    }
  }
  if (patternType === 'word_sub') return buildWordSub(args);
  if (patternType === 'word_mult') return buildWordMult(args);
  if (patternType === 'word_div') return buildWordDiv(args);
  return buildWordAdd(args);
}

/**
 * 文章題 (9-2) 共通のステップ: わり算の商とあまりを出す → 場面で判断する
 */
function wordRemainderSteps({ total, d, q, r, finalExplanation, finalHint, answer }) {
  const steps = [
    {
      stepNumber: 1,
      id: 'quotient',
      title: 'わり算の商',
      actionName: 'わる',
      explanation: `まず ${total} ÷ ${d} を計算しよう。商は？`,
      blankPosition: 'quotient',
      expectedStepValue: q,
      hint: '九九を使って、割り切れる一番大きい数を見つけよう！'
    },
    {
      stepNumber: 2,
      id: 'remainder',
      title: 'あまり',
      actionName: 'かく',
      explanation: `${total} ÷ ${d} の あまりは？`,
      blankPosition: 'remainder',
      expectedStepValue: r,
      hint: `商 × ${d} を ${total} から引いたのが あまりだよ！`
    },
    {
      stepNumber: 3,
      id: 'final',
      title: '場面で判断',
      actionName: 'きめる',
      explanation: finalExplanation,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: finalHint
    }
  ];
  return steps;
}

/**
 * あまりが出るわり算の数値ペア (total, d) を生成する。商は2以上。
 */
function genRemainderPair(difficultyLevel, rng, variationTarget) {
  let total = 0;
  let d = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
      d = randInt(3, 6, rng); total = randInt(11, 40, rng);
    } else if (difficultyLevel === 'challenge') {
      d = randInt(6, 12, rng); total = randInt(61, 250, rng);
    } else {
      d = randInt(4, 9, rng); total = randInt(26, 99, rng);
    }
    if (total % d === 0) continue;
    if (Math.floor(total / d) < 2) continue;
    if (wordOperandsDiffer(variationTarget, total, d)) break;
  }
  return { total, d, q: Math.floor(total / d), r: total % d };
}

/**
 * Stage 9-2 (pattern: word_remainder_up): あまりを切り上げる判断
 */
function buildWordRemainderUp(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const templateIndex = variationTarget?.trapMetadata?.templateIndex ?? randInt(0, 2, rng);
  const { total, d, q, r } = genRemainderPair(difficultyLevel, rng, variationTarget);

  const answer = q + 1;
  const prompts = [
    `${total}人が バスに 乗ります。バス1台に ${d}人まで 乗れます。バスは 何台 必要ですか？`,
    `${total}この 荷物を 箱に 入れます。1箱に ${d}こずつ 入れると、箱は 何箱 必要ですか？`,
    `${total}Lの 水を バケツで 運びます。1回に ${d}Lずつ 運ぶと、ぜんぶ 運ぶのに 何回 かかりますか？`
  ];
  const steps = wordRemainderSteps({
    total, d, q, r, answer,
    finalExplanation: `あまりの ${r} も全部 入れる（乗せる・運ぶ）には、もう1つ必要だね。${q} ＋ 1 で 答えは？`,
    finalHint: 'あまりが出ても、全部のためには もう1つ必要。これが「切り上げ」だよ！'
  });

  const errorDiagnostics = [
    {
      predictedErrorValue: q,
      reasonCategory: 'remainder_needs_round_up',
      adviceMessage: `商の ${q} だけだと、あとの分が入り切らないよ。あまりの分でもう1つ足す「切り上げ」をしよう！`
    }
  ];
  if (r !== q && r !== answer) {
    errorDiagnostics.push({
      predictedErrorValue: r,
      reasonCategory: 'remainder_quotient_confusion',
      adviceMessage: 'それは「あまり」の数だね。聞かれているのは、全部でいくつ必要かだよ！'
    });
  }

  return buildWordProblem({
    stageId: 2, questionIndex, level, difficultyLevel,
    prompt: prompts[templateIndex],
    expression: `${total} ÷ ${d}`,
    operands: [total, d],
    answer,
    steps,
    mistakeValue: q,
    reasonCategory: 'remainder_needs_round_up',
    diagnosis: 'あまりの分が入り切らなくなってしまうよ！全部のためには、商にもう1つ足す「切り上げ」が必要だね！',
    hintMessage: '「全員・全部」のためには、あまりでもう1つ必要だよ！',
    errorDiagnostics,
    patternType: 'word_remainder_up',
    trapMetadata: { templateIndex, remainderMode: 'up', divQuotient: q, divRemainder: r }
  });
}

/**
 * Stage 9-2 (pattern: word_remainder_down): あまりを切り捨てる判断
 */
function buildWordRemainderDown(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const templateIndex = variationTarget?.trapMetadata?.templateIndex ?? randInt(0, 2, rng);

  let total = 0;
  let d = 0;
  if (templateIndex === 0) {
    // お金で買える数: 値段は10円単位
    for (let attempt = 0; attempt < 200; attempt++) {
      if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') {
        d = randInt(6, 12, rng) * 10; total = randInt(200, 500, rng);
      } else if (difficultyLevel === 'challenge') {
        d = randInt(11, 29, rng) * 10; total = randInt(550, 1500, rng);
      } else {
        d = randInt(7, 19, rng) * 10; total = randInt(320, 980, rng);
      }
      if (total % d === 0) continue;
      if (Math.floor(total / d) < 2) continue;
      if (wordOperandsDiffer(variationTarget, total, d)) break;
    }
  } else if (templateIndex === 1) {
    // リボンの長さ (cm) は少し大きめの数にする
    for (let attempt = 0; attempt < 200; attempt++) {
      total = randInt(60, 300, rng); d = randInt(9, 40, rng);
      if (total % d === 0) continue;
      if (Math.floor(total / d) < 2) continue;
      if (wordOperandsDiffer(variationTarget, total, d)) break;
    }
  } else {
    const pair = genRemainderPair(difficultyLevel, rng, variationTarget);
    total = pair.total;
    d = pair.d;
  }
  const q = Math.floor(total / d);
  const r = total % d;

  const answer = q;
  const prompts = [
    `${total}円で、1こ ${d}円の パンを 買います。パンは 何こ 買えますか？`,
    `${total}cmの リボンから、1本 ${d}cmずつ 切り取ります。リボンは 何本 取れますか？`,
    `${total}この みかんを、1箱に ${d}こずつ 入れます。いっぱいに なる箱は 何箱ですか？`
  ];
  const steps = wordRemainderSteps({
    total, d, q, r, answer,
    finalExplanation: `あまりの ${r} の分は 足りなくて数に入れられないね。切り捨てて、商がそのまま答えだよ。答えは？`,
    finalHint: '足りない分は切り捨てる。これが「切り捨て」だよ！'
  });

  const errorDiagnostics = [
    {
      predictedErrorValue: q + 1,
      reasonCategory: 'remainder_needs_round_down',
      adviceMessage: '1つ多く数えているよ。あまりの分は足りないから、切り上げてはいけない場面だね！'
    }
  ];
  if (r !== q && r !== q + 1) {
    errorDiagnostics.push({
      predictedErrorValue: r,
      reasonCategory: 'remainder_quotient_confusion',
      adviceMessage: 'それは「あまり」の数だね。聞かれているのは、いくつ買える（取れる・できる）かだよ！'
    });
  }

  return buildWordProblem({
    stageId: 2, questionIndex, level, difficultyLevel,
    prompt: prompts[templateIndex],
    expression: `${total} ÷ ${d}`,
    operands: [total, d],
    answer,
    steps,
    mistakeValue: q + 1,
    reasonCategory: 'remainder_needs_round_down',
    diagnosis: 'あまりの分は、お金や長さが足りなくて数に入れられないよ。商のままに「切り捨てる」のが正解だね！',
    hintMessage: '足りない分は切り捨てて、商がそのまま答えになるよ！',
    errorDiagnostics,
    patternType: 'word_remainder_down',
    trapMetadata: { templateIndex, remainderMode: 'down', divQuotient: q, divRemainder: r }
  });
}

/**
 * Stage 9-2 (pattern: word_remainder_value): あまりそのものが答え
 */
function buildWordRemainderValue(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const templateIndex = variationTarget?.trapMetadata?.templateIndex ?? randInt(0, 2, rng);
  // 商とあまりが同じ数だと誤答トラップ (商) が正解 (あまり) と一致するため、
  // q !== r になるペアまで引き直す
  let pair = genRemainderPair(difficultyLevel, rng, variationTarget);
  for (let attempt = 0; attempt < 50 && pair.q === pair.r; attempt++) {
    pair = genRemainderPair(difficultyLevel, rng, null);
  }
  const { total, d, q, r } = pair;

  const answer = r;
  const prompts = [
    `${total}この あめを ${d}人で 同じ数ずつ 分けます。あまりは 何こですか？`,
    `${total}まいの 折り紙を ${d}人で 同じ数ずつ 分けます。あまりは 何まいですか？`,
    `${total}この ボールを ${d}つの チームに 同じ数ずつ 分けます。あまりは 何こですか？`
  ];
  const steps = wordRemainderSteps({
    total, d, q, r, answer,
    finalExplanation: `聞かれているのは「あまり」の数だね。あまりがそのまま答えだよ。答えは？`,
    finalHint: '「あまりは？」と聞かれたら、あまりそのものが答えだよ！'
  });

  const errorDiagnostics = [
    {
      predictedErrorValue: q,
      reasonCategory: 'remainder_quotient_confusion',
      adviceMessage: 'それは商（1人分）の数だね。聞かれているのは「あまり」の数だよ！'
    }
  ];
  if (q + 1 !== r) {
    errorDiagnostics.push({
      predictedErrorValue: q + 1,
      reasonCategory: 'remainder_needs_round_up',
      adviceMessage: '切り上げた数になっているよ。この問題で聞かれているのは「あまり」だね！'
    });
  }

  return buildWordProblem({
    stageId: 2, questionIndex, level, difficultyLevel,
    prompt: prompts[templateIndex],
    expression: `${total} ÷ ${d}`,
    operands: [total, d],
    answer,
    steps,
    mistakeValue: q,
    reasonCategory: 'remainder_quotient_confusion',
    diagnosis: '聞かれているのは「あまり」の数だよ！商とまちがえていないか、文の最後を確かめよう！',
    hintMessage: '文の最後の「あまりは 何こ？」が答えの合図だよ！',
    errorDiagnostics,
    patternType: 'word_remainder_value',
    trapMetadata: { templateIndex, remainderMode: 'value', divQuotient: q, divRemainder: r }
  });
}

/**
 * Stage 9-2: あまりの判断マスター (切り上げ・切り捨て・あまりそのもの)
 */
function generateStage9_2(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    if (args.difficultyLevel === 'warmup' || args.difficultyLevel === 'remedial') {
      patternType = pickRandom(['word_remainder_up', 'word_remainder_down'], args.rng);
    } else {
      patternType = pickRandom(
        ['word_remainder_up', 'word_remainder_down', 'word_remainder_value'],
        args.rng
      );
    }
  }
  if (patternType === 'word_remainder_down') return buildWordRemainderDown(args);
  if (patternType === 'word_remainder_value') return buildWordRemainderValue(args);
  return buildWordRemainderUp(args);
}

const WORD_UNIT_KINDS = {
  length: { bigUnit: 'm', smallUnit: 'cm', factor: 100 },
  capacity: { bigUnit: 'L', smallUnit: 'mL', factor: 1000 },
  weight: { bigUnit: 'kg', smallUnit: 'g', factor: 1000 }
};

// 換算してから割る問題で、答えも「倍率を間違えた値」も整数になる (a, b) の候補
const WORD_UNIT_DIV_PAIRS = {
  // b=100: a は 1..6 のどれでもよい
  100: [1, 2, 3, 4, 5, 6],
  // b=200: a は偶数
  200: [2, 4, 6],
  // b=400: a は 4 の倍数
  400: [4, 8],
  // b=500: a は 5 の倍数
  500: [5]
};

/**
 * Stage 9-3: 単位換算の文章題 (そろえてから計算する)
 * subtype 0: 合わせる (たし算), 1: 残り・ちがい (ひき算), 2: 換算してから割る
 */
function buildWordUnit(args) {
  const { questionIndex, level, difficultyLevel, rng, variationTarget } = args;
  const patternType = args.patternType;
  const kindKey = patternType.replace('word_unit_', '');
  const kind = WORD_UNIT_KINDS[kindKey];
  const { bigUnit, smallUnit, factor } = kind;

  let subtype = variationTarget?.trapMetadata?.unitSubtype;
  if (subtype === undefined || subtype === null) {
    if (difficultyLevel === 'warmup' || difficultyLevel === 'remedial') subtype = 0;
    else if (difficultyLevel === 'standard') subtype = pickRandom([0, 1], rng);
    else subtype = pickRandom([0, 1, 2], rng);
  }

  let a = 0;
  let b = 0;
  let answer = 0;
  let prompt = '';
  let expression = '';
  let secondLabel = '';

  for (let attempt = 0; attempt < 200; attempt++) {
    if (subtype === 0) {
      // 合わせる: a(大きい単位) + b(小さい単位) → 小さい単位で答える
      if (kindKey === 'length') {
        a = difficultyLevel === 'warmup' || difficultyLevel === 'remedial' ? randInt(1, 4, rng) : randInt(1, 9, rng);
        b = randInt(1, 19, rng) * 5;
      } else {
        a = difficultyLevel === 'warmup' || difficultyLevel === 'remedial' ? randInt(1, 3, rng) : randInt(1, 6, rng);
        b = randInt(1, 19, rng) * 50;
      }
      answer = a * factor + b;
      expression = `${a} × ${factor} + ${b}`;
      if (kindKey === 'length') prompt = `${a}mの ひもと ${b}cmの ひもを つなぎます。ぜんぶで 何cmですか？`;
      else if (kindKey === 'capacity') prompt = `${a}Lの ジュースと ${b}mLの ジュースを 合わせます。ぜんぶで 何mLですか？`;
      else prompt = `${a}kgの さとうと ${b}gの さとうを 合わせます。ぜんぶで 何gですか？`;
      secondLabel = `もう1つの量は ${b}${smallUnit} です。その数は？`;
    } else if (subtype === 1) {
      // 残り・ちがい: 大きい単位から小さい単位の量を引く。
      // 倍率ミスの診断値 (b − a×factor/10) が正になるよう b > a×(factor/10) を保つ
      if (kindKey === 'length') {
        a = randInt(2, 9, rng);
        b = randInt(11, 48, rng) * 10;
        if (b >= a * factor) continue;
      } else {
        a = randInt(1, 4, rng);
        b = randInt(3, 19, rng) * 50;
        if (b <= a * (factor / 10)) continue;
        if (b >= a * factor) continue;
      }
      answer = a * factor - b;
      expression = `${a} × ${factor} − ${b}`;
      if (kindKey === 'length') prompt = `${a}mの リボンと ${b}cmの リボンが あります。長さの ちがいは 何cmですか？`;
      else if (kindKey === 'capacity') prompt = `${a}Lの 水が あります。${b}mL 飲みました。残りは 何mLですか？`;
      else prompt = `${a}kgの かばんから ${b}gの 本を 出しました。かばんの 重さは 何gに なりますか？`;
      secondLabel = `もう1つの量は ${b}${smallUnit} です。その数は？`;
    } else {
      // 換算してから割る: a(大きい単位) を b(小さい単位) ずつに分ける
      if (kindKey === 'length') {
        b = pickRandom([2, 4, 5, 10], rng);
        a = b === 4 ? randInt(1, 4, rng) * 2 : randInt(1, 8, rng);
        secondLabel = `分ける人数は ${b}人 です。その数は？`;
        prompt = `${a}mの テープを ${b}人で 同じ長さずつ 分けます。1人分は 何cmですか？`;
        // テープの文では b は人数 (割る数) → 1人分は a×100÷b (cm)
        answer = (a * factor) / b;
        expression = `${a} × ${factor} ÷ ${b}`;
      } else {
        const pairKeys = Object.keys(WORD_UNIT_DIV_PAIRS);
        const bKey = pickRandom(pairKeys, rng);
        b = Number(bKey);
        a = pickRandom(WORD_UNIT_DIV_PAIRS[bKey], rng);
        answer = (a * factor) / b;
        expression = `${a} × ${factor} ÷ ${b}`;
        if (kindKey === 'capacity') {
          secondLabel = `1回分は ${b}${smallUnit} ずつです。その数は？`;
          prompt = `${a}Lの ジュースを、1回に ${b}mLずつ くみます。何回 くめますか？`;
        } else {
          secondLabel = `1袋分は ${b}${smallUnit} ずつです。その数は？`;
          prompt = `${a}kgの 米を、1袋 ${b}gずつに 分けます。何袋 できますか？`;
        }
      }
    }
    // 診断の値が答えや互いと重ならない組み合わせだけを採用する
    const trapNoConvert = subtype === 1 ? b - a : a + b;
    const trapWrongFactor = subtype === 2 ? (a * (factor / 10)) / b : subtype === 1 ? b - a * (factor / 10) : a * (factor / 10) + b;
    if (trapNoConvert === answer || trapWrongFactor === answer || trapNoConvert === trapWrongFactor) continue;
    if (!wordOperandsDiffer(variationTarget, a, b)) continue;
    break;
  }

  const converted = a * factor;
  const trapNoConvert = subtype === 1 ? b - a : a + b;
  const trapWrongFactor = subtype === 2 ? (a * (factor / 10)) / b : subtype === 1 ? b - a * (factor / 10) : a * (factor / 10) + b;

  let mistakeValue;
  let reasonCategory;
  let diagnosis;
  let errorDiagnostics;
  if (subtype === 2) {
    mistakeValue = trapWrongFactor;
    reasonCategory = 'unit_wrong_factor';
    diagnosis = `換算の倍率がちがうよ！${bigUnit} から ${smallUnit} は ×${factor} だよ。×${factor / 10} とまちがえていないかな？`;
    errorDiagnostics = [
      {
        predictedErrorValue: trapWrongFactor,
        reasonCategory: 'unit_wrong_factor',
        adviceMessage: `1${bigUnit} = ${factor}${smallUnit} だよ。${a}${bigUnit} は ${converted}${smallUnit} になるね！`
      }
    ];
  } else {
    mistakeValue = trapNoConvert;
    reasonCategory = 'unit_not_converted';
    diagnosis = `単位がそろっていないよ！${a}${bigUnit} は ${converted}${smallUnit} に直してから計算しよう！`;
    errorDiagnostics = [
      {
        predictedErrorValue: trapNoConvert,
        reasonCategory: 'unit_not_converted',
        adviceMessage: `単位をそろえずに計算しているよ。${a}${bigUnit} を ${smallUnit} に直してから計算しよう！`
      },
      {
        predictedErrorValue: trapWrongFactor,
        reasonCategory: 'unit_wrong_factor',
        adviceMessage: `換算の倍率がちがうよ！1${bigUnit} = ${factor}${smallUnit} だね。`
      }
    ];
  }

  const finalExplanation = subtype === 0
    ? `単位をそろえたから、${converted} ＋ ${b} を計算しよう。答えは？`
    : subtype === 1
      ? `単位をそろえたから、${converted} − ${b} を計算しよう。答えは？`
      : `単位をそろえたから、${converted} ÷ ${b} を計算しよう。答えは？`;

  const steps = [
    {
      stepNumber: 1,
      id: 'convert',
      title: '単位の換算',
      actionName: 'なおす',
      explanation: `${a}${bigUnit} は 何${smallUnit}ですか？`,
      blankPosition: 'convert',
      expectedStepValue: converted,
      hint: `1${bigUnit} = ${factor}${smallUnit} だよ！`
    },
    {
      stepNumber: 2,
      id: 'second_amount',
      title: 'もう1つの量',
      actionName: 'さがす',
      explanation: secondLabel,
      blankPosition: 'second_amount',
      expectedStepValue: b,
      hint: `文の中の ${smallUnit} の数を探そう！`
    },
    {
      stepNumber: 3,
      id: 'final',
      title: 'そろえて計算',
      actionName: 'けいさん',
      explanation: finalExplanation,
      blankPosition: 'final',
      expectedStepValue: answer,
      hint: '単位をそろえてから計算するのがコツだよ！'
    }
  ];

  return buildWordProblem({
    stageId: 3, questionIndex, level, difficultyLevel,
    prompt,
    expression,
    operands: [a, b],
    answer,
    steps,
    mistakeValue,
    reasonCategory,
    diagnosis,
    hintMessage: `まず ${bigUnit} を ${smallUnit} に直して、単位をそろえよう！`,
    errorDiagnostics,
    patternType,
    trapMetadata: { unitKind: kindKey, unitSubtype: subtype, convertFactor: factor, bigAmount: a }
  });
}

/**
 * Stage 9-3: 単位換算の文章題 (m↔cm・L↔mL・kg↔g)
 */
function generateStage9_3(args) {
  let patternType = args.variationTarget?.patternType;
  if (!patternType) {
    patternType = pickRandom(['word_unit_length', 'word_unit_capacity', 'word_unit_weight'], args.rng);
  }
  return buildWordUnit({ ...args, patternType });
}

const STAGE_GENERATORS = {
  '1-1': generateStage1_1,
  '1-2': generateStage1_2,
  '1-3': generateStage1_3,
  '2-1': generateStage2_1,
  '2-2': generateStage2_2,
  '2-3': generateStage2_3,
  '3-1': generateStage3_1,
  '3-2': generateStage3_2,
  '3-3': generateStage3_3,
  '4-1': generateStage4_1,
  '4-2': generateStage4_2,
  '4-3': generateStage4_3,
  '5-1': generateStage5_1,
  '5-2': generateStage5_2,
  '5-3': generateStage5_3,
  '6-1': generateStage6_1,
  '6-2': generateStage6_2,
  '6-3': generateStage6_3,
  '7-1': generateStage7_1,
  '7-2': generateStage7_2,
  '7-3': generateStage7_3,
  '8-1': generateStage8_1,
  '8-2': generateStage8_2,
  '8-3': generateStage8_3,
  '9-1': generateStage9_1,
  '9-2': generateStage9_2,
  '9-3': generateStage9_3
};

// ============================================================================
// Public Curriculum Engine API
// ============================================================================

/**
 * 単一の問題を生成する
 * @param {number|string} worldId
 * @param {number|string} [stageId]
 * @param {object} [options]
 * @returns {object} MathProblem
 */
export function generateProblem(worldId, stageId, options = {}) {
  const norm = normalizeWorldAndStage(worldId, stageId);
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const questionIndex = Number(options.questionIndex) || 1;
  const { level, difficultyLevel } = resolveDifficulty({ ...options, questionIndex });
  const key = `${norm.worldId}-${norm.stageId}`;
  const generator = STAGE_GENERATORS[key] || generateStage1_1;

  return generator({
    questionIndex,
    level,
    difficultyLevel,
    rng,
    variationTarget: options.variationTarget || null
  });
}

/**
 * 直前の解答履歴に基づき、次の問題（Q1〜Q5）の難易度レベルを決定する
 * @param {number} questionIndex (1..5)
 * @param {Array<object>} [history=[]]
 * @returns {{ level: number, difficultyLevel: "warmup" | "standard" | "hurdle" | "challenge" | "remedial" }}
 */
export function determineAdaptiveDifficulty(questionIndex, history = []) {
  const idx = Math.max(1, Math.min(5, Number(questionIndex) || 1));
  const safeHistory = Array.isArray(history) ? history : [];

  if (idx === 1) {
    return { level: 1, difficultyLevel: 'warmup' };
  }
  if (idx === 2) {
    return { level: 2, difficultyLevel: 'standard' };
  }

  const hadErrorOrHint = (entry) => {
    if (!entry) return false;
    return (
      entry.isCorrect === false ||
      entry.correct === false ||
      entry.firstTryCorrect === false ||
      Boolean(entry.usedHint) ||
      Boolean(entry.stepsUsed && entry.stepsUsed > 0) ||
      Boolean(entry.wasSelfCorrected)
    );
  };

  const q2Entry = safeHistory[1] || safeHistory[safeHistory.length - 1];
  const anyPriorTrouble = safeHistory.some(hadErrorOrHint);
  const recentTrouble = hadErrorOrHint(safeHistory[safeHistory.length - 1]);

  if (idx === 3) {
    if (hadErrorOrHint(q2Entry)) {
      return { level: 1, difficultyLevel: 'remedial' };
    }
    return { level: 2, difficultyLevel: 'hurdle' };
  }

  if (idx === 4) {
    if (!anyPriorTrouble) {
      return { level: 3, difficultyLevel: 'challenge' };
    }
    if (recentTrouble) {
      return { level: 1, difficultyLevel: 'remedial' };
    }
    return { level: 2, difficultyLevel: 'standard' };
  }

  // idx === 5 (Stage Boss / Final Confirmation)
  if (!anyPriorTrouble) {
    return { level: 3, difficultyLevel: 'challenge' };
  }
  const errorCount = safeHistory.filter(hadErrorOrHint).length;
  if (errorCount >= 2) {
    return { level: 1, difficultyLevel: 'remedial' };
  }
  return { level: 2, difficultyLevel: 'standard' };
}

/**
 * ステージの次の問題を動的に選択・生成する
 * @param {number|string} worldId
 * @param {number|string} stageId
 * @param {number} questionIndex
 * @param {Array<object>} [history=[]]
 * @param {object} [previousProblem=null]
 * @param {object} [options={}]
 */
export function selectNextProblem(
  worldId,
  stageId,
  questionIndex = 1,
  history = [],
  previousProblem = null,
  options = {}
) {
  const adaptive = determineAdaptiveDifficulty(questionIndex, history);
  const lastEntry = Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
  const justMissed =
    lastEntry &&
    (lastEntry.isCorrect === false ||
      lastEntry.correct === false ||
      lastEntry.firstTryCorrect === false ||
      Boolean(lastEntry.usedHint));

  if (justMissed && previousProblem && questionIndex >= 3) {
    const varied = generateVariationProblem(previousProblem, {
      ...options,
      questionIndex,
      level: adaptive.level,
      difficultyLevel: adaptive.difficultyLevel
    });
    varied.questionIndex = questionIndex;
    varied.difficultyLevel = adaptive.difficultyLevel;
    varied.level = adaptive.level;
    return varied;
  }

  return generateProblem(worldId, stageId, {
    ...options,
    questionIndex,
    level: adaptive.level,
    difficultyLevel: adaptive.difficultyLevel
  });
}

/**
 * 1ステージ分（5問）の問題セットを生成する（アダプティブ5問ステージフロー）
 * @param {number|string} worldId
 * @param {number|string} [stageId]
 * @param {Array<object>} [history=[]]
 * @param {object} [options={}]
 * @returns {Array<object>} 5つの MathProblem 配列
 */
export function generateStageProblems(worldId, stageId, history = [], options = {}) {
  const norm = normalizeWorldAndStage(worldId, stageId);
  const safeHistory = Array.isArray(history) ? history : [];
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;

  const problems = [];
  const usedExpressions = new Set();

  for (let qIdx = 1; qIdx <= 5; qIdx++) {
    const historySlice = safeHistory.slice(0, qIdx - 1);
    const adaptive = determineAdaptiveDifficulty(qIdx, historySlice);

    let candidate = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      candidate = generateProblem(norm.worldId, norm.stageId, {
        ...options,
        rng,
        questionIndex: qIdx,
        level: adaptive.level,
        difficultyLevel: adaptive.difficultyLevel
      });
      if (!usedExpressions.has(candidate.expression)) {
        usedExpressions.add(candidate.expression);
        break;
      }
    }
    problems.push(candidate);
  }

  return problems;
}

/**
 * 診断カテゴリ（reasonCategory）の表示名マップ（Issue #23: にがて特訓の対象表示用）
 */
export const TRAINING_CATEGORY_LABELS = {
  carry_forgotten: 'くり上がり',
  borrow_forgotten: 'くり下がり',
  shift_forgotten: '位のずれ',
  place_value_slip: '位の計算',
  order_mistake: '計算の順序',
  quotient_too_small: '商が小さい',
  quotient_too_big: '商が大きい',
  remainder_scale: 'あまりの位',
  calculation_slip: '計算のミス',
  trap_detected: 'ひっかけポイント',
  general_recheck: '計算ミス'
};

/**
 * 追加セッション（発展問題／にがて特訓）の問題数（Issue #23）。
 * ボタンの文言と生成呼び出しはこの定数を正として揃える。
 */
export const EXTRA_SESSION_QUESTION_COUNT = 3;

/**
 * 診断カテゴリの表示名を返す（にがて特訓用）
 * @param {string} category reasonCategory
 * @returns {string}
 */
export function getTrainingCategoryLabel(category) {
  return TRAINING_CATEGORY_LABELS[category] || 'にがて';
}

/**
 * ステージ完了時点のセッション結果から、ステージ単位の適応導線
 * （発展問題＝チャレンジ／にがて特訓）を出すかどうかを判定する純粋関数（Issue #23）。
 *
 * - チャレンジ: 全問を初回正解（firstTryCount === totalQuestions）したときだけ出す
 * - にがて特訓: 同じ診断カテゴリで「異なる問題」を2問以上誤答したとき、そのカテゴリを
 *   対象にする。同じ問題への複数回の誤答は1問分として数える（問題単位で重複排除）。
 *   problem 参照を持たない記録は重複排除できないため、それぞれ別の問題として数える。
 *   対象が複数ある場合は「具体的なカテゴリ（general_recheck 以外）を優先 →
 *   誤答した問題数が多い方 → 最初に現れた方」の順で1つに決める
 *
 * @param {{ firstTryCount?: number, totalQuestions?: number,
 *           errorRecords?: Array<{ reasonCategory?: string, problem?: object }> }} [input]
 * @returns {{ showChallenge: boolean, trainingCategory: string|null, trainingErrorCount: number }}
 *   trainingErrorCount は対象カテゴリで誤答した「異なる問題」の数
 */
export function evaluateStageAdaptation({ firstTryCount = 0, totalQuestions = 5, errorRecords = [] } = {}) {
  const total = Math.max(0, Number(totalQuestions) || 0);
  const firstTry = Math.max(0, Number(firstTryCount) || 0);
  const showChallenge = total > 0 && firstTry >= total;

  const stats = new Map();
  (Array.isArray(errorRecords) ? errorRecords : []).forEach((rec, idx) => {
    const category = rec?.reasonCategory;
    if (!category || typeof category !== 'string') return;
    if (!stats.has(category)) {
      stats.set(category, { category, missedProblems: new Set() });
    }
    const problem = rec?.problem;
    const problemKey =
      problem && typeof problem === 'object'
        ? problem.id || problem.expression || problem
        : `record-${idx}`;
    stats.get(category).missedProblems.add(problemKey);
  });

  let training = null;
  let trainingCount = 0;
  for (const entry of stats.values()) {
    const count = entry.missedProblems.size;
    if (count < 2) continue;
    if (!training) {
      training = entry;
      trainingCount = count;
      continue;
    }
    const entryIsGeneral = entry.category === 'general_recheck';
    const bestIsGeneral = training.category === 'general_recheck';
    if (entryIsGeneral !== bestIsGeneral) {
      if (!entryIsGeneral) {
        training = entry;
        trainingCount = count;
      }
    } else if (count > trainingCount) {
      training = entry;
      trainingCount = count;
    }
    // Same generality and same count: Map iterates in first-occurrence
    // order, so the earlier category is kept.
  }

  return {
    showChallenge,
    trainingCategory: training ? training.category : null,
    trainingErrorCount: training ? trainingCount : 0
  };
}

/**
 * 発展問題（チャレンジ）用に、ステージの生成器から challenge 難易度の問題を
 * 指定問数だけ生成する（Issue #23）。式が重複しないよう再試行する。
 * @param {number|string} worldId
 * @param {number|string} stageId
 * @param {number} [count=EXTRA_SESSION_QUESTION_COUNT]
 * @param {object} [options={}]
 * @returns {Array<object>} MathProblem 配列
 */
export function generateChallengeProblems(worldId, stageId, count = EXTRA_SESSION_QUESTION_COUNT, options = {}) {
  const norm = normalizeWorldAndStage(worldId, stageId);
  const total = Math.max(1, Math.min(5, Number(count) || EXTRA_SESSION_QUESTION_COUNT));
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;

  const problems = [];
  const usedExpressions = new Set();

  for (let qIdx = 1; qIdx <= total; qIdx++) {
    let candidate = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      candidate = generateProblem(norm.worldId, norm.stageId, {
        ...options,
        rng,
        questionIndex: qIdx,
        level: 3,
        difficultyLevel: 'challenge'
      });
      if (!usedExpressions.has(candidate.expression)) {
        usedExpressions.add(candidate.expression);
        break;
      }
    }
    problems.push(candidate);
  }

  return problems;
}

/**
 * にがて特訓用に、対象カテゴリで誤答した問題の類題を指定問数だけ選ぶ（Issue #23）。
 * 元問題が問数より少ない場合は元問題を巡回して別の類題を生成する。
 * @param {Array<{ reasonCategory?: string, problem?: object }>} [errorRecords=[]]
 * @param {string|null} [category=null] 対象カテゴリ（null の場合は全カテゴリ）
 * @param {number} [count=EXTRA_SESSION_QUESTION_COUNT]
 * @param {object} [options={}]
 * @returns {Array<object>} MathProblem 配列（元問題が無ければ空配列）
 */
export function selectTrainingProblems(errorRecords = [], category = null, count = EXTRA_SESSION_QUESTION_COUNT, options = {}) {
  const total = Math.max(1, Number(count) || EXTRA_SESSION_QUESTION_COUNT);
  const sources = (Array.isArray(errorRecords) ? errorRecords : []).filter(
    (rec) => rec && rec.problem && (!category || rec.reasonCategory === category)
  );
  if (sources.length === 0) return [];

  const problems = [];
  const usedExpressions = new Set();
  let cursor = 0;
  let guard = 0;
  while (problems.length < total && guard < total * 20) {
    guard += 1;
    const source = sources[cursor % sources.length];
    cursor += 1;
    const variation = generateVariationProblem(source.problem, {
      ...options,
      questionIndex: problems.length + 1
    });
    if (usedExpressions.has(variation.expression)) continue;
    usedExpressions.add(variation.expression);
    problems.push(variation);
  }
  // Uniqueness could not be satisfied (very small variation space): top up.
  while (problems.length < total) {
    const source = sources[cursor % sources.length];
    cursor += 1;
    problems.push(
      generateVariationProblem(source.problem, {
        ...options,
        questionIndex: problems.length + 1
      })
    );
  }
  return problems;
}

/**
 * パワーアップ宝箱（復習用）および救済分岐向けに、認知トラップと難易度を厳密に維持した
 * 数字違いの類題（Variation Problem）を生成する
 * @param {object} originalProblem
 * @param {object} [options={}]
 * @returns {object} MathProblem
 */
export function generateVariationProblem(originalProblem, options = {}) {
  if (!originalProblem || typeof originalProblem !== 'object') {
    return generateProblem(1, 1, options);
  }

  const norm = normalizeWorldAndStage(
    originalProblem.worldId ?? originalProblem.stageId ?? 1,
    originalProblem.stageId ?? 1
  );

  const origOperands = Array.isArray(originalProblem.operands)
    ? originalProblem.operands
    : [originalProblem.num1 ?? 100, originalProblem.num2 ?? 100];

  const origExpression =
    originalProblem.expression ||
    `${origOperands[0]} ${originalProblem.operator || '+'} ${origOperands[1]}`;

  const origAnswerVal =
    originalProblem.correctAnswer?.value ??
    (typeof originalProblem.expectedAnswer === 'number'
      ? originalProblem.expectedAnswer
      : originalProblem.expectedAnswer?.quotient) ??
    originalProblem.answer ??
    0;

  // Reconstruct trapMetadata if compact object was passed from storage
  let trapMetadata = originalProblem.trapMetadata ? { ...originalProblem.trapMetadata } : {};
  let patternType = originalProblem.patternType;

  if (norm.worldId === 1 && norm.stageId === 2 && trapMetadata.acrossZero === undefined) {
    const aStr = String(origOperands[0]);
    trapMetadata.acrossZero = aStr.slice(1, -1).includes('0');
    trapMetadata.is4Digit = origOperands[0] >= 1000;
  } else if (norm.worldId === 2 && norm.stageId === 2 && trapMetadata.hasMiddleZero === undefined) {
    const aStr = String(origOperands[0]);
    trapMetadata.is3Digit = origOperands[0] >= 100;
    trapMetadata.hasMiddleZero = aStr.length === 3 && aStr[1] === '0';
  } else if (norm.worldId === 3 && norm.stageId === 3 && trapMetadata.zeroInTens === undefined) {
    trapMetadata.zeroInTens = origAnswerVal >= 100 && Math.floor(origAnswerVal / 10) % 10 === 0;
  } else if (norm.worldId === 4 && norm.stageId === 1 && trapMetadata.withRemainder === undefined) {
    const rem =
      originalProblem.correctAnswer?.remainder ??
      originalProblem.expectedAnswer?.remainder ??
      originalProblem.remainder ??
      origOperands[0] % origOperands[1];
    trapMetadata.withRemainder = rem > 0;
  } else if (norm.worldId === 6 && trapMetadata.decimalScale === undefined) {
    // 小数問題 (compact 形式): operands に小数第2位の端数があるかでスケールを推定
    const hasHundredths = origOperands.some(
      (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9 && Math.abs(v * 10 - Math.round(v * 10)) > 1e-9
    );
    trapMetadata.decimalScale = hasHundredths ? 100 : 10;
  } else if (norm.worldId === 7 && trapMetadata.fractionAnswer === undefined) {
    // 分数問題 (compact 形式): operands は [分子1, 分母, 分子2, 分母] の同分母形式。
    // 答えの分数と分母を operands から再構築し、類題でも同分母を維持する
    const [o0, o1, o2, o3] = origOperands;
    if (Number.isInteger(o0) && Number.isInteger(o1) && o1 > 0) {
      trapMetadata.fracDen = o1;
      if (norm.stageId === 1) {
        // 仕組みステージの分数解答は operands [分子, 分母] そのもの
        if (originalProblem.hasFraction) {
          trapMetadata.fractionAnswer = { numerator: o0, denominator: o1 };
          trapMetadata.fracNum = o0;
        }
      } else if (Number.isInteger(o2) && o3 === o1) {
        const resultNum = originalProblem.operator === '-' ? o0 - o2 : o0 + o2;
        trapMetadata.fractionAnswer = { numerator: resultNum, denominator: o1 };
      }
    }
  } else if (norm.worldId === 8) {
    // 大きな数・がい数問題 (compact 形式): operands の第2要素から丸め条件などを復元する
    const second = origOperands[1];
    if (norm.stageId === 1) {
      if (patternType === 'large_place_digit' && Number.isInteger(second)) {
        trapMetadata.placeValue = second;
      } else if (patternType === 'large_unit_count' && Number.isInteger(second)) {
        trapMetadata.unitBase = second;
      } else if (patternType === 'large_times_ten' && trapMetadata.timesMode === undefined && (second === 10 || second === 100)) {
        // 元の問題が持つ timesMode ('tenth' = 1/10) を上書きしないよう、未設定のときだけ復元する
        trapMetadata.timesMode = 'times';
        trapMetadata.scaleFactor = second;
      }
    } else if (norm.stageId === 2) {
      if (Number.isInteger(second) && second >= 10 && trapMetadata.roundPlace === undefined) {
        trapMetadata.roundPlace = second;
      } else if (
        Number.isInteger(second) && second >= 1 && second <= 3 &&
        trapMetadata.sigDigits === undefined
      ) {
        trapMetadata.sigDigits = second;
      }
    }
    // stageId === 3 (概算) は operands から復元できる条件がなく、
    // 各ビルダーの難易度既定 (add/sub は位、mult は百の位) に任せる
  } else if (norm.worldId === 9) {
    // 文章題 (compact 形式): patternType と trapMetadata (テンプレート番号・
    // あまりの判断モード・単位の種類) が残っていれば各ビルダーが再利用する。
    // 欠けている場合は難易度既定のパターン選択に任せる (World 8 stage 3 と同様)
  }

  const targetModel = {
    ...originalProblem,
    operands: origOperands,
    expression: origExpression,
    correctAnswer: { value: origAnswerVal },
    patternType,
    trapMetadata
  };

  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const level = options.level ?? originalProblem.level ?? 2;
  const difficultyLevel = options.difficultyLevel ?? originalProblem.difficultyLevel ?? 'standard';
  const questionIndex = options.questionIndex ?? originalProblem.questionIndex ?? 1;

  let variation = null;
  for (let attempt = 0; attempt < 100; attempt++) {
    variation = generateProblem(norm.worldId, norm.stageId, {
      rng,
      questionIndex,
      level,
      difficultyLevel,
      variationTarget: targetModel
    });

    const operandsDiffer = Array.isArray(variation.operands) && Array.isArray(origOperands)
      ? (variation.operands[0] !== origOperands[0] || variation.operands[1] !== origOperands[1])
      : true;

    if (variation.expression !== origExpression && operandsDiffer) {
      if (norm.worldId === 3 && norm.stageId === 3 && Array.isArray(variation.operands) && Array.isArray(origOperands)) {
        if (variation.operands[0] === origOperands[0]) continue;
      }
      break;
    }
  }

  variation.variationOf = originalProblem.id || origExpression;
  return variation;
}

/**
 * ユーザーの解答入力を正規化する（数値、文字列、"7 あまり 4"、"7...4"、オブジェクト等に対応）
 * @param {number|string|object} userAnswer
 * @returns {{ value: number, remainder: number, hasExplicitRemainder: boolean }}
 */
export function normalizeUserAnswer(userAnswer) {
  if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
    return { value: NaN, remainder: 0, hasExplicitRemainder: false };
  }

  if (typeof userAnswer === 'number') {
    return { value: userAnswer, remainder: 0, hasExplicitRemainder: false };
  }

  if (typeof userAnswer === 'object') {
    // 分数形式 { numerator, denominator } (分数ステージの2欄入力)
    if (userAnswer.numerator !== undefined || userAnswer.denominator !== undefined) {
      const num = Number(userAnswer.numerator ?? NaN);
      const den = Number(userAnswer.denominator ?? NaN);
      const value =
        Number.isFinite(num) && Number.isFinite(den) && den !== 0 ? num / den : NaN;
      return {
        value,
        remainder: 0,
        hasExplicitRemainder: false,
        numerator: num,
        denominator: den
      };
    }
    const val = Number(userAnswer.quotient ?? userAnswer.value ?? userAnswer.answer ?? NaN);
    const hasRem = userAnswer.remainder !== undefined && userAnswer.remainder !== null && userAnswer.remainder !== '';
    const rem = hasRem ? Number(userAnswer.remainder) : 0;
    return { value: val, remainder: Number.isNaN(rem) ? 0 : rem, hasExplicitRemainder: hasRem };
  }

  if (typeof userAnswer === 'string') {
    const trimmed = userAnswer.trim().replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    const remMatch = trimmed.match(/^(-?\d+)\s*(?:あまり|余り|r|\.{2,}|…|・+)\s*(-?\d+)$/i);
    if (remMatch) {
      return {
        value: parseInt(remMatch[1], 10),
        remainder: parseInt(remMatch[2], 10),
        hasExplicitRemainder: true
      };
    }
    // 分数形式 "分子/分母"
    const fracMatch = trimmed.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (fracMatch) {
      const num = parseInt(fracMatch[1], 10);
      const den = parseInt(fracMatch[2], 10);
      return {
        value: den !== 0 ? num / den : NaN,
        remainder: 0,
        hasExplicitRemainder: false,
        numerator: num,
        denominator: den
      };
    }
    const num = Number(trimmed);
    return { value: num, remainder: 0, hasExplicitRemainder: false };
  }

  return { value: NaN, remainder: 0, hasExplicitRemainder: false };
}

/**
 * 誤答の原因を分析し、バツ（×）を出さない探検・ラボ風のピンポイント助言を返す
 * @param {object} problem
 * @param {number|string|object} userAnswer
 */
export function diagnoseError(problem, userAnswer) {
  const norm = normalizeUserAnswer(userAnswer);
  const trueVal = problem?.correctAnswer?.value ?? problem?.answer ?? 0;
  const trueRem = problem?.correctAnswer?.remainder ?? problem?.remainder ?? 0;
  const isDiv = problem?.operator === '÷';
  const decScale = getDecimalScale(problem);
  const valueMatches = (candidate) =>
    decScale ? scaledValueEquals(norm.value, candidate, decScale) : norm.value === candidate;

  // First check exact match in problem.errorDiagnostics
  if (Array.isArray(problem?.errorDiagnostics)) {
    for (const diag of problem.errorDiagnostics) {
      const valMatch = valueMatches(diag.predictedErrorValue);
      const remMatch =
        diag.predictedRemainder === undefined || norm.remainder === diag.predictedRemainder;
      if (valMatch && remMatch) {
        return {
          matched: true,
          reasonCategory: diag.reasonCategory,
          diagnosis: diag.diagnosis || diag.adviceMessage,
          adviceMessage: diag.adviceMessage,
          hintMessage: diag.hintMessage || diag.adviceMessage,
          feedbackTitle: 'ヒントを発見！おしい！もう一歩！',
          highlightDigitIndex: findDiffDigitIndex(trueVal, norm.value),
          userAnswer: { value: norm.value, remainder: norm.remainder }
        };
      }
    }
  }

  // Check commonTrap
  if (problem?.commonTrap && valueMatches(problem.commonTrap.mistakeValue)) {
    if (
      problem.commonTrap.mistakeRemainder === undefined ||
      norm.remainder === problem.commonTrap.mistakeRemainder
    ) {
      return {
        matched: true,
        reasonCategory: problem.commonTrap.reasonCategory || 'trap_detected',
        diagnosis: problem.commonTrap.diagnosis,
        adviceMessage: problem.commonTrap.hintMessage,
        hintMessage: problem.commonTrap.hintMessage,
        feedbackTitle: 'ヒントを発見！おしい！もう一歩！',
        highlightDigitIndex: findDiffDigitIndex(trueVal, norm.value),
        userAnswer: { value: norm.value, remainder: norm.remainder }
      };
    }
  }

  // Fraction dynamic rules (World 7): designed traps above are matched by
  // value; these cover fraction-shaped answers the trap table did not foresee.
  const fracAnswer = getFractionAnswer(problem);
  if (
    fracAnswer &&
    Number.isFinite(norm.numerator) &&
    Number.isFinite(norm.denominator) &&
    norm.denominator !== 0
  ) {
    const fracUserAnswer = { value: norm.value, remainder: norm.remainder };
    if (
      norm.numerator === fracAnswer.denominator &&
      norm.denominator === fracAnswer.numerator &&
      fracAnswer.numerator !== fracAnswer.denominator
    ) {
      return {
        matched: true,
        reasonCategory: 'fraction_inverted',
        diagnosis: '分子と分母が反対になっているかも！',
        adviceMessage: `下の数が分母（何等分したか）、上の数が分子（何こ分）だよ。答えは ${fracAnswer.numerator}/${fracAnswer.denominator} の形になるよ！`,
        hintMessage: '分母は「何等分したか」、分子は「何こ分か」を確かめよう！',
        feedbackTitle: 'おしい！もう一歩！',
        highlightDigitIndex: 0,
        userAnswer: fracUserAnswer
      };
    }
    // 分母が正解と異なる誤答は、先に分母側の診断へ振り分ける。分子だけを
    // 見る診断に落とすと「分母は合っているよ」と誤った助言になるため。
    if (norm.denominator !== fracAnswer.denominator) {
      if (norm.numerator === fracAnswer.numerator) {
        return {
          matched: true,
          reasonCategory: 'fraction_denominator_changed',
          diagnosis: '分子は合っているよ！分母は変わらないはずだよ！',
          adviceMessage: `分母は ${fracAnswer.denominator} のままだよ。同分母の計算では、分母は変えないよ！`,
          hintMessage: '分母は「何等分したか」。計算の途中でも変わらないよ！',
          feedbackTitle: 'おしい！もう一歩！',
          highlightDigitIndex: 0,
          userAnswer: fracUserAnswer
        };
      }
      return {
        matched: true,
        reasonCategory: 'fraction_denominator_mismatch',
        diagnosis: '分母がちがっているみたい！',
        adviceMessage: `この問題では、分母は ${fracAnswer.denominator} のままだよ。分母を ${fracAnswer.denominator} にそろえてから、分子を計算してみよう！`,
        hintMessage: '同分母の計算では、分母は変わらないよ。まず分母を確かめよう！',
        feedbackTitle: 'おしい！もう一歩！',
        highlightDigitIndex: 0,
        userAnswer: fracUserAnswer
      };
    }
    if (norm.numerator !== fracAnswer.numerator) {
      return {
        matched: true,
        reasonCategory: 'fraction_numerator_slip',
        diagnosis: '分母は合っているよ！分子の計算を確かめよう！',
        adviceMessage: '分母はそのままで合っているよ。単位分数が何こ分になるか、分子だけを計算し直してみよう！',
        hintMessage: 'ステップガイドで、分子の計算を1つずつ確かめてみよう！',
        feedbackTitle: 'おしい！もう一歩！',
        highlightDigitIndex: 0,
        userAnswer: fracUserAnswer
      };
    }
  }

  // Dynamic Buggy Rules
  if (isDiv) {
    const divisor = problem.operands?.[1] || 1;
    // Remainder scale trap in Stage 4-1 (e.g., 170 / 30 = 5 r 2 instead of 5 r 20)
    if (norm.value === trueVal && trueRem >= 10 && norm.remainder === trueRem / 10) {
      return {
        matched: true,
        reasonCategory: 'remainder_scale',
        diagnosis: '0をかくして計算したあと、あまりの位を戻すのを忘れているよ！',
        adviceMessage: `商の ${trueVal} はバッチリ！0をかくして計算したあとは、あまりにも0を戻して「${trueRem}」にしよう！`,
        hintMessage: `本当のあまりは ${norm.remainder} ではなく「${trueRem}」だよ！`,
        feedbackTitle: 'おしい！あと一歩！',
        highlightDigitIndex: 0,
        userAnswer: { value: norm.value, remainder: norm.remainder }
      };
    }

    // Remainder >= Divisor
    if (norm.remainder >= divisor) {
      return {
        matched: true,
        reasonCategory: 'quotient_too_small',
        diagnosis: `あまりが ${norm.remainder} になったよ。わる数の ${divisor} がまだ入るね！`,
        adviceMessage: `あまりは必ずわる数（${divisor}）より小さくしよう！商をもう1つ増やしてみよう！`,
        hintMessage: `商を1つ大きくしてもう一度計算してみよう！`,
        feedbackTitle: 'ヒントを発見！',
        highlightDigitIndex: 0,
        userAnswer: { value: norm.value, remainder: norm.remainder }
      };
    }

    // Missing 0 in tens of quotient (e.g., 28 instead of 208)
    if (trueVal >= 100 && Math.floor(trueVal / 10) % 10 === 0) {
      const collapsed = Math.floor(trueVal / 100) * 10 + (trueVal % 10);
      if (norm.value === collapsed) {
        return {
          matched: true,
          reasonCategory: 'shift_forgotten',
          diagnosis: '商の十の位にガードマン「0」をたてるのを忘れているかも！',
          adviceMessage: '割れない位があるときは、商に「0」をたてて位を守ろう！',
          hintMessage: '十の位に0を入れると3桁の商になるよ！',
          feedbackTitle: 'おしい！もう一歩！',
          highlightDigitIndex: 1,
          userAnswer: { value: norm.value, remainder: norm.remainder }
        };
      }
    }
  } else {
    // Decimal dynamic rules (World 6): point ignored / point shifted by one place
    if (decScale) {
      const integerValue = Math.round(trueVal * decScale);
      if (Number.isInteger(norm.value) && norm.value === integerValue && integerValue !== Math.round(trueVal)) {
        return {
          matched: true,
          reasonCategory: 'decimal_point_ignored',
          diagnosis: '小数点を無視して整数のように計算しているかも！',
          adviceMessage: '小数点をたてにそろえて位ごとに計算し、答えにも小数点を書いてみよう！',
          hintMessage: '小数点の位置に注目してステップガイドで確かめてみよう！',
          feedbackTitle: 'おしい！もう一歩！',
          highlightDigitIndex: 0,
          userAnswer: { value: norm.value, remainder: norm.remainder }
        };
      }
      if (scaledValueEquals(norm.value, trueVal * 10, decScale) || scaledValueEquals(norm.value, trueVal / 10, decScale)) {
        return {
          matched: true,
          reasonCategory: 'decimal_point_position',
          diagnosis: '小数点の位置が1つずれているかも！',
          adviceMessage: '0.1 が 10 こで 1、0.01 が 10 こで 0.1 だよ。位の大きさを確認してみよう！',
          hintMessage: '一の位・0.1の位・0.01の位を指でたどって確かめてみよう！',
          feedbackTitle: 'おしい！もう一歩！',
          highlightDigitIndex: 0,
          userAnswer: { value: norm.value, remainder: norm.remainder }
        };
      }
    }

    const diff = Math.abs(trueVal - norm.value);
    if (diff === 10 || diff === 100 || diff === 1000) {
      const placeName = diff === 10 ? '十の位' : diff === 100 ? '百の位' : '千の位';
      // BUG-008: the wording must match the actual operation. Multiplication
      // has neither くり上がり in the addition sense nor くり下がり, so a
      // shared "くり上がり・くり下がり" message misleads the learner.
      const op = problem?.operator;
      const byOperator = {
        '+': {
          reasonCategory: 'carry_forgotten',
          diagnosis: `${placeName}へのくり上がりがズレているみたい！`,
          adviceMessage: `${placeName}の計算で、くり上がりの「1」をもう一度チェックしてみよう！`
        },
        '-': {
          reasonCategory: 'borrow_forgotten',
          diagnosis: `${placeName}のくり下がりがズレているみたい！`,
          adviceMessage: `${placeName}の計算で、くり下がりの「1」をもう一度チェックしてみよう！`
        },
        '×': {
          reasonCategory: 'place_value_slip',
          diagnosis: `${placeName}の位の計算がズレているみたい！`,
          adviceMessage: `${placeName}の計算をもう一度チェックしてみよう！かけ算では部分積の位に気をつけよう！`
        }
      };
      const wording = byOperator[op] || {
        reasonCategory: 'place_value_slip',
        diagnosis: `${placeName}の位の計算がズレているみたい！`,
        adviceMessage: `${placeName}の計算をもう一度チェックしてみよう！`
      };
      return {
        matched: true,
        reasonCategory: wording.reasonCategory,
        diagnosis: wording.diagnosis,
        adviceMessage: wording.adviceMessage,
        hintMessage: `${placeName}の数字に注目してステップガイドで確かめてみよう！`,
        feedbackTitle: 'おしい！もう一歩！',
        highlightDigitIndex: findDiffDigitIndex(trueVal, norm.value),
        userAnswer: { value: norm.value, remainder: norm.remainder }
      };
    }
  }

  return {
    matched: false,
    reasonCategory: 'general_recheck',
    diagnosis: 'おしい！もう一歩！ステップガイドで途中の計算を一緒に確認してみよう！',
    adviceMessage: 'ヒントを発見！1ステップずつ順番に穴埋めすると自力で解けるよ！',
    hintMessage: 'ステップガイドを開いて、1つずつ確かめてみよう！',
    feedbackTitle: 'おしい！もう一歩！',
    highlightDigitIndex: findDiffDigitIndex(trueVal, norm.value),
    userAnswer: { value: norm.value, remainder: norm.remainder }
  };
}

/**
 * 誤答診断カテゴリ（reasonCategory）の保護者向け表示名。
 * diagnoseError が返す診断文の用語に合わせている。
 * Issue #21: 保護者ボードの「つまずきパターンの記録」で使用する。
 */
export const REASON_CATEGORY_LABELS = {
  carry_forgotten: 'くり上がり忘れ',
  borrow_forgotten: 'くり下がり忘れ',
  place_value_slip: '位の計算のずれ',
  shift_forgotten: '位のずれ・0の立て忘れ',
  order_mistake: '計算の順序のまちがい',
  quotient_too_small: '商が小さすぎる',
  quotient_too_big: '商が大きすぎる',
  trial_quotient_too_small: '仮の商が小さすぎる',
  trial_quotient_too_big: '仮の商が大きすぎる',
  remainder_scale: 'あまりの位の戻し忘れ',
  trap_detected: 'ひっかけパターン',
  calculation_slip: '計算ミス',
  general_recheck: '見直しが必要な計算'
};

/**
 * reasonCategory の表示名を返す。未知のカテゴリは汎用名にフォールバックする。
 * @param {string} category
 * @returns {string}
 */
export function getReasonCategoryLabel(category) {
  return REASON_CATEGORY_LABELS[category] || 'その他のつまずき';
}

const DIAGNOSIS_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 未知の reasonCategory を集計時に合算するバケットのキー。
 * 未知カテゴリが複数あっても「その他のつまずき」行が重複表示されないよう、
 * 表示名を持つ既知カテゴリ以外はすべてこの1バケットにまとめる。
 */
export const UNKNOWN_CATEGORY_BUCKET = 'unknown';

/**
 * 診断ログ（progress.diagnosisLog）を保護者ボード表示用に集計する純粋関数。
 * ログ項目の形式: { category, worldId, stageId, at (ISO文字列) }
 * @param {Array} log 診断ログ（不正な項目は無視される）
 * @param {Date|number|string} [nowInput=new Date()] 集計基準時刻
 * @returns {{
 *   totalEntries: number,
 *   byCategory: Array<{category: string, label: string, total: number, recent30: number, recent14: number}>,
 *   focusPatterns: Array<{category: string, label: string, total: number, recent30: number}>,
 *   resolvedPatterns: Array<{category: string, label: string, total: number}>
 * }} focusPatterns は直近30日で多い順に最大2件、
 *    resolvedPatterns は累計3回以上かつ直近30日0回のカテゴリ。
 *    focus と resolved は直近30日の有無で排他的に決まるため、
 *    同じカテゴリが両方に現れることはない。
 *    未来のタイムスタンプ（時計のずれ等）は経過時間が負になるが、
 *    窓の外ではなく「直近」として扱う（解消済みへの誤分類を防ぐ）。
 *    未知のカテゴリは UNKNOWN_CATEGORY_BUCKET に合算される。
 */
export function summarizeDiagnosisLog(log, nowInput = new Date()) {
  const nowMs = nowInput instanceof Date
    ? nowInput.getTime()
    : typeof nowInput === 'number'
      ? nowInput
      : Date.parse(nowInput);
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();

  const stats = new Map();
  let totalEntries = 0;

  if (Array.isArray(log)) {
    for (const entry of log) {
      if (!entry || typeof entry.category !== 'string' || entry.category === '') continue;
      const atMs = Date.parse(entry.at);
      if (!Number.isFinite(atMs)) continue;
      totalEntries++;
      const bucketKey = Object.hasOwn(REASON_CATEGORY_LABELS, entry.category)
        ? entry.category
        : UNKNOWN_CATEGORY_BUCKET;
      let s = stats.get(bucketKey);
      if (!s) {
        s = { category: bucketKey, total: 0, recent30: 0, recent14: 0 };
        stats.set(bucketKey, s);
      }
      s.total++;
      const ageMs = safeNow - atMs;
      // Negative age (future timestamp) counts as inside the window.
      if (ageMs <= 30 * DIAGNOSIS_DAY_MS) s.recent30++;
      if (ageMs <= 14 * DIAGNOSIS_DAY_MS) s.recent14++;
    }
  }

  const byCategory = [...stats.values()]
    .map((s) => ({ ...s, label: getReasonCategoryLabel(s.category) }))
    .sort((a, b) =>
      (b.total - a.total) ||
      (b.recent30 - a.recent30) ||
      a.category.localeCompare(b.category)
    );

  const focusPatterns = byCategory
    .filter((s) => s.recent30 > 0)
    .sort((a, b) =>
      (b.recent30 - a.recent30) ||
      (b.total - a.total) ||
      a.category.localeCompare(b.category)
    )
    .slice(0, 2)
    .map(({ category, label, total, recent30 }) => ({ category, label, total, recent30 }));

  const resolvedPatterns = byCategory
    .filter((s) => s.total >= 3 && s.recent30 === 0)
    .map(({ category, label, total }) => ({ category, label, total }));

  return { totalEntries, byCategory, focusPatterns, resolvedPatterns };
}

/**
 * 正解と誤答で最初に異なる桁インデックス（一の位=0, 十の位=1, ...）を返す
 * @param {number} expected
 * @param {number} actual
 * @returns {number|null}
 */
function findDiffDigitIndex(expected, actual) {
  if (!Number.isFinite(expected) || !Number.isFinite(actual)) return null;
  let e = Math.abs(Math.trunc(expected));
  let a = Math.abs(Math.trunc(actual));
  for (let i = 0; i < 6; i++) {
    if (e % 10 !== a % 10) return i;
    e = Math.floor(e / 10);
    a = Math.floor(a / 10);
    if (e === 0 && a === 0) break;
  }
  return 0;
}

/**
 * ユーザーの解答を判定する（バツを出さないポジティブ・ラボフィードバック付き）
 * @param {object} problem
 * @param {number|string|object} userAnswer
 */
export function evaluateAnswer(problem, userAnswer) {
  // 分数問題 (World 7) は { numerator, denominator } の整数ペアで厳密に判定する
  const fracAnswer = getFractionAnswer(problem);
  if (fracAnswer) {
    const normF = normalizeUserAnswer(userAnswer);
    const isCorrect =
      normF.numerator === fracAnswer.numerator &&
      normF.denominator === fracAnswer.denominator;

    if (isCorrect) {
      return {
        isCorrect: true,
        isQuotientCorrect: true,
        isRemainderCorrect: true,
        normalizedAnswer: {
          value: normF.value,
          remainder: 0,
          numerator: normF.numerator,
          denominator: normF.denominator
        },
        feedbackTone: 'exploratory',
        feedbackTitle: '大正解！ラボデータ解明！',
        feedbackMessage: 'バッチリ正解！見事な計算力だね！',
        diagnosis: null
      };
    }

    const diagnosis = diagnoseError(problem, userAnswer);
    return {
      isCorrect: false,
      isQuotientCorrect: false,
      isRemainderCorrect: true,
      normalizedAnswer: {
        value: normF.value,
        remainder: normF.remainder ?? 0,
        numerator: normF.numerator,
        denominator: normF.denominator
      },
      feedbackTone: 'exploratory',
      feedbackTitle: diagnosis.feedbackTitle || 'おしい！もう一歩！',
      feedbackMessage: diagnosis.adviceMessage,
      diagnosis
    };
  }

  const norm = normalizeUserAnswer(userAnswer);
  const trueVal = problem?.correctAnswer?.value ?? problem?.answer ?? 0;
  const trueRem = problem?.correctAnswer?.remainder ?? problem?.remainder ?? 0;
  const isDiv = problem?.operator === '÷';

  // 小数問題はスケールで丸めて比較し、浮動小数点誤差で不正解にしない
  const decScale = getDecimalScale(problem);
  const isQuotientCorrect = decScale
    ? scaledValueEquals(norm.value, trueVal, decScale)
    : norm.value === trueVal;
  const isRemainderCorrect = isDiv ? norm.remainder === trueRem : true;
  const isCorrect = isQuotientCorrect && isRemainderCorrect;

  if (isCorrect) {
    return {
      isCorrect: true,
      isQuotientCorrect: true,
      isRemainderCorrect: true,
      normalizedAnswer: { value: norm.value, remainder: norm.remainder },
      feedbackTone: 'exploratory',
      feedbackTitle: '大正解！ラボデータ解明！',
      feedbackMessage: 'バッチリ正解！見事な計算力だね！',
      diagnosis: null
    };
  }

  const diagnosis = diagnoseError(problem, userAnswer);
  return {
    isCorrect: false,
    isQuotientCorrect,
    isRemainderCorrect,
    normalizedAnswer: { value: norm.value, remainder: norm.remainder },
    feedbackTone: 'exploratory',
    feedbackTitle: diagnosis.feedbackTitle || 'おしい！もう一歩！',
    feedbackMessage: diagnosis.adviceMessage,
    diagnosis
  };
}

/**
 * Single problem generation alias for testing compatibility
 */
export function generateSingleProblem(worldId, stageId, questionIndex = 1, level = 2) {
  return generateProblem(worldId, stageId, { questionIndex, level });
}

export const CurriculumEngine = {
  WORLDS_METADATA,
  TRAINING_CATEGORY_LABELS,
  getTrainingCategoryLabel,
  EXTRA_SESSION_QUESTION_COUNT,
  getWorldsMetadata,
  getWorldIdByGlobalStage,
  getStageMetadata,
  normalizeWorldAndStage,
  generateProblem,
  generateSingleProblem,
  generateStageProblems,
  selectNextProblem,
  determineAdaptiveDifficulty,
  evaluateStageAdaptation,
  generateChallengeProblems,
  selectTrainingProblems,
  generateVariationProblem,
  evaluateAnswer,
  diagnoseError,
  REASON_CATEGORY_LABELS,
  getReasonCategoryLabel,
  summarizeDiagnosisLog,
  normalizeUserAnswer
};

export default CurriculumEngine;
