export interface QuizQuestion {
  text: string;
  choices: [string, string, string, string];
  answer: number; // 0..3
}

// アプリ内蔵の日本語4択問題10問（外部API不使用）
export const QUESTIONS: QuizQuestion[] = [
  {
    text: "日本の首都はどこ？",
    choices: ["大阪", "京都", "東京", "名古屋"],
    answer: 2,
  },
  {
    text: "富士山の標高として正しいものはどれ？",
    choices: ["3,776m", "3,476m", "3,976m", "3,276m"],
    answer: 0,
  },
  {
    text: "1年で2月が29日まである年を何という？",
    choices: ["平年", "うるう年", "太陽年", "太陰年"],
    answer: 1,
  },
  {
    text: "水の化学式はどれ？",
    choices: ["CO2", "O2", "H2O", "NaCl"],
    answer: 2,
  },
  {
    text: "日本で一番面積が大きい都道府県は？",
    choices: ["岩手県", "福島県", "長野県", "北海道"],
    answer: 3,
  },
  {
    text: "九九で「しちはさんじゅういち」と読む計算は？",
    choices: ["7×4", "7×3", "7×5", "7×6"],
    answer: 1,
  },
  {
    text: "オリンピックの五輪の色に含まれないものは？",
    choices: ["青", "黄", "紫", "緑"],
    answer: 2,
  },
  {
    text: "日本の紙幣で千円札に描かれている人物は？（2024年の新紙幣）",
    choices: ["福沢諭吉", "渋沢栄一", "北里柴三郎", "津田梅子"],
    answer: 2,
  },
  {
    text: "地球から一番近い惑星はどれ？（時期により変わるが、平均的に最も近いとされる）",
    choices: ["火星", "金星", "水星", "木星"],
    answer: 2,
  },
  {
    text: "「桃太郎」で仲間にならない動物はどれ？",
    choices: ["犬", "猿", "キジ", "猫"],
    answer: 3,
  },
];
