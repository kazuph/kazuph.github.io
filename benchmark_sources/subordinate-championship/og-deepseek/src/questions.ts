export interface Question {
  id: string;
  prompt: string;
  choices: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
}

/**
 * All quiz content is bundled with the Worker. Nothing is fetched from an
 * external API at runtime, which keeps the game playable offline.
 */
export const QUESTION_BANK: readonly Question[] = [
  {
    id: "fuji",
    prompt: "富士山の標高はおよそ何メートル？",
    choices: ["3,776m", "3,067m", "4,205m", "2,956m"],
    answerIndex: 0,
  },
  {
    id: "shinano",
    prompt: "日本でいちばん長い川はどれ？",
    choices: ["利根川", "信濃川", "石狩川", "淀川"],
    answerIndex: 1,
  },
  {
    id: "neko",
    prompt: "小説『吾輩は猫である』の作者は誰？",
    choices: ["太宰治", "芥川龍之介", "夏目漱石", "森鴎外"],
    answerIndex: 2,
  },
  {
    id: "au",
    prompt: "元素記号「Au」が表す元素はどれ？",
    choices: ["銀", "銅", "アルミニウム", "金"],
    answerIndex: 3,
  },
  {
    id: "tower",
    prompt: "東京タワーの高さは何メートル？",
    choices: ["333m", "634m", "250m", "408m"],
    answerIndex: 0,
  },
  {
    id: "planet",
    prompt: "太陽系でいちばん大きな惑星はどれ？",
    choices: ["土星", "木星", "天王星", "海王星"],
    answerIndex: 1,
  },
  {
    id: "constitution",
    prompt: "日本国憲法が施行されたのは西暦何年？",
    choices: ["1945年", "1946年", "1947年", "1952年"],
    answerIndex: 2,
  },
  {
    id: "dozen",
    prompt: "「1ダース」は何個のこと？",
    choices: ["10個", "6個", "20個", "12個"],
    answerIndex: 3,
  },
  {
    id: "tanabata",
    prompt: "七夕（たなばた）は何月何日？",
    choices: ["7月7日", "8月7日", "6月7日", "7月17日"],
    answerIndex: 0,
  },
  {
    id: "right-angle",
    prompt: "直角は何度？",
    choices: ["45度", "90度", "180度", "60度"],
    answerIndex: 1,
  },
  {
    id: "soccer",
    prompt: "サッカーの1チームは、フィールド上に何人でプレーする？",
    choices: ["9人", "10人", "11人", "12人"],
    answerIndex: 2,
  },
  {
    id: "boiling",
    prompt: "1気圧のもとで、水が沸騰する温度は何℃？",
    choices: ["80℃", "90℃", "120℃", "100℃"],
    answerIndex: 3,
  },
  {
    id: "satellite",
    prompt: "地球の唯一の自然衛星はどれ？",
    choices: ["月", "火星", "太陽", "金星"],
    answerIndex: 0,
  },
  {
    id: "signal",
    prompt: "日本の道路信号で「進め」を意味する色はどれ？",
    choices: ["赤", "青", "黄色", "白"],
    answerIndex: 1,
  },
  {
    id: "shakespeare",
    prompt: "『ハムレット』や『ロミオとジュリエット』を書いた劇作家は誰？",
    choices: ["ゲーテ", "トルストイ", "シェイクスピア", "ディケンズ"],
    answerIndex: 2,
  },
  {
    id: "kyoto",
    prompt: "「古都」と呼ばれる、日本にかつて首都が置かれた都市はどこ？",
    choices: ["奈良", "大阪", "鎌倉", "京都"],
    answerIndex: 3,
  },
  {
    id: "grape",
    prompt: "ぶどうの果実の色で一般的でないものはどれ？",
    choices: ["紫", "黒", "緑", "水色"],
    answerIndex: 3,
  },
  {
    id: "weekly",
    prompt: "1週間は何日？",
    choices: ["7日", "5日", "10日", "14日"],
    answerIndex: 0,
  },
];

export const TOTAL_QUESTIONS = 10;

/** Fisher–Yates shuffle over a copy, so the bank itself is never mutated. */
export function pickQuestionIndexes(
  count = TOTAL_QUESTIONS,
  random: () => number = Math.random,
): number[] {
  const indexes = QUESTION_BANK.map((_, i) => i);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes.slice(0, Math.min(count, indexes.length));
}

export function questionAt(index: number): Question {
  const question = QUESTION_BANK[index];
  if (!question) throw new Error(`Unknown question index: ${index}`);
  return question;
}
