// アプリに内蔵した日本語の4択問題。外部APIは使わない。
// answer は choices の添字（0〜3）。ゲーム中は正解をブラウザに送らない。

export interface Question {
  text: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

export const QUESTIONS: Question[] = [
  {
    text: '日本の首都はどこでしょう？',
    choices: ['大阪', '東京', '京都', '名古屋'],
    answer: 1,
  },
  {
    text: '1年は何日でしょう？（うるう年を除く）',
    choices: ['360日', '364日', '365日', '366日'],
    answer: 2,
  },
  {
    text: '水の化学式はどれでしょう？',
    choices: ['H2O', 'CO2', 'O2', 'NaCl'],
    answer: 0,
  },
  {
    text: '富士山の標高はおよそ何メートルでしょう？',
    choices: ['1,776m', '2,776m', '3,776m', '4,776m'],
    answer: 2,
  },
  {
    text: '太陽系で最も大きい惑星はどれでしょう？',
    choices: ['地球', '火星', '土星', '木星'],
    answer: 3,
  },
  {
    text: '「吾輩は猫である」を書いた作家は誰でしょう？',
    choices: ['夏目漱石', '太宰治', '芥川龍之介', '宮沢賢治'],
    answer: 0,
  },
  {
    text: '日本で最も長い川はどれでしょう？',
    choices: ['利根川', '信濃川', '石狩川', '木曽川'],
    answer: 1,
  },
  {
    text: '1週間は何時間でしょう？',
    choices: ['120時間', '144時間', '168時間', '196時間'],
    answer: 2,
  },
  {
    text: 'オリンピックの5つの輪が表すものは何でしょう？',
    choices: ['5つの海', '5大陸', '5つの色', '5つの種目'],
    answer: 1,
  },
  {
    text: '人間の体で最も大きい臓器はどれでしょう？',
    choices: ['肝臓', '心臓', '肺', '皮膚'],
    answer: 3,
  },
  {
    text: '「かぐや姫」が登場する日本の古典はどれでしょう？',
    choices: ['源氏物語', '竹取物語', '枕草子', '古事記'],
    answer: 1,
  },
  {
    text: '1リットルは何ミリリットルでしょう？',
    choices: ['10mL', '100mL', '1000mL', '10000mL'],
    answer: 2,
  },
  {
    text: '日本で一番高い建造物はどれでしょう？',
    choices: ['東京タワー', '東京スカイツリー', 'あべのハルカス', '横浜ランドマークタワー'],
    answer: 1,
  },
  {
    text: '光が1秒間に進む距離はおよそどれでしょう？',
    choices: ['3万km', '30万km', '300万km', '3000万km'],
    answer: 1,
  },
  {
    text: '「ドラえもん」の作者は誰でしょう？',
    choices: ['手塚治虫', '藤子・F・不二雄', '鳥山明', '赤塚不二夫'],
    answer: 1,
  },
  {
    text: '日本で一番面積が大きい都道府県はどれでしょう？',
    choices: ['岩手県', '長野県', '新潟県', '北海道'],
    answer: 3,
  },
];

export const TOTAL_QUESTIONS = 10;

// 12問以上の中から10問を重複なく選ぶ。rand は 0〜1 を返す関数（テストで差し替え可能）。
export function pickQuestionOrder(rand: () => number = Math.random): number[] {
  const indices = QUESTIONS.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, TOTAL_QUESTIONS);
}
