/**
 * 内蔵の問題バンク（外部 API は使わない / 10問固定）
 * 選択肢は 4 択、正解は correct で保持する。
 */

export interface Question {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const QUESTIONS: Question[] = [
  {
    text: '日本の首都はどこですか？',
    options: ['東京', '京都', '大阪', '札幌'],
    correct: 0,
    explanation: '日本の首都は東京都（特別区）です。',
  },
  {
    text: '小説「吾輩は猫である」の作者は誰ですか？',
    options: ['太宰治', '芥川龍之介', '森鴎外', '夏目漱石'],
    correct: 3,
    explanation: '「吾輩は猫である」は夏目漱石の処女小説です。',
  },
  {
    text: '富士山の標高はいくらですか？',
    options: ['3067メートル', '4011メートル', '3776メートル', '3211メートル'],
    correct: 2,
    explanation: '富士山の標高は3776メートルです。',
  },
  {
    text: '日本最北端の都道府県はどこですか？',
    options: ['北海道', '青森県', '岩手県', '秋田県'],
    correct: 0,
    explanation: '北海道が最北端、沖縄県が最南端です。',
  },
  {
    text: '古代エジプトのピラミッドが建てられた川はどれですか？',
    options: ['ガンジス川', 'ユングレ川', 'アマゾン川', 'ナイル川'],
    correct: 3,
    explanation: 'ナイル川沿岸にピラミッド群が建てられました。',
  },
  {
    text: '日本の初代内閣総理大臣は誰ですか？',
    options: ['伊藤博文', '吉田茂', '東條英機', '近衛文麿'],
    correct: 0,
    explanation: '1885年に伊藤博文が初代内閣総理大臣になりました。',
  },
  {
    text: '野球の守備でフィールドに立つ選手は何人ですか？',
    options: ['7人', '8人', '9人', '10人'],
    correct: 2,
    explanation: '投手1人・捕手1人・内野手6人・外野手3人で合計9人です。',
  },
  {
    text: '人の心臓は1日におよそ何回拍動しますか？',
    options: ['約1万回', '約5万回', '約50万回', '約10万回'],
    correct: 3,
    explanation: '1分間に約70回、1日では約10万回とされます。',
  },
  {
    text: '十和田湖はどの県にある湖ですか？',
    options: ['岩手県', '秋田県', '青森県', '宮城県'],
    correct: 2,
    explanation: '十和田湖は青森県と秋田県にまたがって存在します。',
  },
  {
    text: '光のおおよその速さは一秒あたりどれくらいですか？',
    options: ['約300キロメートル', '約30万キロメートル', '約3万キロメートル', '約3000万キロメートル'],
    correct: 1,
    explanation: '光速は約30万km/s（秒速299,792km）です。',
  },
];
