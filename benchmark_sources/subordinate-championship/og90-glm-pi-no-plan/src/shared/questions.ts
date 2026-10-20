// 内蔵クイズ（10問・4択・日本語）。外部APIは使わない。
// 正解は正解の選択肢の配列内インデックス。
export interface Question {
  text: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export const QUESTION_COUNT = 10;

export const QUESTIONS: Question[] = [
  {
    text: "日本で一番面積が広い都道府県は？",
    choices: ["岩手県", "長野県", "北海道", "福島県"],
    correctIndex: 2,
  },
  {
    text: "レモンに多く含まれる栄養素は？",
    choices: ["ビタミンC", "カルシウム", "鉄分", "食物繊維"],
    correctIndex: 0,
  },
  {
    text: "2024年時点で、世界で最も人口が多い国は？",
    choices: ["中国", "インド", "アメリカ", "インドネシア"],
    correctIndex: 1,
  },
  {
    text: "桃太郎がお供にした動物「ではない」のはどれ？",
    choices: ["犬", "キジ", "サル", "タヌキ"],
    correctIndex: 3,
  },
  {
    text: "1年で昼（日の出〜日の入り）が最も長い日は？",
    choices: ["夏至", "冬至", "春分の日", "秋分の日"],
    correctIndex: 0,
  },
  {
    text: "富士山の標高はおよそいくつ？",
    choices: ["2,776m", "1,776m", "3,776m", "4,776m"],
    correctIndex: 2,
  },
  {
    text: "光が1秒間に進む距離はおよそ何km？",
    choices: ["3万km", "30万km", "300万km", "3,000km"],
    correctIndex: 1,
  },
  {
    text: "日本の首都が京都から東京に移ったのは何時代？",
    choices: ["江戸時代", "大正時代", "平安時代", "明治時代"],
    correctIndex: 3,
  },
  {
    text: "「カブトムシ」の名前の由来になったものは？",
    choices: ["兜（かぶと）", "頭（かぶり）", "蒲（かば）", "株（かぶ）"],
    correctIndex: 0,
  },
  {
    text: "地球で一番深い海溝は？",
    choices: ["ジャワ海溝", "ペルー・チリ海溝", "マリアナ海溝", "アリューシャン海溝"],
    correctIndex: 2,
  },
];
