/**
 * アプリ内蔵の日本語4択クイズ（外部APIは使わない）。
 * `correct` は choices のインデックス。正誤判定はサーバー側でのみ参照する。
 */
export interface Question {
  id: number;
  text: string;
  choices: [string, string, string, string];
  correct: number;
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "日本で最も高い山はどれ？",
    choices: ["北岳", "富士山", "槍ヶ岳", "奥穂高岳"],
    correct: 1,
  },
  {
    id: 2,
    text: "2月が29日まである年を一般に何と呼ぶ？",
    choices: ["平年", "うるう年", "短年", "長月"],
    correct: 1,
  },
  {
    id: 3,
    text: "1気圧のもとでの水の沸点は摂氏何度？",
    choices: ["80度", "90度", "100度", "120度"],
    correct: 2,
  },
  {
    id: 4,
    text: "太陽系で最も大きい惑星はどれ？",
    choices: ["地球", "土星", "木星", "天王星"],
    correct: 2,
  },
  {
    id: 5,
    text: "『源氏物語』の作者は誰？",
    choices: ["清少納言", "紫式部", "和泉式部", "樋口一葉"],
    correct: 1,
  },
  {
    id: 6,
    text: "「あいうえお」の3番目の文字はどれ？",
    choices: ["あ", "い", "う", "え"],
    correct: 2,
  },
  {
    id: 7,
    text: "オリンピックの5つの輪が象徴しているものは？",
    choices: ["5つの海", "世界の5つの大陸", "5つの競技", "5人の創設者"],
    correct: 1,
  },
  {
    id: 8,
    text: "「全体の半分」を百分率で表すとどれ？",
    choices: ["25%", "50%", "75%", "100%"],
    correct: 1,
  },
  {
    id: 9,
    text: "日本で最も長い川はどれ？",
    choices: ["利根川", "石狩川", "信濃川", "淀川"],
    correct: 2,
  },
  {
    id: 10,
    text: "タコの足は何本？",
    choices: ["6本", "8本", "10本", "12本"],
    correct: 1,
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;
