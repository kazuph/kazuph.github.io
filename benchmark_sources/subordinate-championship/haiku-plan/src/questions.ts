// 内蔵の日本語4択問題。1ゲームでは、この中から10問をランダムに選ぶ。
// answer は choices の添字（0〜3）。正解は出題中の画面には送らない。

export interface QuestionDef {
  q: string;
  choices: [string, string, string, string];
  answer: number;
}

export const QUESTIONS: readonly QuestionDef[] = [
  { q: "日本の首都はどこ？", choices: ["大阪", "京都", "東京", "名古屋"], answer: 2 },
  { q: "平年の1年は何日？", choices: ["364日", "365日", "366日", "360日"], answer: 1 },
  { q: "太陽系で最も大きい惑星は？", choices: ["地球", "木星", "土星", "天王星"], answer: 1 },
  { q: "「ド・レ・ミ」の次の音は？", choices: ["ファ", "ソ", "ラ", "シ"], answer: 0 },
  { q: "日本で最も長い川は？", choices: ["利根川", "信濃川", "石狩川", "淀川"], answer: 1 },
  { q: "水の化学式は？", choices: ["H2O", "CO2", "O2", "NaCl"], answer: 0 },
  { q: "『吾輩は猫である』の作者は？", choices: ["太宰治", "夏目漱石", "芥川龍之介", "森鴎外"], answer: 1 },
  { q: "1時間は何分？", choices: ["60分", "100分", "50分", "90分"], answer: 0 },
  { q: "三角形の内角の和は何度？", choices: ["90度", "180度", "270度", "360度"], answer: 1 },
  { q: "日本の国鳥は？", choices: ["トキ", "キジ", "ツル", "ハト"], answer: 1 },
  { q: "夏季オリンピックは何年ごとに開かれる？", choices: ["2年", "3年", "4年", "5年"], answer: 2 },
  { q: "人間の心臓の部屋は全部でいくつ？", choices: ["2つ", "3つ", "4つ", "5つ"], answer: 2 },
  { q: "北斗七星は何座の一部？", choices: ["大熊座", "小熊座", "カシオペヤ座", "オリオン座"], answer: 0 },
  { q: "『東海道五十三次』を描いた浮世絵師は？", choices: ["葛飾北斎", "歌川広重", "伊藤若冲", "喜多川歌麿"], answer: 1 },
  { q: "金の元素記号は？", choices: ["Ag", "Au", "Fe", "Cu"], answer: 1 },
  { q: "日本の通貨の単位は？", choices: ["円", "元", "ウォン", "ドル"], answer: 0 },
];
