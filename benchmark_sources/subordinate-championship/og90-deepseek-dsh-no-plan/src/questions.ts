/**
 * アプリ内蔵のクイズ問題（外部 API は使わない）。
 * 4 択・全 10 問。正解インデックスは 0-3。
 */
export interface Question {
  text: string;
  choices: [string, string, string, string];
  answerIndex: number;
}

export const QUESTIONS: Question[] = [
  {
    text: "日本でいちばん高い山は？",
    choices: ["北岳", "槍ヶ岳", "富士山", "立山"],
    answerIndex: 2,
  },
  {
    text: "うるう年を除いた 1 年は何日？",
    choices: ["360 日", "365 日", "366 日", "364 日"],
    answerIndex: 1,
  },
  {
    text: "水の化学式は？",
    choices: ["CO2", "O2", "NaCl", "H2O"],
    answerIndex: 3,
  },
  {
    text: "日本の首都は？",
    choices: ["東京", "大阪", "京都", "名古屋"],
    answerIndex: 0,
  },
  {
    text: "世界でいちばん広い大陸は？",
    choices: ["アフリカ", "北アメリカ", "アジア", "南極大陸"],
    answerIndex: 2,
  },
  {
    text: "7 × 8 はいくつ？",
    choices: ["54", "56", "64", "48"],
    answerIndex: 1,
  },
  {
    text: "太陽系でいちばん大きい惑星は？",
    choices: ["土星", "地球", "海王星", "木星"],
    answerIndex: 3,
  },
  {
    text: "『吾輩は猫である』の作者は？",
    choices: ["夏目漱石", "芥川龍之介", "太宰治", "森鴎外"],
    answerIndex: 0,
  },
  {
    text: "日本でいちばん長い川は？",
    choices: ["利根川", "石狩川", "信濃川", "淀川"],
    answerIndex: 2,
  },
  {
    text: "1 ダースはいくつ？",
    choices: ["10", "12", "6", "24"],
    answerIndex: 1,
  },
];
