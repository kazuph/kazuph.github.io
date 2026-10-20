/**
 * アプリに内蔵した日本語4択クイズ。
 * 外部APIからは取得しない。ゲーム開始時にこの中から10問を選ぶ。
 */
export interface Question {
  text: string;
  choices: [string, string, string, string];
  /** 正解の選択肢番号（0〜3）。サーバー側だけで使い、回答中は絶対に送らない。 */
  correct: number;
}

export const QUESTIONS: Question[] = [
  {
    text: "富士山の標高はおよそ何メートル？",
    choices: ["2776m", "3276m", "3776m", "4276m"],
    correct: 2,
  },
  {
    text: "日本でいちばん長い川はどれ？",
    choices: ["利根川", "信濃川", "石狩川", "最上川"],
    correct: 1,
  },
  {
    text: "ふつうの年（平年）は1年が何日？",
    choices: ["354日", "360日", "365日", "366日"],
    correct: 2,
  },
  {
    text: "水の化学式はどれ？",
    choices: ["CO2", "H2O", "O2", "NaCl"],
    correct: 1,
  },
  {
    text: "世界でいちばん面積が大きい国は？",
    choices: ["カナダ", "中国", "ロシア", "アメリカ合衆国"],
    correct: 2,
  },
  {
    text: "三角形の3つの内角の和は何度？",
    choices: ["90度", "180度", "270度", "360度"],
    correct: 1,
  },
  {
    text: "現在の日本の元号はどれ？",
    choices: ["平成", "昭和", "令和", "大正"],
    correct: 2,
  },
  {
    text: "太陽系でいちばん大きい惑星は？",
    choices: ["土星", "木星", "地球", "天王星"],
    correct: 1,
  },
  {
    text: "英語で「図書館」を表す単語はどれ？",
    choices: ["laboratory", "library", "literacy", "gallery"],
    correct: 1,
  },
  {
    text: "1ダースは何個？",
    choices: ["6個", "10個", "12個", "20個"],
    correct: 2,
  },
  {
    text: "那覇市があるのは何県？",
    choices: ["鹿児島県", "沖縄県", "熊本県", "宮崎県"],
    correct: 1,
  },
  {
    text: "光の三原色に含まれない色はどれ？",
    choices: ["赤", "緑", "青", "黄色"],
    correct: 3,
  },
  {
    text: "昔「江戸」と呼ばれていたのは現在の何市？",
    choices: ["大阪市", "京都市", "東京（江戸）", "名古屋市"],
    correct: 2,
  },
  {
    text: "1キロメートルは何メートル？",
    choices: ["100m", "1000m", "10000m", "100000m"],
    correct: 1,
  },
];

/** ゲームに出す問題数。 */
export const QUESTIONS_PER_GAME = 10;

/** 0〜QUESTIONS.length-1 をシャッフルした配列を作る（Fisher–Yates）。 */
export function shuffledQuestionOrder(random: () => number = Math.random): number[] {
  const order = QUESTIONS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order.slice(0, QUESTIONS_PER_GAME);
}
