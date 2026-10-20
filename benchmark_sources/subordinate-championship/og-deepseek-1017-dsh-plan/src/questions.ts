/**
 * アプリに内蔵した日本語の4択クイズ。外部APIは使わない。
 * `correctIndex` は `choices` の何番目が正解かを表す。
 */
export interface Question {
  text: string;
  choices: readonly [string, string, string, string];
  correctIndex: number;
}

export const QUESTIONS: readonly Question[] = [
  {
    text: "富士山の標高はおよそ何メートル？",
    choices: ["3776m", "3333m", "4122m", "2986m"],
    correctIndex: 0,
  },
  {
    text: "元素記号「Au」が表す元素はどれ？",
    choices: ["銀", "銅", "金", "アルミニウム"],
    correctIndex: 2,
  },
  {
    text: "日本で一番長い川はどれ？",
    choices: ["利根川", "信濃川", "石狩川", "揖斐川"],
    correctIndex: 1,
  },
  {
    text: "世界で最も面積が大きい国はどこ？",
    choices: ["カナダ", "中国", "アメリカ合衆国", "ロシア"],
    correctIndex: 3,
  },
  {
    text: "1年で昼の時間が最も長い日を何という？",
    choices: ["春分", "夏至", "秋分", "冬至"],
    correctIndex: 1,
  },
  {
    text: "日本の都道府県の数はいくつ？",
    choices: ["47", "43", "45", "50"],
    correctIndex: 0,
  },
  {
    text: "光が1秒間に進む距離はおよそどれくらい？",
    choices: ["3万km", "30万km", "300万km", "3000万km"],
    correctIndex: 1,
  },
  {
    text: "サッカーの1チームの選手数は何人？",
    choices: ["9人", "10人", "11人", "12人"],
    correctIndex: 2,
  },
  {
    text: "日本国憲法が施行されたのは西暦何年？",
    choices: ["1945年", "1947年", "1950年", "1952年"],
    correctIndex: 1,
  },
  {
    text: "1ダースは何個？",
    choices: ["6個", "12個", "10個", "20個"],
    correctIndex: 1,
  },
  {
    text: "水が標準的な気圧で氷になる温度は？",
    choices: ["0℃", "4℃", "-4℃", "10℃"],
    correctIndex: 0,
  },
  {
    text: "次のうち、昆虫の仲間はどれ？",
    choices: ["クモ", "ムカデ", "カブトムシ", "ダンゴムシ"],
    correctIndex: 2,
  },
  {
    text: "月が地球の周りを1周するのにかかる日数はおよそ？",
    choices: ["7日", "14日", "60日", "27日"],
    correctIndex: 3,
  },
  {
    text: "世界で最も高い山はどれ？",
    choices: ["モンブラン", "K2", "キリマンジャロ", "エベレスト"],
    correctIndex: 3,
  },
  {
    text: "童話「桃太郎」で、桃太郎が鬼退治に持って行ったものは？",
    choices: ["きびだんご", "おむすび", "どら焼き", "せんべい"],
    correctIndex: 0,
  },
  {
    text: "五十音図の「あ行」に含まれる文字はどれ？",
    choices: ["か", "あ", "さ", "た"],
    correctIndex: 1,
  },
  {
    text: "太陽系で最も大きい惑星はどれ？",
    choices: ["地球", "火星", "土星", "木星"],
    correctIndex: 3,
  },
  {
    text: "東京タワーの高さはおよそ何メートル？",
    choices: ["333m", "634m", "250m", "450m"],
    correctIndex: 0,
  },
];

/**
 * 重複しない問題番号を `count` 個えらぶ。`rng` を差し替えればテストで固定できる。
 */
export function pickQuestions(count: number, rng: () => number = Math.random): number[] {
  const pool = QUESTIONS.map((_, index) => index);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(count, pool.length));
}
