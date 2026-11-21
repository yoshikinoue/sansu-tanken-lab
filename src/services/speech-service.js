/**
 * Web Speech API TTS Manager & 1-Minute Mini-Lesson Content Scripts
 * 算数探検ラボ (Smart Math Discovery Lab)
 */

import { WORLDS_METADATA } from './curriculum-engine.js';

export const MINI_LESSON_SCRIPTS = {
  'stage-1': {
    stageId: 'stage-1',
    worldId: 1,
    stageNumber: 1,
    title: 'くり上がりのある3桁筆算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '一の位が10を超えたら十の位へ「1」をお引っ越し！位をそろえて書こう。',
      ttsText: '一の位が十を超えたら、次の位へ小さく一をメモしよう！位をそろえて書くのがポイントだよ。'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '一の位の計算が 7 + 8 = 15 になったよ。十の位にメモする数は？',
      options: [
        { id: 'A', label: '1' },
        { id: 'B', label: '5' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！その調子！十の位にはくり上がった「1」を小さくメモしよう！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！15のうち、十のまとまりはどっちかな？',
      ttsText: 'クイズだよ！一の位の計算が、七たす八は十五になったよ。十の位にメモする数はどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【十の位へ小さく「1」を書く！】くり上がりメモを忘れなければ百発百中！',
      ttsText: '今日のラボ必殺技！一の位が十を超えたら、次の位へ小さく一をメモしよう！'
    }
  },
  'stage-2': {
    stageId: 'stage-2',
    worldId: 1,
    stageNumber: 2,
    title: 'くり下がりのある3桁筆算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '引けない時はとなりの位から「10」を借りてくる！十の位が0の時は百の位から！',
      ttsText: '引けない時はとなりの位から十をもらおう。十の位がゼロの時は百の位からリレーで借りてくるよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '一の位で引けない時、十の位からいくつ借りてくる？',
      options: [
        { id: 'A', label: '1' },
        { id: 'B', label: '10' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！となりの位から「10」のまとまりを借りてくるんだね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！十の位の1は、一の位に行くと何個分になるかな？',
      ttsText: '一の位で引けない時、十の位からいくつ借りてくるかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【となりから「10」を借りる！】斜線で消して数字を書き直すのがプロの技！',
      ttsText: '引けない時はとなりの位から十をもらおう。消して書き直すのがコツだよ。'
    }
  },
  'stage-3': {
    stageId: 'stage-3',
    worldId: 1,
    stageNumber: 3,
    title: 'たし算・ひき算の虫食い算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '□に入る数を探すには「逆の計算」を使おう！たし算の逆はひき算！',
      ttsText: 'わからない四角に入る数を探すには、逆の計算を使おう！たし算の逆はひき算だよ。'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '□ + 35 = 80 のとき、□を求める式はどっち？',
      options: [
        { id: 'A', label: '80 - 35' },
        { id: 'B', label: '80 + 35' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！合計の80から35を引けば□が見つかるね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！たし算の逆はひき算だよ！',
      ttsText: '四角たす三十五は八十のとき、四角を求める式はどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【□の計算は逆算を使う！】たし算はひき算に、ひき算はたし算に変身！',
      ttsText: 'わからない四角がある時は、逆の計算をすると正解が見えてくるよ！'
    }
  },
  'stage-4': {
    stageId: 'stage-4',
    worldId: 2,
    stageNumber: 1,
    title: '九九の発展と0のかけ算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '0に何をかけても0！そして「×10」は右に0を1個つけるだけ！',
      ttsText: 'ゼロに何をかけても答えはゼロ！そして十倍する時は、右にゼロを一個つけるだけだよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '40 × 6 の答えはどうやって考える？',
      options: [
        { id: 'A', label: '4×6の答えに0をつける' },
        { id: 'B', label: '4×6に0をたす' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！4×6=24 のうしろに 0 を1個つけて 240 だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！10のまとまりが 4×6=24 個あるから、うしろに何をつけるかな？',
      ttsText: '四十かける六の答えは、どうやって考えるとカンタンかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【0を隠して計算、最後に0をつける！】40×6なら4×6=24に0をつけて240！',
      ttsText: 'ゼロはいったん隠して九九を計算。最後にゼロをつければ簡単だよ！'
    }
  },
  'stage-5': {
    stageId: 'stage-5',
    worldId: 2,
    stageNumber: 2,
    title: '2〜3桁×1桁の筆算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '一の位から順番にかけていくよ。くり上がりの足し算を忘れないように！',
      ttsText: '一の位から順番にかけていくよ。くり上がりの数を、あとから足すのを忘れないようにしよう！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '38 × 4 で、一の位は 8×4=32。十の位にメモするくり上がりは？',
      options: [
        { id: 'A', label: '3' },
        { id: 'B', label: '2' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！32の十の位「3」を小さくメモして、3×4=12に足すんだね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！32のうち、一の位に書くのが2、くり上がるのはどっちかな？',
      ttsText: '三十八かける四で、一の位は八かける四で三十二。十の位にメモするくり上がりはどっち？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【かける・くり上がる・たす！】九九を計算したあとに、くり上がりを足そう！',
      ttsText: 'かける、くり上がる、足す！この順番を守ればどんな大きな数も大丈夫。'
    }
  },
  'stage-6': {
    stageId: 'stage-6',
    worldId: 2,
    stageNumber: 3,
    title: '2桁×2桁の筆算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: 'かける数の「一の位」をかけた段と「十の位」をかけた段を書いて足す！',
      ttsText: 'かける数の一の位をかけた段と、十の位をかけた段の二段を書いて、最後に足し算するよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '23 × 14 の計算で、十の位の1をかけた答えはどこから書き始める？',
      options: [
        { id: 'A', label: '一の位の下' },
        { id: 'B', label: '十の位の下' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！十の位の計算だから、左に1つズラして十の位の下から書くよ！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！十の位の数をかけているから、書き始める場所も十の位の下だよ！',
      ttsText: '二十三かける十四の計算で、十の位の一をかけた答えはどこから書き始める？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【十の位をかけたら十の位の下から書く！】段のズレが筆算成功の最大のカギ！',
      ttsText: '十の位をかけた答えは、十の位の下から書くんだ。位のズレに注目しよう！'
    }
  },
  'stage-7': {
    stageId: 'stage-7',
    worldId: 3,
    stageNumber: 1,
    title: 'あまりのあるわり算の基本',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '「あまり」は絶対に「わる数」より小さくなる！検算の合言葉も覚えよう。',
      ttsText: 'わり算のあまりは、絶対にわる数より小さくなるよ！確かめ算の合言葉もマスターしよう。'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '7でわった計算。あまりとして正しいのはどっち？',
      options: [
        { id: 'A', label: '5' },
        { id: 'B', label: '8' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！5は7より小さいからバッチリ！8だとまだ7が1回引けちゃうね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！あまりは「わる数（7）」より小さい数になるよ！',
      ttsText: '七でわった計算のとき、あまりとして正しいのは五と八のどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【あまりはわる数より小さい！】検算：商×わる数＋あまり＝わられる数！',
      ttsText: 'あまりは割る数より必ず小さくなるよ。検算の式で確かめよう！'
    }
  },
  'stage-8': {
    stageId: 'stage-8',
    worldId: 3,
    stageNumber: 2,
    title: '2桁÷1桁の筆算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '筆算の4ステップ！「①たてる → ②かける → ③ひく → ④おろす」の呪文！',
      ttsText: 'わり算の筆算は四つのステップ！たてる、かける、ひく、おろすの順番で進むよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '商をたてたあと、次にするステップはどっち？',
      options: [
        { id: 'A', label: 'ひく' },
        { id: 'B', label: 'かける' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！商をたてたら、わる数と「かける」が2番目のステップだね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！「たてる・かける・ひく・おろす」のリズムだよ！',
      ttsText: '上に商をたてたあと、次にするステップは、ひくと、かけるのどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【たてる・かける・ひく・おろす！】この4拍子のリズムで解き進めよう！',
      ttsText: 'たてる、かける、ひく、おろす！この四拍子のリズムを唱えながら解こう！'
    }
  },
  'stage-9': {
    stageId: 'stage-9',
    worldId: 3,
    stageNumber: 3,
    title: '3桁÷1桁の筆算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '割れない時は商に「0」をたてる！0を抜かすと桁がズレちゃうぞ！',
      ttsText: '途中で割れない位が出てきた時は、商にゼロをたてよう！ゼロを抜かすと桁がズレちゃうよ。'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '百の位から順に計算して、割れない位があったらどうする？',
      options: [
        { id: 'A', label: '商に0をたてる' },
        { id: 'B', label: 'とばして次の位へ行く' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！商に「0」をたてて位を守ってから、次の位の数字をおろそう！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！そのままとばすと百の位が十の位にズレちゃうよ！',
      ttsText: '百の位から順に計算して、途中で割れない位があったらどうする？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【割れない時は商に0をたてて次をおろす！】位のガードマン「0」を忘れずに！',
      ttsText: '割れない位にはゼロを立てる！ゼロは位を守る大切なガードマンだよ。'
    }
  },
  'stage-10': {
    stageId: 'stage-10',
    worldId: 4,
    stageNumber: 1,
    title: '何十でわる計算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: 'わられる数とわる数の両方から「0」を同じ数だけ消して考えよう！',
      ttsText: 'わられる数とわる数の両方から、ゼロを同じ数だけ隠して、10のまとまりで考えよう！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '80 ÷ 20 の答えは、どっちの計算と同じ？',
      options: [
        { id: 'A', label: '8 ÷ 2' },
        { id: 'B', label: '80 ÷ 2' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！10のまとまりで考えると、8 ÷ 2 = 4 と同じ答えになるよ！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！両方から「0」を1個ずつ消すとどの式になるかな？',
      ttsText: '八十わる二十の答えは、どっちの計算と同じになるかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【10のまとまりで簡単化！】両方から0を1個ずつ取れば九九の世界に変身！',
      ttsText: '両方の数からゼロを一個ずつ取ると、いつもの九九で解けちゃうよ！'
    }
  },
  'stage-11': {
    stageId: 'stage-11',
    worldId: 4,
    stageNumber: 2,
    title: '2桁÷2桁の筆算（商の見当）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: 'わる数を「およそ何十」と丸めて、最初の商の見当（予想）をつけよう！',
      ttsText: '二桁でわる筆算では、わる数を「およそ何十」と丸めて、最初の商の見当をつけよう！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '73 ÷ 21 の商の見当をつける時、21をおよそいくつと考える？',
      options: [
        { id: 'A', label: '20' },
        { id: 'B', label: '30' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！21を「およそ20」と考えて 70÷20 で商「3」の見当がつくね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！21は20と30のどっちに近いかな？',
      ttsText: '七十三わる二十一の商の見当をつける時、二十一をおよそいくつと考えるかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【四捨五入でおよその数にして見当づけ！】70÷20で見当をつけると商は3！',
      ttsText: '割る数を約何十と考えて、商の見当をつけよう。七十割る二十なら約三だね！'
    }
  },
  'stage-12': {
    stageId: 'stage-12',
    worldId: 4,
    stageNumber: 3,
    title: '仮の商の修正',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: 'かけて引けない時は商が「大きすぎ」！1へらしてもう一度チャレンジ！',
      ttsText: '仮の商をたてて掛け算した時、引けない時は商が大きすぎた合図！一減らして直そう！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: 'たてた商をかけたら、わられる数より大きくなっちゃった！どうする？',
      options: [
        { id: 'A', label: '商を1小さくする' },
        { id: 'B', label: '商を1大きくする' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！大きすぎて引けない時は、商を「1」小さく直せばバッチリ解けるよ！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！かける数が大きすぎた時は、商を増やす？それとも減らす？',
      ttsText: 'たてた商をかけたら、わられる数より大きくなっちゃった！どうすればいいかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【引き算できなかったら商を1小さく修正！】自分で気づいて直せたら天才！',
      ttsText: '掛け算して引けなかったら商が大きすぎた証拠。一小さくしてリトライ！'
    }
  },
  'stage-13': {
    stageId: 'stage-13',
    worldId: 5,
    stageNumber: 1,
    title: '（かっこ）のある計算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '計算の順番ナンバーワンは（かっこ）の中！かっこを見つけたら最優先！',
      ttsText: '計算のきまりナンバーワン！かっこがある式では、かっこの中を一番最初に計算しよう！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '50 - (10 + 20) は、どこから先に計算する？',
      options: [
        { id: 'A', label: '50 - 10' },
        { id: 'B', label: '10 + 20' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！かっこの中の 10 + 20 = 30 を先に計算して、50 - 30 = 20 になるね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！（かっこ）の中がいつでも最優先だよ！',
      ttsText: '五十ひく、かっこ十たす二十は、どこから先に計算するかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【かっこは最優先ガード！】どんな計算があっても（かっこ）の中が1番最初！',
      ttsText: 'カッコがある計算は、カッコの中が絶対最優先！真っ先に計算しよう。'
    }
  },
  'stage-14': {
    stageId: 'stage-14',
    worldId: 5,
    stageNumber: 2,
    title: '＋－×÷のまざった計算',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: 'かっこの次は「かけ算・わり算」が先！「たし算・ひき算」はその後！',
      ttsText: 'たし算、ひき算、かけ算、わり算がまざった式では、かけ算とわり算を先に計算するよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '12 + 4 × 3 の計算、先に計算するのはどっち？',
      options: [
        { id: 'A', label: '12 + 4' },
        { id: 'B', label: '4 × 3' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！かけ算の 4 × 3 = 12 を先に計算して、12 + 12 = 24 だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！たし算よりも「かけ算」のほうが優先順位が高いよ！',
      ttsText: '十二たす四かける三の計算、先に計算するのはどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【かけ算・わり算が優先、たし算・ひき算はあと！】左から順番とは限らない！',
      ttsText: '掛け算と割り算は、足し算や引き算より強い！先に計算してしまおう。'
    }
  },
  'stage-15': {
    stageId: 'stage-15',
    worldId: 5,
    stageNumber: 3,
    title: '計算の工夫（まとめ）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '25×4=100 や かっこの入れかえ (a+b)+c を使って、キリのいい数を作ろう！',
      ttsText: '二十五かける四は百！キリのいい百や千のまとまりを見つけると、あっという間に計算できるよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '25 × 17 × 4 をカンタンに計算する工夫はどっち？',
      options: [
        { id: 'A', label: '25 × 4 を先に計算する' },
        { id: 'B', label: '17 × 4 を先に計算する' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！25 × 4 = 100 を先に作れば、100 × 17 = 1700 と暗算でできちゃうね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！かける順番を変えて「100」が作れるペアはどっちかな？',
      ttsText: '二十五かける十七かける四を、カンタンに計算する工夫はどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【25×4=100を見つけたら勝ち！】工夫して100や1000のまとまりを作ろう！',
      ttsText: '二十五掛ける四は百！キリのいい数を作ると、暗算で解けちゃうよ！'
    }
  },
  'stage-16': {
    stageId: 'stage-16',
    worldId: 6,
    stageNumber: 1,
    title: '小数の仕組み（0.1と0.01）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '1を10等分した1つ分が「0.1」。0.1が10こ集まると1！0.1を10等分すると「0.01」だよ。',
      ttsText: '0.1が10こ集まると1になるよ。0.1を10等分すると0.01。小数は位に分けると正体がわかるよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '0.1 が 23 こ集まった数はいくつ？',
      options: [
        { id: 'A', label: '23' },
        { id: 'B', label: '2.3' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！0.1が20こで2、0.1が3こで0.3。合わせて2.3だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！0.1が10こ集まると1になるんだったね。',
      ttsText: '0.1が23こ集まった数はいくつかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【0.1が10こで1、0.01が10こで0.1！】位に分けると小数の大きさが見えてくる！',
      ttsText: '今日の必殺技！0.1が10こで1！位に分けて考えると小数はこわくないよ！'
    }
  },
  'stage-17': {
    stageId: 'stage-17',
    worldId: 6,
    stageNumber: 2,
    title: '小数のたし算（小数点をそろえる）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '小数のたし算は小数点の位置をそろえて、位ごとに計算！答えにも小数点を書こう。',
      ttsText: '小数のたし算は小数点をそろえるのが鉄則！位ごとに計算して、答えにも小数点を書こう！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '0.7 + 0.5 の 0.1の位は 7 + 5 = 12。答えの 0.1の位に書く数字はどっち？',
      options: [
        { id: 'A', label: '2' },
        { id: 'B', label: '12' }
      ],
      correctOption: 'A',
      correctFeedback: 'ピンポン！大正解！12の「2」を書いて、1は一の位へくり上がり。答えは1.2だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！1つの位に書ける数字は1つだけだよ。',
      ttsText: '0.7たす0.5の計算、0.1の位に書く数字はどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【小数点をそろえて位ごとに計算、答えにも小数点！】小数点を無視して整数みたいにしない！',
      ttsText: '今日の必殺技！小数点をそろえて計算、答えにも小数点を忘れずに！'
    }
  },
  'stage-18': {
    stageId: 'stage-18',
    worldId: 6,
    stageNumber: 3,
    title: '小数のひき算（くり下がり）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '引けない時は上の位から「10」を借りる！小数でも整数と同じルールだよ。',
      ttsText: '小数のひき算も、引けない時は上の位から十を借りてくるよ。整数から引く時は位に分けて考えよう！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '0.5 - 0.27 で、0.1の位の5から10を借りたよ。0.1の位の計算はどっち？',
      options: [
        { id: 'A', label: '5 - 2' },
        { id: 'B', label: '4 - 2' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！貸した分を引いて4 - 2 = 2。答えは0.23だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！となりに貸したら、自分の位は1減るんだったね。',
      ttsText: '0.5ひく0.27の計算、借りたあとの0.1の位はどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【引けない時は10を借りる、貸した位は1減らす！】小数点をそろえるのも忘れずに！',
      ttsText: '今日の必殺技！引けない時は十を借りる！貸した位が1減るのを忘れないでね！'
    }
  },
  'stage-19': {
    stageId: 'stage-19',
    worldId: 7,
    stageNumber: 1,
    title: '分数の仕組み（分母と分子）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '1を7等分した1つ分が「1/7」。分母は1を何等分したか、分子はその何こ分か表すよ。',
      ttsText: '分母は1を何等分したか、分子はその何こ分か表すよ。3/7は1/7が3こ分だね！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '5/9 は 1/9 が何こ分？',
      options: [
        { id: 'A', label: '9' },
        { id: 'B', label: '5' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！分子の5が、1/9 が5こ分という意味だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！9は分母で「9等分した」という意味だったね。',
      ttsText: '5/9は1/9が何こ分かな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【分母＝等分した数、分子＝何こ分！】単位分数が何こ分かで分数を読む！',
      ttsText: '今日の必殺技！分母は等分した数、分子は何こ分！単位分数で分数を読もう！'
    }
  },
  'stage-20': {
    stageId: 'stage-20',
    worldId: 7,
    stageNumber: 2,
    title: '同分母のたし算（分母はそのまま）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '2/7 + 3/7 は、1/7 が2こと3こで合わせて5こ分。分母は変わらないよ。',
      ttsText: '同分母のたし算は、分母はそのままで分子だけを足すよ。分母同士は足さないでね！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '3/8 + 2/8 の答えの分母はどっち？',
      options: [
        { id: 'A', label: '16' },
        { id: 'B', label: '8' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！分母は8のまま、分子は 3 + 2 = 5。答えは5/8だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！分母同士を足してしまっているよ。',
      ttsText: '3/8たす2/8の答えの分母はどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【分母はそのまま、分子だけ足す！】分母同士は絶対に足さない！',
      ttsText: '今日の必殺技！分母はそのまま、分子だけ足す！ミッションスタート！'
    }
  },
  'stage-21': {
    stageId: 'stage-21',
    worldId: 7,
    stageNumber: 3,
    title: '同分母のひき算（仮分数に直す）',
    card1: {
      title: '【着眼点・ひらめきカード】',
      text: '引けない時は帯分数を仮分数に直す！1と2/7 は 9/7 に変身できるよ。',
      ttsText: '引けない時は帯分数を仮分数に直してから引くよ。整数の1は分母の数こ分に変身できるよ！'
    },
    card2: {
      title: '【参加型 2択クイズカード】',
      question: '1と1/5 を仮分数に直すと、分子はどっち？',
      options: [
        { id: 'A', label: '5' },
        { id: 'B', label: '6' }
      ],
      correctOption: 'B',
      correctFeedback: 'ピンポン！大正解！1は1/5が5こ分、それに1こ分を足して6。答えは6/5だね！',
      incorrectFeedback: 'おしい！もう一度考えてみよう！もとの分子の1を足し忘れているよ。',
      ttsText: '1と1/5を仮分数に直すと、分子はどっちかな？'
    },
    card3: {
      title: '【攻略・解法まとめカード】',
      rule: '【引けない時は仮分数に直して、分子だけ引く！】分母はひき算でもそのまま！',
      ttsText: '今日の必殺技！引けない時は仮分数に直す！分母はそのままで分子だけ引こう！'
    }
  }
};

// Default Grade 4 friendly speech settings
const DEFAULT_RATE = 0.95;
const DEFAULT_PITCH = 1.05;
const PREFERRED_VOICE_KEYWORDS = ['Google 日本語', 'Kyoko', 'Otoya', 'Sayaka', 'O-Ren', 'Haruka', 'Ichiro'];

let speechEnabled = true;
let speechRate = DEFAULT_RATE;
let speechPitch = DEFAULT_PITCH;
let customSpeechProvider = null;
let pendingResolve = null;

/**
 * Clamp a numeric parameter within [min, max].
 */
function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Resolve the active speechSynthesis and SpeechSynthesisUtterance objects.
 */
function getSpeechEnvironment() {
  if (customSpeechProvider) {
    return {
      synth: customSpeechProvider.speechSynthesis || null,
      UtteranceClass: customSpeechProvider.SpeechSynthesisUtterance || null
    };
  }

  const g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
  return {
    synth: g.speechSynthesis || null,
    UtteranceClass: g.SpeechSynthesisUtterance || null
  };
}

/**
 * Retrieve available Japanese voices, prioritized by naturalness for Grade 4 learners.
 * @returns {Array<SpeechSynthesisVoice>}
 */
export function getJapaneseVoices() {
  const { synth } = getSpeechEnvironment();
  if (!synth || typeof synth.getVoices !== 'function') {
    return [];
  }

  let voices = [];
  try {
    voices = synth.getVoices() || [];
  } catch {
    return [];
  }

  const jaVoices = voices.filter((v) => {
    const lang = String(v?.lang || '').toLowerCase();
    return lang === 'ja-jp' || lang.startsWith('ja');
  });

  jaVoices.sort((a, b) => {
    const nameA = String(a?.name || '');
    const nameB = String(b?.name || '');
    const idxA = PREFERRED_VOICE_KEYWORDS.findIndex((kw) => nameA.includes(kw));
    const idxB = PREFERRED_VOICE_KEYWORDS.findIndex((kw) => nameB.includes(kw));
    const rankA = idxA === -1 ? 999 : idxA;
    const rankB = idxB === -1 ? 999 : idxB;
    return rankA - rankB;
  });

  return jaVoices;
}

/**
 * Select the best available Japanese voice.
 * @param {string} [preferredVoiceName]
 * @returns {SpeechSynthesisVoice|null}
 */
export function selectBestJapaneseVoice(preferredVoiceName) {
  const jaVoices = getJapaneseVoices();
  if (jaVoices.length === 0) return null;
  if (preferredVoiceName) {
    const exact = jaVoices.find((v) => v.name === preferredVoiceName);
    if (exact) return exact;
  }
  return jaVoices[0];
}

/**
 * Enable or disable TTS speech output.
 * @param {boolean} enabled
 * @returns {boolean}
 */
export function setSpeechEnabled(enabled) {
  speechEnabled = Boolean(enabled);
  if (!speechEnabled) {
    stopSpeech();
  }
  return speechEnabled;
}

/**
 * Check whether TTS speech is currently enabled.
 * @returns {boolean}
 */
export function isSpeechEnabled() {
  return speechEnabled;
}

/**
 * Toggle TTS speech enabled state.
 * @returns {boolean}
 */
export function toggleSpeech() {
  return setSpeechEnabled(!speechEnabled);
}

/**
 * Set default speech rate (clamped between 0.5 and 2.0).
 * @param {number} rate
 * @returns {number}
 */
export function setSpeechRate(rate) {
  speechRate = clamp(rate, 0.5, 2.0, DEFAULT_RATE);
  return speechRate;
}

/**
 * Get current default speech rate.
 * @returns {number}
 */
export function getSpeechRate() {
  return speechRate;
}

/**
 * Set default speech pitch (clamped between 0.5 and 2.0).
 * @param {number} pitch
 * @returns {number}
 */
export function setSpeechPitch(pitch) {
  speechPitch = clamp(pitch, 0.5, 2.0, DEFAULT_PITCH);
  return speechPitch;
}

/**
 * Get current default speech pitch.
 * @returns {number}
 */
export function getSpeechPitch() {
  return speechPitch;
}

/**
 * Inject a custom speech provider `{ speechSynthesis, SpeechSynthesisUtterance }` for deterministic testing.
 * @param {object|null} provider
 */
export function setSpeechSynthesisProvider(provider) {
  customSpeechProvider = provider || null;
}

/**
 * Reset speech service configuration and active state to defaults.
 */
export function resetSpeechService() {
  stopSpeech();
  speechEnabled = true;
  speechRate = DEFAULT_RATE;
  speechPitch = DEFAULT_PITCH;
  customSpeechProvider = null;
}

/**
 * Immediately stop any active speech synthesis and resolve any pending speakText promise.
 */
export function stopSpeech() {
  const { synth } = getSpeechEnvironment();
  if (synth && typeof synth.cancel === 'function') {
    try {
      synth.cancel();
    } catch {
      // Ignore cancellation errors in restricted browsers
    }
  }
  if (typeof pendingResolve === 'function') {
    const resolveFn = pendingResolve;
    pendingResolve = null;
    resolveFn();
  }
}

/**
 * Speak Japanese text aloud using the Web Speech API with safe silent fallback.
 * Automatically cancels any previous utterance before speaking so rapid card transitions never overlap.
 *
 * @param {string} text - Text to speak
 * @param {object} [options={}] - Optional settings: { rate, pitch, lang, voiceName, onBoundary, onEnd }
 * @returns {Promise<void>}
 */
export function speakText(text, options = {}) {
  // Always cancel any in-flight utterance first (Edge Case #2 in survey_miner_2/analysis.md)
  stopSpeech();

  const cleanText = String(text ?? '').trim();
  const onBoundary = typeof options.onBoundary === 'function' ? options.onBoundary : null;
  const onEnd = typeof options.onEnd === 'function' ? options.onEnd : null;

  if (!cleanText || !speechEnabled) {
    if (onEnd) {
      try {
        onEnd({ type: 'end', skipped: true, reason: !cleanText ? 'empty_text' : 'speech_disabled' });
      } catch {
        // Ignore callback error
      }
    }
    return Promise.resolve();
  }

  const { synth, UtteranceClass } = getSpeechEnvironment();
  if (!synth || typeof synth.speak !== 'function' || typeof UtteranceClass !== 'function') {
    // Safe silent fallback when Web Speech API is unavailable (Edge Case #1)
    if (onEnd) {
      try {
        onEnd({ type: 'end', fallback: true, reason: 'speech_api_unavailable' });
      } catch {
        // Ignore callback error
      }
    }
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (eventPayload) => {
      if (settled) return;
      settled = true;
      if (pendingResolve === finish) {
        pendingResolve = null;
      }
      if (onEnd) {
        try {
          onEnd(eventPayload || { type: 'end' });
        } catch {
          // Ignore callback error
        }
      }
      resolve();
    };

    pendingResolve = finish;

    try {
      const utterance = new UtteranceClass(cleanText);
      utterance.lang = options.lang || 'ja-JP';
      utterance.rate = clamp(options.rate !== undefined ? options.rate : speechRate, 0.5, 2.0, speechRate);
      utterance.pitch = clamp(options.pitch !== undefined ? options.pitch : speechPitch, 0.5, 2.0, speechPitch);

      const selectedVoice = selectBestJapaneseVoice(options.voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      if (onBoundary) {
        utterance.onboundary = (event) => {
          try {
            onBoundary(event);
          } catch {
            // Ignore callback error
          }
        };
      }

      utterance.onend = (event) => {
        finish(event || { type: 'end' });
      };

      utterance.onerror = (event) => {
        finish(event || { type: 'error' });
      };

      synth.speak(utterance);
    } catch {
      finish({ type: 'error', fallback: true });
    }
  });
}

/**
 * Normalize stage identifier (supports 'stage-1', 1, '1', 'w2-s1', or { worldId, stageId })
 * and return the corresponding 1-minute mini-lesson script data.
 *
 * @param {string|number|object} stageIdentifier
 * @returns {object}
 */
export function getMiniLessonData(stageIdentifier) {
  let key = 'stage-1';
  // 総ステージ数はカリキュラムのメタデータから導出する (ワールド追加に追随)
  const totalStages = WORLDS_METADATA.reduce((n, world) => n + world.stages.length, 0);

  if (typeof stageIdentifier === 'number') {
    const clamped = Math.max(1, Math.min(totalStages, Math.floor(stageIdentifier)));
    key = `stage-${clamped}`;
  } else if (typeof stageIdentifier === 'string') {
    const trimmed = stageIdentifier.trim().toLowerCase();
    if (MINI_LESSON_SCRIPTS[trimmed]) {
      key = trimmed;
    } else if (/^\d+$/.test(trimmed)) {
      const num = Math.max(1, Math.min(totalStages, Number(trimmed)));
      key = `stage-${num}`;
    } else {
      const worldStageMatch = trimmed.match(/w(?:orld)?[-_]?(\d+)[-_]s(?:tage)?[-_]?(\d+)/);
      if (worldStageMatch) {
        const w = Number(worldStageMatch[1]);
        const s = Number(worldStageMatch[2]);
        const globalStage = (w - 1) * 3 + s;
        if (globalStage >= 1 && globalStage <= totalStages) {
          key = `stage-${globalStage}`;
        }
      }
    }
  } else if (stageIdentifier && typeof stageIdentifier === 'object') {
    const w = Number(stageIdentifier.worldId || 1);
    const s = Number(stageIdentifier.stageId || 1);
    if (s >= 1 && s <= totalStages && !stageIdentifier.worldId) {
      key = `stage-${s}`;
    } else {
      const globalStage = (w - 1) * 3 + s;
      if (globalStage >= 1 && globalStage <= totalStages) {
        key = `stage-${globalStage}`;
      }
    }
  }

  return MINI_LESSON_SCRIPTS[key] || MINI_LESSON_SCRIPTS['stage-1'];
}
