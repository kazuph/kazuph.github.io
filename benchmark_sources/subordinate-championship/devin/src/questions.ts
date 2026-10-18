// Built-in question set. 10 Japanese 4-choice questions.
// The server is the single source of truth for the correct answer.

export interface QuizQuestion {
  text: string;
  choices: [string, string, string, string];
  answer: number; // index into choices
}

export const QUESTIONS: QuizQuestion[] = [
  {
    text: "日本の首都はどこ？",
    choices: ["大阪", "東京", "京都", "名古屋"],
    answer: 1,
  },
  {
    text: "水の化学式はどれ？",
    choices: ["CO2", "O2", "H2O", "NaCl"],
    answer: 2,
  },
  {
    text: "1年は何日？（うるう年以外）",
    choices: ["364日", "365日", "366日", "360日"],
    answer: 1,
  },
  {
    text: "「桃太郎」で最初に仲間になった動物は？",
    choices: ["犬", "猿", "キジ", "熊"],
    answer: 0,
  },
  {
    text: "世界で一番高い山は？",
    choices: ["富士山", "K2", "エベレスト", "マッキンリー"],
    answer: 2,
  },
  {
    text: "光の速さはおよそ秒速何km？",
    choices: ["3万km", "30万km", "300万km", "3千km"],
    answer: 1,
  },
  {
    text: "オリンピックは何年ごとに開催される？",
    choices: ["2年", "3年", "4年", "5年"],
    answer: 2,
  },
  {
    text: "日本の通貨単位は？",
    choices: ["ウォン", "ドル", "元", "円"],
    answer: 3,
  },
  {
    text: "北極にいるのはどっち？",
    choices: ["ペンギン", "シロクマ", "アザラシだけ", "どちらもいない"],
    answer: 1,
  },
  {
    text: "コンピュータの「CPU」は何の略？",
    choices: [
      "Central Processing Unit",
      "Computer Personal Unit",
      "Central Program Utility",
      "Core Power Unit",
    ],
    answer: 0,
  },
];
