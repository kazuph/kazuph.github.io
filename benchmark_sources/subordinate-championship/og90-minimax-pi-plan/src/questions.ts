/**
 * アプリに内蔵する日本語の4択クイズ。
 * 外部APIからは取らない。ゲームごとにこの中からランダムに10問を選んで出す。
 */

export interface Question {
  /** 問題文 */
  text: string;
  /** 選択肢 4つ */
  choices: [string, string, string, string];
  /** 正解の添字 (0-3) */
  correct: number;
}

export const QUESTION_BANK: Question[] = [
  {
    text: "日本の首都はどこですか？",
    choices: ["東京", "大阪", "京都", "札幌"],
    correct: 0,
  },
  {
    text: "富士山の高さはおよそ何メートルですか？",
    choices: ["2,776メートル", "3,776メートル", "1,776メートル", "4,776メートル"],
    correct: 1,
  },
  {
    text: "世界最高峰の山はどれですか？",
    choices: ["エベレスト", "キトラ", "K2", "マスカット"],
    correct: 0,
  },
  {
    text: "日本の千円札に描かれている人物は誰ですか？",
    choices: ["伊藤博文", "夏目漱石", "野口英世", "徳川家康"],
    correct: 2,
  },
  {
    text: "絶対零度は摂氏いくつですか？",
    choices: ["-273.15度", "-100度", "0度", "-459.67度"],
    correct: 0,
  },
  {
    text: "面積が一番大きい日本の都道府県はどれですか？",
    choices: ["北海道", "東京都", "大阪府", "青森県"],
    correct: 0,
  },
  {
    text: "閏年の1年は何日ですか？",
    choices: ["365日", "366日", "364日", "367日"],
    correct: 1,
  },
  {
    text: "日本の初代内閣総理大臣は誰ですか？",
    choices: ["伊藤博文", "桂太郎", "明治天皇", "西郷隆盛"],
    correct: 0,
  },
  {
    text: "「五月雨」の読みはどれですか？",
    choices: ["samidare", "ごうりゅう", "さつきがれ", "tsuyu"],
    correct: 2,
  },
  {
    text: "光速はおよそ1秒で何キロメートル進みますか？",
    choices: ["約3万キロメートル", "約30万キロメートル", "約300キロメートル", "約3,000万キロメートル"],
    correct: 1,
  },
  {
    text: "「梅雨」の読みはどれですか？",
    choices: ["つゆ", "なつく", "haru", "aki"],
    correct: 0,
  },
  {
    text: "日本の紙幣の最高額面はいくらですか？",
    choices: ["1万円", "5千円", "2万円", "1千円"],
    correct: 0,
  },
  {
    text: "掛け算の英語は何ですか？",
    choices: ["multiplication", "division", "addition", "subtraction"],
    correct: 0,
  },
  {
    text: "マグマが地表で冷えて固まった岩石は何という分析法ですか？",
    choices: ["火成岩", "堆積岩", "変成岩", "深成岩"],
    correct: 0,
  },
  {
    text: "地球の周囲を1周する距離はおよそ何キロメートルですか？",
    choices: ["約4万キロメートル", "約1万キロメートル", "約10万キロメートル", "約400キロメートル"],
    correct: 0,
  },
  {
    text: "「七転び八起き」の「七」は何回ですか？",
    choices: ["7回", "8回", "6回", "9回"],
    correct: 0,
  },
];

export const TOTAL_QUESTIONS = 10;
