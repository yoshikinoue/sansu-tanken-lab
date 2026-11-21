/**
 * @file curriculum-engine.js
 * @description 小学4年生向け 四則演算ステップアップ学習Webアプリ (算数探検ラボ)
 * 全5ワールド・15ステージ カリキュラム問題生成・アダプティブ出題・ステップガイド・誤答診断・類題生成エンジン
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
 * 全5ワールド・15ステージのメタデータ（ミニ授業3ステップ＋2択クイズ定義含む）
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
  }
];

/**
 * ワールド・ステージIDを正規化する（範囲外は World 1, Stage 1 にフォールバック）
 * @param {number|string} worldIdInput
 * @param {number|string} [stageIdInput]
 * @returns {{ worldId: number, stageId: number, globalStageNumber: number }}
 */
export function normalizeWorldAndStage(worldIdInput, stageIdInput) {
  let w = Number(worldIdInput);
  let s = Number(stageIdInput);

  if (typeof worldIdInput === 'string') {
    const stageMatch = worldIdInput.match(/^stage-(\d+)$/i);
    const wsMatch = worldIdInput.match(/^w(\d+)[_-]s(\d+)$/i);
    if (stageMatch) {
      const globalNum = parseInt(stageMatch[1], 10);
      if (globalNum >= 1 && globalNum <= 15) {
        w = Math.ceil(globalNum / 3);
        s = ((globalNum - 1) % 3) + 1;
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
      if (globalNum >= 1 && globalNum <= 15) {
        w = Math.ceil(globalNum / 3);
        s = ((globalNum - 1) % 3) + 1;
      }
    }
  }

  // If worldId was 1..5 and stageId was given as global 1..15 (e.g., (2, 5))
  if (Number.isInteger(w) && w >= 1 && w <= 5 && Number.isInteger(s) && s >= 4 && s <= 15) {
    const expectedWorld = Math.ceil(s / 3);
    if (expectedWorld === w) {
      s = ((s - 1) % 3) + 1;
    }
  }

  if (!Number.isInteger(w) || w < 1 || w > 5 || !Number.isInteger(s) || s < 1 || s > 3) {
    w = 1;
    s = 1;
  }

  return {
    worldId: w,
    stageId: s,
    globalStageNumber: (w - 1) * 3 + s
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
// Stage Generators (15 Stages)
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
  '5-3': generateStage5_3
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
  general_recheck: '計算ミス'
};

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
 * - にがて特訓: 同じ診断カテゴリの誤答が2回以上あったとき、そのカテゴリを対象にする。
 *   対象が複数ある場合は「具体的なカテゴリ（general_recheck 以外）を優先 →
 *   誤答回数が多い方 → 最初に現れた方」の順で1つに決める
 *
 * @param {{ firstTryCount?: number, totalQuestions?: number,
 *           errorRecords?: Array<{ reasonCategory?: string }> }} [input]
 * @returns {{ showChallenge: boolean, trainingCategory: string|null, trainingErrorCount: number }}
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
      stats.set(category, { category, count: 0, firstIndex: idx });
    }
    stats.get(category).count += 1;
  });

  let training = null;
  for (const entry of stats.values()) {
    if (entry.count < 2) continue;
    if (!training) {
      training = entry;
      continue;
    }
    const entryIsGeneral = entry.category === 'general_recheck';
    const bestIsGeneral = training.category === 'general_recheck';
    if (entryIsGeneral !== bestIsGeneral) {
      if (!entryIsGeneral) training = entry;
    } else if (entry.count > training.count) {
      training = entry;
    }
    // Same generality and same count: Map iterates in first-occurrence
    // order, so the earlier category is kept.
  }

  return {
    showChallenge,
    trainingCategory: training ? training.category : null,
    trainingErrorCount: training ? training.count : 0
  };
}

/**
 * 発展問題（チャレンジ）用に、ステージの生成器から challenge 難易度の問題を
 * 指定問数だけ生成する（Issue #23）。式が重複しないよう再試行する。
 * @param {number|string} worldId
 * @param {number|string} stageId
 * @param {number} [count=3]
 * @param {object} [options={}]
 * @returns {Array<object>} MathProblem 配列
 */
export function generateChallengeProblems(worldId, stageId, count = 3, options = {}) {
  const norm = normalizeWorldAndStage(worldId, stageId);
  const total = Math.max(1, Math.min(5, Number(count) || 3));
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
 * @param {number} [count=3]
 * @param {object} [options={}]
 * @returns {Array<object>} MathProblem 配列（元問題が無ければ空配列）
 */
export function selectTrainingProblems(errorRecords = [], category = null, count = 3, options = {}) {
  const total = Math.max(1, Number(count) || 3);
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

  // First check exact match in problem.errorDiagnostics
  if (Array.isArray(problem?.errorDiagnostics)) {
    for (const diag of problem.errorDiagnostics) {
      const valMatch = norm.value === diag.predictedErrorValue;
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
  if (problem?.commonTrap && norm.value === problem.commonTrap.mistakeValue) {
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
  const norm = normalizeUserAnswer(userAnswer);
  const trueVal = problem?.correctAnswer?.value ?? problem?.answer ?? 0;
  const trueRem = problem?.correctAnswer?.remainder ?? problem?.remainder ?? 0;
  const isDiv = problem?.operator === '÷';

  const isQuotientCorrect = norm.value === trueVal;
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
  getWorldsMetadata,
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
