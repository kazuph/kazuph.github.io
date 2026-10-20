/**
 * アプリに内蔵した日本語の4択問題。
 * 外部 API からは取得しない（TASK.md の決定済み事項）。
 */
export interface Question {
  text: string;
  choices: [string, string, string, string];
  /** 正解の選択肢の添字（0〜3） */
  answer: number;
}

export const QUESTIONS: Question[] = [
  {
    text: "日本で一番高い山はどれ？",
    choices: ["富士山", "北岳", "槍ヶ岳", "奥穂高岳"],
    answer: 0,
  },
  {
    text: "1週間は何日？",
    choices: ["5日", "6日", "7日", "8日"],
    answer: 2,
  },
  {
    text: "水の化学式はどれ？",
    choices: ["CO2", "H2O", "O2", "NaCl"],
    answer: 1,
  },
  {
    text: "日本の首都はどこ？",
    choices: ["大阪", "京都", "東京", "名古屋"],
    answer: 2,
  },
  {
    text: "1ダースは何個？",
    choices: ["6個", "10個", "12個", "20個"],
    answer: 2,
  },
  {
    text: "太陽系で一番大きい惑星はどれ？",
    choices: ["地球", "火星", "木星", "土星"],
    answer: 2,
  },
  {
    text: "世界で一番面積が広い国はどこ？",
    choices: ["中国", "アメリカ", "ロシア", "カナダ"],
    answer: 2,
  },
  {
    text: "昆虫の脚はふつう何本？",
    choices: ["4本", "6本", "8本", "10本"],
    answer: 1,
  },
  {
    text: "オリンピックは何年ごとに開かれる？",
    choices: ["2年ごと", "3年ごと", "4年ごと", "5年ごと"],
    answer: 2,
  },
  {
    text: "人間の心臓はいくつの部屋に分かれている？",
    choices: ["2つ", "3つ", "4つ", "5つ"],
    answer: 2,
  },
  {
    text: "日本で一番長い川はどれ？",
    choices: ["信濃川", "利根川", "石狩川", "淀川"],
    answer: 0,
  },
  {
    text: "2進数の「10」を10進数にすると？",
    choices: ["2", "4", "8", "10"],
    answer: 0,
  },
  {
    text: "虹はふつう何色といわれる？",
    choices: ["5色", "6色", "7色", "8色"],
    answer: 2,
  },
  {
    text: "地球が太陽のまわりを1周するのにかかる日数はおよそ？",
    choices: ["30日", "180日", "365日", "1000日"],
    answer: 2,
  },
];

/**
 * 配列を壊さないように、ランダムに count 問選ぶ。
 * `rand` を渡せるようにしておき、テストでは固定できるようにする。
 */
export function pickQuestions(
  count: number,
  rand: () => number = Math.random,
  pool: Question[] = QUESTIONS,
): number[] {
  const indexes = pool.map((_, i) => i);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes.slice(0, Math.min(count, indexes.length));
}

export function getQuestion(index: number): Question {
  return QUESTIONS[index];
}
