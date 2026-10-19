export interface Question {
  text: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

// 内蔵問題。外部APIは使わない。毎ゲームここからシャッフルして10問出す。
export const QUESTIONS: Question[] = [
  {
    text: "日本の首都はどこ？",
    choices: ["大阪", "京都", "東京", "福岡"],
    answer: 2,
  },
  {
    text: "富士山の標高として正しいのはどれ？（約）",
    choices: ["2,829m", "3,776m", "4,102m", "3,193m"],
    answer: 1,
  },
  {
    text: "水の化学式はどれ？",
    choices: ["CO2", "H2O", "O2", "NaCl"],
    answer: 1,
  },
  {
    text: "日本で一番長い川はどれ？",
    choices: ["利根川", "石狩川", "四万十川", "信濃川"],
    answer: 3,
  },
  {
    text: "1年で2月が29日まである年を何という？",
    choices: ["平年", "うるう年", "太陽年", "太陰年"],
    answer: 1,
  },
  {
    text: "ピアノの鍵盤のうち、白鍵はいくつ？",
    choices: ["88", "52", "36", "61"],
    answer: 1,
  },
  {
    text: "日本の国鳥はどれ？",
    choices: ["ツル", "キジ", "スズメ", "カラス"],
    answer: 1,
  },
  {
    text: "九九で「しちはち」の答えは？",
    choices: ["54", "56", "63", "48"],
    answer: 1,
  },
  {
    text: "オリンピックの五輪の色に含まれないのはどれ？",
    choices: ["青", "黄", "緑", "紫"],
    answer: 3,
  },
  {
    text: "日本の通貨単位はどれ？",
    choices: ["ウォン", "円", "元", "ドル"],
    answer: 1,
  },
  {
    text: "地球からいちばん近い天体はどれ？",
    choices: ["火星", "金星", "月", "太陽"],
    answer: 2,
  },
  {
    text: "将棋で最初に動かせる駒の動かし方として正しいのはどれ？",
    choices: [
      "角を斜めに何マスでも進める",
      "歩を1マス前に進める",
      "王を2マス動かす",
      "香車を横に動かす",
    ],
    answer: 1,
  },
  {
    text: "1週間は何時間？",
    choices: ["144時間", "152時間", "160時間", "168時間"],
    answer: 3,
  },
  {
    text: "日本語の五十音で、最初の行はどれ？",
    choices: ["か行", "さ行", "あ行", "た行"],
    answer: 2,
  },
];
