/**
 * 内蔵の日本語4択クイズ（外部APIは使わない）。
 * correct は choices のインデックス（0始まり）。
 */
export interface Question {
  text: string;
  choices: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
}

export const QUESTIONS: Question[] = [
  {
    text: "日本語の「こんにちは」にあたる英単語はどれ？",
    choices: ["Hello", "Goodbye", "Thank you", "Sorry"],
    correct: 0,
  },
  {
    text: "うるう年を除いたとき、1年は何日？",
    choices: ["364日", "365日", "366日", "360日"],
    correct: 1,
  },
  {
    text: "日本でいちばん高い山はどれ？",
    choices: ["北岳", "奥穂高岳", "富士山", "槍ヶ岳"],
    correct: 2,
  },
  {
    text: "水の化学式はどれ？",
    choices: ["CO2", "H2O", "O2", "NaCl"],
    correct: 1,
  },
  {
    text: "日本の首都はどこ？",
    choices: ["大阪", "京都", "東京", "名古屋"],
    correct: 2,
  },
  {
    text: "太陽系でいちばん大きい惑星はどれ？",
    choices: ["地球", "火星", "土星", "木星"],
    correct: 3,
  },
  {
    text: "1週間は何日？",
    choices: ["5日", "6日", "7日", "8日"],
    correct: 2,
  },
  {
    text: "三角形の3つの内角の和は何度？",
    choices: ["90度", "180度", "270度", "360度"],
    correct: 1,
  },
  {
    text: "日本の桜が咲く季節はいつ？",
    choices: ["春", "夏", "秋", "冬"],
    correct: 0,
  },
  {
    text: "12 × 12 はいくつ？",
    choices: ["124", "132", "144", "154"],
    correct: 2,
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;
