// 内蔵の日本語4択問題。外部 API は使わない。
// ここから 10 問を選んで出すので 12 問以上用意する（正解は answer の添字）。
export interface Question {
  text: string;
  choices: [string, string, string, string];
  answer: number;
}

export const QUESTIONS: Question[] = [
  { text: "日本でいちばん高い山はどれ？", choices: ["北岳", "奥穂高岳", "富士山", "間ノ岳"], answer: 2 },
  { text: "日本の首都はどこ？", choices: ["大阪", "東京", "京都", "名古屋"], answer: 1 },
  { text: "地球上でいちばん大きな動物はどれ？", choices: ["アフリカゾウ", "シロナガスクジラ", "キリン", "シャチ"], answer: 1 },
  { text: "太陽系の惑星でいちばん大きいのはどれ？", choices: ["火星", "地球", "木星", "土星"], answer: 2 },
  { text: "「桃栗三年」の続きとして正しいのは？", choices: ["柿八年", "梨十年", "梅五年", "葡萄十二年"], answer: 0 },
  { text: "ふつうの1年は何日？", choices: ["355日", "364日", "365日", "370日"], answer: 2 },
  { text: "日本の国旗の丸は何色？", choices: ["赤", "青", "緑", "黄"], answer: 0 },
  { text: "3の2乗（3を掛けた数）はいくつ？", choices: ["6", "8", "9", "12"], answer: 2 },
  { text: "ライオンはどの仲間の動物？", choices: ["イヌ科", "ネコ科", "クマ科", "ウマ科"], answer: 1 },
  { text: "北海道の道庁所在地はどこ？", choices: ["函館", "旭川", "札幌", "小樽"], answer: 2 },
  { text: "世界でいちばん多くの国で盛んなスポーツはどれ？", choices: ["野球", "サッカー", "バスケットボール", "テニス"], answer: 1 },
  { text: "昔の日本で使われていたお金の単位はどれ？", choices: ["ペニー", "セント", "文", "シリング"], answer: 2 },
];

export const TOTAL_QUESTIONS_IN_BANK = QUESTIONS.length;

/** QUESTIONS の添字から、ランダムに 10 問ぶん選ぶ。Room 側の開始時に使う */
export function pickOrder(rand: () => number, count: number): number[] {
  const pool = QUESTIONS.map((_, i) => i);
  const order: number[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    order.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  return order;
}
