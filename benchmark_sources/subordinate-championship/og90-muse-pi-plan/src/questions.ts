// アプリ内蔵の日本語4択問題。外部APIは使わない。
// choice の順番は固定で出し、テストは問題文から正解を引ける。
export interface Question {
  q: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

export const QUESTIONS: Question[] = [
  {
    q: "富士山の標高は約何メートル？",
    choices: ["2,796m", "3,776m", "3,067m", "4,206m"],
    answer: 1,
  },
  {
    q: "日本の都道府県で、面積がもっとも広いのは？",
    choices: ["岩手県", "福島県", "北海道", "長野県"],
    answer: 2,
  },
  {
    q: "水の化学式はどれ？",
    choices: ["CO2", "H2O", "O2", "NaCl"],
    answer: 1,
  },
  {
    q: "江戸幕府を開いた人物はだれ？",
    choices: ["豊臣秀吉", "徳川家康", "織田信長", "足利尊氏"],
    answer: 1,
  },
  {
    q: "1年で2月が29日まである年を何という？",
    choices: ["平年", "うるう年", "和暦年", "太陰年"],
    answer: 1,
  },
  {
    q: "寿司のネタで「トロ」といえば、魚のどの部分？",
    choices: ["背びれ", "腹部の脂の多い部分", "ほほ肉", "尾びれ"],
    answer: 1,
  },
  {
    q: "太陽系でいちばん大きな惑星は？",
    choices: ["土星", "地球", "木星", "火星"],
    answer: 2,
  },
  {
    q: "オリンピックの五輪の色に含まれていないのはどれ？",
    choices: ["青", "黄", "紫", "緑"],
    answer: 2,
  },
  {
    q: "「ありがとう」を英語で書くと？",
    choices: ["Hello", "Goodbye", "Thank you", "Please"],
    answer: 2,
  },
  {
    q: "7 × 8 はいくつ？",
    choices: ["54", "56", "63", "48"],
    answer: 1,
  },
  {
    q: "日本の国鳥はどれ？",
    choices: ["キジ", "ツル", "カラス", "スズメ"],
    answer: 0,
  },
  {
    q: "カレーライスの「カレー」の発祥地とされる国は？",
    choices: ["日本", "フランス", "インド", "ブラジル"],
    answer: 2,
  },
  {
    q: "漢字「桜」の読みとして正しいのはどれ？",
    choices: ["もも", "さくら", "うめ", "きく"],
    answer: 1,
  },
  {
    q: "新幹線で東京駅と新大阪駅を結ぶ路線の名前は？",
    choices: ["東北新幹線", "上越新幹線", "東海道新幹線", "山陽新幹線"],
    answer: 2,
  },
];

export function correctOf(orderPos: number, order: number[]): number {
  return QUESTIONS[order[orderPos]].answer;
}
