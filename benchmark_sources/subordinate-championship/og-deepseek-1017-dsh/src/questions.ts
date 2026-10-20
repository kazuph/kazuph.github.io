/**
 * アプリ内蔵の日本語4択クイズ問題バンク。
 * 外部APIは一切使わない（課題の決定済み事項）。
 *
 * - `choices` は必ず4つ
 * - `correct` は 0..3 の正解インデックス（サーバーだけが保持し、
 *   正解を表示するフェーズになるまでクライアントには送らない）
 */
export interface Question {
  id: string;
  text: string;
  choices: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  category: string;
}

export const QUESTIONS: readonly Question[] = [
  {
    id: "q-fuji",
    text: "日本で一番高い山はどれ？",
    choices: ["富士山", "北岳", "奥穂高岳", "槍ヶ岳"],
    correct: 0,
    category: "地理",
  },
  {
    id: "q-year-days",
    text: "うるう年を除くと、1年は何日？",
    choices: ["364日", "365日", "366日", "360日"],
    correct: 1,
    category: "生活",
  },
  {
    id: "q-neko",
    text: "小説「吾輩は猫である」を書いた作家は？",
    choices: ["夏目漱石", "森鴎外", "太宰治", "芥川龍之介"],
    correct: 0,
    category: "文学",
  },
  {
    id: "q-water",
    text: "水の化学式は？",
    choices: ["CO2", "H2O", "O2", "NaCl"],
    correct: 1,
    category: "理科",
  },
  {
    id: "q-capital",
    text: "日本の首都はどこ？",
    choices: ["大阪", "名古屋", "東京", "京都"],
    correct: 2,
    category: "地理",
  },
  {
    id: "q-week",
    text: "1週間は何日？",
    choices: ["5日", "6日", "7日", "8日"],
    correct: 2,
    category: "生活",
  },
  {
    id: "q-planet",
    text: "太陽系で一番大きい惑星は？",
    choices: ["地球", "火星", "木星", "土星"],
    correct: 2,
    category: "理科",
  },
  {
    id: "q-fuji-height",
    text: "富士山の標高はおよそ何メートル？",
    choices: ["2776m", "3776m", "4776m", "5776m"],
    correct: 1,
    category: "地理",
  },
  {
    id: "q-monariza",
    text: "絵画「モナ・リザ」を描いたのは？",
    choices: ["ゴッホ", "ピカソ", "レオナルド・ダ・ヴィンチ", "モネ"],
    correct: 2,
    category: "芸術",
  },
  {
    id: "q-longest-river",
    text: "日本で一番長い川は？",
    choices: ["利根川", "石狩川", "信濃川", "揖斐川"],
    correct: 2,
    category: "地理",
  },
  {
    id: "q-dozen",
    text: "1ダースは何個？",
    choices: ["10個", "12個", "15個", "20個"],
    correct: 1,
    category: "生活",
  },
  {
    id: "q-largest-country",
    text: "世界で一番面積が広い国は？",
    choices: ["中国", "アメリカ", "カナダ", "ロシア"],
    correct: 3,
    category: "地理",
  },
  {
    id: "q-element-o",
    text: "元素記号「O」が表す元素は？",
    choices: ["酸素", "水素", "炭素", "窒素"],
    correct: 0,
    category: "理科",
  },
  {
    id: "q-prefectures",
    text: "日本の都道府県の数は？",
    choices: ["43", "45", "47", "49"],
    correct: 2,
    category: "地理",
  },
  {
    id: "q-ghibli",
    text: "映画「千と千尋の神隠し」を制作したスタジオは？",
    choices: ["スタジオジブリ", "ピクサー", "ディズニー", "東映アニメーション"],
    correct: 0,
    category: "芸術",
  },
  {
    id: "q-hour",
    text: "1時間は何分？",
    choices: ["30分", "45分", "60分", "90分"],
    correct: 2,
    category: "生活",
  },
  {
    id: "q-soccer",
    text: "サッカーの1チームのフィールド人数は？",
    choices: ["9人", "10人", "11人", "12人"],
    correct: 2,
    category: "スポーツ",
  },
  {
    id: "q-hokkaido",
    text: "日本で一番面積が広い都道府県は？",
    choices: ["北海道", "岩手県", "福島県", "長野県"],
    correct: 0,
    category: "地理",
  },
] as const;

/** 1ゲームで出題する問題数（課題の必須要件: 10問）。 */
export const QUESTIONS_PER_GAME = 10;

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/**
 * 1ゲーム分の問題を選ぶ。問題順は毎回シャッフルし、重複は出さない。
 * `rng` を差し替えられるようにしてテストを決定的にできるようにしている。
 */
export function pickQuestions(
  count: number = QUESTIONS_PER_GAME,
  rng: () => number = Math.random,
): Question[] {
  const pool = [...QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
