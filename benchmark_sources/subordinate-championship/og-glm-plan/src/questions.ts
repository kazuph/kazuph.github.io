/**
 * 内蔵の日本語4択クイズ。外部APIは使わない。
 * 毎回ゲームごとに QUESTIONS から10問を選ぶ。12問以上用意してある。
 */

export interface Question {
  text: string;
  choices: [string, string, string, string];
  /** 正解の添字（0〜3） */
  answer: number;
}

export const QUESTIONS: Question[] = [
  { text: "世界で一番高い山はどれ？", choices: ["エベレスト", "K2", "モンブラン", "マッキンリー"], answer: 0 },
  { text: "「1ダース」はいくつを数える言葉？", choices: ["10", "12", "20", "144"], answer: 1 },
  { text: "スパゲッティの語源となったイタリア語の意味は？", choices: ["板", "棒", "ひも", "袋"], answer: 2 },
  { text: "富士山の標高は何メートル？", choices: ["3776メートル", "3676メートル", "3876メートル", "3476メートル"], answer: 0 },
  { text: "イクラは何の卵？", choices: ["タラ", "ニシン", "サバ", "鮭"], answer: 3 },
  { text: "月までの距離はおよそいくら？", choices: ["約3.8万キロ", "約38万キロ", "約380万キロ", "約3800万キロ"], answer: 1 },
  { text: "ワルツは何拍子の音楽？", choices: ["2拍子", "3拍子", "4拍子", "6拍子"], answer: 1 },
  { text: "成人の血液量は体重のおよそ何分の1？", choices: ["5分の1", "8分の1", "13分の1", "20分の1"], answer: 2 },
  { text: "血液が赤いのはどの成分の色？", choices: ["ヘモグロビン", "メラニン", "カロテン", "コラーゲン"], answer: 0 },
  { text: "東京タワーの高さは？", choices: ["約250メートル", "約300メートル", "約333メートル", "約634メートル"], answer: 2 },
  { text: "1オクターブ上の音は、元の音の周波数の何倍？", choices: ["1.5倍", "2倍", "3倍", "4倍"], answer: 1 },
  { text: "七夕は毎年何月何日？", choices: ["5月5日", "7月7日", "8月7日", "9月9日"], answer: 1 },
  { text: "光は1秒間に何キロ進む？", choices: ["約3万キロ", "約30万キロ", "約300万キロ", "約3000万キロ"], answer: 1 },
  { text: "日本の水道水の浄水場での主な消毒薬は？", choices: ["塩素", "フッ素", "ヨウ素", "オゾン"], answer: 0 },
];

/** 全問題の中から count 問を選ぶ。ゲームごとに並びも選択肢も変わらないが、出題される10問は毎回変わる。 */
export function pickQuestionIndices(count: number): { indices: number[]; correctChoices: number[] } {
  const all = [...Array(QUESTIONS.length).keys()];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const indices = all.slice(0, count);
  return { indices, correctChoices: indices.map((i) => QUESTIONS[i].answer) };
}
